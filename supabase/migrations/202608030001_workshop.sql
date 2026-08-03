create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_id bigint not null unique,
  github_login text not null,
  display_name text not null,
  avatar_url text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  mode text not null default 'pvc' check (mode = 'pvc'),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  license text not null check (license in ('cc-by-4.0', 'cc-by-nc-4.0', 'cc0-1.0', 'all-rights-reserved')),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  current_revision_id uuid,
  like_count integer not null default 0 check (like_count >= 0),
  rating_count integer not null default 0 check (rating_count >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  rating_average double precision generated always as (
    case when rating_count = 0 then 0 else rating_sum::double precision / rating_count end
  ) stored,
  comment_count integer not null default 0 check (comment_count >= 0),
  download_count integer not null default 0 check (download_count >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.track_revisions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  revision integer not null check (revision > 0),
  app_version text not null,
  schema_version text not null default '1.0' check (schema_version = '1.0'),
  json_path text not null unique,
  preview_path text not null unique,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  piece_count integer not null check (piece_count between 1 and 200),
  total_length double precision not null check (total_length >= 0),
  change_note text not null default '' check (char_length(change_note) <= 1000),
  created_at timestamptz not null default now(),
  unique (track_id, revision)
);

alter table public.tracks
  add constraint tracks_current_revision_fk
  foreign key (current_revision_id) references public.track_revisions(id) on delete restrict;

create table public.downloads (
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  revision_id uuid not null references public.track_revisions(id) on delete restrict,
  first_downloaded_at timestamptz not null default now(),
  last_downloaded_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

create table public.likes (
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

create table public.ratings (
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  root_id uuid references public.comments(id) on delete cascade,
  reply_to_comment_id uuid references public.comments(id) on delete set null,
  reply_to_user_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like', 'rating', 'comment', 'reply', 'moderation')),
  track_id uuid references public.tracks(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 300),
  unique_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('track', 'comment')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'abuse', 'copyright', 'invalid-track', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, target_type, target_id)
);

create index tracks_public_order_idx on public.tracks (status, published_at desc, id desc);
create index tracks_owner_idx on public.tracks (owner_id, created_at desc);
create index tracks_tags_idx on public.tracks using gin (tags);
create index track_revisions_track_idx on public.track_revisions (track_id, revision desc);
create index comments_track_root_idx on public.comments (track_id, root_id, created_at);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);
create index reports_status_idx on public.reports (status, created_at desc);

create or replace function public.workshop_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.workshop_set_updated_at();
create trigger tracks_updated_at before update on public.tracks
for each row execute function public.workshop_set_updated_at();
create trigger ratings_updated_at before update on public.ratings
for each row execute function public.workshop_set_updated_at();
create trigger comments_updated_at before update on public.comments
for each row execute function public.workshop_set_updated_at();

create or replace function public.workshop_sync_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_id bigint;
  provider_text text;
  login_name text;
begin
  provider_text := nullif(coalesce(
    new.raw_user_meta_data ->> 'provider_id',
    new.raw_user_meta_data ->> 'sub'
  ), '');
  if provider_text is null or provider_text !~ '^[0-9]+$' then
    return new;
  end if;
  provider_id := provider_text::bigint;
  login_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'user_name', ''),
    nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
    'github-user'
  );

  if provider_id is null then
    return new;
  end if;

  insert into public.profiles (id, github_id, github_login, display_name, avatar_url, role)
  values (
    new.id,
    provider_id,
    login_name,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), login_name),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    case when provider_id = 174326754 then 'admin' else 'user' end
  )
  on conflict (id) do update set
    github_id = excluded.github_id,
    github_login = excluded.github_login,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    role = case when excluded.github_id = 174326754 then 'admin' else public.profiles.role end;

  return new;
end;
$$;

create trigger auth_user_workshop_profile
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.workshop_sync_profile();

create or replace function public.workshop_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.workshop_track_is_public(target_track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tracks
    where id = target_track_id and status = 'published'
  );
$$;

create or replace function public.workshop_has_download(target_track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.downloads
    where track_id = target_track_id and user_id = auth.uid()
  );
$$;

create or replace function public.workshop_validate_comment_thread()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  root_comment public.comments;
  target_comment public.comments;
