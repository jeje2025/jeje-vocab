# Supabase 데이터베이스 설정 가이드

JEJEVOCA 앱의 공유 단어장 기능을 사용하려면 Supabase 데이터베이스 테이블을 생성해야 합니다.

## 설정 방법

1. **Supabase Dashboard에 접속**
   - https://supabase.com/dashboard 로 이동
   - 연결된 프로젝트를 선택

2. **SQL Editor 열기**
   - 왼쪽 사이드바에서 "SQL Editor" 클릭
   - "New Query" 버튼 클릭

3. **SQL 마이그레이션 실행**
   - `/supabase/migrations/create_vocabulary_tables.sql` 파일의 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼을 눌러 실행

4. **완료!**
   - 다음 테이블들이 생성됩니다:
     - `shared_vocabularies` - 공유 단어장 목록
     - `shared_words` - 공유 단어장의 단어들
     - `user_vocabularies` - 사용자 단어장
     - `user_words` - 사용자가 학습 중인 단어들
   - 샘플 데이터도 함께 추가됩니다 (토익, SAT, 일반 영어 단어장)

## 테이블 구조

### shared_vocabularies
공유 단어장 메타데이터
- `id` - UUID
- `name` - 단어장 이름
- `description` - 설명
- `total_words` - 총 단어 수
- `category` - 카테고리 (TOEIC, SAT, General English 등)
- `difficulty_level` - 난이도

### shared_words
공유 단어장의 개별 단어
- `id` - UUID
- `vocabulary_id` - 단어장 ID
- `word` - 단어
- `pronunciation` - 발음 기호
- `meaning` - 의미
- `example_sentence` - 예문
- `order_index` - 순서

### user_vocabularies
사용자가 다운로드한 단어장
- `id` - UUID
- `user_id` - 사용자 ID
- `name` - 단어장 이름
- `words_per_unit` - 유닛당 단어 수
- `total_words` - 총 단어 수
- `shared_vocabulary_id` - 원본 단어장 ID

### user_words
사용자의 개별 단어 학습 진행 상황
- `id` - UUID
- `user_id` - 사용자 ID
- `vocabulary_id` - 단어장 ID
- `word` - 단어
- `pronunciation` - 발음 기호
- `meaning` - 의미
- `example_sentence` - 예문
- `unit` - 유닛 번호
- `status` - 상태 (learning, mastered, graveyard)
- `confidence` - 자신감 레벨 (0-100)
- `review_count` - 복습 횟수

## 보안 정책 (RLS)

모든 테이블에 Row Level Security가 적용되어 있습니다:
- **공유 단어장**: 누구나 읽기 가능
- **사용자 단어장**: 자신의 데이터만 읽기/쓰기 가능

## 샘플 데이터

다음 샘플 단어장이 자동으로 추가됩니다:
1. **토익 고득점 필수 단어 1200** (20개 샘플 단어 포함)
2. **SAT 기본 어휘 800**
3. **일상 영어 회화 500**

## 추가 단어장 등록하기

더 많은 단어장을 추가하려면 Supabase Dashboard의 Table Editor에서:
1. `shared_vocabularies` 테이블에 새 행 추가
2. `shared_words` 테이블에 해당 단어장의 단어들 추가

또는 SQL Editor에서 INSERT 문을 사용하세요.

## 문제 해결

**에러: relation "shared_vocabularies" does not exist**
- SQL 마이그레이션이 실행되지 않았습니다. 위의 3단계를 다시 수행하세요.

**에러: permission denied**
- RLS 정책이 올바르게 설정되지 않았습니다. SQL을 다시 실행하세요.

**데이터가 보이지 않음**
- 브라우저 콘솔에서 네트워크 에러를 확인하세요.
- Supabase 프로젝트의 API 키가 올바른지 확인하세요.
