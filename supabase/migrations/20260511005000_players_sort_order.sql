-- Add sort_order column for admin drag-and-drop reordering
ALTER TABLE players ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialise existing rows with a sequential order based on threat level then created_at
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE threat_level
          WHEN 'hostile'  THEN 1
          WHEN 'caution'  THEN 2
          WHEN 'friendly' THEN 3
          ELSE 4
        END,
        created_at ASC
    ) AS rn
  FROM players
)
UPDATE players
SET sort_order = ranked.rn
FROM ranked
WHERE players.id = ranked.id;
