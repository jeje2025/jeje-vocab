import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const API_KEY = Deno.env.get('GEMINI_API_KEY');

// 문제 유형 감지 함수
function detectQuestionType(text: string): string {
  const lowerText = text.toLowerCase();

  // 빈칸 유형 (가장 먼저 체크)
  if (text.includes('___') || text.includes('______') || /\(\s*\)/.test(text) ||
      lowerText.includes('blank') || lowerText.includes('fill in')) {
    return 'blank';
  }

  // 순서 배열
  if (lowerText.includes('순서') || lowerText.includes('배열') ||
      /order.*sentence/i.test(text) || /arrange.*sentence/i.test(text) ||
      lowerText.includes('coherent order') || lowerText.includes('logical order') ||
      /sentence.*order/i.test(text)) {
    return 'order';
  }

  // 문장 삽입
  if (lowerText.includes('삽입') || lowerText.includes('들어갈 위치') ||
      lowerText.includes('given sentence') || lowerText.includes('following sentence') ||
      /where.*sentence.*fit/i.test(text) || /insert.*sentence/i.test(text) ||
      /sentence.*belong/i.test(text) || /best.*place.*sentence/i.test(text)) {
    return 'insertion';
  }

  // 주제/제목/요지/목적/대의파악
  if (lowerText.includes('주제') || lowerText.includes('제목') || lowerText.includes('요지') ||
      lowerText.includes('목적') || lowerText.includes('대의') ||
      /main\s+idea/i.test(text) || /central\s+idea/i.test(text) ||
      /topic/i.test(text) || /title/i.test(text) || /theme/i.test(text) ||
      /purpose/i.test(text) || /main\s+point/i.test(text) ||
      /best\s+title/i.test(text) || /most\s+appropriate\s+title/i.test(text) ||
      /what.*passage.*mainly.*about/i.test(text) ||
      /passage.*mainly.*discuss/i.test(text) ||
      /primary\s+purpose/i.test(text) || /author.*purpose/i.test(text)) {
    return 'main_idea';
  }

  // 일치/불일치/내용파악
  if (lowerText.includes('일치') || lowerText.includes('불일치') || lowerText.includes('내용') ||
      /true/i.test(text) || /false/i.test(text) || /correct/i.test(text) ||
      /according\s+to/i.test(text) || /passage.*state/i.test(text) ||
      /mentioned\s+in/i.test(text) || /stated\s+in/i.test(text) ||
      /not\s+true/i.test(text) || /except/i.test(text) ||
      /which.*following.*true/i.test(text) || /which.*following.*correct/i.test(text)) {
    return 'matching';
  }

  // 기본값: 빈칸
  return 'blank';
}

