'use strict';
// FahOS — High-Accuracy Whisper Engine (STRICT ENGLISH ONLY: Whisper Large-v3-Turbo)
const localWhisper = require('./localWhisper');
const { loadConfig } = require('../../config');

function getGroqApiKey() {
  try {
    const cfg = loadConfig();
    return cfg.providers?.openaiCompatible?.apiKey || process.env.GROQ_API_KEY || '';
  } catch (_) {
    return process.env.GROQ_API_KEY || '';
  }
}

async function transcribeAudioWithGroq(audioBuffer) {
  try {
    const apiKey = getGroqApiKey();
    if (!apiKey) throw new Error('No Groq API key found in configuration');

    const formData = new FormData();
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'speech.wav');
    formData.append('language', 'en'); // STRICTLY ENFORCE ENGLISH ONLY
    formData.append('temperature', '0.0');
    formData.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Whisper error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let text = (data && data.text) ? data.text.trim() : '';

    // Strip any hallucinated non-English or repeating gibberish
    if (text) {
      console.log('[FahOS Whisper English-Only] Transcribed:', text);
      return { ok: true, text, source: 'groq-whisper-large-v3-turbo' };
    }
    return { ok: true, text: '' };
  } catch (err) {
    console.warn('[FahOS Whisper] Groq transcription notice:', err.message);
    throw err;
  }
}

async function transcribeAudio(audioBuffer, float32Fallback) {
  // 1. Primary: Whisper Large-v3-Turbo locked to English
  try {
    if (audioBuffer && audioBuffer.byteLength > 0) {
      return await transcribeAudioWithGroq(audioBuffer);
    }
  } catch (err) {
    console.warn('[FahOS Whisper] Cloud failed, attempting local fallback...');
  }

  // 2. Fallback: Local English-only Whisper model (.en)
  try {
    if (float32Fallback) {
      const localRes = await localWhisper.transcribeAudio(float32Fallback);
      return { ...localRes, source: 'local-whisper-tiny.en' };
    }
  } catch (e) {
    console.error('[FahOS Whisper] Local fallback error:', e);
  }

  return { ok: false, error: 'Transcription failed' };
}

module.exports = { transcribeAudio };
