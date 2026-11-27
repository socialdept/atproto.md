import { VIZ } from './components';

// Range tabs switch the chart between 7 and 30 days, and hover or the arrow keys pick a day and show its counts.
export const CHART_SCRIPT = `
(() => {
  document.querySelectorAll('.chart-panel .tabs button').forEach((b) => b.addEventListener('click', () => {
    const panel = b.closest('.chart-panel');
    panel.querySelectorAll('.tabs button').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    panel.querySelectorAll('.range').forEach((r) => { r.hidden = r.dataset.range !== b.dataset.show; });
  }));
  const fmt = new Intl.NumberFormat('en-US');
  const rows = [['HTTP', 'http', '${VIZ.http}'], ['MCP', 'mcp', '${VIZ.mcp}'], ['Not split', 'earlier', '${VIZ.earlier}'], ['Errors', 'errors', '${VIZ.errors}']];
  document.querySelectorAll('.plot').forEach((plot) => {
    const tip = plot.querySelector('.tip');
    const cols = [...plot.querySelectorAll('.col')];
    let at = null;
    function show(i) {
      cols.forEach((c, j) => c.classList.toggle('on', j === i));
      at = i;
      if (i === null) { tip.hidden = true; return; }
      const d = cols[i].dataset;
      tip.innerHTML = '<p class="when">' + d.day + '</p>' + rows
        .filter(([, key]) => key !== 'earlier' || d.earlier !== '0')
        .map(([label, key, color]) => '<p><i style="background:' + color + '"></i><span class="muted">' + label + '</span><b>' + fmt.format(+d[key]) + '</b></p>').join('');
      tip.hidden = false;
      const left = ((i + 0.5) / cols.length) * 100;
      tip.style.left = left + '%';
      tip.style.transform = left > 60 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)';
    }
    const indexAt = (x) => { const r = plot.getBoundingClientRect(); return Math.min(cols.length - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * cols.length))); };
    plot.addEventListener('pointermove', (e) => show(indexAt(e.clientX)));
    plot.addEventListener('pointerleave', () => show(null));
    plot.addEventListener('blur', () => show(null));
    plot.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const i = at === null ? cols.length - 1 : at + (e.key === 'ArrowLeft' ? -1 : 1);
      show(Math.min(cols.length - 1, Math.max(0, i)));
    });
  });
})();`;