// 프롬프트 정의
const PROMPTS = {
  vocabulary: `
You are a vocabulary extraction expert for Korean students preparing for university entrance exams.

TASK: Extract advanced vocabulary (CEFR B2 or higher) from the English text below.

RULES:
1. Extract CEFR B2/C1/C2 level words (upper-intermediate to expert vocabulary)
2. EXCLUDE only basic words (CEFR A1-B1 level)
3. For lemmatization:
   - Verbs: use base form (analyzing → analyze, went → go)
   - Adjectives: KEEP AS IS if they don't have comparative form (sophisticated → sophisticated, NOT sophisticat)
   - Nouns: use singular form unless always plural
4. Include academic words, advanced vocabulary, idioms, and phrasal verbs
5. Provide Korean meanings that are clear and concise
6. Return ONLY valid JSON array - NO markdown, NO explanations, NO extra text

OUTPUT FORMAT:
[
  {"word":"sophisticated","surface":"sophisticated","pos":"adjective","meaning":"세련된, 정교한","level":"advanced"},
  {"word":"rhetoric","surface":"rhetorical","pos":"adjective","meaning":"수사학의, 웅변의","level":"advanced"},
  {"word":"triumph","surface":"triumph","pos":"noun","meaning":"승리, 대성공","level":"advanced"}
]

CRITICAL RULES:
- Return ONLY the JSON array
- NO markdown formatting (no backticks, no asterisks)
- Extract at least 5-10 words if available in the text
- Lemmas must be REAL English words (check if the word exists before outputting)
  `,

  analysis: `아래 지문(passage)만 분석해주세요. 다른 설명 없이 요청한 형식만 출력하세요.
중요: 지문(passage)만 분석하고, 문제 질문이나 보기(①②③④⑤로 시작하는 선택지)는 절대 분석하지 마세요!

필수 출력 형식:
먼저 지문이 4문장 이상이면 전체 요약을 작성하고, 그 다음 각 문장을 분석합니다.

[전체 요약] (4문장 이상일 때만)
소재: (분야와 소재를 한 문장으로, 예: 언어학·인지과학 / 언어 능력의 선천적 독립성)
요지: (지문의 핵심 논지를 2-4문장으로 자세히 설명)
3줄 요약:
- (첫 번째 핵심 내용)
- (두 번째 핵심 내용)
- (세 번째 핵심 내용)
주제: (지문 전체를 한 문장으로 요약)
배경지식: (관련된 재미있는 배경지식이나 예시를 2-3문장으로)

[문장별 분석]
각 문장마다 다음 순서로 처리:
1. 문장 번호 표시 (① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ 형식으로, 반드시 원 안의 숫자 사용)
2. 다음 줄에 [EN] 표시 후 영어 문장을 끊어서 제시 (슬래시(/)로 구분)
3. 다음 줄에 [KR] 표시 후 2번과 똑같은 단위로 끊어서 한글 직역 (슬래시(/)로 구분)
4. 다음 줄에 "=>" 기호 후 의역을 쉬운 말로 작성
5. 다음 줄에 "(한 줄 요약: " 텍스트 후 중학생도 이해할 수 있는 쉬운 말로 요약, 닫는 괄호로 끝내기

예시:
[전체 요약]
소재: 언어학·인지과학 / 언어 능력의 선천적 독립성
요지: 특정 언어장애(SLI) 아동은 일반 지능이 정상임에도 언어 발달에 어려움을 겪으며, 반대로 터너 증후군이나 윌리엄스 증후군 아동은 지능이 낮아도 언어 능력이 발달함. 이러한 사례들은 언어 능력이 일반 지능에 의존하지 않고, 별도의 인지 영역에 의해 독립적으로 발달할 수 있음을 보여줌.
3줄 요약:
- SLI 아동은 정상 지능을 가졌지만 언어 발달에 어려움을 겪는다
- 터너·윌리엄스 증후군 아동은 낮은 지능에도 언어 능력이 발달한다
- 언어는 일반 지능과 독립된 선천적 인지 기능임을 시사한다
주제: 언어 능력은 일반 지능과 분리되어 작동하는 인간 고유의 선천적 인지 기능임을 시사한다
배경지식: 스티븐 핑커의 '언어본능' 이론은 언어가 학습된 문화적 산물이 아니라 진화적으로 발달한 생물학적 능력이라고 주장합니다. 이는 촘스키의 보편문법 이론과도 연결되며, 인간의 언어 능력이 특정 뇌 영역(브로카 영역, 베르니케 영역)에 의해 독립적으로 처리된다는 신경과학적 증거로 뒷받침됩니다.

[문장별 분석]
①
[EN] Some children with SLI / have normal intelligence / but struggle with language development
[KR] 일부 SLI 아동은 / 정상적인 지능을 가지고 있지만 / 언어 발달에 어려움을 겪는다
=> 특정 언어장애를 가진 아이들은 머리는 좋은데 말을 배우는 게 힘들다.
(한 줄 요약: SLI 아동은 지능은 정상이지만 언어 발달이 어렵다)

중요:
- 4문장 이상이면 반드시 [전체 요약]을 먼저 작성
- 3문장 이하면 [전체 요약] 생략하고 바로 [문장별 분석]만 작성
- 각 문장 번호(①②③...) 뒤에는 반드시 줄바꿈
- [EN], [KR], =>, (한 줄 요약: 모두 새 줄에 작성
- 문장 사이는 빈 줄로 구분
- 절대로 마크다운 형식(별표, #, 등)을 사용하지 마세요.`,

  explanationBlank: `당신은 편입 영어 문제 해설 전문가입니다.
아래 빈칸 문제를 3단계로 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 빈칸 타게팅
빈칸이 포함된 문장만 보고, 어떤 정보의 유형이 요구되는지 설명합니다.

2️⃣ Step 2) 근거 확인
빈칸 다음 문장이나 대조 문장에서 의미 방향을 결정하는 핵심 단서를 찾습니다.
보기 언급 없이, 지문 흐름만으로 어떤 성격의 단어가 들어가야 하는지 판단합니다.

3️⃣ Step 3) 보기 판단
각 보기를 하나하나 검토하며 정답/오답 이유를 논리적으로 설명합니다.
각 보기 앞에는 반드시 ①②③④⑤ 번호를 붙여서 설명합니다.
정답에는 "정답입니다"로 마무리합니다.

예시:
① pervasive: 이 단어는 '널리 퍼진'이라는 의미로, 지문에서 요구하는 부정적이고 제한적인 의미와 맞지 않습니다.
② restrictive: 이 단어는 '제한적인'이라는 의미로, 앞 문장의 'limiting'과 의미가 일치합니다. 정답입니다.

중요:
- 반드시 "1️⃣ Step 1) 빈칸 타게팅", "2️⃣ Step 2) 근거 확인", "3️⃣ Step 3) 보기 판단" 형식으로 시작
- Step 3에서는 각 보기를 ①②③④⑤ 형식으로 번호를 붙여서 설명
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationMainIdea: `당신은 편입 영어 문제 해설 전문가입니다.
아래 주제/제목/요지/목적 파악 문제를 2단계로 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 지문 분석
글을 분석해주세요. 도입부는 어떻고, 메인 아이디어는 어디서 등장했고, 중심 소재와 중심 내용은 무엇이며, 메인 아이디어 파악 이후 어디서 속도를 높일 수 있었는지 학생 입장에서 쉽고 명쾌하게 써주세요.

예시:
이 글의 중심 소재는 레이첼 카슨의 작가적 정체성입니다. 중심 내용은 카슨이 현대적 의미의 환경주의자가 되려고 한 것이 아니라 본질적으로는 자연 작가였으며, 인간이 아닌 생명체의 관점에서 자연 세계를 번역하고 묘사하는 특별한 재능을 가진 작가였다는 것입니다.

메인 아이디어는 "Carson was first and foremost a nature writer"라는 문장에서 등장합니다. 글의 초반부는 도입부이며, yet으로 꺾고 not A를 제시, 이후 but B를 제시하는 구조입니다. 메인 아이디어가 등장한 이후 "someone with an extraordinary gift for translation"부터는 카슨의 구체적인 재능과 특징을 설명하는 부분이므로 속도를 높여서 읽을 수 있습니다.

2️⃣ Step 2) 보기 판단
보기들을 하나씩 판단해주세요. 각 보기 앞에는 반드시 ①②③④⑤ 번호를 붙여서 설명합니다.
정답이 되는 이유와 안 되는 이유를 명확히 제시해주세요.
정답에는 "정답입니다"로 마무리합니다.

