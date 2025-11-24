// Google Cloud TTS Utility with Mobile Autoplay Support

// Audio cache for played words (global)
const audioCache = new Map<string, string>();
const audioBufferCache = new Map<string, AudioBuffer>();

// AudioContext for mobile autoplay support
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;

export interface TTSOptions {
  text: string;
  lang?: string;
  playbackRate?: number;
}

/**
 * Initialize AudioContext (must be called on user interaction)
 */
export function initAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (mobile requirement)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Preload audio for a card (call on user interaction to unlock autoplay)
 */
export async function preloadCardAudio(
  word: string,
  meaning: string
): Promise<void> {
  try {
    const ctx = initAudioContext();

    // Preload English word audio
    await loadAudioBuffer(`${word}_en-US`, word, 'en-US', ctx);

    // Preload Korean meaning audio
    await loadAudioBuffer(`${meaning}_ko-KR`, meaning, 'ko-KR', ctx);
  } catch (error) {
    console.error('Preload error:', error);
  }
}

/**
 * Load and cache audio buffer
 */
async function loadAudioBuffer(
  cacheKey: string,
  text: string,
  lang: string,
  ctx: AudioContext
): Promise<AudioBuffer | null> {
  // Check if already cached
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey)!;
  }

  try {
    // Get audio data
    const audioData = await fetchTTSAudio(text, lang);
    if (!audioData) return null;

    // Decode audio data
    const buffer = await ctx.decodeAudioData(audioData);
    audioBufferCache.set(cacheKey, buffer);
    return buffer;
  } catch (error) {
    console.error('Buffer load error:', error);
    return null;
  }
}

/**
 * Fetch TTS audio from API
 */
async function fetchTTSAudio(text: string, lang: string): Promise<ArrayBuffer | null> {
  try {
    // Check URL cache first
    const cacheKey = `${text}_${lang}`;
    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      console.log('[TTS] Fetching from API:', text, lang);
      const env = (import.meta as any).env;
      const supabaseUrl = env?.VITE_SUPABASE_URL || `https://ooxinxuphknbfhbancgs.supabase.co`;
      const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGlueHVwaGtuYmZoYmFuY2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDExMTQsImV4cCI6MjA3NDM3NzExNH0.lrbSZb3DTTWBkX3skjOHZ7N_WC_5YURB0ncDHFrwEzY';

      const response = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text, lang }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TTS] API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      console.log('[TTS] API response received');
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
      audioUrl = URL.createObjectURL(audioBlob);
      audioCache.set(cacheKey, audioUrl);
    } else {
      console.log('[TTS] Using cached URL');
    }

    // Fetch and return ArrayBuffer
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    console.log('[TTS] ArrayBuffer size:', arrayBuffer.byteLength);
    return arrayBuffer;
  } catch (error) {
    console.error('[TTS] Fetch error:', error);
    return null;
  }
}

/**
 * Fallback: play via a normal HTMLAudioElement (less picky than Web Audio)
 */
async function playWithHtmlAudio(text: string, lang: string, playbackRate: number): Promise<void> {
  const cacheKey = `${text}_${lang}`;
  let audioUrl = audioCache.get(cacheKey);

  try {
    // If not cached, fetch from API and cache URL
    if (!audioUrl) {
      const env = (import.meta as any).env;
      const supabaseUrl = env?.VITE_SUPABASE_URL || `https://ooxinxuphknbfhbancgs.supabase.co`;
      const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veGlueHVwaGtuYmZoYmFuY2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDExMTQsImV4cCI6MjA3NDM3NzExNH0.lrbSZb3DTTWBkX3skjOHZ7N_WC_5YURB0ncDHFrwEzY';

      const response = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text, lang }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[TTS] HTML audio API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
      audioUrl = URL.createObjectURL(audioBlob);
      audioCache.set(cacheKey, audioUrl);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl!);
      audio.playbackRate = playbackRate;
      currentHtmlAudio = audio;

      audio.onended = () => {
        currentHtmlAudio = null;
        resolve();
      };
      audio.onerror = (e) => {
        console.error('[TTS] HTML audio play error:', e);
        currentHtmlAudio = null;
        reject(e);
      };

      audio.play().catch(err => {
        console.error('[TTS] HTML audio start error:', err);
        currentHtmlAudio = null;
        reject(err);
      });
    });
  } catch (error) {
    console.error('[TTS] HTML audio fallback error:', error);
    throw error;
  }
}

/**
 * Speak text using AudioContext (for mobile autoplay support)
 */
export async function speakText(options: TTSOptions): Promise<void> {
  const { text, lang = 'en-US', playbackRate = 1.0 } = options;

  console.log('[TTS] Speaking:', text, lang, playbackRate);

  // Stop ALL current audio immediately
  stopAudio();

  try {
    const ctx = initAudioContext();
    console.log('[TTS] AudioContext initialized:', ctx.state);

    // Get or load audio buffer
    const cacheKey = `${text}_${lang}`;
    let buffer = audioBufferCache.get(cacheKey);

    if (!buffer) {
      console.log('[TTS] Loading audio buffer for:', text);
      const loadedBuffer = await loadAudioBuffer(cacheKey, text, lang, ctx);
      if (!loadedBuffer) {
        console.warn('[TTS] Failed to load buffer, using fallback');
        // Fallback to browser TTS if buffer loading failed
        return fallbackSpeakText(text, lang, playbackRate);
      }
      buffer = loadedBuffer;
      console.log('[TTS] Audio buffer loaded successfully');
    } else {
      console.log('[TTS] Using cached audio buffer');
    }

    // Play using AudioBufferSourceNode
    return new Promise((resolve, reject) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer!;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);

      currentSource = source;

      source.onended = () => {
        console.log('[TTS] Playback ended');
        currentSource = null;
        resolve();
      };

      try {
        source.start(0);
        console.log('[TTS] Playback started');
      } catch (error) {
        console.error('[TTS] AudioContext play error:', error);
        currentSource = null;
        // Web Audio failed; try HTML audio, then speech synthesis
        playWithHtmlAudio(text, lang, playbackRate)
          .then(resolve)
          .catch(() => fallbackSpeakText(text, lang, playbackRate).then(resolve).catch(reject));
      }
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    try {
      await playWithHtmlAudio(text, lang, playbackRate);
      return;
    } catch (htmlError) {
      console.error('[TTS] HTML fallback failed, using speech synthesis:', htmlError);
      return fallbackSpeakText(text, lang, playbackRate);
    }
  }
}

/**
 * Stop current audio playback
 */
export function stopAudio(): void {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Already stopped
    }
    currentSource = null;
  }
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentHtmlAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Fallback to browser's built-in TTS
 */
function fallbackSpeakText(text: string, lang: string, playbackRate: number): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    // Browser TTS rate is 0.1-10, normalize our 0.75-1.5 range
    utterance.rate = playbackRate * (lang === 'ko-KR' ? 0.9 : 0.85);
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Helper function to convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
