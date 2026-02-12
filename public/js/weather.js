(function initWeather() {
  const API_URL = 'https://60s.viki.moe/v2/weather?query=临沂';
  const STATUS_URL = 'xiaomi_weather_status.json';
  const ICON_BASE = 'img/weather';
  const ALERT_ICON_BASE = 'img/weather/alerts';
  const ALERT_ICONS = { blue: 'blue.png', yellow: 'yellow.png', red: 'red.png', orange: 'orange.png' };
  const FALLBACK_CODE = 99;
  const REFRESH_MS = 10 * 60 * 1000;

  const fetchWithTimeout = (url, ms = 8000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, cache: 'no-store' }).finally(() => clearTimeout(timer));
  };

  async function loadStatusMap() {
    const res = await fetchWithTimeout(STATUS_URL, 4000);
    if (!res.ok) throw new Error('status map fetch failed');
    const json = await res.json();
    const list = Array.isArray(json?.weatherinfo) ? json.weatherinfo : [];
    const map = new Map();
    for (const item of list) {
      const code = Number.parseInt(item?.code, 10);
      if (Number.isFinite(code) && item?.wea) map.set(code, item.wea);
    }
    return map;
  }

  function parseCurrent(payload) {
    const weather = payload?.data?.weather ?? null;
    if (!weather) return null;
    const code = weather.condition_code ?? weather.code;
    const condition = weather.condition ?? null;
    const temperature = weather.temperature ?? null;
    return { code, temperature, condition };
  }

  function parseAlert(payload) {
    const alerts = Array.isArray(payload?.data?.alerts) ? payload.data.alerts : [];
    if (!alerts.length) return null;
    const first = alerts[0] ?? {};
    const level = (first.level || '').toLowerCase();
    const type = first.type || '';
    if (!level && !type) return null;
    return { level, type };
  }

  const fmt = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? Math.round(num).toString() : '--';
  };

  const refreshMarquee = (...els) => {
    requestAnimationFrame(() => {
      els.forEach((el) => {
        if (!el) return;
        el.classList.remove('alert-marquee');
        el.style.removeProperty('--scroll-distance');
        const overflow = el.scrollWidth - el.clientWidth;
        if (overflow > 2) {
          el.style.setProperty('--scroll-distance', `${overflow}px`);
          void el.offsetWidth; // restart animation
          el.classList.add('alert-marquee');
        }
      });
    });
  };

  function applyWeather(ui, statusMap, current) {
    const codeNum = Number.parseInt(current.code, 10);
    const safeCode = Number.isFinite(codeNum) ? codeNum : FALLBACK_CODE;
    const desc = statusMap.get(safeCode) ?? current.condition ?? '未知';
    const isDay = isDayTime();
    const iconName = isDay ? `${safeCode}` : `${safeCode}d`;
    const fallbackName = isDay ? `${FALLBACK_CODE}` : `${FALLBACK_CODE}d`;
    const iconSrc = `${ICON_BASE}/${iconName}.svg`;

    if (ui.icon) {
      ui.icon.src = iconSrc;
      ui.icon.alt = desc;
      ui.icon.onerror = () => {
        ui.icon.onerror = null;
        ui.icon.src = `${ICON_BASE}/${fallbackName}.svg`;
      };
    }
    if (ui.feels) ui.feels.textContent = `${fmt(current.temperature)}°C`;
  }

  function applyAlert(ui, alert) {
    if (!ui.icon || !ui.title || !ui.detail) return;
    const defaults = {
      title: '无预警',
      detail: '一切安好',
      icon: `${ALERT_ICON_BASE}/blue.png`,
    };

    if (!alert) {
      ui.icon.style.display = 'none';            // 无预警时隐藏图标
      ui.title.textContent = defaults.title;
      ui.detail.textContent = defaults.detail;
      refreshMarquee(ui.title, ui.detail);
      return;
    }

    const levelKey = (alert.level || '').toLowerCase();
    const iconFile = ALERT_ICONS[levelKey];
    ui.icon.style.display = '';                   // 有预警时显示图标
    ui.icon.src = iconFile ? `${ALERT_ICON_BASE}/${iconFile}` : defaults.icon;
    ui.icon.alt = alert.type || '天气预警';
    ui.icon.onerror = () => {
      ui.icon.onerror = null;
      ui.icon.src = defaults.icon;
    };
    ui.title.textContent = alert.level ? `${alert.level}预警` : '天气预警';
    ui.detail.textContent = alert.type || defaults.detail;
    refreshMarquee(ui.title, ui.detail);
  }

  const isDayTime = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
  };

  function setWeatherBackground() {
    const card = document.getElementById('weather-card');
    if (!card) return;
    const isDay = isDayTime();
    card.classList.remove('day', 'night');
    card.classList.add(isDay ? 'day' : 'night');
  }

  async function loadWeather() {
    setWeatherBackground(); // 每次刷新天气时同步切换背景

    const icon = document.getElementById('weather-icon');
    const feels = document.getElementById('feels-like');
    const alertIcon = document.getElementById('alert-icon');
    const alertTitle = document.getElementById('alert-title');
    const alertDetail = document.getElementById('alert-detail');
    if (!icon || !feels) return;

    let statusMap = new Map();
    try {
      statusMap = await loadStatusMap();
    } catch (e) {
      console.warn('天气状态码映射获取失败', e);
    }

    try {
      const res = await fetchWithTimeout(API_URL, 8000);
      if (!res.ok) throw new Error(`api status ${res.status}`);
      const data = await res.json();
      const current = parseCurrent(data);
      if (!current) throw new Error('missing current');
      applyWeather({ icon, feels }, statusMap, current);

      const alert = parseAlert(data);
      applyAlert({ icon: alertIcon, title: alertTitle, detail: alertDetail }, alert);
    } catch (e) {
      console.warn('天气获取失败，保留占位', e);
      if (feels) feels.textContent = '--°C';
      if (icon) icon.src = `${ICON_BASE}/${FALLBACK_CODE}.svg`;
      applyAlert(
        { icon: alertIcon, title: alertTitle, detail: alertDetail },
        null
      );
    }
  }

  window.initWeather = function () {
    loadWeather();
    setInterval(loadWeather, REFRESH_MS);
  };
})();