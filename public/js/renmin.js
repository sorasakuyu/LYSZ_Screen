async function initRenmin() {
  const quoteEl = document.querySelector('.quote-text');
  const meaningEl = document.querySelector('.quote-meaning');
  if (!quoteEl) return;

  // 在释义区域下方追加主题行
  let themeLineEl = null;
  if (meaningEl) {
    themeLineEl = document.createElement('div');
    themeLineEl.className = 'quote-theme';
    meaningEl.parentNode.insertBefore(themeLineEl, meaningEl.nextSibling);
  }

  const fallbackQuoteHTML = quoteEl.innerHTML;
  let fallbackMeaningHTML = null;
  if (meaningEl) {
    fallbackMeaningHTML = meaningEl.innerHTML;
  }

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const textToHtmlWithBr = (s) =>
    escapeHtml(s).replace(/\r\n|\n|\r/g, '<br>');

  const isBlank = (s) => {
    if (s == null) return true;
    return String(s).replace(/\r\n|\n|\r/g, '').trim().length === 0;
  };

  const setMeaning = (text) => {
    if (!meaningEl) return;
    meaningEl.innerHTML = '<strong>释义：</strong><br>' + textToHtmlWithBr(text || '');
  };

  const setTheme = (text) => {
    if (!themeLineEl) return;
    const normalized = (text || '').trim();
    if (!normalized) {
      themeLineEl.innerHTML = '';
      return;
    }
    const parts = normalized.split('、').map(s => s.trim()).filter(Boolean);
    if (!parts.length) {
      themeLineEl.innerHTML = '';
      return;
    }
    const display = parts.map(p => `【${escapeHtml(p)}】`).join('');
    themeLineEl.innerHTML = `<strong>使用主题：</strong>${display}`;
  };

  try {
    const res = await fetch('http://localhost:9000/renmin/', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let data;
    try {
      data = await res.json();
    } catch (_) {
      throw new Error('Invalid JSON');
    }

    const payload = (data && typeof data === 'object' && data.data && typeof data.data === 'object')
      ? data.data
      : data;

    const content = payload?.content ?? null;
    const def = payload?.defination ?? null;
    const theme = payload?.theme ?? '';

    if (content != null) {
      quoteEl.innerHTML = textToHtmlWithBr(content);
    } else {
      quoteEl.innerHTML = fallbackQuoteHTML;
    }

    if (meaningEl) {
      if (!isBlank(def)) {
        setMeaning(def);
      } else {
        // 成功但释义为空：不显示“释义：”和其内容
        meaningEl.innerHTML = '';
      }
    }

    // 主题行
    setTheme(theme);
  } catch (err) {
    console.warn('加载每日金句失败', err);
    quoteEl.innerHTML = fallbackQuoteHTML;
    if (meaningEl && fallbackMeaningHTML != null) meaningEl.innerHTML = fallbackMeaningHTML;
    if (themeLineEl) themeLineEl.innerHTML = '';
  }
}