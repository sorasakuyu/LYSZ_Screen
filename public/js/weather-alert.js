/* weather-alert.js
   Fetch weather alerts from QWeather API and render into the page.
   Exposes window.initWeatherAlert() to initialize and auto-refresh.
*/
(function(){
  // Try a list of candidate URLs (local test JSON first, then the configured API).
  const API_CANDIDATES = [
    'https://ny4up3enmw.re.qweatherapi.com/weatheralert/v1/current/35.05280/118.34733'
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

  function rgbaFromColor(c){
    if(!c) return null;
    const r = c.red ?? 0;
    const g = c.green ?? 0;
    const b = c.blue ?? 0;
    const a = (c.alpha !== undefined) ? c.alpha : 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  async function renderAlert(){
    const data = await fetchAlert();
    const titleEl = document.getElementById('alert-title');
    const titleInner = titleEl ? (titleEl.querySelector('.alert-title-inner') || (function(){ const span = document.createElement('span'); span.className = 'alert-title-inner'; titleEl.textContent = ''; titleEl.appendChild(span); return span; })()) : null;
    const detailEl = document.getElementById('alert-detail');
    const iconEl = document.getElementById('alert-icon');

    if(!data || !data.alerts || data.alerts.length === 0){
      console.info('renderAlert: no alerts in data', data);
      if(titleInner){
        titleInner.textContent = '无预警';
        titleInner.classList.remove('alert-marquee');
        titleInner.style.removeProperty('--scroll-distance');
        titleInner.style.removeProperty('--marquee-duration');
      }
      if(detailEl){
        detailEl.textContent = '一切安好';
        detailEl.title = '';
      }
      return;
    }

    const alert = data.alerts[0];
    const eventName = (alert.eventType && alert.eventType.name) ? alert.eventType.name : (alert.title || '预警');
    const iconCode = alert.icon || (alert.eventType && (alert.eventType.name || '').toLowerCase());
    const color = rgbaFromColor(alert.color);

    console.info('renderAlert: alert object', alert);
    if(titleInner){
      titleInner.textContent = eventName;
      try{
        titleInner.classList.remove('alert-marquee');
        titleInner.style.removeProperty('--scroll-distance');
        titleInner.style.removeProperty('--marquee-duration');
        const viewportEl = titleInner.parentElement;
        const scrollW = titleInner.scrollWidth;
        const availW = viewportEl ? viewportEl.clientWidth : titleInner.clientWidth;
        const needsMarquee = eventName && eventName.length > 4;
        if(needsMarquee){
          // ensure there is always movement even if text barely overflows
          const baseDistance = scrollW - availW;
          const distance = Math.max(40, baseDistance, Math.round(scrollW * 0.4));
          const durationSec = Math.max(6, Math.round(distance / 40));
          titleInner.classList.add('alert-marquee');
          titleInner.style.setProperty('--scroll-distance', `${distance}px`);
          titleInner.style.setProperty('--marquee-duration', `${durationSec}s`);
        }
      }catch(e){
        console.warn('renderAlert: marquee setup failed', e);
      }
    }
    if(detailEl){
      const full = alert.description || alert.headline || alert.detail || '';
      detailEl.textContent = full;
      detailEl.title = full; // tooltip with full text
    }

    if(!iconEl) return;

    // Try to fetch the SVG and inline it so we can color it
    const svgPath = `img/weather/${iconCode}.svg`;
    try{
      const res = await fetch(svgPath, { cache: 'no-cache' });
      if(!res.ok) throw new Error('svg not found');
      const svgText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if(!svg) throw new Error('invalid svg');

      svg.setAttribute('id', 'alert-icon');
      svg.setAttribute('class', 'alert-icon');

      if(color){
        const styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `*{fill: ${color} !important;}`;
        svg.insertBefore(styleEl, svg.firstChild);
      }

      // Replace the <img> with inline svg
      iconEl.parentNode.replaceChild(svg, iconEl);
    }catch(e){
      // fallback: use png and apply a non-destructive drop-shadow filter as hint
      console.warn('load svg failed, fallback to png', e);
      const pngPath = `img/weather/alerts/${iconCode}.png`;
      if(iconEl.tagName.toLowerCase() === 'img'){
        iconEl.src = pngPath;
        if(color) iconEl.style.filter = `drop-shadow(0 0 0 ${color})`;
      }else{
        // if replaced already, just create an img
        const img = document.createElement('img');
        img.id = 'alert-icon';
        img.className = 'alert-icon';
        img.src = pngPath;
        if(color) img.style.filter = `drop-shadow(0 0 0 ${color})`;
        iconEl.parentNode.appendChild(img);
      }
    }
  }

  window.initWeatherAlert = function(){
    // initial render and periodic refresh
    renderAlert();
    setInterval(renderAlert, 5 * 60 * 1000);
  };
})();
