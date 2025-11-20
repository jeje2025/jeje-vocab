import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath('/admin-tools');

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper: Get Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Helper: Get Supabase client with Anon Key (for auth verification)
function getSupabaseAnonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
}

// Helper: Get user ID from Authorization header
async function getUserIdFromAuth(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAnonClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('❌ Auth error:', error);
    return null;
  }

  return user.id;
}

// Helper: Check if user is admin
// Anyone who can authenticate is considered admin for now
async function isAdmin(userId: string): Promise<boolean> {
  // If user has valid userId, they're authenticated and can use admin tools
  return !!userId;
}

// Regenerate examples and translations for existing vocabulary
app.post("/regenerate-examples", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const isUserAdmin = await isAdmin(userId);
    if (!isUserAdmin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { vocabularyId } = body;

    if (!vocabularyId) {
      return c.json({ error: 'vocabularyId is required' }, 400);
    }

    const supabase = getSupabaseClient();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);
    }

    console.log(`🔄 Regenerating examples for vocabulary ${vocabularyId}`);

    // Get all words from the vocabulary
    const { data: words, error: fetchError } = await supabase
      .from('shared_words')
      .select('id, word, meaning, part_of_speech')
      .eq('vocabulary_id', vocabularyId)
      .order('order_index', { ascending: true })
      .limit(100000);

    if (fetchError) {
      console.error('❌ Error fetching words:', fetchError);
      return c.json({ error: `Fetch error: ${fetchError.message}` }, 500);
    }

    if (!words || words.length === 0) {
      return c.json({ error: 'No words found in vocabulary' }, 404);
    }

    console.log(`📝 Processing ${words.length} words`);

    const BATCH_SIZE = 30; // Process 30 words at a time
    let processedCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)}`);

      const wordList = batch.map((w, idx) =>
        `${idx + 1}. "${w.word}" (뜻: ${w.meaning}${w.part_of_speech ? ', ' + w.part_of_speech : ''})`
      ).join('\n');

      const prompt = `You are a professional English vocabulary expert. Generate example sentences, translations, and Korean meanings for the following words.

INPUT WORDS:
${wordList}

TASK:
For EACH word, generate a JSON object with ONLY these fields:
1. word: The exact word from the input (unchanged)
2. meaning: Concise Korean meaning (1-3 words, comma-separated if multiple meanings)
3. example: One natural English sentence using the word (12-20 words)
4. translation: Korean translation of the example sentence that still includes the English word explicitly (e.g., "그는 항상 resilience(회복력)을 보여준다.")

CRITICAL REQUIREMENTS:
- Return a JSON array with EXACTLY ${batch.length} objects in the SAME ORDER as the input words
- Each object must include ALL 4 fields above
- Meanings should be natural, commonly used Korean translations
- translation must contain the English word itself
- Return ONLY valid JSON (no markdown, no extra commentary)

EXAMPLES:
[
  {"word":"sophisticated","meaning":"세련된, 정교한","example":"The sophisticated technology revolutionized the industry.","translation":"그 sophisticated(세련된) 기술이 산업을 혁신했다."},
  {"word":"rhetoric","meaning":"수사학, 웅변","example":"His rhetoric persuaded many voters during the campaign.","translation":"그의 rhetoric(웅변술)이 캠페인 동안 많은 유권자들을 설득했다."}
]

