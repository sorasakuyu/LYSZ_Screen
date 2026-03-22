/* weather-alert.js
   Fetch weather data from QWeather API and render into the page.
   Exposes window.initWeatherAlert() to initialize and auto-refresh.
*/
(function(){
  const API_CANDIDATES = [
    'http://localhost:9000/weather/3d'
  ];
  const API_KEY = "7ff913a997ea42d5bd3bd8d1840aa0e5";

  let currentData = null;
  let switchInterval = null;
  let showingTemp = true;

  async function fetchAlert(){
    for(const url of API_CANDIDATES){
      try{
        const res = await fetch(url, { headers: { 'X-QW-Api-Key': API_KEY }, cache: 'no-cache' });
        if(!res.ok){
          console.warn(`fetchAlert: ${url} returned status ${res.status}`);
          continue;
        }
        try{
          const json = await res.json();
          console.info('fetchAlert: got data from', url);
          return json;
        }catch(parseErr){
          console.warn('fetchAlert: JSON parse error from', url, parseErr);
          continue;
        }
      }catch(e){
        console.warn('fetchAlert: fetch failed for', url, e);
        continue;
      }
    }
    console.error('fetchAlert: all candidate URLs failed');
    return null;
  }

  async function loadWeatherIcon(iconCode, containerId){
    const container = document.getElementById(containerId);
    if(!container) return;

    const svgPath = `/img/weather/${iconCode}.svg`;
    try{
      const res = await fetch(svgPath, { cache: 'no-cache' });
      if(!res.ok) throw new Error('svg not found');
      const svgText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if(!svg) throw new Error('invalid svg');

      svg.setAttribute('class', 'weather-icon-svg');
      svg.style.width = '100%';
      svg.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(svg);
    }catch(e){
      console.warn('loadWeatherIcon: failed to load', svgPath, e);
      const img = document.createElement('img');
      img.src = `/img/weather/${iconCode}.png`;
      img.style.width = '100%';
      img.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(img);
    }
  }

  function renderTemperature(daily){
    const titleEl = document.getElementById('alert-title');
    const titleInner = titleEl ? (titleEl.querySelector('.alert-title-inner') || (function(){ const span = document.createElement('span'); span.className = 'alert-title-inner'; titleEl.textContent = ''; titleEl.appendChild(span); return span; })()) : null;
    const detailEl = document.getElementById('alert-detail');

    if(titleInner){
      titleInner.textContent = '今日天气';
      titleInner.classList.remove('alert-marquee');
      titleInner.style.removeProperty('--scroll-distance');
      titleInner.style.removeProperty('--marquee-duration');
    }

    if(detailEl && daily){
      const tempMax = daily.tempMax ?? '--';
      const tempMin = daily.tempMin ?? '--';
      detailEl.textContent = `${tempMax}/${tempMin}℃`;
      detailEl.title = `最高温度: ${tempMax}℃, 最低温度: ${tempMin}℃`;
    }
  }

  async function renderWeatherIcons(daily){
    const detailEl = document.getElementById('alert-detail');

    if(detailEl && daily){
      const iconDay = daily.iconDay ?? '--';
      const iconNight = daily.iconNight ?? '--';

      detailEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%;">
          <div id="weather-icon-day" style="width: 32px; height: 32px;"></div>
          <span style="font-size: 14px; color: inherit;">/</span>
          <div id="weather-icon-night" style="width: 32px; height: 32px;"></div>
        </div>
      `;
      detailEl.title = `白天天气图标: ${iconDay}, 夜间天气图标: ${iconNight}`;

      await Promise.all([
        loadWeatherIcon(iconDay, 'weather-icon-day'),
        loadWeatherIcon(iconNight, 'weather-icon-night')
      ]);
    }
  }

  async function switchContent(){
    if(!currentData || !currentData.daily || currentData.daily.length === 0) return;

    const daily = currentData.daily[0];
    const detailEl = document.getElementById('alert-detail');

    if(!detailEl) return;

    detailEl.style.transition = 'opacity 0.5s ease';
    detailEl.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 500));

    showingTemp = !showingTemp;
    if(showingTemp){
      renderTemperature(daily);
    }else{
      await renderWeatherIcons(daily);
    }

    detailEl.style.opacity = '1';
  }

  async function renderAlert(){
    const data = await fetchAlert();
    const titleEl = document.getElementById('alert-title');
    const titleInner = titleEl ? (titleEl.querySelector('.alert-title-inner') || (function(){ const span = document.createElement('span'); span.className = 'alert-title-inner'; titleEl.textContent = ''; titleEl.appendChild(span); return span; })()) : null;
    const detailEl = document.getElementById('alert-detail');

    if(!data || !data.daily || data.daily.length === 0){
      console.info('renderAlert: no daily data', data);
      if(titleInner){
        titleInner.textContent = '今日天气';
        titleInner.classList.remove('alert-marquee');
        titleInner.style.removeProperty('--scroll-distance');
        titleInner.style.removeProperty('--marquee-duration');
      }
      if(detailEl){
        detailEl.textContent = '暂无数据';
        detailEl.title = '';
      }
      currentData = null;
      if(switchInterval){
        clearInterval(switchInterval);
        switchInterval = null;
      }
      return;
    }

    currentData = data;
    showingTemp = true;
    renderTemperature(data.daily[0]);

    if(switchInterval){
      clearInterval(switchInterval);
    }
    switchInterval = setInterval(switchContent, 5000);
  }

  window.initWeatherAlert = function(){
    renderAlert();
    setInterval(renderAlert, 5 * 60 * 1000);
  };
})();
