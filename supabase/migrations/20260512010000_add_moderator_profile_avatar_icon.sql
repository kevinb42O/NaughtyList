alter table public.profiles
drop constraint if exists profiles_avatar_icon_check;

alter table public.profiles
add constraint profiles_avatar_icon_check
check (avatar_icon in (
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
  'bug',
  'siren',
  'crown',
  'shield-alert',
  'lock',
  'fingerprint',
  'scan-face',
  'binoculars',
  'badge-alert'
));