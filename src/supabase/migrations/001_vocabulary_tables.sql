-- Create shared_vocabularies table (공유 단어장 목록)
CREATE TABLE IF NOT EXISTS shared_vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT DEFAULT 'english',
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  total_words INTEGER DEFAULT 0,
  category TEXT, -- '토익', '수능', '텝스' etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shared_words table (공유 단어장의 단어들)
CREATE TABLE IF NOT EXISTS shared_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL REFERENCES shared_vocabularies(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pronunciation TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  order_index INTEGER, -- 단어 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_vocabularies table (사용자가 다운로드한 단어장)
CREATE TABLE IF NOT EXISTS user_vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_vocabulary_id UUID REFERENCES shared_vocabularies(id), -- 어느 공유 단어장에서 왔는지
  total_units INTEGER DEFAULT 1,
  words_per_unit INTEGER DEFAULT 100,
  total_words INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_words table (사용자 단어장의 단어들)
CREATE TABLE IF NOT EXISTS user_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_vocabulary_id UUID NOT NULL REFERENCES user_vocabularies(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pronunciation TEXT,
  meaning TEXT NOT NULL,
  example_sentence TEXT,
  unit_number INTEGER NOT NULL,
  order_index INTEGER,
  is_starred BOOLEAN DEFAULT FALSE,
  is_graveyard BOOLEAN DEFAULT FALSE,
  mastery_level INTEGER DEFAULT 0, -- 0~5
  last_reviewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_words_vocabulary ON shared_words(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_user_vocabularies_user ON user_vocabularies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_words_vocabulary ON user_words(user_vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_user_words_unit ON user_words(user_vocabulary_id, unit_number);

-- Enable Row Level Security (RLS)
ALTER TABLE shared_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_vocabularies (모두가 읽기 가능)
CREATE POLICY "Anyone can view shared vocabularies"
  ON shared_vocabularies FOR SELECT
  USING (true);

-- RLS Policies for shared_words (모두가 읽기 가능)
CREATE POLICY "Anyone can view shared words"
  ON shared_words FOR SELECT
  USING (true);

-- RLS Policies for user_vocabularies (자기 것만 CRUD)
CREATE POLICY "Users can view their own vocabularies"
  ON user_vocabularies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabularies"
  ON user_vocabularies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabularies"
  ON user_vocabularies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabularies"
  ON user_vocabularies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_words (자기 것만 CRUD)
CREATE POLICY "Users can view their own words"
  ON user_words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_vocabularies
      WHERE user_vocabularies.id = user_words.user_vocabulary_id
      AND user_vocabularies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own words"
  ON user_words FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_vocabularies
      WHERE user_vocabularies.id = user_words.user_vocabulary_id
      AND user_vocabularies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own words"
  ON user_words FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_vocabularies
      WHERE user_vocabularies.id = user_words.user_vocabulary_id
      AND user_vocabularies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own words"
  ON user_words FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_vocabularies
      WHERE user_vocabularies.id = user_words.user_vocabulary_id
      AND user_vocabularies.user_id = auth.uid()
    )
  );

-- Insert sample shared vocabularies (선물상자 샘플 데이터)
INSERT INTO shared_vocabularies (id, title, description, category, difficulty_level, total_words)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '토익 고득점 필수 어휘', '토익 시험에서 자주 출제되는 필수 단어 1200개', '토익', 'intermediate', 1200),
  ('550e8400-e29b-41d4-a716-446655440002', '수능 영어 완벽 대비', '수능 영어 영역 1등급을 위한 필수 어휘 800개', '수능', 'advanced', 800),
  ('550e8400-e29b-41d4-a716-446655440003', '왕초보 영어 시작하기', '영어 공부를 처음 시작하는 분들을 위한 기초 어휘 500개', '기초', 'beginner', 500);

-- Insert sample words for TOEIC vocabulary
INSERT INTO shared_words (vocabulary_id, word, pronunciation, meaning, example_sentence, order_index)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'accommodate', 'ə-ˈkɒm-ə-deɪt', '수용하다, 편의를 제공하다', 'The hotel can accommodate up to 200 guests.', 1),
  ('550e8400-e29b-41d4-a716-446655440001', 'acquire', 'ə-ˈkwaɪə', '획득하다, 습득하다', 'The company acquired a new subsidiary.', 2),
  ('550e8400-e29b-41d4-a716-446655440001', 'adjacent', 'ə-ˈdʒeɪ-sənt', '인접한, 이웃한', 'The office is adjacent to the conference room.', 3),
  ('550e8400-e29b-41d4-a716-446655440001', 'allocate', 'ˈæl-ə-keɪt', '할당하다, 배분하다', 'We need to allocate more resources to this project.', 4),
  ('550e8400-e29b-41d4-a716-446655440001', 'anticipate', 'æn-ˈtɪs-ɪ-peɪt', '예상하다, 기대하다', 'We anticipate a 20% increase in sales.', 5);

-- Insert sample words for 수능 vocabulary
INSERT INTO shared_words (vocabulary_id, word, pronunciation, meaning, example_sentence, order_index)
VALUES
  ('550e8400-e29b-41d4-a716-446655440002', 'sophisticated', 'sə-ˈfɪs-tɪ-keɪ-tɪd', '정교한, 세련된', 'The design is very sophisticated.', 1),
  ('550e8400-e29b-41d4-a716-446655440002', 'phenomenon', 'fɪ-ˈnɒm-ɪ-nən', '현상', 'Climate change is a global phenomenon.', 2),
  ('550e8400-e29b-41d4-a716-446655440002', 'contemporary', 'kən-ˈtem-pə-rer-i', '현대의, 동시대의', 'Contemporary art is often controversial.', 3),
  ('550e8400-e29b-41d4-a716-446655440002', 'comprehend', 'kɒm-prɪ-ˈhend', '이해하다', 'It is difficult to comprehend the magnitude of the disaster.', 4),
  ('550e8400-e29b-41d4-a716-446655440002', 'preserve', 'prɪ-ˈzɜːv', '보존하다, 유지하다', 'We must preserve our natural resources.', 5);

-- Insert sample words for beginner vocabulary
INSERT INTO shared_words (vocabulary_id, word, pronunciation, meaning, example_sentence, order_index)
VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'apple', 'ˈæp-əl', '사과', 'I eat an apple every day.', 1),
  ('550e8400-e29b-41d4-a716-446655440003', 'book', 'bʊk', '책', 'I love reading books.', 2),
  ('550e8400-e29b-41d4-a716-446655440003', 'computer', 'kəm-ˈpjuː-tər', '컴퓨터', 'I use a computer for work.', 3),
  ('550e8400-e29b-41d4-a716-446655440003', 'friend', 'frend', '친구', 'She is my best friend.', 4),
  ('550e8400-e29b-41d4-a716-446655440003', 'happy', 'ˈhæp-i', '행복한', 'I am happy to see you.', 5);
