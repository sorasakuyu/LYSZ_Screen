/* weather-alert.js
   Fetch weather data from QWeather API and render into the page.
   Exposes window.initWeatherAlert() to initialize and auto-refresh.
*/
(function(){
  const API_CANDIDATES = [
    'http://localhost:9000/weather/3d'
  ];
  const API_KEY = "7ff913a997ea42d5bd3bd8d1840aa0e5";

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
      detailEl.style.textAlign = 'center';
      detailEl.style.display = 'flex';
      detailEl.style.alignItems = 'center';
      detailEl.style.justifyContent = 'center';
    }
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
        detailEl.style.textAlign = 'center';
        detailEl.style.display = 'flex';
        detailEl.style.alignItems = 'center';
        detailEl.style.justifyContent = 'center';
      }
      return;
    }

    renderTemperature(data.daily[0]);
  }

  window.initWeatherAlert = function(){
    renderAlert();
    setInterval(renderAlert, 5 * 60 * 1000);
  };
})();
