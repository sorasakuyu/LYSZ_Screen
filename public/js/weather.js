async function initWeather() {
  const API_URL = 'https://ny4up3enmw.re.qweatherapi.com/v7/weather/now?location=101120911';
  const API_KEY = '7ff913a997ea42d5bd3bd8d1840aa0e5';
  const STATUS_URL = 'xiaomi_weather_status.json';
  const ICON_BASE = 'img/weather';
  const FALLBACK_CODE = 99;
  const REFRESH_MS = 10 * 60 * 1000;

  const fetchWithTimeout = (url, ms = 8000, options = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal, cache: 'no-store', ...options }).finally(() => clearTimeout(timer));
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
    if (!payload || payload.code !== '200') return null;
    const now = payload.now ?? null;
    if (!now) return null;
    const code = now.icon ?? null;
    const condition = now.text ?? null;
    const temperature = now.feelsLike ?? now.temp ?? null;
    return { code, temperature, condition };
  }

  const fmt = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? Math.round(num).toString() : '--';
  };

  function applyWeather(ui, statusMap, current) {
    const codeNum = Number.parseInt(current.code, 10);
    const safeCode = Number.isFinite(codeNum) ? codeNum : FALLBACK_CODE;
    const desc = statusMap.get(safeCode) ?? current.condition ?? '未知';
    const isDay = isDayTime();
    const iconName = isDay ? `${safeCode}` : `${safeCode}`;
    const fallbackName = isDay ? `${FALLBACK_CODE}` : `${FALLBACK_CODE}`;
    const iconSrc = `${ICON_BASE}/${iconName}.svg`;

    if (ui.icon) {
      ui.icon.src = iconSrc;
      ui.icon.alt = desc;
      ui.icon.onerror = () => {
        ui.icon.onerror = null;
        ui.icon.src = `${ICON_BASE}/${fallbackName}.svg`;
      };
    }
    const tempText = `${fmt(current.temperature)}°`;
    if (ui.feels) ui.feels.textContent = tempText;
    if (ui.temp) ui.temp.textContent = tempText;
    if (ui.desc) ui.desc.textContent = desc;
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
    const temp = document.getElementById('weather-temp');
    const desc = document.getElementById('weather-desc');
    if (!icon || !feels || !temp || !desc) return;

    let statusMap = new Map();
    try {
      statusMap = await loadStatusMap();
    } catch (e) {
      console.warn('天气状态码映射获取失败', e);
    }

    try {
      const weatherRes = await fetchWithTimeout(API_URL, 8000, {
        headers: { 'X-QW-Api-Key': API_KEY },
      });
      if (!weatherRes.ok) throw new Error(`api status ${weatherRes.status}`);

      const weatherData = await weatherRes.json();
      const current = parseCurrent(weatherData);
      if (!current) throw new Error('missing current');
      applyWeather({ icon, feels, temp, desc }, statusMap, current);

      // Alerts removed per request
    } catch (e) {
      console.warn('天气获取失败，保留占位', e);
      if (feels) feels.textContent = '--°C';
      if (temp) temp.textContent = '--°C';
      if (icon) icon.src = `${ICON_BASE}/${FALLBACK_CODE}.svg`;
      if (desc) desc.textContent = '未知';
    }
  }

  window.initWeather = function () {
    loadWeather();
    setInterval(loadWeather, REFRESH_MS);
  };

  return window.initWeather();
}