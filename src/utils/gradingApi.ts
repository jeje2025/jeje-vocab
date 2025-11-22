import { projectId, publicAnonKey } from './supabase/info';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

interface GradeFillInResponse {
  isCorrect: boolean;
  feedback: string;
}

// Calculate similarity between two Korean strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '');
  const a = normalize(str1);
  const b = normalize(str2);

  if (a === b) return 1.0;

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) {
    const longer = Math.max(a.length, b.length);
    const shorter = Math.min(a.length, b.length);
    return shorter / longer;
  }

  // Calculate Levenshtein distance-based similarity
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - (distance / maxLen);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export async function gradeFillInAnswer(
  englishWord: string,
  correctAnswer: string,
  userAnswer: string
): Promise<GradeFillInResponse> {
  // Stage 1: Exact match (instant)
  if (userAnswer.trim() === correctAnswer.trim()) {
    return {
      isCorrect: true,
      feedback: '완벽해요! 정확한 답변입니다.',
    };
  }

  // Parse multiple correct answers (separated by comma or semicolon)
  const correctAnswers = correctAnswer
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Stage 2: Check against all possible correct answers
  let maxSimilarity = 0;
  for (const answer of correctAnswers) {
    const similarity = calculateSimilarity(userAnswer, answer);
    maxSimilarity = Math.max(maxSimilarity, similarity);

    // Exact match with one of the alternatives
    if (userAnswer.trim() === answer.trim()) {
      return {
        isCorrect: true,
        feedback: '완벽해요! 정확한 답변입니다.',
      };
    }

    // High similarity with one of the alternatives (90%+)
    if (similarity >= 0.9) {
      return {
        isCorrect: true,
        feedback: '정답이에요! 약간의 표현 차이만 있네요.',
      };
    }
  }

  // Use maxSimilarity for the rest of the logic
  const similarity = maxSimilarity;

  // Stage 3: AI grading for all other cases (not exact/high similarity)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/server/grade-fill-in-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        englishWord,
        correctAnswer,
        userAnswer,
      }),
    });

    if (!response.ok) {
      console.error('Grading API error:', await response.text());
      // Fallback: use similarity threshold
      return {
        isCorrect: similarity >= 0.6,
        feedback: similarity >= 0.6
          ? '유사한 답변이에요. 정답으로 인정합니다.'
          : '아쉽지만 정답과 조금 다릅니다.',
      };
    }

    const data = await response.json();
    return {
      isCorrect: data.isCorrect || false,
      feedback: data.feedback || '채점이 완료되었습니다.',
    };
  } catch (error) {
    console.error('Grading error:', error);
    // Fallback: use similarity threshold
    return {
      isCorrect: similarity >= 0.6,
      feedback: similarity >= 0.6
        ? '유사한 답변이에요. 정답으로 인정합니다.'
        : '채점 중 오류가 발생했지만, 답변이 정답과 다른 것 같습니다.',
    };
  }
}