begin
  if new.root_id is null then
    if new.reply_to_comment_id is not null or new.reply_to_user_id is not null then
      raise exception 'Top-level comments cannot target another comment';
    end if;
    return new;
  end if;

  select * into root_comment from public.comments where id = new.root_id;
  if root_comment.id is null or root_comment.root_id is not null or root_comment.track_id <> new.track_id then
    raise exception 'Replies must reference a top-level comment on the same track';
  end if;
  if new.reply_to_comment_id is null or new.reply_to_user_id is null then
    raise exception 'Replies require a target comment and user';
  end if;

  select * into target_comment from public.comments where id = new.reply_to_comment_id;
  if target_comment.id is null
    or target_comment.track_id <> new.track_id
    or coalesce(target_comment.root_id, target_comment.id) <> new.root_id then
    raise exception 'Reply target must belong to the same comment thread';
  end if;
  if target_comment.author_id <> new.reply_to_user_id then
    raise exception 'Reply target user does not match the comment author';
  end if;
  return new;
end;
$$;

create trigger comments_validate_thread before insert on public.comments
for each row execute function public.workshop_validate_comment_thread();

create or replace function public.workshop_refresh_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_track uuid := coalesce(new.track_id, old.track_id);
begin
  update public.tracks set like_count = (
    select count(*)::integer from public.likes where track_id = affected_track
  ) where id = affected_track;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger likes_refresh_count after insert or delete on public.likes
for each row execute function public.workshop_refresh_like_count();

create or replace function public.workshop_refresh_rating_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_track uuid := coalesce(new.track_id, old.track_id);
begin
  update public.tracks set
    rating_count = (select count(*)::integer from public.ratings where track_id = affected_track),
    rating_sum = (select coalesce(sum(value), 0)::integer from public.ratings where track_id = affected_track)
  where id = affected_track;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger ratings_refresh_count after insert or update or delete on public.ratings
for each row execute function public.workshop_refresh_rating_count();

create or replace function public.workshop_refresh_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_track uuid := coalesce(new.track_id, old.track_id);
begin
  update public.tracks set comment_count = (
    select count(*)::integer from public.comments
    where track_id = affected_track and status = 'visible'
  ) where id = affected_track;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger comments_refresh_count after insert or update of status or delete on public.comments
for each row execute function public.workshop_refresh_comment_count();

create or replace function public.workshop_refresh_download_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_track uuid := coalesce(new.track_id, old.track_id);
begin
  update public.tracks set download_count = (
    select count(*)::integer from public.downloads where track_id = affected_track
  ) where id = affected_track;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger downloads_refresh_count after insert or delete on public.downloads
for each row execute function public.workshop_refresh_download_count();

create or replace function public.workshop_notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where unique_key = 'like:' || old.track_id || ':' || old.user_id;
    return old;
  end if;

  select owner_id into owner from public.tracks where id = new.track_id;
  if owner is null or owner = new.user_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, type, track_id, message, unique_key)
  values (owner, new.user_id, 'like', new.track_id, '赞了你的赛道', 'like:' || new.track_id || ':' || new.user_id)
  on conflict (unique_key) do update set created_at = now(), read_at = null;
  return new;
end;
$$;

create trigger likes_notify after insert or delete on public.likes
for each row execute function public.workshop_notify_like();

create or replace function public.workshop_notify_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.tracks where id = new.track_id;
  if owner is null or owner = new.user_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, type, track_id, message, unique_key)
  values (
    owner,
    new.user_id,
    'rating',
    new.track_id,
    '给你的赛道评了 ' || new.value || ' 星',
    'rating:' || new.track_id || ':' || new.user_id
  )
  on conflict (unique_key) do update set message = excluded.message, created_at = now(), read_at = null;
  return new;
end;
$$;

create trigger ratings_notify after insert or update of value on public.ratings
for each row execute function public.workshop_notify_rating();

create or replace function public.workshop_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  event_type text;
  event_message text;
begin
  if new.root_id is null then
    select owner_id into recipient from public.tracks where id = new.track_id;
    event_type := 'comment';
    event_message := '评论了你的赛道';
  else
    recipient := new.reply_to_user_id;
    event_type := 'reply';
    event_message := '回复了你的评论';
  end if;

  if recipient is null or recipient = new.author_id then return new; end if;
  insert into public.notifications (recipient_id, actor_id, type, track_id, comment_id, message, unique_key)
  values (
    recipient,
    new.author_id,
    event_type,
    new.track_id,
    new.id,
    event_message,
    'comment:' || new.id || ':' || recipient
  );
  return new;