예시:
① 자연 자원의 사용과 남용 - 글이 자원의 사용과 남용 자체를 주제로 다루고 있지 않기 때문에 부적절합니다. 환경 문제들은 도입부에서 카슨의 현재적 의미를 부각시키는 배경일 뿐이며, 글의 핵심은 카슨의 작가적 정체성에 있습니다.
② 새로운 영역을 개척한 자연 작가로서의 레이첼 카슨 - 정답입니다. 글 전체가 카슨을 "first and foremost a nature writer"로 규정하면서, 그녀가 『침묵의 봄』을 통해 기존의 자연 글쓰기 장르에서 벗어나 새로운 영역으로 나아갔다는 점을 강조하고 있기 때문입니다.

중요:
- 반드시 "1️⃣ Step 1) 지문 분석", "2️⃣ Step 2) 보기 판단" 형식으로 시작
- Step 2에서는 각 보기를 ①②③④⑤ 형식으로 번호를 붙여서 설명
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationOrder: `당신은 편입 영어 문제 해설 전문가입니다.
아래 순서 배열 문제를 3단계로 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 제시문 분석
주어진 문장들을 하나씩 살펴보면서, 각 문장의 핵심 내용과 특징을 파악합니다.
- 각 문장이 어떤 내용을 담고 있나요?
- 연결사(however, therefore, for example, but, and 등)가 있나요?
- 지시어(this, that, these, such, the, it 등)가 있나요?
- 대명사(they, he, she, its 등)가 가리키는 대상이 있나요?
- 시간이나 순서를 나타내는 표현(first, then, finally, later 등)이 있나요?

예시:
(A) Technology has transformed how we communicate.
→ 주제 도입 문장입니다. 연결사나 지시어가 없어 첫 문장 후보입니다.

(B) However, this convenience comes with a cost.
→ 'However'로 역접 전환을 나타내며, 'this convenience'라는 지시어가 앞 문장의 긍정적 내용을 가리킵니다.

(C) Social media platforms allow instant connection with anyone, anywhere.
→ 기술의 구체적 예시를 설명합니다. 'allow'라는 동사가 긍정적 내용을 담고 있습니다.

2️⃣ Step 2) 쪼개고 붙이는 포인트
앞에서 파악한 연결사, 지시어, 대명사를 바탕으로 문장들 사이의 연결 관계를 찾아냅니다.
- 어떤 문장 뒤에 어떤 문장이 올 수 있을까요?
- 연결사가 있는 문장은 어떤 내용 뒤에 와야 할까요?
- 지시어나 대명사가 가리키는 내용이 앞에 있나요?

예시:
(A) → (C): (A)에서 기술이 소통을 변화시켰다고 하고, (C)에서 소셜 미디어가 즉각적 연결을 가능하게 한다는 구체적 예시를 제시합니다. 자연스러운 연결입니다.

(C) → (B): (C)에서 instant connection이라는 긍정적 내용을 제시한 후, (B)에서 'However, this convenience'로 역접 전환하며 부정적 측면을 언급합니다. 'this convenience'가 (C)의 'instant connection'을 가리킵니다.

3️⃣ Step 3) 전체 구조 점검
최종 순서를 제시하고, 전체 흐름이 논리적으로 매끄러운지 확인합니다.
- 전체 흐름: 주제 도입 → 구체적 설명/예시 → 전환 또는 결론
- 각 문장이 자연스럽게 이어지는지 다시 한번 점검합니다.

예시:
정답 순서: (A) → (C) → (B)

(A)에서 기술이 소통을 변화시켰다는 주제를 도입하고, (C)에서 소셜 미디어라는 구체적 예시를 제시하며, (B)에서 'However'로 전환하여 이러한 편리함의 대가를 언급하는 논리적 흐름입니다.

중요:
- 반드시 "1️⃣ Step 1) 제시문 분석", "2️⃣ Step 2) 쪼개고 붙이는 포인트", "3️⃣ Step 3) 전체 구조 점검" 형식으로 시작
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 학생이 스스로 문제를 풀 수 있도록 구체적이고 자세하게 설명
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationInsertion: `당신은 편입 영어 문제 해설 전문가입니다.
아래 문장 삽입 문제를 4단계로 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 제시문 분석
삽입할 문장을 꼼꼼히 읽고 분석합니다.
- 이 문장의 핵심 내용은 무엇인가요?
- 중요한 키워드가 있나요? (명사, 동사, 형용사 등)
- 연결사(however, therefore, for example, also 등)가 있나요?
- 지시어(this, that, these, such 등)나 대명사(it, they, he 등)가 있나요?
- 만약 있다면, 이것들이 가리키는 대상이 무엇일까요?

