import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath('/server');

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

function generateVocabularyId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `vocab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function generateWordId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `word_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Helper: Extract user ID from Authorization header
async function getUserIdFromAuth(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    console.log('⚠️ No Authorization header provided');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // ✅ Log token prefix for debugging
  console.log('🔑 Received token:', token.substring(0, 20) + '...');
  console.log('🔑 Token length:', token.length);
  
  // Check if this is the anon key (not a user token)
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (token === anonKey) {
    console.log('⚠️ Anon key provided instead of user token');
    return null;
  }
  
  try {
    // ✅ Use ANON client for JWT verification
    const supabase = getSupabaseAnonClient();
    
    console.log('🔍 Verifying JWT with Supabase Auth...');
    
    // Verify the JWT token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('❌ Auth verification failed:', error.message);
      console.error('❌ Error code:', error.status);
      console.error('❌ Error name:', error.name);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      return null;
    }
    
    if (!user) {
      console.error('❌ No user found in token (but no error either)');
      return null;
    }
    
    console.log('✅ Auth verified for user:', user.id);
    return user.id;
  } catch (error: any) {
    console.error('❌ Exception verifying auth token:', error.message || error);
    console.error('❌ Exception type:', typeof error);
    console.error('❌ Exception stack:', error.stack);
    return null;
  }
}

// Helper: Return standardized unauthorized response
function unauthorizedResponse(c: any, message?: string) {
  return c.json({ 
    code: 401,
    message: message || 'Invalid JWT',
    error: '인증이 필요합니다. 다시 로그인해주세요.'
  }, 401);
}

type DerivativeEntry = { word: string; meaning: string };

function ensureStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => typeof item === 'string'
        ? item.trim()
        : typeof item === 'object' && item !== null && typeof item.word === 'string'
          ? item.word.trim()
          : '')
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return ensureStringArray(parsed);
      }
    } catch {
      // ignore parse failure, fall through to comma split
    }
    return value.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
}

function ensureDerivativeArray(value: any): DerivativeEntry[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') {
        const [word, meaning] = item.split(':').map(part => part.trim());
        return { word, meaning: meaning || '' };
      }
      if (typeof item === 'object' && item !== null) {
        return {
          word: String(item.word || '').trim(),
          meaning: String(item.meaning || '').trim(),
        };
      }
      return { word: '', meaning: '' };
    }).filter(entry => entry.word);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return ensureDerivativeArray(parsed);
      }
    } catch {
      // continue parsing as comma separated pieces
    }
    return value.split(',').map(segment => {
      const [word, meaning] = segment.split(':').map(part => part.trim());
      return { word, meaning: meaning || '' };
    }).filter(entry => entry.word);
  }
  if (typeof value === 'object') {
    return ensureDerivativeArray([value]);
  }
  return [];
}

function normalizeWordPayload(word: any) {
  const normalizedWord = (word?.word || '').trim();
  const meaningCandidate = (word?.meaning || word?.translation || word?.definition || normalizedWord).trim();
  return {
    word: normalizedWord,
    pronunciation: word?.pronunciation || '',
    part_of_speech: word?.part_of_speech || word?.partOfSpeech || '',
    meaning: meaningCandidate || '의미 미정',
    definition: word?.definition || '',
    synonyms: ensureStringArray(word?.synonyms),
    antonyms: ensureStringArray(word?.antonyms),
    derivatives: ensureDerivativeArray(word?.derivatives),
    example: word?.example || word?.example_sentence || '',
    translation: word?.translation || '',
    translation_highlight: word?.translation_highlight || word?.translationHighlight || '',
    etymology: word?.etymology || '',
    metadata: word?.metadata ?? null,
  };
}

function hydrateWordResponse(word: any) {
  const hydrated = { ...word };
  hydrated.synonyms = ensureStringArray(word?.synonyms);
  hydrated.antonyms = ensureStringArray(word?.antonyms);
  hydrated.derivatives = ensureDerivativeArray(word?.derivatives);
  hydrated.partOfSpeech = word?.partOfSpeech || word?.part_of_speech || '';
  hydrated.translationHighlight = word?.translationHighlight || word?.translation_highlight || '';
  hydrated.example = word?.example || word?.example_sentence || '';
  hydrated.example_sentence = hydrated.example;
  hydrated.translation_highlight = hydrated.translation_highlight || hydrated.translationHighlight;
  hydrated.part_of_speech = hydrated.part_of_speech || hydrated.partOfSpeech;
  return hydrated;
}

