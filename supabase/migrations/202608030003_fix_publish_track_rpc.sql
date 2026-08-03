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

  select coalesce(max(existing_revision.revision), 0) + 1 into next_revision
  from public.track_revisions as existing_revision
  where existing_revision.track_id = selected_track.id;

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