NOW GENERATE THE JSON ARRAY:`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 8192,
              },
            }),
          }
        );

        if (!response.ok) {
          console.error(`❌ Gemini API error for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        const geminiData = await response.json();
        const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          console.error(`❌ No content generated for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        // Clean and parse JSON
        let cleanedText = generatedText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/```\n?/g, '').replace(/```\s*$/g, '');
        }
        cleanedText = cleanedText.trim();

        let parsed;
        try {
          parsed = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error(`❌ Failed to parse JSON for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        if (!Array.isArray(parsed)) {
          console.error(`❌ Response is not an array for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        // Update each word in the database
        for (let j = 0; j < batch.length && j < parsed.length; j++) {
          const wordData = batch[j];
          const aiResult = parsed[j];

          if (!aiResult.example || !aiResult.translation || !aiResult.meaning) {
            console.error(`⚠️ Missing fields for word: ${wordData.word}`);
            errorCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('shared_words')
            .update({
              meaning: aiResult.meaning,
              example: aiResult.example,
              translation: aiResult.translation,
              updated_at: new Date().toISOString(),
            })
            .eq('id', wordData.id);

          if (updateError) {
            console.error(`❌ Error updating word ${wordData.word}:`, updateError);
            errorCount++;
          } else {
            processedCount++;
          }
        }

        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
      } catch (batchError) {
        console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError);
        errorCount += batch.length;
      }
    }

    console.log(`✅ Regeneration complete: ${processedCount} success, ${errorCount} errors`);
    return c.json({
      success: true,
      processedCount,
      errorCount,
      totalWords: words.length,
    });
  } catch (error: any) {
    console.error('❌ Regeneration error:', error);
    return c.json({
      error: error?.message || String(error),
      details: error?.stack
    }, 500);
  }
});

// Regenerate meanings for existing vocabulary
app.post("/regenerate-meanings", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const isUserAdmin = await isAdmin(userId);
    if (!isUserAdmin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { vocabularyId } = body;

    if (!vocabularyId) {
      return c.json({ error: 'vocabularyId is required' }, 400);
    }

    const supabase = getSupabaseClient();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);
    }

    console.log(`🔄 Regenerating meanings for vocabulary ${vocabularyId}`);

    // Get all words from the vocabulary
    const { data: words, error: fetchError } = await supabase
      .from('shared_words')
      .select('id, word, meaning, part_of_speech')
      .eq('vocabulary_id', vocabularyId)
      .order('order_index', { ascending: true })
      .limit(100000);

    if (fetchError) {
      console.error('❌ Error fetching words:', fetchError);
      return c.json({ error: `Fetch error: ${fetchError.message}` }, 500);
    }

    if (!words || words.length === 0) {
      return c.json({ error: 'No words found in vocabulary' }, 404);
    }

    console.log(`📝 Processing ${words.length} words`);

    const BATCH_SIZE = 30; // Process 30 words at a time
    let processedCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(words.length / BATCH_SIZE)}`);

      const wordList = batch.map((w, idx) =>
        `${idx + 1}. "${w.word}"${w.part_of_speech ? ' (' + w.part_of_speech + ')' : ''}`
      ).join('\n');

      const prompt = `You are a professional English-Korean dictionary expert. Generate Korean meanings for the following English words.

INPUT WORDS:
${wordList}

TASK:
For EACH word, generate a JSON object with ONLY these fields:
1. word: The exact word from the input (unchanged)
2. meaning: Concise Korean meaning (1-3 words, comma-separated if multiple meanings)

CRITICAL REQUIREMENTS:
- Return a JSON array with EXACTLY ${batch.length} objects in the SAME ORDER as the input words
- Each object must include ALL 2 fields above
- Meanings should be natural, commonly used Korean translations
- Keep meanings concise and clear
- Return ONLY valid JSON (no markdown, no extra commentary)

EXAMPLES:
[
  {"word":"sophisticated","meaning":"세련된, 정교한"},
  {"word":"rhetoric","meaning":"수사학, 웅변"},
  {"word":"triumph","meaning":"승리, 대성공"}
]

NOW GENERATE THE JSON ARRAY:`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        if (!response.ok) {
          console.error(`❌ Gemini API error for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        const geminiData = await response.json();
        const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
          console.error(`❌ No content generated for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        // Clean and parse JSON
        let cleanedText = generatedText.trim();
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/```\n?/g, '').replace(/```\s*$/g, '');
        }
        cleanedText = cleanedText.trim();

        let parsed;
        try {
          parsed = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error(`❌ Failed to parse JSON for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        if (!Array.isArray(parsed)) {
          console.error(`❌ Response is not an array for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          errorCount += batch.length;
          continue;
        }

        // Update each word in the database
        for (let j = 0; j < batch.length && j < parsed.length; j++) {
          const wordData = batch[j];
          const aiResult = parsed[j];

          if (!aiResult.meaning) {
            console.error(`⚠️ Missing meaning for word: ${wordData.word}`);
            errorCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('shared_words')
            .update({
              meaning: aiResult.meaning,
              updated_at: new Date().toISOString(),
            })
            .eq('id', wordData.id);

          if (updateError) {
            console.error(`❌ Error updating word ${wordData.word}:`, updateError);
            errorCount++;
          } else {
            processedCount++;
          }
        }

        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
      } catch (batchError) {
        console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError);
        errorCount += batch.length;
      }
    }

    console.log(`✅ Regeneration complete: ${processedCount} success, ${errorCount} errors`);
    return c.json({
      success: true,
      processedCount,
      errorCount,
      totalWords: words.length,
    });
  } catch (error: any) {
    console.error('❌ Regeneration error:', error);
    return c.json({
      error: error?.message || String(error),
      details: error?.stack
    }, 500);
  }
});

Deno.serve(app.fetch);
