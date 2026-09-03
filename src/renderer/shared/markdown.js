'use strict';
// FahOS — Clean Lightweight Markdown, Math & Table Parser for Luxury Chat

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Converts raw LaTeX / math notation into clean human-readable unicode
function sanitizeMath(text) {
  if (!text) return '';
  return text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\cdot/g, '·')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\^0/g, '⁰')
    .replace(/\^1/g, '¹')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^4/g, '⁴')
    .replace(/\^5/g, '⁵')
    .replace(/\^6/g, '⁶')
    .replace(/\^7/g, '⁷')
    .replace(/\^8/g, '⁸')
    .replace(/\^9/g, '⁹')
    .replace(/\^n/g, 'ⁿ')
    .replace(/\^x/g, 'ˣ')
    .replace(/\^y/g, 'ʸ')
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([a-zA-Z0-9_\+\-\*\/\^\(\)\s=]{2,50})\$/g, '$1');
}

function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';

  // 1. Sanitize math expressions
  let cleaned = sanitizeMath(md);
  let html = escapeHtml(cleaned);

  // 2. Fenced Code Blocks
  html = html.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    return `<div class="ai-code-wrapper"><div class="ai-code-header">${lang || 'code'}</div><pre class="ai-code-block"><code>${code.trim()}</code></pre></div>`;
  });

  // 3. Inline Code
  html = html.replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>');

  // 4. Headings
  html = html.replace(/^### (.*$)/gim, '<h4 class="ai-h4">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="ai-h3">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="ai-h2">$1</h2>');

  // 5. Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="ai-strong">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="ai-strong">$1</strong>');
  html = html.replace(/\*([^\*\n]+)\*/g, '<em class="ai-em">$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em class="ai-em">$1</em>');

  // 6. Line-by-Line Parser for Tables, Lists, and Paragraphs
  const rawLines = html.split(/\r?\n/);
  const formatted = [];
  let inList = false;
  let inNumList = false;

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();
    if (!line) {
      if (inList) { formatted.push('</ul>'); inList = false; }
      if (inNumList) { formatted.push('</ol>'); inNumList = false; }
      i++;
      continue;
    }

    // Check for Markdown Table:
    // Header line: | a | b |
    // Delimiter line: | --- | :---: |
    if (line.startsWith('|') && line.endsWith('|') && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1].trim();
      if (nextLine.startsWith('|') && nextLine.endsWith('|') && /^\|[\s\-:|]+\|$/.test(nextLine)) {
        if (inList) { formatted.push('</ul>'); inList = false; }
        if (inNumList) { formatted.push('</ol>'); inNumList = false; }

        const parseCells = (row) => {
          const inner = row.replace(/^\|/, '').replace(/\|$/, '');
          return inner.split('|').map(c => c.trim());
        };

        const headers = parseCells(line);
        i += 2; // skip header and delimiter
        const rows = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          rows.push(parseCells(rawLines[i].trim()));
          i++;
        }

        let tableHtml = '<div class="ai-table-wrap"><table class="ai-table"><thead><tr>';
        for (const h of headers) {
          tableHtml += `<th>${h}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        for (const r of rows) {
          tableHtml += '<tr>';
          for (let col = 0; col < headers.length; col++) {
            tableHtml += `<td>${r[col] !== undefined ? r[col] : ''}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        formatted.push(tableHtml);
        continue;
      }
    }

    // Pass through already generated code blocks directly
    if (line.startsWith('<div class="ai-code')) {
      if (inList) { formatted.push('</ul>'); inList = false; }
      if (inNumList) { formatted.push('</ol>'); inNumList = false; }
      formatted.push(line);
      i++;
      continue;
    }

    // Bullet item (* or - or •)
    const bullet = line.match(/^[\*\-\•]\s+(.*)$/);
    // Numbered item (1. or 2.)
    const numbered = line.match(/^(\d+)\.\s+(.*)$/);

    if (bullet) {
      if (inNumList) { formatted.push('</ol>'); inNumList = false; }
      if (!inList) { formatted.push('<ul class="ai-list">'); inList = true; }
      formatted.push(`<li>${bullet[1]}</li>`);
    } else if (numbered) {
      if (inList) { formatted.push('</ul>'); inList = false; }
      if (!inNumList) { formatted.push('<ol class="ai-num-list">'); inNumList = true; }
      formatted.push(`<li>${numbered[2]}</li>`);
    } else {
      if (inList) { formatted.push('</ul>'); inList = false; }
      if (inNumList) { formatted.push('</ol>'); inNumList = false; }

      if (line.startsWith('<h2') || line.startsWith('<h3') || line.startsWith('<h4')) {
        formatted.push(line);
      } else {
        formatted.push(`<p class="ai-p">${line}</p>`);
      }
    }
    i++;
  }

  if (inList) formatted.push('</ul>');
  if (inNumList) formatted.push('</ol>');

  return formatted.join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderMarkdown, sanitizeMath };
} else {
  window.renderMarkdown = renderMarkdown;
  window.sanitizeMath = sanitizeMath;
}