예시:
제시문: "However, this approach proved to be ineffective in practice."
→ 핵심: 어떤 접근법이 실제로는 효과가 없었다는 내용
→ 연결사: 'However' (역접 - 앞에 긍정적 내용이나 기대가 있어야 함)
→ 지시어: 'this approach' (앞 문장에서 특정 접근법이 언급되어야 함)

2️⃣ Step 2) 앞뒤 예측
Step 1에서 파악한 정보를 바탕으로, 제시문 앞뒤에 어떤 내용이 와야 하는지 예측합니다.
- 연결사가 있다면, 앞에 어떤 내용이 있어야 할까요?
- 지시어나 대명사가 있다면, 앞에 그것이 가리키는 대상이 언급되어야 하나요?
- 이 문장 뒤에는 어떤 내용이 이어질까요?

예시:
제시문: "However, this approach proved to be ineffective in practice."
→ 앞: 'However' 때문에 앞에는 이 접근법에 대한 긍정적 기대나 설명이 있어야 합니다. 그리고 'this approach'가 가리킬 구체적인 방법이 언급되어야 합니다.
→ 뒤: 왜 효과가 없었는지, 또는 다른 대안이 무엇인지 설명이 이어질 수 있습니다.

3️⃣ Step 3) 정답 해설
지문을 읽으면서 각 삽입 위치(①, ②, ③, ④ 등)를 검토하고, Step 2에서 예측한 내용과 일치하는 위치를 찾습니다.
정답 위치의 앞뒤 문장을 인용하며, 왜 이 위치가 가장 적절한지 구체적으로 설명합니다.