async function handleWordGenerationRequest(c: any) {
  try {
    // 인증 선택적 - 관리자 모드에서도 사용 가능하도록
    // const userId = await getUserIdFromAuth(c);
    // if (!userId) return unauthorizedResponse(c);

    let body;
    try {
      body = await c.req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const { words } = body || {};

    if (!words || !Array.isArray(words) || words.length === 0) {
      return c.json({ success: false, error: 'words array is required' }, 400);
    }

    const validWords: { word: string; meaning?: string }[] = [];
    const invalidWords: any[] = [];

    words.forEach((entry: any, index: number) => {
      if (!entry || typeof entry !== 'object') {
        invalidWords.push({ index, reason: 'Entry must be an object' });
        return;
      }
      if (!entry.word || typeof entry.word !== 'string' || entry.word.trim() === '') {
        invalidWords.push({ index, reason: 'word must be a non-empty string' });
        return;
      }
      validWords.push({
        word: entry.word.trim(),
        meaning: typeof entry.meaning === 'string' ? entry.meaning.trim() : undefined,
      });
    });

    if (validWords.length === 0) {
      return c.json({ success: false, error: 'No valid words provided', invalidWords }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return c.json({ success: false, error: 'GEMINI_API_KEY not configured' }, 500);
    }

    // Process all words in a single request (client handles batching)
    console.log(`📦 Processing ${validWords.length} words`);

    const wordList = validWords.map((w, idx) => `${idx + 1}. "${w.word}"${w.meaning ? ` (뜻: ${w.meaning})` : ''}`).join('\n');

    const prompt = `You are a professional English vocabulary expert. You will receive a list of English words and generate comprehensive information for each word.

INPUT WORDS:
${wordList}

TASK:
For EACH word, generate a JSON object with the following fields:

1. word: The exact word from the input (unchanged)
2. pronunciation: IPA phonetic notation (example: "/ˈwɜːrd/")
3. partOfSpeech: Part of speech in Korean (examples: "n.", "v.", "adj.", "adv.")
4. meaning: Korean meaning (use provided meaning if available, otherwise generate appropriate meaning)
5. definition: Short English definition in 8-12 words
6. synonyms: Array of 4-5 English synonym strings (example: ["happy", "joyful", "glad"])
7. antonyms: Array of 2-3 English antonym strings (example: ["sad", "unhappy"])
8. derivatives: Array of 2-3 derivative word objects with format {"word": "string", "meaning": "Korean meaning"}
9. example: One natural English sentence using the word (12-20 words)
10. translation: Korean translation of the example sentence that still includes the English word explicitly
11. translationHighlight: The Korean word/phrase highlighting the meaning of the English word
12. etymology: Detailed Korean story (2-3 sentences) explaining the word's historical origin, how its meaning evolved across languages, and any notable cultural or historical context tied to the term

CRITICAL REQUIREMENTS:
- Return a JSON array with EXACTLY ${validWords.length} objects in the SAME ORDER as the input words
- Each object must include ALL fields above
- synonyms/antonyms must be arrays of strings
- derivatives must be an array of objects with {word, meaning}
- translation must contain the English word itself (e.g., "그는 항상 resilience(회복력)을 보여준다.")
- Return ONLY valid JSON (no markdown, no extra commentary)

NOW GENERATE THE JSON ARRAY:`;

      const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 16384,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', errorText);
      return c.json({ success: false, error: 'Gemini API request failed', details: errorText }, 500);
    }

    const geminiData = await response.json();
    const inputTokens = geminiData.usageMetadata?.promptTokenCount || 0;
    const outputTokens = geminiData.usageMetadata?.candidatesTokenCount || 0;

    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      console.error('❌ No content generated from Gemini:', geminiData);
      return c.json({ success: false, error: 'No content generated', details: geminiData }, 500);
    }

    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '').replace(/```\s*$/g, '');
    }
    cleanedText = cleanedText.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response, attempting recovery...');
      console.error('❌ Parse error:', parseError);

      // Try to fix common JSON issues
      let fixedText = cleanedText;

      // Fix 1: Remove trailing commas before ] or }
      fixedText = fixedText.replace(/,(\s*[\]}])/g, '$1');

      // Fix 2: Fix unescaped quotes in strings (common issue)
      // This is tricky, try a simple approach first
      fixedText = fixedText.replace(/([^\\])"/g, (match, p1, offset) => {
        // Count opening braces/brackets before this position to determine if we're in a value
        const before = fixedText.substring(0, offset);
        const inString = (before.split('"').length - 1) % 2 === 1;
        if (inString && p1 !== ':' && p1 !== ',' && p1 !== '{' && p1 !== '[') {
          return p1 + '\\"';
        }
        return match;
      });

      // Fix 3: Try to extract valid JSON array if there's extra content
      const arrayMatch = fixedText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        fixedText = arrayMatch[0];
      }

      try {
        parsed = JSON.parse(fixedText);
        console.log('✅ Successfully recovered JSON after fixing');
      } catch (secondError) {
        // Fix 4: If still failing, try to parse incrementally and salvage what we can
        console.error('❌ Recovery failed, attempting partial extraction...');

        // Try to find complete objects in the array
        const objectMatches = cleanedText.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        const partialResults: any[] = [];

        for (const match of objectMatches) {
          try {
            const obj = JSON.parse(match[0]);
            if (obj.word) {
              partialResults.push(obj);
            }
          } catch {
            // Skip malformed objects
          }
        }

        if (partialResults.length > 0) {
          console.log(`⚠️ Partially recovered ${partialResults.length} out of ${validWords.length} words`);
          parsed = partialResults;
        } else {
          console.error('❌ Complete failure to parse Gemini response');
          console.error('❌ Raw response (first 2000 chars):', cleanedText.substring(0, 2000));
          return c.json({
            success: false,
            error: 'Failed to parse JSON response',
            details: String(parseError),
            hint: 'The AI generated invalid JSON. Try reducing the batch size or retrying.'
          }, 500);
        }
      }
    }

    if (!Array.isArray(parsed)) {
      console.error('❌ Parsed result is not an array:', parsed);
      return c.json({ success: false, error: 'Gemini response is not an array' }, 500);
    }

    const normalizedResults = parsed.map((item: any, index: number) => {
      const base = normalizeWordPayload({
        ...item,
        word: item.word || validWords[index]?.word,
        meaning: item.meaning || validWords[index]?.meaning,
        partOfSpeech: item.partOfSpeech || item.part_of_speech,
        translationHighlight: item.translationHighlight || item.translation_highlight,
      });
      return {
        word: base.word,
        pronunciation: base.pronunciation,
        partOfSpeech: item.partOfSpeech || item.part_of_speech || base.part_of_speech || '',
        meaning: base.meaning,
        definition: item.definition || '',
        synonyms: base.synonyms,
        antonyms: base.antonyms,
        derivatives: base.derivatives,
        example: base.example,
        translation: base.translation,
        translationHighlight: base.translation_highlight,
        etymology: base.etymology,
      };
    });

    console.log(`✅ Completed processing ${normalizedResults.length} words`);

    return c.json({
      success: true,
      results: normalizedResults,
      inputTokens,
      outputTokens,
    });
  } catch (error) {
    console.error('❌ Word generation error:', error);
    return c.json({ success: false, error: 'AI generation failed', details: String(error) }, 500);
  }
}

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ 
    status: "ok",
    version: "5.0.0-table-based",
    timestamp: new Date().toISOString(),
    message: "✅ Fully table-based, KV removed"
  });
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// Signup endpoint - Create new user
app.post("/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return c.json({ error: 'Email, password, and full name are required' }, 400);
    }

    // ✅ Use SERVICE_ROLE_KEY for admin.createUser
    const supabase = getSupabaseClient();

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('✅ User created successfully:', data.user.id);
    return c.json({ user: data.user });
  } catch (error) {
    console.error('❌ Error during signup:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Signin endpoint - Authenticate user
app.post("/auth/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // ✅ Use ANON client for signin (must match verification client!)
    const supabase = getSupabaseAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Signin error:', error);
      return c.json({ error: error.message }, 401);
    }

    // ✅ Validate response structure
    if (!data.session || !data.session.access_token) {
      console.error('❌ Invalid session structure:', data);
      return c.json({ error: 'Invalid session response from Supabase' }, 500);
    }

    console.log('✅ User signed in successfully:', data.user.id);
    console.log('🔑 Generated access token:', data.session.access_token.substring(0, 20) + '...');
    
    return c.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('❌ Error during signin:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Verify token endpoint - Check if token is still valid
app.get("/auth/verify", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Token verification failed');
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    console.log('✅ Token verified for user:', user.id);
    return c.json({ 
      valid: true,
      user: {
        id: user.id,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('❌ Error during token verification:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// SHARED VOCABULARY ENDPOINTS (PUBLIC)
// ============================================

// Get all shared vocabularies
app.get("/shared-vocabularies", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('shared_vocabularies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📚 Fetched ${data.length} shared vocabularies`);
    return c.json({ vocabularies: data });
  } catch (error) {
    console.error('❌ Error fetching shared vocabularies:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get words for a specific shared vocabulary
app.get("/shared-vocabulary/:id/words", async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('shared_words')
      .select('*')
      .eq('vocabulary_id', id)
      .order('order_index', { ascending: true });

    if (error) throw error;

    console.log(`📖 Fetched ${data.length} words for vocabulary ${id}`);
    return c.json({ words: data.map(hydrateWordResponse) });
  } catch (error) {
    console.error('❌ Error fetching shared vocabulary words:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// USER VOCABULARY ENDPOINTS
// ============================================

// Get all user vocabularies
app.get("/user-vocabularies", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_vocabularies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📚 Fetched ${data.length} user vocabularies for user ${userId}`);
    return c.json({ vocabularies: data });
  } catch (error) {
    console.error('❌ Error fetching user vocabularies:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create user vocabulary from shared vocabulary (old endpoint compatibility)
app.post("/user-vocabulary", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const body = await c.req.json();
    const { shared_vocabulary_id, selected_word_ids, title, category, level } = body;

    if (!shared_vocabulary_id || !selected_word_ids || !title) {
      return c.json({ error: 'shared_vocabulary_id, selected_word_ids, and title are required' }, 400);
    }

    const supabase = getSupabaseClient();
    const vocabId = generateVocabularyId();

    // Create user vocabulary
    const { data: vocabulary, error: vocabError } = await supabase
      .from('user_vocabularies')
      .insert({
        id: vocabId,
        user_id: userId,
        shared_vocabulary_id,
        title,
        category: category || 'General',
        level: level || 'Beginner',
        total_words: selected_word_ids.length,
      })
      .select()
      .single();

    if (vocabError) throw vocabError;

    // Fetch selected words from shared vocabulary
    const { data: sharedWords, error: wordsError } = await supabase
      .from('shared_words')
      .select('*')
      .eq('vocabulary_id', shared_vocabulary_id)
      .in('id', selected_word_ids);

    if (wordsError) throw wordsError;

    // Create user words
    const userWords = sharedWords.map((word: any, index: number) => {
      const payload = normalizeWordPayload(word);
      return {
        id: generateWordId(),
        user_id: userId,
        vocabulary_id: vocabId,
        shared_word_id: word.id,
        ...payload,
        unit_number: Math.floor(index / 10) + 1,
        order_index: index + 1,
        status: 'learning',
        confidence: 0,
        last_reviewed_at: null,
        review_count: 0,
        is_starred: false,
        is_graveyard: false,
        is_wrong_answer: false,
      };
    });

    const { error: insertError } = await supabase
      .from('user_words')
      .insert(userWords);

    if (insertError) throw insertError;

    console.log(`✅ Created user vocabulary ${vocabId} with ${userWords.length} words`);
    return c.json({ vocabulary });
  } catch (error) {
    console.error('❌ Error creating user vocabulary:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get words for a specific user vocabulary
app.get("/user-vocabulary/:id/words", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const id = c.req.param('id');
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_words')
      .select('*')
      .eq('vocabulary_id', id)
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const words = data.map(hydrateWordResponse);

    console.log(`📖 Fetched ${words.length} words for user vocabulary ${id}`);
    return c.json({ words });
  } catch (error) {
    console.error('❌ Error fetching user vocabulary words:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update word state
app.put("/user-vocabulary/:vocabId/word/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const vocabId = c.req.param('vocabId');
    const wordId = c.req.param('wordId');
    const body = await c.req.json();

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_words')
      .update(body)
      .eq('id', wordId)
      .eq('vocabulary_id', vocabId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated word ${wordId} in vocabulary ${vocabId}`);
    return c.json({ word: data });
  } catch (error) {
    console.error('❌ Error updating word:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete user vocabulary
app.delete("/user-vocabularies/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const id = c.req.param('id');
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('user_vocabularies')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`🗑️ Deleted user vocabulary ${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting user vocabulary:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete user vocabularies by category
app.delete("/user-vocabularies/category/:category", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const category = c.req.param('category');
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('user_vocabularies')
      .delete()
      .eq('category', category)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`🗑️ Deleted all user vocabularies in category ${category}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting user vocabularies by category:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get single user vocabulary details (for quiz)
app.get("/user-vocabularies/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const id = c.req.param('id');
    const unitParam = c.req.query('unit'); // Get unit number from query parameter
    const requestedUnit = unitParam ? parseInt(unitParam) : undefined;
    const supabase = getSupabaseClient();

    // Get vocabulary details
    const { data: vocabulary, error: vocabError } = await supabase
      .from('user_vocabularies')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (vocabError) throw vocabError;

    if (!vocabulary) {
      // Check if this is a shared vocabulary
      const { data: sharedVocab } = await supabase
        .from('shared_vocabularies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (sharedVocab) {
        return c.json({
          error: 'This is a shared vocabulary. Please add it to your collection first.',
          isSharedVocabulary: true
        }, 403);
      }

      return c.json({ error: 'Vocabulary not found' }, 404);
    }

    // Get words - filter by unit if specified
    let wordsQuery = supabase
      .from('user_words')
      .select('*')
      .eq('vocabulary_id', id)
      .eq('user_id', userId);

    // Filter by unit number if specified
    if (requestedUnit) {
      wordsQuery = wordsQuery.eq('unit_number', requestedUnit);
    }

    wordsQuery = wordsQuery.order('order_index', { ascending: true });

    const { data: rawWords, error: wordsError } = await wordsQuery;

    if (wordsError) throw wordsError;

    const words = (rawWords || []).map(hydrateWordResponse);

    // Group words into units
    const units: { [key: number]: any[] } = {};
    words.forEach(word => {
      const unitNumber = word.unit_number || 1;
      if (!units[unitNumber]) {
        units[unitNumber] = [];
      }
      units[unitNumber].push(word);
    });

    const unitsArray = Object.keys(units).map(unitNum => ({
      unitNumber: parseInt(unitNum),
      words: units[parseInt(unitNum)]
    }));

    const logMessage = requestedUnit
      ? `📚 Fetched vocabulary ${id} unit ${requestedUnit} with ${words.length} words`
      : `📚 Fetched vocabulary ${id} with ${words.length} words in ${unitsArray.length} units`;
    console.log(logMessage);

    return c.json({
      vocabulary,
      units: unitsArray,
      words
    });
  } catch (error) {
    console.error('❌ Error fetching user vocabulary details:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update user vocabulary (rename)
app.put("/user-vocabularies/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const { title } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_vocabularies')
      .update({ title })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated vocabulary ${id} title to "${title}"`);
    return c.json({ vocabulary: data });
  } catch (error) {
    console.error('❌ Error updating vocabulary:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Add shared vocabulary to user's collection
app.post("/user-vocabularies/add-shared", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) {
      return unauthorizedResponse(c);
    }

    const body = await c.req.json();
    const { sharedVocabularyId, selectedWordIds } = body;

    if (!sharedVocabularyId) {
      return c.json({ error: 'sharedVocabularyId is required' }, 400);
    }

    const supabase = getSupabaseClient();

    // Get shared vocabulary details
    const { data: sharedVocab, error: vocabError } = await supabase
      .from('shared_vocabularies')
      .select('*')
      .eq('id', sharedVocabularyId)
      .single();

    if (vocabError) throw vocabError;

    const vocabId = generateVocabularyId();

    // Get words to copy first to calculate total_units
    let query = supabase
      .from('shared_words')
      .select('*')
      .eq('vocabulary_id', sharedVocabularyId)
      .order('order_index', { ascending: true });

    if (selectedWordIds && selectedWordIds.length > 0) {
      query = query.in('id', selectedWordIds);
    }

    const { data: sharedWords, error: wordsError } = await query;

    if (wordsError) throw wordsError;

    const wordsPerUnit = 100; // 100 words per unit as requested

    // Create user vocabulary with actual DB schema columns
    const { data: vocabulary, error: createError } = await supabase
      .from('user_vocabularies')
      .insert({
        id: vocabId,
        user_id: userId,
        title: sharedVocab.title,
        category: 'My Vocabularies', // Always use 'My Vocabularies' for shared vocabularies
        level: sharedVocab.difficulty_level || 'Beginner',
        total_words: sharedWords.length,
        shared_vocabulary_id: sharedVocabularyId,
        words_per_unit: wordsPerUnit,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Create user words with actual DB schema columns
    const userWords = sharedWords.map((word: any, index: number) => {
      const payload = normalizeWordPayload(word);
      return {
        id: generateWordId(),
        user_id: userId,
        vocabulary_id: vocabId,
        shared_word_id: word.id,
        ...payload,
        unit_number: Math.floor(index / wordsPerUnit) + 1,
        order_index: index + 1,
        status: 'learning',
        confidence: 0,
        review_count: 0,
        is_starred: false,
        is_graveyard: false,
        is_wrong_answer: false,
      };
    });

    const { error: insertError } = await supabase
      .from('user_words')
      .insert(userWords);

    if (insertError) throw insertError;

    console.log(`✅ Added shared vocabulary ${sharedVocabularyId} to user ${userId} with ${userWords.length} words`);
    return c.json({ vocabulary, success: true });
  } catch (error: any) {
    console.error('❌ Error adding shared vocabulary:', error);
    const errorMessage = error?.message || error?.toString?.() || JSON.stringify(error) || 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// ============================================
// STARRED/GRAVEYARD/WRONG ANSWERS ENDPOINTS
// ============================================

app.get("/starred", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').select('*').eq('user_id', userId).eq('is_starred', true).order('created_at', { ascending: false });
    if (error) throw error;
    console.log(`⭐ Fetched ${data.length} starred words`);
    return c.json({ words: data.map(hydrateWordResponse) });
  } catch (error) {
    console.error('❌ Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/starred/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').update({ is_starred: true }).eq('id', wordId).eq('user_id', userId).select().single();
    if (error) throw error;
    return c.json({ word: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/starred/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').update({ is_starred: false }).eq('id', wordId).eq('user_id', userId).select().single();
    if (error) throw error;
    return c.json({ word: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/graveyard", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').select('*').eq('user_id', userId).eq('is_graveyard', true).order('updated_at', { ascending: false });
    if (error) throw error;
    return c.json({ words: data.map(hydrateWordResponse) });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/graveyard/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').update({ is_graveyard: true, is_starred: false, is_wrong_answer: false }).eq('id', wordId).eq('user_id', userId).select().single();
    if (error) throw error;
    return c.json({ word: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/graveyard/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('user_words').delete().eq('id', wordId).eq('user_id', userId);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/wrong-answers", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').select('*').eq('user_id', userId).eq('is_wrong_answer', true).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ words: data.map(hydrateWordResponse) });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/wrong-answers/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').update({ is_wrong_answer: true }).eq('id', wordId).eq('user_id', userId).select().single();
    if (error) throw error;
    return c.json({ word: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/wrong-answers/:wordId", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const wordId = c.req.param('wordId');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_words').update({ is_wrong_answer: false }).eq('id', wordId).eq('user_id', userId).select().single();
    if (error) throw error;
    return c.json({ word: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

app.get("/admin/shared-vocabularies", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('shared_vocabularies').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ vocabularies: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/admin/shared-vocabularies", async (c) => {
  try {
    const body = await c.req.json();
    const { title, category, level, difficulty_level, words, description } = body;
    if (!title || !category || !words) {
      return c.json({ error: 'title, category, and words are required' }, 400);
    }
    const supabase = getSupabaseClient();
    const vocabId = generateVocabularyId();
    const { data: vocabulary, error: vocabError } = await supabase.from('shared_vocabularies').insert({
      id: vocabId, title, category, difficulty_level: level || difficulty_level || 'Beginner', description: description || '', total_words: words.length,
    }).select().single();
    if (vocabError) throw vocabError;
    
    // Map frontend field names to DB schema
    const sharedWords = words.map((word: any, index: number) => {
      const payload = normalizeWordPayload(word);
      return {
        id: generateWordId(),
        vocabulary_id: vocabId,
        ...payload,
        order_index: index + 1,
      };
    });
    
    const { error: wordsError } = await supabase.from('shared_words').insert(sharedWords);
    if (wordsError) throw wordsError;
    console.log(`✅ [ADMIN] Created ${vocabId} with ${words.length} words`);
    return c.json({ vocabulary });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/admin/shared-vocabularies/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title, category, description } = body;
    const supabase = getSupabaseClient();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('shared_vocabularies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log(`✅ [ADMIN] Updated vocabulary ${id}`);
    return c.json({ vocabulary: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/admin/shared-vocabularies/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabaseClient();

    // First delete all words associated with this vocabulary
    const { error: wordsError } = await supabase
      .from('shared_words')
      .delete()
      .eq('vocabulary_id', id);

    if (wordsError) {
      console.error('❌ Error deleting words:', wordsError);
      throw wordsError;
    }

    // Then delete the vocabulary itself
    const { error: vocabError } = await supabase
      .from('shared_vocabularies')
      .delete()
      .eq('id', id);

    if (vocabError) {
      console.error('❌ Error deleting vocabulary:', vocabError);
      throw vocabError;
    }

    console.log(`✅ Deleted vocabulary ${id} and its words`);
    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Delete error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Merge vocabularies
app.post("/admin/shared-vocabularies/merge", async (c) => {
  try {
    const body = await c.req.json();
    const { targetVocabId, sourceVocabIds, newTitle } = body;

    console.log('🔀 Merging vocabularies:', { targetVocabId, sourceVocabIds, newTitle });

    // Validate input
    if (!targetVocabId || !sourceVocabIds || !Array.isArray(sourceVocabIds) || sourceVocabIds.length === 0) {
      console.error('❌ Invalid input:', { targetVocabId, sourceVocabIds });
      return c.json({ error: 'Invalid input: targetVocabId and sourceVocabIds are required' }, 400);
    }

    const supabase = getSupabaseClient();

    // 1. Get target vocabulary
    console.log('📥 Fetching target vocabulary:', targetVocabId);
    const { data: targetVocab, error: targetError } = await supabase
      .from('shared_vocabularies')
      .select('*')
      .eq('id', targetVocabId)
      .single();

    if (targetError) {
      console.error('❌ Error fetching target vocabulary:', targetError);
      return c.json({ error: `Target vocabulary error: ${targetError.message}` }, 400);
    }

    if (!targetVocab) {
      console.error('❌ Target vocabulary not found:', targetVocabId);
      return c.json({ error: 'Target vocabulary not found' }, 404);
    }

    console.log('✅ Target vocabulary found:', targetVocab.title);

    // 2. Get all source vocabularies
    console.log('📥 Fetching source vocabularies:', sourceVocabIds);
    const { data: sourceVocabs, error: sourceError } = await supabase
      .from('shared_vocabularies')
      .select('*')
      .in('id', sourceVocabIds);

    if (sourceError) {
      console.error('❌ Error fetching source vocabularies:', sourceError);
      return c.json({ error: `Source vocabularies error: ${sourceError.message}` }, 400);
    }

    if (!sourceVocabs || sourceVocabs.length === 0) {
      console.error('❌ No source vocabularies found');
      return c.json({ error: 'Source vocabularies not found' }, 404);
    }

    console.log('✅ Source vocabularies found:', sourceVocabs.length);

    // 3. Get target vocabulary words (with high limit to avoid truncation)
    const { data: targetWords, error: targetWordsError } = await supabase
      .from('shared_words')
      .select('*')
      .eq('vocabulary_id', targetVocabId)
      .order('order_index', { ascending: true })
      .limit(100000);

    if (targetWordsError) {
      console.error('❌ Error fetching target words:', targetWordsError);
      return c.json({ error: `Target words error: ${targetWordsError.message}` }, 500);
    }

    console.log('📝 Starting with', targetWords?.length || 0, 'words from target');

    // 4. Get all source vocabulary words (with high limit to avoid truncation)
    const { data: sourceWords, error: sourceWordsError } = await supabase
      .from('shared_words')
      .select('*')
      .in('vocabulary_id', sourceVocabIds)
      .order('vocabulary_id, order_index', { ascending: true })
      .limit(100000);

    if (sourceWordsError) {
      console.error('❌ Error fetching source words:', sourceWordsError);
      return c.json({ error: `Source words error: ${sourceWordsError.message}` }, 500);
    }

    console.log('📝 Adding', sourceWords?.length || 0, 'words from source vocabularies');

    // 5. Update source words to point to target vocabulary
    let currentOrderIndex = (targetWords?.length || 0) + 1;
    const wordsToUpdate: any[] = [];

    if (sourceWords && sourceWords.length > 0) {
      for (const word of sourceWords) {
        wordsToUpdate.push({
          ...word,
          vocabulary_id: targetVocabId,
          order_index: currentOrderIndex++,
        });
      }

      // Delete old source words
      const { error: deleteWordsError } = await supabase
        .from('shared_words')
        .delete()
        .in('vocabulary_id', sourceVocabIds);

      if (deleteWordsError) {
        console.error('❌ Error deleting source words:', deleteWordsError);
        return c.json({ error: `Delete words error: ${deleteWordsError.message}` }, 500);
      }

      // Insert words with updated vocabulary_id and order_index
      const { error: insertWordsError } = await supabase
        .from('shared_words')
        .insert(wordsToUpdate);

      if (insertWordsError) {
        console.error('❌ Error inserting merged words:', insertWordsError);
        return c.json({ error: `Insert words error: ${insertWordsError.message}` }, 500);
      }
    }

    const totalWords = (targetWords?.length || 0) + (sourceWords?.length || 0);
    console.log('✅ Total words after merge:', totalWords);

    // 6. Update target vocabulary with new title and total_words count
    console.log('💾 Updating target vocabulary...');
    const { error: updateError } = await supabase
      .from('shared_vocabularies')
      .update({
        title: newTitle || targetVocab.title,
        total_words: totalWords,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetVocabId);

    if (updateError) {
      console.error('❌ Error updating vocabulary:', updateError);
      return c.json({ error: `Update error: ${updateError.message}` }, 500);
    }

    console.log('✅ Target vocabulary updated');

    // 7. Delete source vocabularies
    console.log('🗑️ Deleting source vocabularies...');
    const { error: deleteError } = await supabase
      .from('shared_vocabularies')
      .delete()
      .in('id', sourceVocabIds);

    if (deleteError) {
      console.error('❌ Error deleting vocabularies:', deleteError);
      return c.json({ error: `Delete error: ${deleteError.message}` }, 500);
    }

    console.log('✅ Vocabularies merged successfully');
    return c.json({
      success: true,
      mergedVocabId: targetVocabId,
      totalWords
    });
  } catch (error: any) {
    console.error('❌ Error merging vocabularies:', error);
    console.error('Stack:', error?.stack);
    return c.json({
      error: error?.message || String(error),
      details: error?.stack
    }, 500);
  }
});

app.get("/admin/stats", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { count: totalVocabularies } = await supabase.from('shared_vocabularies').select('*', { count: 'exact', head: true });
    const { data: usersData } = await supabase.from('user_vocabularies').select('user_id');
    const activeUsers = new Set(usersData?.map(u => u.user_id) || []).size;
    const { count: totalDownloads } = await supabase.from('user_vocabularies').select('*', { count: 'exact', head: true });
    return c.json({ stats: { totalVocabularies: totalVocabularies || 0, totalDownloads: totalDownloads || 0, activeUsers, avgRating: '4.8' } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/admin/categories", async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Directly extract unique categories from shared_vocabularies
    const { data, error } = await supabase
      .from('shared_vocabularies')
      .select('category');

    if (error) {
      console.error('❌ Error fetching vocabularies:', error);
      return c.json({ categories: [] }, 500);
    }

    // Extract unique categories
    const categoriesSet = new Set<string>();
    data?.forEach(item => {
      if (item.category) categoriesSet.add(item.category);
    });

    // Convert to array and sort alphabetically
    const categories = Array.from(categoriesSet)
      .sort()
      .map(name => ({
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        icon: '📚',
        enabled: true,
        order: 0
      }));

    console.log(`✅ Found ${categories.length} unique categories`);
    return c.json({ categories });
  } catch (error) {
    console.error('❌ Error in /admin/categories:', error);
    return c.json({ categories: [] }, 500);
  }
});

app.post("/admin/categories", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { name, icon } = await c.req.json();
    if (!name) return c.json({ error: 'name is required' }, 400);

    const id = name.toLowerCase().replace(/\s+/g, '_');

    // Get max sort_order
    const { data: maxData } = await supabase
      .from('vocabulary_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const newOrder = (maxData?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('vocabulary_categories')
      .insert({
        id,
        name,
        icon: icon || '📚',
        enabled: true,
        sort_order: newOrder
      })
      .select()
      .single();

    if (error) throw error;

    return c.json({
      category: {
        id: data.id,
        name: data.name,
        icon: data.icon,
        enabled: data.enabled,
        order: data.sort_order
      }
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/admin/categories", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const body = await c.req.json();

    // Support both single update and batch update
    if (body.categories && Array.isArray(body.categories)) {
      // Batch update
      for (const cat of body.categories) {
        await supabase
          .from('vocabulary_categories')
          .update({
            name: cat.name,
            icon: cat.icon || '📚',
            enabled: cat.enabled,
            sort_order: cat.order || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', cat.id);
      }
      return c.json({ success: true });
    } else {
      // Single update
      const { id, name, icon, enabled } = body;
      const { data, error } = await supabase
        .from('vocabulary_categories')
        .update({
          name: name || id,
          icon: icon || '📚',
          enabled: enabled !== undefined ? enabled : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return c.json({
        category: {
          id: data.id,
          name: data.name,
          icon: data.icon,
          enabled: data.enabled,
          order: data.sort_order
        }
      });
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/admin/categories/:id", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const categoryId = c.req.param('id');

    const { error } = await supabase
      .from('vocabulary_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get all users (admin only)
app.get("/admin/users", async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    // Map users to a simplified format
    const mappedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      role: user.user_metadata?.role || 'user',
      permissions: user.user_metadata?.permissions || [],
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    }));

    console.log(`👥 Fetched ${mappedUsers.length} users`);
    return c.json({ users: mappedUsers });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update user permissions/role (admin only)
app.put("/admin/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { role, permissions } = body;

    const supabase = getSupabaseClient();

    // Update user metadata
    const { data: { user }, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: role || 'user',
          permissions: permissions || [],
        }
      }
    );

    if (error) throw error;

    console.log(`✅ Updated user ${userId} with role: ${role}`);
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        role: user.user_metadata?.role || 'user',
        permissions: user.user_metadata?.permissions || [],
      }
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// VOCABULARY CREATION ENDPOINTS
// ============================================

app.get("/my-own-units", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_vocabularies').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ vocabularies: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get user vocabularies (for My Own section)
app.get("/my-vocabularies", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('user_vocabularies').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ vocabularies: data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/save-vocabulary", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const { title, category, level, words, vocabularyId, description, tags } = await c.req.json();
    if (!title || !words || words.length === 0) {
      return c.json({ error: 'Title and words are required' }, 400);
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag: any) => String(tag || '').trim()).filter(Boolean)
      : [];

    const supabase = getSupabaseClient();
    const vocabId = typeof vocabularyId === 'string' && vocabularyId.trim()
      ? vocabularyId.trim()
      : generateVocabularyId();
    
    const { data: vocabulary, error: vocabError } = await supabase.from('user_vocabularies').insert({
      id: vocabId,
      user_id: userId,
      title,
      category: category || 'My Vocabularies',
      level: level || 'Beginner',
      total_words: words.length,
      description: description || null,
      header_description: normalizedTags.length ? JSON.stringify({ tags: normalizedTags }) : null,
    }).select().single();
    if (vocabError) throw vocabError;
    
    const userWords = words.map((word: any, index: number) => {
      const payload = normalizeWordPayload(word);
      return {
        id: generateWordId(),
        user_id: userId,
        vocabulary_id: vocabId,
        ...payload,
        unit_number: Math.floor(index / 10) + 1,
        order_index: index + 1,
        status: 'learning',
        confidence: 0,
        last_reviewed_at: null,
        review_count: 0,
        is_starred: false,
        is_graveyard: false,
        is_wrong_answer: false,
      };
    });
    
    const { error: insertError } = await supabase.from('user_words').insert(userWords);
    if (insertError) throw insertError;
    console.log(`✅ Saved ${vocabId} with ${words.length} words`);
    return c.json({ vocabulary, success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post("/add-words-to-vocabulary", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const { vocabularyId, words } = await c.req.json();
    if (!vocabularyId || !words || words.length === 0) {
      return c.json({ error: 'vocabularyId and words are required' }, 400);
    }
    const supabase = getSupabaseClient();
    const { count: currentCount } = await supabase.from('user_words').select('*', { count: 'exact', head: true }).eq('vocabulary_id', vocabularyId).eq('user_id', userId);
    const startIndex = currentCount || 0;
    
    const userWords = words.map((word: any, index: number) => {
      const payload = normalizeWordPayload(word);
      const orderIndex = startIndex + index + 1;
      return {
        id: generateWordId(),
        user_id: userId,
        vocabulary_id: vocabularyId,
        ...payload,
        unit_number: Math.floor((orderIndex - 1) / 10) + 1,
        order_index: orderIndex,
        status: 'learning',
        confidence: 0,
        last_reviewed_at: null,
        review_count: 0,
        is_starred: false,
        is_graveyard: false,
        is_wrong_answer: false,
      };
    });
    
    const { error: insertError } = await supabase.from('user_words').insert(userWords);
    if (insertError) throw insertError;
    await supabase.from('user_vocabularies').update({ total_words: startIndex + words.length }).eq('id', vocabularyId).eq('user_id', userId);
    console.log(`✅ Added ${words.length} words to ${vocabularyId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ============================================
// AI ENDPOINTS
// ============================================

app.post("/generate-vocabulary-batch", (c) => handleWordGenerationRequest(c));
app.post("/generate-word-info", (c) => handleWordGenerationRequest(c));

app.post("/ai-chat", async (c) => {
  try {
    const { conversationHistory } = await c.req.json();
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return c.json({ error: 'conversationHistory is required' }, 400);
    }
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return c.json({ error: 'GEMINI_API_KEY not configured' }, 500);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: conversationHistory, generationConfig: { temperature: 0.7, maxOutputTokens: 1000 } })
      }
    );
    const data = await response.json();
    const message = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    return c.json({ message });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Regenerate examples and translations for existing vocabulary
app.post("/admin/regenerate-examples", async (c) => {
  try {
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

      const prompt = `You are a professional English vocabulary expert. Generate ONLY example sentences and translations for the following words.

INPUT WORDS:
${wordList}

TASK:
For EACH word, generate a JSON object with ONLY these fields:
1. word: The exact word from the input (unchanged)
2. example: One natural English sentence using the word (12-20 words)
3. translation: Korean translation of the example sentence that still includes the English word explicitly (e.g., "그는 항상 resilience(회복력)을 보여준다.")

CRITICAL REQUIREMENTS:
- Return a JSON array with EXACTLY ${batch.length} objects in the SAME ORDER as the input words
- Each object must include ALL 3 fields above
- translation must contain the English word itself
- Return ONLY valid JSON (no markdown, no extra commentary)

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

          if (!aiResult.example || !aiResult.translation) {
            console.error(`⚠️ Missing fields for word: ${wordData.word}`);
            errorCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('shared_words')
            .update({
              example: aiResult.example,
              translation: aiResult.translation,
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

// ============================================
// USER PROGRESS ENDPOINTS
// ============================================

app.get("/user-progress", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const supabase = getSupabaseClient();
    const { count } = await supabase.from('user_vocabularies').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    return c.json({ progress: { streakCount: 0, lastActiveDate: new Date().toISOString(), currentProgress: 0, totalQuizzesCompleted: count || 0, completedStages: [] } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/user-progress", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c);
    if (!userId) return unauthorizedResponse(c);
    const body = await c.req.json();
    return c.json({ progress: body });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
