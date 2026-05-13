alter table public.clans
drop constraint if exists clans_badge_icon_check;

alter table public.clans
add constraint clans_badge_icon_check
check (
  badge_icon in (
    'skull',
    'shield',
    'crosshair',
    'radar',
    'radio',
    'swords',
    'target',
    'flame',
    'zap',
    'eye',
    'ghost',
    'bomb',
    'rat',
    'bug',
    'siren',
    'lock',
    'fingerprint',
    'scan-face',
    'binoculars',
    'badge-alert'
  )
);