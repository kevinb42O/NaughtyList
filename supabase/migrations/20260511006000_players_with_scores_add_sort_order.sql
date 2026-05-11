-- Recreate players_with_scores to include sort_order (added in migration 005000)
-- Must drop first — CREATE OR REPLACE cannot insert a column in the middle
drop view if exists public.players_with_scores;

create view public.players_with_scores as
select
  p.id,
  p.name,
  p.clan,
  p.threat_level,
  p.initial_trust_score,
  coalesce(round(avg(v.score))::integer, p.initial_trust_score) as trust_score,
  count(v.id)::integer as vote_count,
  p.tags,
  p.evidence_url,
  p.notes,
  p.created_by,
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.moderated_at,
  p.moderated_by
from public.players p
left join public.trust_votes v on v.player_id = p.id
group by p.id;

-- Re-grant select since the view was dropped and recreated
grant select on public.players_with_scores to anon, authenticated;
