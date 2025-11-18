# CategoryManager Module

관리자 대시보드에서 카테고리별 단어장을 관리할 수 있는 독립적인 모듈입니다.

## 주요 기능

### 1. 체크박스로 여러 단어장 선택 및 병합
- 카테고리를 확장하면 해당 카테고리의 모든 단어장이 표시됩니다
- 체크박스로 여러 단어장을 선택할 수 있습니다
- 2개 이상 선택 시 "병합하기" 버튼이 나타납니다
- 병합 다이얼로그에서:
  - 기준이 될 단어장을 라디오 버튼으로 선택
  - 새로운 단어장 이름 지정 (선택사항)
  - 병합 실행 시 선택된 단어장들이 하나로 합쳐지고, 원본은 삭제됩니다

### 2. 드래그 앤 드롭으로 카테고리 간 이동
- 단어장 항목의 드래그 핸들(≡ 아이콘)을 잡고 드래그
- 다른 카테고리로 드롭하면 해당 카테고리로 이동
- 실시간으로 서버에 반영됩니다

### 3. 개별 단어장 편집/삭제
- 각 단어장의 편집 버튼으로 내용 수정 가능
- 삭제 버튼으로 즉시 삭제 가능
- 모든 작업은 확인 후 실행됩니다

## 파일 구조

```
CategoryManager/
├── index.ts                 # Export 모듈
├── types.ts                 # TypeScript 타입 정의
├── api.ts                   # API 호출 유틸리티
├── CategoryManager.tsx      # 메인 컴포넌트
├── VocabularyItem.tsx       # 개별 단어장 아이템 컴포넌트
├── MergeDialog.tsx          # 병합 다이얼로그 컴포넌트
└── README.md               # 이 문서
```

## 사용 방법

### AdminDashboard에서 사용

```tsx
import { CategoryManager } from './admin/CategoryManager';
import { useAuth } from '../hooks/useAuth';

function AdminDashboard() {
  const { getAuthToken } = useAuth();

  return (
    <CategoryManager
      getAuthToken={getAuthToken}
      onUpdate={() => {
        // 선택사항: 업데이트 후 콜백
        console.log('Categories updated!');
      }}
    />
  );
}
```

### Props

```typescript
interface CategoryManagerProps {
  getAuthToken: () => string | null;  // 인증 토큰 가져오는 함수
  onUpdate?: () => void;               // 업데이트 후 콜백 (선택사항)
}
```

## 의존성

### NPM 패키지
- `@dnd-kit/core` - 드래그 앤 드롭 핵심 기능
- `@dnd-kit/sortable` - 정렬 가능한 리스트
- `@dnd-kit/utilities` - CSS 변환 유틸리티
- `motion/react` - 애니메이션
- `lucide-react` - 아이콘
- `sonner` - 토스트 알림

### 내부 의존성
- `../../../utils/supabase/info` - Supabase 프로젝트 정보
- `../hooks/useAuth` - 인증 훅

## API 엔드포인트

### GET `/admin/categories`
카테고리 목록 조회

### GET `/admin/shared-vocabularies`
공유 단어장 목록 조회 (카테고리별 필터링 가능)

### PUT `/admin/shared-vocabularies/:id`
단어장 정보 업데이트 (카테고리 변경 포함)

**Request Body:**
```json
{
  "title": "새 제목",
  "category": "새 카테고리",
  "description": "설명"
}
```

### DELETE `/admin/shared-vocabularies/:id`
단어장 삭제

### POST `/admin/shared-vocabularies/merge`
여러 단어장 병합

**Request Body:**
```json
{
  "targetVocabId": "기준 단어장 ID",
  "sourceVocabIds": ["병합할 단어장 ID 1", "병합할 단어장 ID 2"],
  "newTitle": "병합된 단어장 제목 (선택사항)"
}
```

**Response:**
```json
{
  "success": true,
  "mergedVocabId": "결과 단어장 ID",
  "totalWords": 150
}
```

## 스타일링

- Tailwind CSS 사용
- 커스텀 컬러: `#491B6D` (메인 퍼플), `#8B5CF6` (라이트 퍼플)
- 모든 인터랙션은 `motion/react`로 부드러운 애니메이션 적용
- 반응형 디자인 적용

## 보안

- 모든 API 호출은 `Authorization: Bearer {token}` 헤더 필요
- 관리자 권한이 필요한 엔드포인트입니다
- 서버 측에서 권한 검증 수행

## 주의사항

1. **병합은 되돌릴 수 없습니다** - 병합 시 원본 단어장들이 삭제됩니다
2. **드래그 앤 드롭은 터치 기기에서 제한적** - 마우스/트랙패드 사용 권장
3. **대량의 단어장 처리 시** - 성능을 위해 페이지네이션 고려 필요
4. **네트워크 오류** - 모든 오류는 toast로 사용자에게 표시됩니다

## 향후 개선 사항

- [ ] 페이지네이션 추가 (단어장이 많을 경우)
- [ ] 병합 시 중복 단어 자동 제거 옵션
- [ ] 단어장 미리보기 기능
- [ ] 벌크 작업 (여러 단어장 일괄 삭제/이동)
- [ ] 실행 취소/다시 실행 기능
- [ ] 드래그 앤 드롭 터치 지원 개선
