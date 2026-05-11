alter table public.profiles
add column if not exists game_accounts jsonb not null default '[]'::jsonb;

update public.profiles
set game_accounts = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'id', activision_id,
        'shadowbanStatus', 'unknown',
        'shadowbanDate', ''
      )
    )
    from unnest(activision_ids) as activision_id
  ),
  '[]'::jsonb
)
where jsonb_array_length(game_accounts) = 0
  and coalesce(array_length(activision_ids, 1), 0) > 0;