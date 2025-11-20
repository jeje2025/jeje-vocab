import { projectId } from './supabase/info';

const BATCH_SIZE = 20; // Process 20 words at a time
const MAX_CONCURRENT_BATCHES = 3; // Process up to 3 batches in parallel

export interface WordToGenerate {
  word: string;
}

export interface BatchProgress {
  current: number;
  total: number;
}

export interface GenerateOptions {
  onProgress?: (progress: BatchProgress) => void;
  onBatchUpdate?: (message: string) => void;
}

/**
 * Clean and normalize word by removing markdown and special characters
 */
function cleanWord(word: string): string {
  return word
    .trim()
    // Remove markdown bold/italic
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    // Remove other common markdown
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`/g, '') // code
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate complete vocabulary data for words using Gemini API
 * Processes words in batches with parallel processing and retry logic
 */
export async function generateVocabularyBatch(
  words: WordToGenerate[],
  authToken: string,
  options?: GenerateOptions
): Promise<any[]> {
  // Clean all words before processing
  const cleanedWords = words.map(w => ({ word: cleanWord(w.word) }));

  const batches: WordToGenerate[][] = [];
  for (let i = 0; i < cleanedWords.length; i += BATCH_SIZE) {
    batches.push(cleanedWords.slice(i, i + BATCH_SIZE));
  }

  const allResults: { index: number; items: any[] }[] = [];
  let completedCount = 0;

  // Report initial progress
  if (options?.onProgress) {
    options.onProgress({ current: 0, total: batches.length });
  }

  // Helper function to fetch single batch with retry
  const fetchBatchWithRetry = async (
    batch: WordToGenerate[],
    batchIndex: number,
    maxRetries = 3
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const generateResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/generate-vocabulary-batch`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              words: batch,
            }),
          }
        );

        const generateData = await generateResponse.json();
        if (!generateResponse.ok) {
          throw new Error(
            generateData?.error || `배치 ${batchIndex + 1} 생성 실패`
          );
        }

        const generatedItems = Array.isArray(generateData.results)
          ? generateData.results
          : Array.isArray(generateData.data)
            ? generateData.data
            : [];

        if (generateData.success === false || generatedItems.length === 0) {
          throw new Error(
            generateData?.error || `배치 ${batchIndex + 1} AI 응답 오류`
          );
        }

        return {
          index: batchIndex,
          items: generatedItems,
        };
      } catch (error) {
        console.error(
          `❌ 배치 ${batchIndex + 1} 시도 ${attempt}/${maxRetries} 실패:`,
          error
        );

        if (attempt < maxRetries) {
          // Wait 2 seconds before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          throw error; // All retries exhausted
        }
      }
    }
    throw new Error(`배치 ${batchIndex + 1} 모든 재시도 실패`);
  };

  // Process batches with limited concurrency (parallel but controlled)
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const batchPromises = batches
      .slice(i, i + MAX_CONCURRENT_BATCHES)
      .map((batch, idx) => fetchBatchWithRetry(batch, i + idx));

    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults);

    completedCount += batchResults.length;

    // Report progress
    if (options?.onProgress) {
      options.onProgress({ current: completedCount, total: batches.length });
    }

    // Report batch update message
    if (options?.onBatchUpdate) {
      options.onBatchUpdate(
        `단어 생성 중... (${completedCount}/${batches.length} 배치)`
      );
    }
  }

  // Sort by original index and flatten items
  allResults.sort((a, b) => a.index - b.index);
  const finalWords = allResults.flatMap((r) => r.items);

  return finalWords;
}
