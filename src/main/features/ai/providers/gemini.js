'use strict';
// Google Gemini (has a generous free tier). Get a key at https://aistudio.google.com/apikey
// then set "aiProvider": "gemini" and providers.gemini.apiKey in fahos.config.json
// (or the GEMINI_API_KEY env var). The key is read only in the main process.
function createGeminiProvider(cfg) {
  const model = cfg.model || 'gemini-1.5-flash';
  function endpoint() {
    if (!cfg.apiKey) throw new Error('Gemini API key missing — set providers.gemini.apiKey or GEMINI_API_KEY.');
    return 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + cfg.apiKey;
  }
  function textOf(data) {
    try { return data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join(''); }
    catch (e) { return ''; }
  }
  return {
    name: 'gemini',
    async generate({ system, prompt }) {
      const res = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });
      if (!res.ok) throw new Error('Gemini HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
      return textOf(await res.json());
    },
    async analyzeImage({ system, prompt, imageBase64, mime }) {
      const res = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [
            { text: prompt },
            { inline_data: { mime_type: mime || 'image/png', data: imageBase64 } }
          ] }]
        })
      });
      if (!res.ok) throw new Error('Gemini vision HTTP ' + res.status);
      return textOf(await res.json());
    }
  };
}
module.exports = { createGeminiProvider };
