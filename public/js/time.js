function initTime() {
  const dateEl = document.getElementById('time-date');
  const clockEl = document.getElementById('time-clock');
  let serverOffset = 0;
  const weekMap = ['日', '一', '二', '三', '四', '五', '六'];

  const pad2 = (n) => n.toString().padStart(2, '0');
  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return {
      dateText: `${d.getFullYear()}年${pad2(d.getMonth() + 1)}月${pad2(d.getDate())}日 星期${weekMap[d.getDay()]}`,
      clockText: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    };
  };

  function updateTime() {
    const now = Date.now() + serverOffset;
    const { dateText, clockText } = formatTimestamp(now);
    if (dateEl) dateEl.textContent = dateText;
    if (clockEl) clockEl.textContent = clockText;
  }

  const endpoints = [
    'https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp'
  ];

  const fetchWithTimeout = (url, ms = 5000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, cache: 'no-store' }).finally(() => clearTimeout(t));
  };

  async function syncTime() {
    for (const url of endpoints) {
      try {
        const res = await fetchWithTimeout(url, 1);
        if (!res.ok) continue;
        let serverMs = null;
        if (url.includes('mtop.common.getTimestamp')) {
          const data = await res.json();
          serverMs = Number.parseInt(data?.data?.t, 10);
        } else if (url.includes('worldtimeapi')) {
          const data = await res.json();
          serverMs = new Date(data.datetime).getTime();
        } else {
          const data = await res.json();
          serverMs = data?.ts ?? data?.timestamp ?? null;
        }
        if (Number.isFinite(serverMs)) {
          serverOffset = serverMs - Date.now();
          return;
        }
      } catch (_) {
        // try next
      }
    }
    serverOffset = 0; // 全部失败则退回本地时间
  }

  syncTime().finally(() => {
    updateTime();
    setInterval(updateTime, 1000);
    setInterval(syncTime, 5 * 60 * 1000);
  });
}