(function () {
  const tr = (window.MathArcadeI18n && window.MathArcadeI18n.t) || ((s) => s);

  const REPORTS = [
    {
      title: 'Letter Whack',
      key: 'dyslexiaScreening.letterwhack',
      fields: [
        [tr('Sessions'), (rows) => rows.length],
        [tr('Latest score'), (rows) => latest(rows).score || 0],
        [tr('Reversal errors'), (rows) => sum(rows, 'reversalErrors')],
        [tr('Median RT'), (rows) => formatMs(latest(rows).medianRtMs)]
      ],
      columns: [
        [tr('Date'), (row) => formatDate(row.date)],
        [tr('Score'), (row) => row.score || 0],
        [tr('Trials'), (row) => row.trials || 0],
        [tr('Reversals'), (row) => row.reversalErrors || 0],
        [tr('Median RT'), (row) => formatMs(row.medianRtMs)]
      ],
      empty: tr('Play Letter Whack to collect target-letter accuracy, reversal errors, and reaction-time samples.')
    },
    {
      title: 'Recall Crates',
      key: 'dyslexiaScreening.recallcrates',
      fields: [
        [tr('Sessions'), (rows) => rows.length],
        [tr('Latest score'), (rows) => latest(rows).score || 0],
        [tr('Best span'), (rows) => max(rows, 'maxSpan')],
        [tr('Order errors'), (rows) => sum(rows, 'orderErrors')]
      ],
      columns: [
        [tr('Date'), (row) => formatDate(row.date)],
        [tr('Score'), (row) => row.score || 0],
        [tr('Rounds'), (row) => row.rounds || 0],
        [tr('Max span'), (row) => row.maxSpan || 0],
        [tr('Order errors'), (row) => row.orderErrors || 0]
      ],
      empty: tr('Play Recall Crates to collect sequence span, order errors, and wrong-letter attempts.')
    },
    {
      title: 'Bee Buzz Says',
      key: 'dyslexiaScreening.beebuzzsays',
      fields: [
        [tr('Sessions'), (rows) => rows.length],
        [tr('Latest score'), (rows) => latest(rows).score || 0],
        [tr('Best span'), (rows) => max(rows, 'maxSpan')],
        [tr('Mirror confusions'), (rows) => sum(rows, 'mirrorConfusions')]
      ],
      columns: [
        [tr('Date'), (row) => formatDate(row.date)],
        [tr('Score'), (row) => row.score || 0],
        [tr('Rounds'), (row) => row.rounds || 0],
        [tr('Max span'), (row) => row.maxSpan || 0],
        [tr('Mirror taps'), (row) => row.mirrorConfusions || 0]
      ],
      empty: tr('Play Bee Buzz Says in solo mode to collect memory span and b/d/p/q mirror-confusion patterns.')
    }
  ];

  function readRows(key) {
    try {
      const store = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(store && store.history) ? store.history.slice(-8).reverse() : [];
    } catch (e) {
      return [];
    }
  }

  function latest(rows) {
    return rows[0] || {};
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  }

  function max(rows, key) {
    return rows.reduce((best, row) => Math.max(best, Number(row[key]) || 0), 0);
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatMs(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) + ' ms' : '-';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderMetrics(card, rows, fields) {
    const wrap = el('div', 'metrics');
    fields.forEach(([label, getValue]) => {
      const item = el('div', 'metric');
      item.appendChild(el('span', '', label));
      item.appendChild(el('b', '', String(getValue(rows))));
      wrap.appendChild(item);
    });
    card.appendChild(wrap);
  }

  function renderTable(card, rows, columns) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    columns.forEach(([label]) => tr.appendChild(el('th', '', label)));
    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row) => {
      const bodyRow = document.createElement('tr');
      columns.forEach(([, getValue]) => bodyRow.appendChild(el('td', '', String(getValue(row)))));
      tbody.appendChild(bodyRow);
    });
    table.appendChild(tbody);
    card.appendChild(table);
  }

  function renderReport(config) {
    const rows = readRows(config.key);
    const card = el('article', 'card');
    card.appendChild(el('h2', '', config.title));

    if (!rows.length) {
      card.appendChild(el('p', 'empty', config.empty));
      return card;
    }

    renderMetrics(card, rows, config.fields);
    renderTable(card, rows, config.columns);
    return card;
  }

  function init() {
    const grid = document.getElementById('report-grid');
    if (!grid) return;
    REPORTS.forEach((config) => grid.appendChild(renderReport(config)));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
