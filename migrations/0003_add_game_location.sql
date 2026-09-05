ALTER TABLE games
ADD COLUMN opponent_abbreviation TEXT
CHECK (opponent_abbreviation IS NULL OR length(trim(opponent_abbreviation)) BETWEEN 1 AND 10);

ALTER TABLE games
ADD COLUMN venue TEXT
CHECK (venue IS NULL OR length(trim(venue)) BETWEEN 1 AND 120);

ALTER TABLE games
ADD COLUMN site TEXT NOT NULL DEFAULT 'home'
CHECK (site IN ('home', 'away', 'neutral'));
