async function initDays() {
  const ROTATE_MS = 5 * 1000;

  const byDate = (items) =>
    items
      .map((x) => ({ content: x.content, time: x.time }))
      .filter((x) => x.content && x.time)
      .sort((a, b) => new Date(a.time) - new Date(b.time));

  const daysLeft = (dateStr) => {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return '--';
    const now = new Date();
    const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(diffMs / 86400000));
  };

  function render(item, ui) {
    if (!ui.card || !ui.label || !ui.value || !ui.date) return;
    if (!item) {
      ui.label.textContent = '暂无倒数日';
      ui.value.textContent = '--';
      ui.date.textContent = '目标日：--';
    } else {
      ui.label.innerHTML = `距 ${item.content} 还有`;
      ui.value.textContent = daysLeft(item.time);
      ui.date.textContent = `目标日：${item.time}`;
    }
  }

  async function load() {
    const card = document.getElementById('countdown-card');
    const label = document.getElementById('countdown-label');
    const valueEl = document.getElementById('countdown-value');
    const dateEl = document.getElementById('countdown-date');
    if (!card || !label || !valueEl || !dateEl) return;

    let list = [];
    try {
      const res = await apiGet('/days/', 8000);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      list = Array.isArray(data) ? byDate(data) : [];
    } catch (e) {
      console.warn('倒数日获取失败', e);
    }

    if (!list.length) {
      render(null, { card, label, value: valueEl, date: dateEl });
      return;
    }

    let idx = 0;
    const tick = () => {
      const item = list[idx % list.length];
      render(item, { card, label, value: valueEl, date: dateEl });
      idx += 1;
    };
    tick();
    setInterval(tick, ROTATE_MS);
  }

  window.initDays = load;
  return load();
}
