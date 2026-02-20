function initPicture(){
	const endpoints = ['http://localhost:9000/picture/'];

	async function loadPicture(){
		const box = document.querySelector('.notice-text');
		if (!box){
			console.warn('未找到通知容器');
			return;
		}

		const fallback = box.innerHTML;
		for (const url of endpoints){
			try {
				const res = await fetch(url, { cache: 'no-store' });
				if (!res.ok) continue;
				const data = await res.json();
				const picUrl = typeof data.url === 'string' ? data.url : '';
				if (!picUrl) continue;

				// 清空并插入图片
				box.innerHTML = '';
				const img = document.createElement('img');
				img.src = picUrl;
				img.alt = '通知图片';
				img.className = 'notice-img';
				box.appendChild(img);

				return; // 成功后结束
			} catch (e) {
				// 尝试下一个端点
			}
		}

		console.warn('图片通知接口不可用或缺少url，保留占位内容');
		box.innerHTML = fallback;
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', loadPicture, { once: true });
	} else {
		loadPicture();
	}
}
