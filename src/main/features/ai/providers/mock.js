'use strict';
// Zero-dependency, zero-setup provider so FahOS runs the instant you `npm start`.
// It does not call any model — it echoes what it received so you can see the full
// UI -> IPC -> router -> provider -> UI round trip working. Swap to a real provider
// (ollama / gemini / openaiCompatible) in fahos.config.json when you are ready.
function createMockProvider() {
  return {
    name: 'mock',
    async generate({ prompt }) {
      const preview = (prompt || '').slice(0, 500);
      return [
        'FahOS is running on the MOCK provider (no real model connected yet).',
        '',
        'It received this request:',
        '"' + preview + '"',
        '',
        'To get real answers, edit fahos.config.json and set "aiProvider" to',
        '"ollama" (free & local), "gemini", or "openaiCompatible" (Groq / Featherless / OpenAI).'
      ].join('\n');
    },
    async analyzeImage() {
      return 'MOCK vision: connect a vision model (e.g. llava via Ollama, or gemini-1.5-flash) to describe screen regions.';
    }
  };
}
module.exports = { createMockProvider };
