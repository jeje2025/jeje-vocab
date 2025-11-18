-- Create vocabulary_categories table (단어장 카테고리 관리)
CREATE TABLE IF NOT EXISTS vocabulary_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE vocabulary_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vocabulary_categories (모두가 읽기 가능, 관리자만 수정 가능)
CREATE POLICY "Anyone can view vocabulary categories"
  ON vocabulary_categories FOR SELECT
  USING (true);

-- Insert default categories
INSERT INTO vocabulary_categories (id, name, icon, enabled, sort_order)
VALUES
  ('toeic', '토익', '📊', true, 1),
  ('suneung', '수능', '📚', true, 2),
  ('teps', '텝스', '📝', true, 3),
  ('basic', '기초', '🔤', true, 4),
  ('business', '비즈니스', '💼', true, 5)
ON CONFLICT (id) DO NOTHING;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_vocabulary_categories_order ON vocabulary_categories(sort_order);