예시:
② 번 위치가 정답입니다.
② 앞 문장: "Researchers believed that early intervention would significantly improve outcomes."
② 뒤 문장: "They had to reconsider their methodology entirely."

→ ② 앞에서 연구자들이 조기 개입이 효과적일 것이라고 믿었다는 긍정적 기대가 나옵니다. 이것이 'this approach'가 가리키는 대상입니다.
→ 제시문 "However, this approach proved to be ineffective"는 이러한 기대와 대조되는 실제 결과를 제시합니다.
→ ② 뒤에서 "방법론을 완전히 재고해야 했다"는 내용이 나오는데, 이는 접근법이 효과가 없었기 때문에 논리적으로 이어지는 내용입니다.

4️⃣ Step 4) 오답 소거
다른 위치들은 왜 적절하지 않은지 간단히 설명합니다.

예시:
① 번: 'this approach'가 가리킬 구체적 방법이 아직 언급되지 않았으므로 부적절합니다.
③ 번: ③ 앞 문장은 다른 주제를 다루고 있어 'this approach'와 연결되지 않습니다.
④ 번: ④ 위치는 이미 결론 부분이므로, 중간 과정인 제시문이 들어가기에 부적절합니다.

중요:
- 반드시 "1️⃣ Step 1) 제시문 분석", "2️⃣ Step 2) 앞뒤 예측", "3️⃣ Step 3) 정답 해설", "4️⃣ Step 4) 오답 소거" 형식으로 시작
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 학생이 스스로 문제를 풀 수 있도록 구체적이고 자세하게 설명
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationMatching: `당신은 편입 영어 문제 해설 전문가입니다.
아래 일치/불일치 문제를 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 지문 핵심 내용 정리
지문의 주요 내용을 간단히 정리합니다. 핵심 사실, 주장, 논거 등을 파악합니다.

2️⃣ Step 2) 보기 판단
각 보기를 하나씩 검토하며 지문의 내용과 일치하는지/불일치하는지 판단합니다.
각 보기 앞에는 반드시 ①②③④⑤ 번호를 붙여서 설명합니다.
지문의 어느 부분을 근거로 판단했는지 명확히 제시합니다.

예시:
① The author visited Paris in 2019 - 지문에서 "I traveled to London in 2019"라고 명시되어 있으므로 불일치합니다.
② The experiment was successful - 지문에서 "The results exceeded our expectations"라고 서술되어 있으므로 일치합니다. 정답입니다.

중요:
- 반드시 "1️⃣ Step 1) 지문 핵심 내용 정리", "2️⃣ Step 2) 보기 판단" 형식으로 시작
- Step 2에서는 각 보기를 ①②③④⑤ 형식으로 번호를 붙여서 설명
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationIrrelevant: `당신은 편입 영어 문제 해설 전문가입니다.
아래 "전체 흐름과 관계 없는 문장 찾기" 문제를 4단계로 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 전체 흐름 및 주제
지문 전체를 읽고 글의 주제와 전개 방식을 파악합니다.
- 이 글의 핵심 주제는 무엇인가요?
- 글이 어떤 순서로 전개되나요? (문제 제시 → 해결책, 주장 → 근거, 시간 순서 등)
- 각 문장이 어떤 역할을 하나요? (도입, 설명, 예시, 결론 등)