end;
$$;

create trigger comments_notify after insert on public.comments
for each row execute function public.workshop_notify_comment();

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.track_revisions enable row level security;
alter table public.downloads enable row level security;
alter table public.likes enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);

create policy tracks_public_read on public.tracks for select to anon, authenticated
using (status = 'published' or owner_id = auth.uid() or public.workshop_is_admin());
create policy tracks_owner_soft_delete on public.tracks for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() and status = 'deleted' and deleted_at is not null);

create policy revisions_public_read on public.track_revisions for select to anon, authenticated
using (public.workshop_track_is_public(track_id) or exists (
  select 1 from public.tracks as source_track
  where source_track.id = track_revisions.track_id
    and (source_track.owner_id = auth.uid() or public.workshop_is_admin())
));

create policy downloads_owner_read on public.downloads for select to authenticated using (user_id = auth.uid());

create policy likes_owner_read on public.likes for select to authenticated using (user_id = auth.uid());
create policy likes_owner_insert on public.likes for insert to authenticated
with check (user_id = auth.uid() and public.workshop_track_is_public(track_id));
create policy likes_owner_delete on public.likes for delete to authenticated using (user_id = auth.uid());

create policy ratings_owner_read on public.ratings for select to authenticated using (user_id = auth.uid());
create policy ratings_owner_insert on public.ratings for insert to authenticated
with check (user_id = auth.uid() and public.workshop_has_download(track_id));
create policy ratings_owner_update on public.ratings for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid() and public.workshop_has_download(track_id));

create policy comments_public_read on public.comments for select to anon, authenticated
using (
  (status = 'visible' and public.workshop_track_is_public(track_id))
  or author_id = auth.uid()
  or public.workshop_is_admin()
);
create policy comments_owner_insert on public.comments for insert to authenticated
with check (author_id = auth.uid() and status = 'visible' and public.workshop_track_is_public(track_id));
create policy comments_owner_update on public.comments for update to authenticated
using (author_id = auth.uid() or public.workshop_is_admin())
with check (author_id = auth.uid() or public.workshop_is_admin());

