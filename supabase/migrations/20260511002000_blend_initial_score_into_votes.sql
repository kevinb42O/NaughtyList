drop view if exists public.players_with_scores;

create view public.players_with_scores as
select
  p.id,
  p.name,
  p.clan,
  p.threat_level,
  p.initial_trust_score,
  round((p.initial_trust_score + coalesce(sum(v.score), 0))::numeric / (count(v.id) + 1))::integer as trust_score,
  count(v.id)::integer as vote_count,
  p.tags,
  p.evidence_url,
  p.notes,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.moderated_at,
  p.moderated_by
from public.players p
left join public.trust_votes v on v.player_id = p.id
group by p.id;

grant select on public.players_with_scores to anon, authenticated;
