function initNotice(){
	const endpoints = ['http://localhost:9000/notice/'];
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
		const t = setTimeout(() => ctrl.abort(), ms);
		return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
			.finally(() => clearTimeout(t));
	}

	async function loadNotice(){
		const titleEl = document.querySelector('.notice-title');
		const textBox = document.querySelector('.notice-text');
		if (!titleEl || !textBox) {
			console.warn('未找到通知容器');
			return;
		}

		const fallback = textBox.innerHTML;
		let ok = false;
		let items = [];

		for (const url of endpoints){
			try {
				const res = await fetchWithTimeout(url);
				if (!res.ok) continue;
				const data = await res.json();

				if (typeof data.title === 'string') titleEl.textContent = data.title;
				const context = typeof data.context === 'string' ? data.context : '';
				if (context){
					items = [context];
					ok = true;
					break;
				}
			} catch(e) {
				// 尝试下一个端点
			}
		}

		if (!ok){
			console.warn('通知接口不可用或被CORS拦截，保留占位内容');
			textBox.innerHTML = fallback;
			return;
		}

		const ul = document.createElement('ul');
		ul.className = 'notice-list';
		ul.style.margin = '0';
		ul.style.padding = '0 12px';
		ul.style.listStyle = 'disc';

		for (const text of items){
			const li = document.createElement('li');
			li.style.margin = '6px 0';
			li.innerHTML = escapeHtml(text);
			ul.appendChild(li);
		}

		startAutoScroll(textBox, ul);
	}

	function startAutoScroll(host, listEl){
		host.innerHTML = '';

		const root = getComputedStyle(document.documentElement);
		const varHeight = root.getPropertyValue('--notice-height').trim();
		const varSpeed = root.getPropertyValue('--notice-speed').trim();
		const viewportH = varHeight ? parseInt(varHeight, 10) : 360;
		let speed = varSpeed ? parseFloat(varSpeed) : 30; // px/s

		const viewport = document.createElement('div');
		viewport.style.height = viewportH + 'px';
		viewport.style.overflow = 'hidden';
		viewport.style.position = 'relative';
		viewport.style.padding = '0';
		viewport.style.margin = '0';
		host.appendChild(viewport);

		const scroller = document.createElement('div');
		scroller.style.willChange = 'transform';
		scroller.style.transform = 'translate3d(0,0,0)';
		scroller.style.backfaceVisibility = 'hidden';
		scroller.style.contain = 'layout paint';
		viewport.appendChild(scroller);

		scroller.appendChild(listEl);
		const clone = listEl.cloneNode(true);
		scroller.appendChild(clone);

		const threshold = listEl.scrollHeight;
		let offset = 0;
		let lastTs = null;

		function step(ts){
			if (lastTs == null) lastTs = ts;
			const dt = (ts - lastTs) / 1000;
			lastTs = ts;

			offset += speed * dt;
			if (offset >= threshold) offset -= threshold;
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
		if (next <= now) next.setDate(next.getDate() + 1);
		const delay = next.getTime() - now.getTime();
		dailyTimer = setTimeout(async () => {
			await loadNotice();
			scheduleDailyRefresh();
		}, delay);
	}

	function boot(){
		loadNotice();
		scheduleDailyRefresh();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot, { once: true });
	} else {
		boot();
	}
}
