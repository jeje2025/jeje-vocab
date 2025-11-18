import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const API_KEY = Deno.env.get('GEMINI_API_KEY');

// 프롬프트 정의
const PROMPTS = {
  vocabulary: `
다음 영어 텍스트에서 편입/수능 수준의 중요 어휘만 추출하세요.
CEFR C1/C2 레벨, 학술 영어 핵심 단어
각 단어: 품사, 한국어 뜻, 난이도(상/중/하)
10-20개 추출
JSON 형식: [{"word":"단어", "pos":"품사", "meaning":"뜻", "level":"난이도"}]
  `,

  analysis: `아래 지문(passage)만 분석해주세요. **다른 설명 없이 요청한 형식만 출력하세요.**
**중요: 지문(passage)만 분석하고, 문제 질문이나 보기(①②③④⑤로 시작하는 선택지)는 절대 분석하지 마세요!**

**필수 출력 형식:**
각 문장마다 다음 순서로 처리:
1. 문장 번호 표시 (① ② ③ 형식)
2. 영어 문장을 끊어서 제시 (슬래시(/)로 구분)
3. 끊은 그대로 직역 (슬래시(/)로 구분)
4. 의역 ("=> " 다음에 쉬운 말로 작성)
5. 요약 ("(한 줄 요약: " 다음에 중학생도 이해할 수 있는 쉬운 말로, 괄호로 감싸기)

위 형식대로만 출력하세요.`,

  explanation: `당신은 편입 영어 문제 해설 전문가입니다.
아래 지문과 문제를 3단계로 해설하세요:

1️⃣ Step 1) 빈칸 타게팅
빈칸이 포함된 문장만 보고, 어떤 정보의 유형이 요구되는지 설명

2️⃣ Step 2) 근거 확인
빈칸 다음 문장이나 대조 문장에서 의미 방향을 결정하는 핵심 단서 찾기
보기 언급 없이, 지문 흐름만으로 어떤 성격의 단어가 들어가야 하는지 판단

3️⃣ Step 3) 보기 판단
각 보기를 하나하나 검토하며 정답/오답 이유를 논리적으로 설명
정답에는 "정답입니다"로 마무리

모든 설명은 "~합니다, ~입니다"체로 통일`
};

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function parseVocabularyResult(text: string) {
  try {
    // JSON 파싱 시도
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // 파싱 실패시 빈 배열
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
      const { text, options, answerKey } = await req.json();
      const results: Record<string, any> = {};

      if (!API_KEY) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');
      }

      const genAI = new GoogleGenerativeAI(API_KEY);

      // 선택된 옵션만 처리
      if (options.vocabulary) {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        const vocabPrompt = PROMPTS.vocabulary + "\n\n텍스트:\n" + text;
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        let explainPrompt = PROMPTS.explanation + "\n\n문제:\n" + text;
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
