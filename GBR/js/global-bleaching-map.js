/* global-bleaching-map.js
 *
 * Loads Vega_Specs/global-bleaching-map.json as the visual template,
 * then handles the interactive controls (dropdown + year slider) and
 * injects filtered data before each vegaEmbed call.
 *
 * Requires: vegaEmbed (loaded globally in main_index.html)
 */
(function () {
  'use strict';

  const SPEC_URL = 'Vega_Specs/global-bleaching-map.json';
  const DATA_URL = 'data/global_bleaching_processed.json';

  /* Index of the survey-site layer inside spec.layer[] */
  const DATA_LAYER = 3;

  /* ── Parameter configuration ─────────────────────────────────────────── */
  const PARAMS = [
    {
      field:  'bleaching',
      label:  'Bleaching (%)',
      scheme: { scheme: 'reds' },
      desc:   'Percentage of coral colonies showing bleaching at each survey site. ' +
              'Dark red = severe bleaching.'
    },
    {
      field:  'cover',
      label:  'Coral Cover (%)',
      scheme: { scheme: 'greens' },
      desc:   'Live coral as a percentage of substrate surveyed. ' +
              'Dark green = healthier reef.'
    },
    {
      field:  'temp_c',
      label:  'Mean Temp (°C)',
      scheme: { scheme: 'inferno' },
      desc:   'Mean sea-surface temperature in °C. ' +
              'Bleaching typically occurs ≥ 1 °C above the local long-term average.'
    },
    {
      field:  'ssta',
      label:  'SST Anomaly (°C)',
      scheme: { scheme: 'blueorange', domainMid: 0, type: 'diverging' },
      desc:   'Sea-surface temperature anomaly. ' +
              'Orange = warmer than average (thermal stress); blue = cooler than average.'
    }
  ];

  /* ── State ──────────────────────────────────────────────────────────── */
  let baseSpec     = null;   /* parsed JSON template */
  let allData      = null;   /* full processed dataset */
  let currentParam = 'bleaching';
  let currentYear  = 2010;
  let renderTimer  = null;

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function paramCfg(field) {
    return PARAMS.find(p => p.field === field) || PARAMS[0];
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  function render() {
    if (!baseSpec || !allData) return;

    const p = paramCfg(currentParam);

    /* Pre-filter data in JS — fast since data is already in memory */
    const yearData = allData.filter(
      d => d.year === currentYear && d[currentParam] !== null
    );

    /* Deep-clone the template so we never mutate the original */
    const spec = JSON.parse(JSON.stringify(baseSpec));
    const layer = spec.layer[DATA_LAYER];

    /* Inject filtered data */
    layer.data.values = yearData;

    /* Update color encoding */
    layer.encoding.color.field        = currentParam;
    layer.encoding.color.scale        = p.scheme;
    layer.encoding.color.legend.title = p.label;

    /* Update the dynamic tooltip slot (index 3 = the param value) */
    layer.encoding.tooltip[3] = {
      field:  currentParam,
      type:   'quantitative',
      title:  p.label,
      format: '.2f'
    };

    vegaEmbed('#gbm-chart', spec, { actions: false, renderer: 'svg' })
      .catch(err => console.error('[global-bleaching-map] embed error:', err));
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 160);
  }

  /* ── Site count badge ────────────────────────────────────────────────── */
  function updateCount() {
    if (!allData) return;
    const n  = allData.filter(d => d.year === currentYear && d[currentParam] !== null).length;
    const el = document.getElementById('gbm-count');
    if (el) el.textContent = n.toLocaleString() + ' sites';
  }

  /* ── Build controls ──────────────────────────────────────────────────── */
  function buildControls(container) {

    /* Shared label style */
    const LBL = 'color:#a8d4df;font-size:0.8rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;';

    /* ── Wrapper row ── */
    const row = document.createElement('div');
    row.setAttribute('style', [
      'display:flex', 'align-items:center', 'gap:20px', 'flex-wrap:wrap',
      'background:rgba(0,20,35,0.55)', 'border-radius:8px',
      'padding:10px 16px', 'margin-bottom:10px',
      'border:1px solid rgba(94,200,192,0.15)'
    ].join(';'));

    /* ── Dropdown ── */
    const ddWrap = document.createElement('div');
    ddWrap.setAttribute('style', 'display:flex;align-items:center;gap:8px;');

    const ddLbl = document.createElement('label');
    ddLbl.setAttribute('for', 'gbm-param-select');
    ddLbl.setAttribute('style', LBL);
    ddLbl.textContent = 'Parameter';

    const dd = document.createElement('select');
    dd.id = 'gbm-param-select';
    dd.setAttribute('style', [
      'background:rgba(0,30,50,0.92)', 'color:#e8f4f8',
      'border:1px solid rgba(94,200,192,0.4)', 'border-radius:6px',
      'padding:5px 12px', 'font-family:inherit', 'font-size:0.88rem',
      'cursor:pointer', 'outline:none'
    ].join(';'));

    PARAMS.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.field;
      opt.textContent = p.label;
      if (p.field === currentParam) opt.selected = true;
      dd.appendChild(opt);
    });

    ddWrap.appendChild(ddLbl);
    ddWrap.appendChild(dd);

    /* ── Year slider ── */
    const slWrap = document.createElement('div');
    slWrap.setAttribute('style', 'display:flex;align-items:center;gap:10px;flex:1;min-width:220px;');

    const slLbl = document.createElement('label');
    slLbl.setAttribute('for', 'gbm-year-slider');
    slLbl.setAttribute('style', LBL + 'white-space:nowrap;');
    slLbl.textContent = 'Year';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.id    = 'gbm-year-slider';
    slider.min   = '1980';
    slider.max   = '2020';
    slider.step  = '1';
    slider.value = String(currentYear);
    slider.setAttribute('style', 'flex:1;accent-color:#5ec8c0;cursor:pointer;min-width:140px;');

    const yearBadge = document.createElement('span');
    yearBadge.id = 'gbm-year-badge';
    yearBadge.setAttribute('style', 'color:#5ec8c0;font-family:monospace;font-size:1rem;font-weight:700;min-width:42px;');
    yearBadge.textContent = String(currentYear);

    const countBadge = document.createElement('span');
    countBadge.id = 'gbm-count';
    countBadge.setAttribute('style', 'color:#a8d4df;font-size:0.78rem;font-weight:600;white-space:nowrap;margin-left:auto;');

    slWrap.appendChild(slLbl);
    slWrap.appendChild(slider);
    slWrap.appendChild(yearBadge);
    slWrap.appendChild(countBadge);

    row.appendChild(ddWrap);
    row.appendChild(slWrap);

    /* ── Description text ── */
    const desc = document.createElement('p');
    desc.id = 'gbm-desc';
    desc.setAttribute('style', 'font-size:0.83rem;color:#6fb3c4;margin:0 0 8px;line-height:1.55;font-style:italic;');
    desc.textContent = paramCfg(currentParam).desc;

    container.appendChild(row);
    container.appendChild(desc);

    /* ── Events ── */
    dd.addEventListener('change', function () {
      currentParam = this.value;
      document.getElementById('gbm-desc').textContent = paramCfg(currentParam).desc;
      updateCount();
      render();
    });

    slider.addEventListener('input', function () {
      currentYear = parseInt(this.value, 10);
      document.getElementById('gbm-year-badge').textContent = currentYear;
      updateCount();
      scheduleRender();
    });
  }

  /* ── Entry point ─────────────────────────────────────────────────────── */
  async function init() {
    const controlsEl = document.getElementById('gbm-controls');
    const chartEl    = document.getElementById('gbm-chart');
    if (!controlsEl || !chartEl) return;

    buildControls(controlsEl);

    try {
      /* Load spec template and data in parallel */
      const [specResp, dataResp] = await Promise.all([
        fetch(SPEC_URL),
        fetch(DATA_URL)
      ]);
      baseSpec = await specResp.json();
      allData  = await dataResp.json();
      updateCount();
      render();
    } catch (e) {
      console.error('[global-bleaching-map] Failed to load resources:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