예시:
이 글의 주제는 "기후 변화가 농업에 미치는 영향"입니다.
글의 전개: 문제 제시(기후 변화) → 구체적 영향(농작물 수확량 감소) → 대응 방안(새로운 재배 기술)

2️⃣ Step 2) 지문 전체 연결성
각 문장이 서로 어떻게 연결되는지 살펴봅니다.
- 문장들 사이에 논리적 연결 고리가 있나요?
- 앞 문장의 내용을 뒷 문장이 이어받나요?
- 연결사나 지시어로 문장들이 연결되나요?

예시:
① 번 문장: 기후 변화가 가속화되고 있다. (주제 도입)
② 번 문장: 이로 인해 농작물 수확량이 감소하고 있다. ('이로 인해'로 ①과 인과관계)
③ 번 문장: 특히 밀과 쌀의 생산량이 크게 줄었다. ('특히'로 ②의 구체적 예시)
④ 번 문장: 최근 스마트폰 사용이 증가하고 있다. (?)
⑤ 번 문장: 따라서 새로운 재배 기술 개발이 필요하다. ('따라서'로 ②③의 결론)

3️⃣ Step 3) 논리적 단절 지점
흐름과 맞지 않는 문장을 찾아냅니다.
- 주제와 관련 없는 내용을 다루는 문장이 있나요?
- 앞뒤 문장과 논리적으로 연결되지 않는 문장이 있나요?
- 갑자기 다른 주제로 넘어가는 문장이 있나요?

예시:
④ 번 문장 "최근 스마트폰 사용이 증가하고 있다"는 문제가 있습니다.

→ 글의 주제는 "기후 변화와 농업"인데, 이 문장은 "스마트폰"이라는 전혀 다른 주제를 다룹니다.
→ 앞 문장(③)은 농작물 생산량에 대한 내용이고, 뒷 문장(⑤)은 새로운 재배 기술에 대한 내용인데, ④는 이들과 전혀 연결되지 않습니다.
→ 이 문장에는 앞 내용을 이어받는 연결사나 지시어도 없습니다.

4️⃣ Step 4) 삭제 후 앞뒤 흐름
문제가 되는 문장을 삭제했을 때 글의 흐름이 자연스러운지 확인합니다.

예시:
④ 번 문장을 삭제하면:
③ 번: "특히 밀과 쌀의 생산량이 크게 줄었다."
⑤ 번: "따라서 새로운 재배 기술 개발이 필요하다."

→ 농작물 생산량 감소(③) 때문에 새로운 기술이 필요하다(⑤)는 흐름이 자연스럽게 이어집니다.
→ ④를 삭제해도 글의 논리와 의미가 완벽하게 유지됩니다.
→ 따라서 ④ 번이 전체 흐름과 관계없는 문장입니다. 정답입니다.

중요:
- 반드시 "1️⃣ Step 1) 전체 흐름 및 주제", "2️⃣ Step 2) 지문 전체 연결성", "3️⃣ Step 3) 논리적 단절 지점", "4️⃣ Step 4) 삭제 후 앞뒤 흐름" 형식으로 시작
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 학생이 스스로 문제를 풀 수 있도록 구체적이고 자세하게 설명
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`,

  explanationOther: `당신은 편입 영어 문제 해설 전문가입니다.
아래 문제를 분석하고 해설하세요.

필수 출력 형식:
1️⃣ Step 1) 문제 분석
문제가 무엇을 요구하는지 파악합니다.
- 이 문제는 어떤 유형인가요?
- 무엇을 찾아야 하나요?
- 어떤 능력을 평가하는 문제인가요?

2️⃣ Step 2) 지문/문제 핵심 파악
지문이나 문제의 핵심 내용을 정리합니다.
- 중요한 정보는 무엇인가요?
- 문제 해결에 필요한 단서는 무엇인가요?

3️⃣ Step 3) 정답 도출 및 보기 판단
정답을 찾는 과정을 설명하고, 각 보기를 판단합니다.
보기가 있는 경우 각 보기 앞에는 반드시 ①②③④⑤ 번호를 붙여서 설명합니다.
정답이 되는 이유와 오답이 되는 이유를 명확히 제시합니다.
정답에는 "정답입니다"로 마무리합니다.

