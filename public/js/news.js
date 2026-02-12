(function(){
  const endpoints = [
    'http://localhost:4399/v2/60s'
  ];
  let dailyTimer = null;

  function escapeHtml(s){
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fetchWithTimeout(url, ms = 60000){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
      .finally(()=>clearTimeout(t));
  }

  async function loadNews(){
    const textBox = document.querySelector('.news-text');
    if (!textBox) {
      console.warn('未找到 .news-text 容器');
      return;
    }

    const fallback = textBox.innerHTML;

    let ok = false, items = [];
    for (const url of endpoints){
      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) continue;
        const json = await res.json();
        const data = json?.data ?? json;
        const newsArr = Array.isArray(data?.news) ? data.news : [];
        if (newsArr.length){
          items = newsArr;
          ok = true;
          break;
        }
      } catch(e){
        // 尝试下一个端点
      }
    }

    if (!ok){
      console.warn('新闻接口不可用或被CORS拦截，保留占位内容');
      textBox.innerHTML = fallback;
      return;
    }

    // 生成列表 DOM
    const ul = document.createElement('ul');
    ul.className = 'news-list';
    ul.style.margin = '0';
    ul.style.padding = '0 12px';
    ul.style.listStyle = 'disc';

    for (const text of items){
      const li = document.createElement('li');
      li.style.margin = '6px 0';
      li.innerHTML = escapeHtml(text);
      ul.appendChild(li);
    }

    // 将 .news-text 替换为滚动视口，避免溢出
    startAutoScroll(textBox, ul);
  }

  function startAutoScroll(host, listEl){
    host.innerHTML = '';

    const root = getComputedStyle(document.documentElement);
    const varHeight = root.getPropertyValue('--news-height').trim();
    const varSpeed  = root.getPropertyValue('--news-speed').trim();
    const viewportH = varHeight ? parseInt(varHeight, 10) : 360;
    let speed = varSpeed ? parseFloat(varSpeed) : 30; // px/s

    // 视口：裁剪溢出
    const viewport = document.createElement('div');
    viewport.style.height = viewportH + 'px';
    viewport.style.overflow = 'hidden';
    viewport.style.position = 'relative';
    viewport.style.padding = '0';
    viewport.style.margin = '0';
    host.appendChild(viewport);

    // 滚动容器：GPU 加速
    const scroller = document.createElement('div');
    scroller.style.willChange = 'transform';
    scroller.style.transform = 'translate3d(0,0,0)';
    scroller.style.backfaceVisibility = 'hidden';
    scroller.style.contain = 'layout paint';
    viewport.appendChild(scroller);

    // 原始列表 + 克隆列表（无缝循环）
    scroller.appendChild(listEl);
    const clone = listEl.cloneNode(true);
    scroller.appendChild(clone);

    const threshold = listEl.scrollHeight; // 一屏高度
    let offset = 0;
    let lastTs = null;

    function step(ts){
      if (lastTs == null) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      offset += speed * dt;
      if (offset >= threshold) offset -= threshold; // 无缝回到开头
      scroller.style.transform = `translate3d(0, ${-offset}px, 0)`;

      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

  }

  function scheduleDailyRefresh(){
    if (dailyTimer) clearTimeout(dailyTimer);
    const now = new Date();
    const next = new Date(now);
    next.setHours(10, 30, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1); // 如果已过10:30则排到明天
    const delay = next.getTime() - now.getTime();
    dailyTimer = setTimeout(async () => {
      await loadNews();
      scheduleDailyRefresh(); // 递归安排下一次
    }, delay);
  }

  // 暴露并执行：调用 initNews() 会立即加载新闻并安排每日刷新
  window.initNews = function(){
    loadNews();
    scheduleDailyRefresh();
  };
})();