create policy notifications_owner_read on public.notifications for select to authenticated
using (recipient_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy reports_owner_insert on public.reports for insert to authenticated
with check (reporter_id = auth.uid() and status = 'open');
create policy reports_owner_or_admin_read on public.reports for select to authenticated
using (reporter_id = auth.uid() or public.workshop_is_admin());

grant select on public.profiles, public.tracks, public.track_revisions, public.comments to anon, authenticated;
grant update (status, deleted_at) on public.tracks to authenticated;
grant select on public.downloads, public.likes, public.ratings, public.notifications, public.reports to authenticated;
grant insert, delete on public.likes to authenticated;
grant insert on public.ratings to authenticated;
grant update (value) on public.ratings to authenticated;
grant insert on public.comments to authenticated;
grant update (body, status, edited_at) on public.comments to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert on public.reports to authenticated;
grant execute on function public.workshop_is_admin() to anon, authenticated;
grant execute on function public.workshop_track_is_public(uuid) to anon, authenticated;
grant execute on function public.workshop_has_download(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('workshop-previews', 'workshop-previews', true, 1048576, array['image/webp', 'image/png']),
  ('workshop-tracks', 'workshop-tracks', false, 2097152, array['application/json'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy workshop_previews_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'workshop-previews');

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.workshop_publish_track(
  p_actor_id uuid,
  p_track_id uuid,
  p_title text,
  p_description text,
  p_tags text[],
  p_license text,
  p_change_note text,
  p_app_version text,
  p_json_path text,
  p_preview_path text,
  p_checksum_sha256 text,
  p_piece_count integer,
  p_total_length double precision
)
returns table (track_id uuid, revision_id uuid, revision_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_track public.tracks;
  next_revision integer;
  created_revision_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then
    raise exception 'Workshop profile is unavailable';
  end if;

  if (
    select count(*)
    from public.track_revisions as recent_revision
    join public.tracks as recent_track on recent_track.id = recent_revision.track_id
    where recent_track.owner_id = p_actor_id
      and recent_revision.created_at >= now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Daily publish limit reached';
  end if;

  if p_track_id is null then
    insert into public.tracks (owner_id, title, description, tags, license)
    values (p_actor_id, p_title, p_description, p_tags, p_license)
    returning * into selected_track;
  else
    select * into selected_track from public.tracks where id = p_track_id for update;
    if selected_track.id is null or selected_track.owner_id <> p_actor_id then
      raise exception 'Track is unavailable';
    end if;
    if selected_track.status = 'deleted' then
      raise exception 'Deleted tracks cannot receive revisions';
    end if;

    update public.tracks set
      title = p_title,
      description = p_description,
      tags = p_tags,
      license = p_license,
      status = 'published',
      published_at = now()
    where id = selected_track.id
    returning * into selected_track;
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.track_revisions where track_id = selected_track.id;

  insert into public.track_revisions (
    track_id,
    revision,
    app_version,
    json_path,
    preview_path,
    checksum_sha256,
    piece_count,
    total_length,
    change_note
  ) values (
    selected_track.id,
    next_revision,
    p_app_version,
    p_json_path,
    p_preview_path,
    p_checksum_sha256,
    p_piece_count,
    p_total_length,
    p_change_note
  ) returning id into created_revision_id;

  update public.tracks set current_revision_id = created_revision_id
  where id = selected_track.id;

  return query select selected_track.id, created_revision_id, next_revision;
end;
$$;

create or replace function public.workshop_record_download(
  p_actor_id uuid,
  p_revision_id uuid
)
returns table (
  track_id uuid,
  revision_id uuid,
  json_path text,
  checksum_sha256 text,
  track_title text,
  revision_number integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_revision public.track_revisions;
  selected_track public.tracks;
begin
  select * into selected_revision from public.track_revisions where id = p_revision_id;
  if selected_revision.id is null then raise exception 'Revision is unavailable'; end if;

  select * into selected_track from public.tracks where id = selected_revision.track_id;
  if selected_track.id is null or selected_track.status <> 'published' then
    raise exception 'Track is unavailable';
  end if;

  insert into public.downloads (track_id, user_id, revision_id)
  values (selected_track.id, p_actor_id, selected_revision.id)
  on conflict (track_id, user_id) do update set
    revision_id = excluded.revision_id,
    last_downloaded_at = now();

  return query select
    selected_track.id,
    selected_revision.id,
    selected_revision.json_path,
    selected_revision.checksum_sha256,
    selected_track.title,
    selected_revision.revision;
end;
$$;

create or replace function public.workshop_moderate_content(
  p_actor_id uuid,
  p_report_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_report public.reports;
  recipient uuid;
  target_track uuid;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Administrator access required';
  end if;

  select * into selected_report from public.reports where id = p_report_id for update;
  if selected_report.id is null or selected_report.status <> 'open' then
    raise exception 'Report is unavailable';
  end if;

  if p_action = 'dismiss' then
    update public.reports set status = 'dismissed', resolved_by = p_actor_id, resolved_at = now()
    where id = selected_report.id;
    return;
  end if;
  if p_action <> 'hide' then raise exception 'Unsupported moderation action'; end if;

  if selected_report.target_type = 'track' then
    update public.tracks set status = 'hidden'
    where id = selected_report.target_id
    returning owner_id, id into recipient, target_track;
  else
    update public.comments set status = 'hidden'
    where id = selected_report.target_id
    returning author_id, track_id into recipient, target_track;
  end if;

  if recipient is null then raise exception 'Reported content is unavailable'; end if;
  update public.reports set status = 'resolved', resolved_by = p_actor_id, resolved_at = now()
  where id = selected_report.id;

  insert into public.notifications (recipient_id, actor_id, type, track_id, message)
  values (recipient, p_actor_id, 'moderation', target_track, '你的公开内容因举报已被隐藏');
end;
$$;

revoke all on function public.workshop_publish_track(
  uuid, uuid, text, text, text[], text, text, text, text, text, text, integer, double precision
) from public, anon, authenticated;
revoke all on function public.workshop_record_download(uuid, uuid) from public, anon, authenticated;
revoke all on function public.workshop_moderate_content(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.workshop_publish_track(
  uuid, uuid, text, text, text[], text, text, text, text, text, text, integer, double precision
) to service_role;
grant execute on function public.workshop_record_download(uuid, uuid) to service_role;
grant execute on function public.workshop_moderate_content(uuid, uuid, text) to service_role;
