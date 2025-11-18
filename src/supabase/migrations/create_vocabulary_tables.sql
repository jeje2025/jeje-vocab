-- =====================================================
-- JEJEVOCA Vocabulary Database Schema (Rich Vocabulary Model)
-- =====================================================
-- Run this SQL inside Supabase (SQL Editor or CLI) before deploying Edge Functions.
-- The schema is designed to store the full VocabularyItem shape from the
-- Aesthetic Vocabulary Layout project (pronunciation, definition, json arrays, etc.)
-- =====================================================

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. SHARED VOCABULARIES
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_vocabularies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty_level TEXT,
  words_per_unit INTEGER NOT NULL DEFAULT 20,
  total_words INTEGER NOT NULL DEFAULT 0,
  header_title TEXT,
  header_description TEXT,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. SHARED WORDS (Rich data per word)
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vocabulary_id UUID NOT NULL REFERENCES shared_vocabularies(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  meaning TEXT NOT NULL,
  definition TEXT,
  synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,        -- ["synonym1", "synonym2"]
  antonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  derivatives JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{"word":"...", "meaning":"..."}]
  example TEXT,
  translation TEXT,
  translation_highlight TEXT,
  etymology TEXT,
  metadata JSONB,                                     -- optional misc info (images, tags, etc.)
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_words_vocab ON shared_words(vocabulary_id, order_index);

-- =====================================================
-- 3. USER VOCABULARIES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_vocabularies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT,
  words_per_unit INTEGER NOT NULL DEFAULT 20,
  total_words INTEGER NOT NULL DEFAULT 0,
  shared_vocabulary_id UUID REFERENCES shared_vocabularies(id),
  header_title TEXT,
  header_description TEXT,
  token_input INTEGER NOT NULL DEFAULT 0,
  token_output INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vocabularies_user_id ON user_vocabularies(user_id);

-- =====================================================
-- 4. USER WORDS (Rich data + learning state)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES user_vocabularies(id) ON DELETE CASCADE,
  shared_word_id UUID REFERENCES shared_words(id),
  word TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  meaning TEXT NOT NULL,
  definition TEXT,
  synonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  antonyms JSONB NOT NULL DEFAULT '[]'::jsonb,
  derivatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  example TEXT,
  translation TEXT,
  translation_highlight TEXT,
  etymology TEXT,
  metadata JSONB,
  unit_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'learning',
  confidence INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_graveyard BOOLEAN NOT NULL DEFAULT false,
  is_wrong_answer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_words_vocab ON user_words(vocabulary_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_words_user_status ON user_words(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_words_user_flags ON user_words(user_id, is_starred, is_graveyard, is_wrong_answer);
CREATE INDEX IF NOT EXISTS idx_user_words_unit ON user_words(vocabulary_id, unit_number);

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================
ALTER TABLE shared_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared vocab read" ON shared_vocabularies
  FOR SELECT USING (true);

CREATE POLICY "shared words read" ON shared_words
  FOR SELECT USING (true);

CREATE POLICY "user vocab read" ON user_vocabularies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user vocab insert" ON user_vocabularies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user vocab update" ON user_vocabularies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user vocab delete" ON user_vocabularies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "user words read" ON user_words
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user words insert" ON user_words
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user words update" ON user_words
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user words delete" ON user_words
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shared_vocab_updated
  BEFORE UPDATE ON shared_vocabularies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shared_words_updated
  BEFORE UPDATE ON shared_words
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_vocab_updated
  BEFORE UPDATE ON user_vocabularies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_words_updated
  BEFORE UPDATE ON user_words
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- Optional: seed data can be added here if desired.
-- =====================================================
