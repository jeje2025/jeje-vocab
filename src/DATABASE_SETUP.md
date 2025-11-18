# 데이터베이스 설정 가이드

## Supabase 데이터베이스 테이블 생성

선물상자 기능을 사용하려면 Supabase 데이터베이스에 테이블을 생성해야 합니다.

### 1단계: Supabase Dashboard 접속

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인하세요
2. 연결된 프로젝트를 선택하세요
3. 왼쪽 메뉴에서 **SQL Editor**를 클릭하세요

### 2단계: SQL 실행

1. **New Query** 버튼을 클릭하세요
2. `/supabase/migrations/001_vocabulary_tables.sql` 파일의 내용을 복사하세요
3. SQL Editor에 붙여넣기 하세요
4. **Run** 버튼을 클릭하여 실행하세요

### 3단계: 확인

SQL이 성공적으로 실행되면 다음 테이블들이 생성됩니다:

- `shared_vocabularies` - 공유 단어장 목록
- `shared_words` - 공유 단어장의 단어들
- `user_vocabularies` - 사용자가 다운로드한 단어장
- `user_words` - 사용자 단어장의 단어들

또한 샘플 데이터도 자동으로 추가됩니다:
- 토익 고득점 필수 어휘 (1200단어)
- 수능 영어 완벽 대비 (800단어)
- 왕초보 영어 시작하기 (500단어)

### 4단계: 테스트

1. 앱에서 하단 네비게이션의 **선물상자** 아이콘을 클릭하세요
2. 공유 단어장 목록이 표시되는지 확인하세요
3. 단어장을 클릭하여 단어 선택 화면으로 이동하세요
4. 아는 단어를 스와이프하여 제거하세요
5. 유닛당 단어 수를 설정하세요
6. "내 단어장에 추가" 버튼을 클릭하세요

## 문제 해결

### 테이블이 생성되지 않는 경우

- SQL Editor에서 오류 메시지를 확인하세요
- 이미 같은 이름의 테이블이 존재하는지 확인하세요
- 필요한 경우, 기존 테이블을 삭제하고 다시 생성하세요:

```sql
DROP TABLE IF EXISTS user_words CASCADE;
DROP TABLE IF EXISTS user_vocabularies CASCADE;
DROP TABLE IF EXISTS shared_words CASCADE;
DROP TABLE IF EXISTS shared_vocabularies CASCADE;
```

### 인증 오류가 발생하는 경우

현재 임시 토큰(`mock-token`)을 사용하고 있습니다. 실제 사용을 위해서는:

1. Supabase Auth 설정 필요
2. `App.tsx`에서 `accessToken` 상태를 실제 토큰으로 교체

## 추가 단어장 추가하기

더 많은 공유 단어장을 추가하려면 Supabase Dashboard의 Table Editor에서 직접 추가하거나, 다음 SQL을 실행하세요:

```sql
-- 새 단어장 추가
INSERT INTO shared_vocabularies (title, description, category, difficulty_level, total_words)
VALUES ('내 단어장', '설명', '카테고리', 'intermediate', 100);

-- 단어 추가 (vocabulary_id는 위에서 생성된 단어장의 ID)
INSERT INTO shared_words (vocabulary_id, word, pronunciation, meaning, example_sentence, order_index)
VALUES 
  ('단어장-ID', 'hello', 'həˈloʊ', '안녕', 'Hello, how are you?', 1),
  ('단어장-ID', 'world', 'wɜːrld', '세계', 'Welcome to the world.', 2);
```
