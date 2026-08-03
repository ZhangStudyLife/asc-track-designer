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
  select source_revision.* into selected_revision
  from public.track_revisions as source_revision
  where source_revision.id = p_revision_id;
  if selected_revision.id is null then raise exception 'Revision is unavailable'; end if;

  select source_track.* into selected_track
  from public.tracks as source_track
  where source_track.id = selected_revision.track_id;
  if selected_track.id is null or selected_track.status <> 'published' then
    raise exception 'Track is unavailable';
  end if;

  insert into public.downloads (track_id, user_id, revision_id)
  values (selected_track.id, p_actor_id, selected_revision.id)
  on conflict on constraint downloads_pkey do update set
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
