-- Add source_chapter column to shared_words table
ALTER TABLE shared_words ADD COLUMN IF NOT EXISTS source_chapter TEXT;

-- Create index for better query performance on source_chapter
CREATE INDEX IF NOT EXISTS idx_shared_words_source_chapter ON shared_words(source_chapter);
