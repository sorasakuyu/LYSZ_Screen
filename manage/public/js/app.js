'use strict';

/* ===== 工具函数 ===== */
function apiBase() {
  return (document.getElementById('apiBase').value || 'http://localhost:9000').replace(/\/$/, '');
}

async function apiFetch(path, opts = {}) {
  const url = apiBase() + path;
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.detail || d.message || msg; } catch (ignored) { void ignored; }
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showModal(html, onSubmit) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  const form = overlay.querySelector('form');
  if (form && onSubmit) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      await onSubmit(form, overlay);
    });
  }
  return overlay;
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ===== 连接状态检测 ===== */
async function checkStatus() {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  try {
    await apiFetch('/config/');
    dot.className = 'status-dot online';
    label.textContent = '已连接';
  } catch (ignored) {
    void ignored;
    dot.className = 'status-dot offline';
    label.textContent = '未连接';
  }
}

/* ===== 路由 ===== */
const pages = {
  dashboard: renderDashboard,
  config: renderConfig,
  days: renderDays,
  video: renderVideo,
  notice: renderNotice,
  picture: renderPicture,
};

const pageTitles = {
  dashboard: '仪表盘',
  config: '显示模式',
  days: '倒数日管理',
  video: '视频管理',
  notice: '通知文本管理',
  picture: '通知图片管理',
};

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  const fn = pages[page];
  if (fn) fn();
}

/* ===== 仪表盘 ===== */
async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const [cfg, daysList] = await Promise.allSettled([
      apiFetch('/config/'),
      apiFetch('/days/'),
    ]);
    const mode = cfg.status === 'fulfilled' ? (cfg.value.mode || '未知') : '连接失败';
    const daysCount = daysList.status === 'fulfilled' ? daysList.value.length : '—';

    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">当前模式</span>
          <span class="stat-value" style="font-size:18px">${esc(mode)}</span>
          <span class="stat-sub">显示屏运行模式</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">倒数日</span>
          <span class="stat-value">${esc(String(daysCount))}</span>
          <span class="stat-sub">已配置条目</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">快速导航</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;" id="quickNav">
          ${Object.entries(pageTitles).filter(([k]) => k !== 'dashboard').map(([k, v]) =>
            `<button class="btn btn-ghost" data-page="${esc(k)}">${esc(v)}</button>`
          ).join('')}
        </div>
      </div>`;
    content.querySelectorAll('#quickNav [data-page]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.page));
    });
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

/* ===== 显示模式 ===== */
const MODES = [
  { key: 'default', icon: '🖥', name: '默认', desc: '标准显示屏模式' },
  { key: 'video', icon: '🎬', name: '视频', desc: '全屏视频播放模式' },
  { key: 'notice', icon: '📢', name: '通知', desc: '通知公告展示模式' },
];

async function renderConfig() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const data = await apiFetch('/config/');
    const current = data.mode || 'default';
    content.innerHTML = `
      <div class="card">
        <div class="card-title">选择显示模式</div>
        <div class="mode-grid">
          ${MODES.map(m => `
            <div class="mode-card ${m.key === current ? 'active' : ''}" data-mode="${m.key}">
              <div class="mode-icon">${m.icon}</div>
              <div class="mode-name">${m.name}</div>
              <div class="mode-desc">${m.desc}</div>
            </div>`).join('')}
        </div>
        <p style="margin-top:14px;font-size:13px;color:var(--text-muted)">点击卡片切换模式</p>
      </div>`;

    content.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => setMode(card.dataset.mode));
    });
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

async function setMode(mode) {
  try {
    await apiFetch('/config/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    toast(`已切换至「${mode}」模式`, 'success');
    renderConfig();
  } catch (e) {
    toast(`切换失败：${e.message}`, 'error');
  }
}

/* ===== 倒数日 ===== */
async function renderDays() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const rows = await apiFetch('/days/');
    content.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="card-title" style="margin:0">倒数日列表</div>
          <button class="btn btn-primary btn-sm" id="addDayBtn">＋ 新增</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>内容</th><th>日期</th><th>剩余天数</th><th>操作</th></tr></thead>
            <tbody>
              ${rows.length === 0 ? '<tr><td colspan="5"><div class="empty">暂无数据</div></td></tr>' :
                rows.map(r => {
                  const diff = Math.ceil((new Date(r.time) - new Date()) / 86400000);
                  const diffStr = diff > 0 ? `还有 ${diff} 天` : diff === 0 ? '今天' : `已过 ${-diff} 天`;
                  return `<tr>
                    <td>${esc(String(r.id))}</td>
                    <td>${esc(r.content)}</td>
                    <td>${esc(r.time)}</td>
                    <td>${diffStr}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${esc(String(r.id))}" data-content="${esc(r.content)}" data-time="${esc(r.time)}">编辑</button>
                      <button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(String(r.id))}" style="margin-left:6px">删除</button>
                    </td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    document.getElementById('addDayBtn').addEventListener('click', () => addDay());
    content.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => editDay(Number(btn.dataset.id), btn.dataset.content, btn.dataset.time));
    });
    content.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => deleteDay(Number(btn.dataset.id)));
    });
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

