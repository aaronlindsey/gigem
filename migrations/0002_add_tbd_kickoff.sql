ALTER TABLE games
ADD COLUMN kickoff_time_tbd INTEGER NOT NULL DEFAULT 0
CHECK (kickoff_time_tbd IN (0, 1));