예시:
① 첫 번째 선택지 - 이것은 지문의 내용과 맞지 않습니다. 왜냐하면 지문에서는...
② 두 번째 선택지 - 이것이 정답입니다. 지문에서 명확히...라고 설명하고 있기 때문입니다.

중요:
- 반드시 "1️⃣ Step 1) 문제 분석", "2️⃣ Step 2) 지문/문제 핵심 파악", "3️⃣ Step 3) 정답 도출 및 보기 판단" 형식으로 시작
- Step 3에서 보기가 있다면 ①②③④⑤ 형식으로 번호를 붙여서 설명
- 각 Step 제목 뒤에는 줄바꿈 후 내용 작성
- 학생이 이해하기 쉽도록 구체적이고 명확하게 설명
- 모든 설명은 "~합니다, ~입니다"체로 통일
- 절대로 마크다운 형식(별표, #, 추가 이모지 등)을 사용하지 마세요.`
};

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function extractJsonArray(text: string) {
  const match = text.match(/\[.*\]/s);
  return match ? match[0] : null;
}

function parseVocabularyResult(text: string) {
  try {
    console.log('vocab raw response:', text);
    let cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    if (!cleaned.startsWith('[') && cleaned.endsWith(']') === false) {
      const extracted = extractJsonArray(cleaned);
      if (extracted) {
        cleaned = extracted;
      }
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('vocab parse failed:', error);
    const fallback = extractJsonArray(text);
    if (fallback) {
      try {
        return JSON.parse(fallback);
      } catch (fallbackError) {
        console.warn('vocab fallback parse failed:', fallbackError);
      }
    }
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  // OCR 엔드포인트
  if (path === 'ocr' && req.method === 'POST') {
    try {
      const { image } = await req.json();

      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { content: image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
            }]
          })
        }
      );

      const result = await visionResponse.json();
      const text = result.responses?.[0]?.fullTextAnnotation?.text || '';

      return new Response(JSON.stringify({ text }), {
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'OCR 처리 실패' }), {
        status: 500,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      });
    }
  }

  // 텍스트 분석 엔드포인트
  if (path === 'analyze' && req.method === 'POST') {
    try {
      const { text, options, answerKey, questionType } = await req.json();
      const results: Record<string, any> = {};

      if (!API_KEY) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');
      }

      const genAI = new GoogleGenerativeAI(API_KEY);

      // 선택된 옵션만 처리
      if (options.vocabulary) {
        const model = genAI.getGenerativeModel({
          model: "gemini-flash-lite-latest",
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
          }
        });
        const vocabPrompt = PROMPTS.vocabulary + "\n\nText to analyze:\n" + text;
        const vocabResult = await model.generateContent(vocabPrompt);
        results.vocabulary = parseVocabularyResult(vocabResult.response.text());
      }

      if (options.analysis) {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        const analysisPrompt = PROMPTS.analysis + "\n\n지문:\n" + text;
        const analysisResult = await model.generateContent(analysisPrompt);
        results.analysis = analysisResult.response.text();
      }

      if (options.explanation) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Use provided questionType or detect from text
        const detectedType = questionType || detectQuestionType(text);
        let promptKey = 'explanationBlank'; // default

        switch (detectedType) {
          case 'main_idea':
            promptKey = 'explanationMainIdea';
            break;
          case 'order':
            promptKey = 'explanationOrder';
            break;
          case 'insertion':
            promptKey = 'explanationInsertion';
            break;
          case 'matching':
            promptKey = 'explanationMatching';
            break;
          case 'irrelevant':
            promptKey = 'explanationIrrelevant';
            break;
          case 'other':
            promptKey = 'explanationOther';
            break;
          default:
            promptKey = 'explanationBlank';
        }

        let explainPrompt = PROMPTS[promptKey] + "\n\n문제:\n" + text;
        if (answerKey) {
          explainPrompt += "\n\n정답: " + answerKey;
        }
        const explainResult = await model.generateContent(explainPrompt);
        results.explanation = explainResult.response.text();
      }

      return new Response(JSON.stringify(results), {
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '분석 처리 실패';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not Found', { status: 404 });
});