function addDay() {
  showModal(`
    <div class="modal-title">新增倒数日</div>
    <form>
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">内容</label>
        <input class="form-input" name="content" required placeholder="如：高考" />
      </div>
      <div class="form-group" style="margin-bottom:4px">
        <label class="form-label">日期</label>
        <input class="form-input" name="time" type="date" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>`, async (form, overlay) => {
    const body = { content: form.content.value, time: form.time.value };
    try {
      await apiFetch('/days/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      toast('新增成功', 'success');
      overlay.remove();
      renderDays();
    } catch (e) { toast(`失败：${e.message}`, 'error'); }
  });
}

function editDay(id, content, time) {
  showModal(`
    <div class="modal-title">编辑倒数日</div>
    <form>
      <div class="form-group" style="margin-bottom:12px">
        <label class="form-label">内容</label>
        <input class="form-input" name="content" value="${esc(content)}" required />
      </div>
      <div class="form-group" style="margin-bottom:4px">
        <label class="form-label">日期</label>
        <input class="form-input" name="time" type="date" value="${esc(time)}" required />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>`, async (form, overlay) => {
    const body = { content: form.content.value, time: form.time.value };
    try {
      await apiFetch(`/days/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      toast('更新成功', 'success');
      overlay.remove();
      renderDays();
    } catch (e) { toast(`失败：${e.message}`, 'error'); }
  });
}

async function deleteDay(id) {
  if (!confirm(`确认删除 ID=${id} 的倒数日？`)) return;
  try {
    await apiFetch(`/days/${id}`, { method: 'DELETE' });
    toast('已删除', 'success');
    renderDays();
  } catch (e) { toast(`失败：${e.message}`, 'error'); }
}

/* ===== 视频 ===== */
async function renderVideo() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const data = await apiFetch('/video/');
    const urls = Object.values(data);
    content.innerHTML = `
      <div class="card">
        <div class="card-title">视频 URL 配置</div>
        ${urls.length === 0
          ? '<div class="empty">暂无视频 URL</div>'
          : urls.map((u, i) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <input class="form-input" id="vurl${i}" value="${esc(u)}" readonly />
            </div>`).join('')}
        <div style="margin-top:16px">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">新视频 URL</label>
              <input class="form-input" id="newVideoUrl" placeholder="https://…" />
            </div>
            <button class="btn btn-primary" style="align-self:flex-end" onclick="setVideoUrl()">保存</button>
          </div>
        </div>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

async function setVideoUrl() {
  const val = document.getElementById('newVideoUrl').value.trim();
  if (!val) { toast('请输入 URL', 'error'); return; }
  try {
    await apiFetch('/video/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: val }) });
    toast('视频 URL 已更新', 'success');
    renderVideo();
  } catch (e) { toast(`失败：${e.message}`, 'error'); }
}

/* ===== 通知文本 ===== */
async function renderNotice() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const data = await apiFetch('/notice/');
    content.innerHTML = `
      <div class="card">
        <div class="card-title">通知文本配置</div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">标题</label>
          <input class="form-input" id="noticeTitle" value="${esc(data.title || '')}" />
        </div>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">内容</label>
          <textarea class="form-textarea" id="noticeContext">${esc(data.context || '')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveNotice()">保存</button>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

async function saveNotice() {
  const title = document.getElementById('noticeTitle').value.trim();
  const context = document.getElementById('noticeContext').value.trim();
  if (!title || !context) { toast('标题和内容不能为空', 'error'); return; }
  try {
    await apiFetch('/notice/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, context }) });
    toast('通知已保存', 'success');
  } catch (e) { toast(`失败：${e.message}`, 'error'); }
}

/* ===== 通知图片 ===== */
async function renderPicture() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const data = await apiFetch('/picture/');
    const urls = Object.values(data);
    content.innerHTML = `
      <div class="card">
        <div class="card-title">通知图片 URL 配置</div>
        ${urls.length === 0
          ? '<div class="empty">暂无图片 URL</div>'
          : urls.map((u, i) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <input class="form-input" id="purl${i}" value="${esc(u)}" readonly />
            </div>`).join('')}
        <div style="margin-top:16px">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">新图片 URL</label>
              <input class="form-input" id="newPicUrl" placeholder="https://…" />
            </div>
            <button class="btn btn-primary" style="align-self:flex-end" onclick="setPicUrl()">保存</button>
          </div>
        </div>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">加载失败：${esc(e.message)}</p></div>`;
  }
}

async function setPicUrl() {
  const val = document.getElementById('newPicUrl').value.trim();
  if (!val) { toast('请输入 URL', 'error'); return; }
  try {
    await apiFetch('/picture/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: val }) });
    toast('图片 URL 已更新', 'success');
    renderPicture();
  } catch (e) { toast(`失败：${e.message}`, 'error'); }
}

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', () => {
  // 侧边栏折叠
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuBtn').addEventListener('click', () => {
    if (window.innerWidth <= 640) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // 导航
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (window.innerWidth <= 640) sidebar.classList.remove('mobile-open');
      navigate(a.dataset.page);
    });
  });

  // API 地址变更时刷新状态
  document.getElementById('apiBase').addEventListener('change', () => {
    checkStatus();
    navigate('dashboard');
  });

  checkStatus();
  setInterval(checkStatus, 15000);
  navigate('dashboard');
});
