function initPicture(){
	async function loadPicture(){
		const box = document.querySelector('.notice-text');
		if (!box){
			console.warn('未找到通知容器');
			return;
		}

		const fallback = box.innerHTML;
		try {
			const res = await apiGet('/picture/', 8000);
			if (!res.ok) throw new Error('fetch failed');
			const data = await res.json();
			const picUrl = typeof data.url === 'string' ? data.url : '';
			if (!picUrl) throw new Error('no url');

			box.innerHTML = '';
			const img = document.createElement('img');
			img.src = picUrl;
			img.alt = '通知图片';
			img.className = 'notice-img';
			box.appendChild(img);

			return;
		} catch (e) {
			console.warn('图片通知接口不可用或缺少url，保留占位内容');
			box.innerHTML = fallback;
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', loadPicture, { once: true });
	} else {
		loadPicture();
	}
}
