/* Calorie & Macro Counter — plain JS, no dependencies, all data stored locally. */
(function () {
  'use strict';

  // ---------- constants & helpers ----------
  var STORE_KEY = 'calorieCounter.v1';
  var MEALS = [
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'dinner', name: 'Dinner' },
    { id: 'snacks', name: 'Snacks' }
  ];
  var NUTR = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
  var MACROS = [
    { k: 'protein', label: 'Protein' },
    { k: 'carbs', label: 'Carbs' },
    { k: 'fat', label: 'Fat' },
    { k: 'fiber', label: 'Fiber' },
    { k: 'sugar', label: 'Sugar', limit: true }
  ];
  var OFF = 'https://world.openfoodfacts.org';
  var SWATCHES = [
    ['Black', '#111111'], ['White', '#ffffff'], ['Grey', '#9ca3af'], ['Dark grey', '#374151'],
    ['Red', '#ef4444'], ['Dark red', '#991b1b'], ['Orange', '#f97316'], ['Amber', '#f59e0b'],
    ['Yellow', '#facc15'], ['Lime', '#84cc16'], ['Green', '#22c55e'], ['Dark green', '#166534'],
    ['Teal', '#14b8a6'], ['Cyan', '#06b6d4'], ['Light blue', '#38bdf8'], ['Blue', '#3b82f6'],
    ['Navy', '#1e3a8a'], ['Indigo', '#6366f1'], ['Purple', '#9333ea'], ['Violet', '#8b5cf6'],
    ['Magenta', '#d946ef'], ['Pink', '#ec4899'], ['Rose', '#f43f5e'], ['Brown', '#92400e'], ['Beige', '#d6c7a1']
  ];
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  var FONTS = [
    { id: 'system', name: 'System default', stack: 'system-ui,-apple-system,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif' },
    { id: 'inter', name: 'Inter', stack: '"Inter",' + SANS },
    { id: 'poppins', name: 'Poppins', stack: '"Poppins",' + SANS },
    { id: 'nunito', name: 'Nunito', stack: '"Nunito",' + SANS },
    { id: 'roboto', name: 'Roboto', stack: '"Roboto",' + SANS },
    { id: 'montserrat', name: 'Montserrat', stack: '"Montserrat",' + SANS },
    { id: 'lora', name: 'Lora', note: 'serif', stack: '"Lora",Georgia,"Times New Roman",serif' },
    { id: 'playfair', name: 'Playfair Display', note: 'serif', stack: '"Playfair Display",Georgia,"Times New Roman",serif' },
    { id: 'comic', name: 'Comic Neue', note: 'playful', stack: '"Comic Neue","Comic Sans MS","Chalkboard SE",cursive' },
    { id: 'mono', name: 'JetBrains Mono', note: 'monospace', stack: '"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace' }
  ];
  var SIZES = { small: 15, normal: 16, large: 18 };
  var RING_NAMES = [{ k: 'kcal', label: 'Calories' }, { k: 'protein', label: 'Protein' }, { k: 'carbs', label: 'Carbs' }, { k: 'fat', label: 'Fat' }];
  var MEAL_ICON = { breakfast: '🥣', lunch: '🥗', dinner: '🍲', snacks: '🍎' };
  function isHex(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }
  function hexRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function lum(h) {
    var c = hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function onColor(h) { return contrast(h, '#ffffff') >= contrast(h, '#111111') ? '#ffffff' : '#111111'; }
  function mix(h, w, t) { var a = hexRgb(h), b = hexRgb(w); return '#' + a.map(function (v, i) { return pad2(Math.round(v + (b[i] - v) * t).toString(16)); }).join(''); }
  function pad2(s) { return s.length < 2 ? '0' + s : s; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function fmt(n, k) { return k === 'kcal' ? String(Math.round(n)) : String(r1(n)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
  function todayKey() { return dateKey(new Date()); }
  function zero() { return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }; }
  function sumInto(t, n) { NUTR.forEach(function (k) { t[k] += num(n && n[k]); }); return t; }
  function scale(food, amount) { // amount in g/ml
    var o = {}; NUTR.forEach(function (k) { o[k] = num(food[k]) * amount / 100; }); return o;
  }
  function unitOf(f) { return f && f.unit === 'ml' ? 'ml' : 'g'; }
  function servingLabel(f) { // e.g. "1 slice", "1 glass (250 ml)"; generic → "1 serving"
    var l = String((f && f.serving_name) || 'serving').trim();
    return l === 'serving' ? '1 serving' : l;
  }
  function exact(v) { return String(Math.round(num(v) * 1000) / 1000); } // shows stored values as-is (float noise trimmed)

  // ---------- state ----------
  function defaults() {
    return {
      version: 1,
      settings: {
        goals: { kcal: 2000, protein: 120, carbs: 225, fat: 67, fiber: 30, sugar: 50 },
        profile: { sex: 'male', age: 35, height: 180, weight: 80, activity: '1.375', goal: 'maintain' },
        theme: 'auto',
        look: defaultLook()
      },
      days: {},
      customFoods: [],
      recipes: [],
      favorites: [],
      recent: [],
      weights: {}
    };
  }
  function defaultLook() {
    return { accent: '#111111', rings: { kcal: null, protein: '#e5534b', carbs: '#e8973d', fat: '#4f8ef7' }, font: 'system', size: 'normal' };
  }
  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s === 'object') return normalize(s);
    } catch (e) { /* ignore */ }
    return defaults();
  }
  function normalize(s) {
    var d = defaults();
    s.settings = Object.assign({}, d.settings, s.settings || {});
    s.settings.goals = Object.assign({}, d.settings.goals, s.settings.goals || {});
    s.settings.profile = Object.assign({}, d.settings.profile, s.settings.profile || {});
    var lk = s.settings.look && typeof s.settings.look === 'object' ? s.settings.look : {};
    var dl = defaultLook();
    s.settings.look = {
      accent: isHex(lk.accent) ? lk.accent.toLowerCase() : dl.accent,
      rings: {},
      font: FONTS.some(function (f) { return f.id === lk.font; }) ? lk.font : dl.font,
      size: SIZES[lk.size] ? lk.size : dl.size
    };
    ['kcal', 'protein', 'carbs', 'fat'].forEach(function (k) {
      var v = lk.rings && lk.rings[k];
      s.settings.look.rings[k] = isHex(v) ? v.toLowerCase() : (lk.rings && k in lk.rings && v === null ? null : dl.rings[k]);
    });
    if (['light', 'dark', 'auto'].indexOf(s.settings.theme) < 0) s.settings.theme = 'auto';
    ['days', 'weights'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {}; });
    ['customFoods', 'recipes', 'favorites', 'recent'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    s.version = 1;
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save: storage full or blocked'); }
  }

  var ui = { date: todayKey(), view: 'today', range: 7, rangeOffset: 0, addMeal: 'breakfast', addMode: 'log' };

  // ---------- food database ----------
  var FOODS = [];
  var foodSource = 'fallback';
  function cleanFoods(arr) {
    if (!Array.isArray(arr)) return null;
    var out = [];
    arr.forEach(function (f) {
      if (!f || typeof f.name !== 'string' || !f.name.trim() || !isFinite(parseFloat(f.kcal))) return;
      var o = { name: f.name.trim(), source: 'builtin' };
      NUTR.forEach(function (k) { o[k] = num(f[k]); });
      if (f.unit === 'ml') o.unit = 'ml';
      var sv = f.serving && typeof f.serving === 'object' ? f.serving : {};
      var sg = num(f.serving_g) > 0 ? num(f.serving_g) : num(sv.grams);
      if (sg > 0) {
        o.serving_g = sg;
        o.serving_name = String(sv.label || f.serving_name || 'serving');
      }
      if (f.source != null && f.source !== '') o.ref = String(f.source); // data source/credit (NEVO, FDC, ...)
      out.push(o);
    });
    return out.length ? out : null;
  }
  function initFoods() {
    var fb = cleanFoods(window.FALLBACK_FOODS) || [];
    if (window.EMBEDDED_FOODS) {
      var emb = cleanFoods(window.EMBEDDED_FOODS);
      FOODS = emb || fb; foodSource = emb ? 'foods.json (embedded)' : 'fallback list';
      return Promise.resolve();
    }
    FOODS = fb; foodSource = 'fallback list';
    if (!/^https?:/.test(location.protocol)) return Promise.resolve();
    return fetch('foods.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('no foods.json');
      return r.json();
    }).then(function (j) {
      var c = cleanFoods(j);
      if (c) { FOODS = c; foodSource = 'foods.json'; }
    }).catch(function () { /* keep fallback */ });
  }

  // ---------- theme & customization ----------
  var THEMES = { light: { bg: '#f6f6f7', card: '#ffffff', text: '#111114' }, dark: { bg: '#0d0d0f', card: '#1a1a1d', text: '#f4f4f5' } };
  function isDark() {
    var t = state.settings.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function fontById(id) { return FONTS.filter(function (f) { return f.id === id; })[0] || FONTS[0]; }
  // Resolves the stored look into the actual colours used for the current theme (keeps everything readable).
  function resolveLook() {
    var look = state.settings.look, dark = isDark(), th = THEMES[dark ? 'dark' : 'light'];
    var accent = look.accent;
    if (contrast(accent, th.bg) < 1.35) accent = dark ? (lum(accent) < 0.05 ? '#f4f4f5' : mix(accent, '#ffffff', 0.35)) : accent;
    var border = !dark && contrast(accent, th.bg) < 1.35 ? '#d4d4d8' : 'transparent';
    var rings = {};
    RING_NAMES.forEach(function (r) {
      var c = look.rings[r.k] || accent;
      if (r.k === 'kcal' && !look.rings.kcal) c = accent;
      if (contrast(c, th.card) < 1.35) c = th.text;
      rings[r.k] = c;
    });
    return { dark: dark, accent: accent, onAccent: onColor(accent), border: border, rings: rings, font: fontById(look.font), size: SIZES[look.size] || 16, bg: th.bg };
  }
  function applyLook() {
    var r = resolveLook(), root = document.documentElement, st = root.style;
    root.classList.toggle('dark', r.dark);
    root.setAttribute('data-theme', r.dark ? 'dark' : 'light');
    st.setProperty('--accent', r.accent);
    st.setProperty('--on-accent', r.onAccent);
    var rgb = hexRgb(r.accent).join(',');
    st.setProperty('--accent-soft', 'rgba(' + rgb + ',' + (r.dark ? '.22' : '.12') + ')');
    st.setProperty('--btn-border', r.border);
    st.setProperty('--kcal', r.rings.kcal);
    st.setProperty('--protein', r.rings.protein);
    st.setProperty('--carbs', r.rings.carbs);
    st.setProperty('--fat', r.rings.fat);
    st.setProperty('--font', r.font.stack);
    st.setProperty('--fs', r.size + 'px');
    var m = document.getElementById('themeColorMeta'); if (m) m.setAttribute('content', r.bg);
    $$('#themeSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.theme === state.settings.theme); });
  }
  function applyTheme() { applyLook(); if (ui && ui.view === 'customize') renderCustomize(); }
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onMq = function () { if (state.settings.theme === 'auto') { applyLook(); if (ui.view === 'customize') renderCustomize(); } };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  function miniRing(pct, color, size, stroke, inner) {
    var R = (size - stroke) / 2, C = 2 * Math.PI * R, p = Math.max(0, Math.min(1, pct || 0)), c = size / 2;
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"/>' +
      (p > 0 ? '<circle cx="' + c + '" cy="' + c + '" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' +
        (C * p).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')"/>' : '') + (inner || '') + '</svg>';
  }
  function renderCustomize() {
    var look = state.settings.look, r = resolveLook();
    $$('#themeSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.theme === state.settings.theme); });
    $('#accentGrid').innerHTML = SWATCHES.map(function (sw) {
      var on = sw[1] === look.accent;
      return '<button type="button" class="swatch' + (on ? ' active' : '') + '" data-accent="' + sw[1] + '" title="' + sw[0] + '" aria-label="' + sw[0] +
        '" aria-pressed="' + on + '" style="background:' + sw[1] + ';--sw-on:' + onColor(sw[1]) + '"></button>';
    }).join('');
    var named = SWATCHES.filter(function (sw) { return sw[1] === look.accent; })[0];
    $('#accentName').textContent = named ? named[0] : 'Custom ' + look.accent;
    $('#accentCustom').value = look.accent;
    $('#ringColors').innerHTML = RING_NAMES.map(function (x) {
      var val = look.rings[x.k];
      return '<label class="ring-row"><span class="dot" style="--c:' + r.rings[x.k] + '"></span><span class="rn">' + x.label +
        (x.k === 'kcal' && !val ? ' <small>(follows accent)</small>' : '') + '</span><input type="color" data-ring="' + x.k + '" value="' + (val || r.rings[x.k]) +
        '" aria-label="' + x.label + ' ring color"></label>';
    }).join('');
    $('#fontGrid').innerHTML = FONTS.map(function (f) {
      var on = f.id === look.font;
      return '<button type="button" class="font-tile' + (on ? ' active' : '') + '" data-font="' + f.id + '" aria-pressed="' + on + '" style="font-family:' + esc(f.stack) +
        '"><b>Aa 123</b><span>' + f.name + (f.note ? ' · ' + f.note : '') + '</span></button>';
    }).join('');
    $$('#sizeSeg button').forEach(function (b) { b.classList.toggle('active', b.dataset.size === look.size); });
    $('#pvRing').innerHTML = miniRing(0.5, 'var(--kcal)', 80, 9, '');
    $('#pvMacros').innerHTML = [['protein', 'Protein', 0.7], ['carbs', 'Carbs', 0.45], ['fat', 'Fat', 0.3]].map(function (m) {
      return '<div>' + miniRing(m[2], 'var(--' + m[0] + ')', 40, 5, '') + m[1] + '</div>';
    }).join('');
  }
  function setLook(fn) { fn(state.settings.look); save(); applyLook(); renderCustomize(); }

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    var openDlg = $$('dialog[open]').pop();
    (openDlg || document.body).appendChild(t);
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---------- navigation ----------
  function showView(v) {
    ui.view = v;
    $$('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + v); });
    $$('#tabbar button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === v); });
    $$('#tabbar button').forEach(function (b) { if (v === 'customize') b.classList.toggle('active', b.dataset.view === 'settings'); });
    $('#viewTitleText').textContent = { today: 'Calories', history: 'Progress', foods: 'Foods', settings: 'Settings', customize: 'Customization' }[v];
    $('.brand-mark').hidden = v !== 'today';
    $('#backBtn').hidden = v !== 'customize';
    $('#streakChip').hidden = v !== 'today' && v !== 'history';
    $('#customizeBtn').hidden = v === 'customize';
    $('#dateNav').classList.toggle('hidden', v !== 'today');
    $('#fab').classList.toggle('hidden', v !== 'today');
    render();
    window.scrollTo(0, 0);
  }
  function dateLabel(k) {
    var t = todayKey();
    if (k === t) return 'Today';
    if (k === addDays(t, -1)) return 'Yesterday';
    if (k === addDays(t, 1)) return 'Tomorrow';
    return parseKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: parseKey(k).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  function setDate(k) { ui.date = k; render(); }

  // ---------- rendering ----------
  function render() {
    if (ui.view === 'today') renderToday();
    else if (ui.view === 'history') renderHistory();
    else if (ui.view === 'foods') renderFoods();
    else if (ui.view === 'settings') renderSettings();
    else if (ui.view === 'customize') renderCustomize();
    renderStreakChip();
  }
  function dayEntries(k) { return state.days[k] || []; }
  function dayTotals(k) { var t = zero(); dayEntries(k).forEach(function (e) { sumInto(t, e.n); }); return t; }

  var FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 1.7c.4 3-1 4.8-2.6 6.5C9.2 10 7.5 11.8 7.5 15a4.5 4.5 0 0 0 9 .2c0-1.7-.7-2.9-1.5-4 .1 1.4-.4 2.4-1.4 2.8.4-2.6-.1-4.8-1.1-6.7 1.9.3 4.6 2.9 5.3 6.2.9-1 1.2-2.4 1.1-3.8 1.3 1.6 2.1 3.6 2.1 5.5a7.5 7.5 0 0 1-15 0c0-4.7 2.8-7.2 4.7-9.3 1.5-1.6 2.6-2.8 2.8-4.2z"/></svg>';
  function ringSVG(val, goal) {
    var pct = goal > 0 ? val / goal : 0, over = goal > 0 && val > goal;
    return '<svg viewBox="0 0 140 140" role="img" aria-label="Calories ' + Math.round(val) + ' of ' + Math.round(goal) + '">' +
      miniRing(pct, over ? 'var(--danger)' : 'var(--kcal)', 140, 13, '').replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>';
  }
  function weekStart(k) { var d = parseKey(k), wd = (d.getDay() + 6) % 7; return addDays(k, -wd); }
  function streak() {
    var t = todayKey(), k = dayEntries(t).length ? t : addDays(t, -1), n = 0;
    while (dayEntries(k).length && n < 3650) { n++; k = addDays(k, -1); }
    return n;
  }
  function renderStreakChip() { var el = $('#streakChip'); if (el) el.textContent = '🔥 ' + streak(); }
  function renderWeek() {
    var ws = weekStart(ui.date), t = todayKey(), g = num(state.settings.goals.kcal);
    var html = '';
    for (var i = 0; i < 7; i++) {
      var k = addDays(ws, i), d = parseKey(k), kc = dayTotals(k).kcal, has = dayEntries(k).length > 0;
      var wd = d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);
      var ring = has ? miniRing(g > 0 ? kc / g : 1, kc > g && g > 0 ? 'var(--danger)' : 'var(--kcal)', 36, 3, '') :
        '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 3" opacity=".6"/></svg>';
      ring = ring.replace('</svg>', '<text x="18" y="22.5" text-anchor="middle" class="dn">' + d.getDate() + '</text></svg>');
      html += '<button type="button" role="tab" class="day' + (k === ui.date ? ' sel' : '') + (k === t ? ' today' : '') + (k > t ? ' future' : '') + '" data-day="' + k +
        '" aria-selected="' + (k === ui.date) + '" aria-label="' + d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + (has ? ', ' + Math.round(kc) + ' kcal' : '') +
        '"><span class="wd">' + wd + '</span>' + ring + '</button>';
    }
    $('#weekStrip').innerHTML = html;
  }
  function macroCard(value, goal, label, color, limit, unit) {
    unit = unit == null ? 'g' : unit;
    var left = goal - value, over = goal > 0 && value > goal;
    var big = goal > 0 ? (limit ? fmt(value) + '<small>/' + fmt(goal) + unit + '</small>' : fmt(Math.abs(left)) + '<small>' + unit + '</small>') : fmt(value) + '<small>' + unit + '</small>';
    var lab = goal > 0 ? (limit ? label + ' (max)' : label + (left >= 0 ? ' left' : ' over')) : label;
    var pct = goal > 0 ? value / goal : 0;
    return '<div class="mcard' + (over && limit ? ' over' : '') + '"><div class="mv">' + big + '</div><div class="ml">' + lab + '</div><div class="mring">' +
      miniRing(pct, over ? 'var(--danger)' : color, 72, 7, '') + '<span>' + (goal > 0 ? Math.round(pct * 100) + '%' : '–') + '</span></div></div>';
  }
  function renderToday() {
    var g = state.settings.goals, t = dayTotals(ui.date);
    $('#dateLabel').textContent = dateLabel(ui.date);
    $('#datePicker').value = ui.date;
    $('#todayBtn').style.visibility = ui.date === todayKey() ? 'hidden' : 'visible';
    renderWeek();
    var left = g.kcal - t.kcal;
    $('#kcalBig').textContent = Math.round(Math.abs(left));
    $('#kcalLabel').textContent = left >= 0 ? 'Calories left' : 'Calories over';
    $('#kcalSub').textContent = Math.round(t.kcal) + ' / ' + Math.round(g.kcal) + ' kcal eaten';
    $('#kcalRing').innerHTML = ringSVG(t.kcal, g.kcal) + '<div class="ring-icon">' + FLAME + '</div>';
    $('#macroCards').innerHTML = macroCard(t.protein, num(g.protein), 'Protein', 'var(--protein)') +
      macroCard(t.carbs, num(g.carbs), 'Carbs', 'var(--carbs)') + macroCard(t.fat, num(g.fat), 'Fat', 'var(--fat)');
    var wKeys = Object.keys(state.weights).filter(function (k) { return k <= ui.date; }).sort();
    var lw = wKeys.length ? state.weights[wKeys[wKeys.length - 1]] : null;
    $('#microCards').innerHTML = macroCard(t.fiber, num(g.fiber), 'Fiber', 'var(--fiber)') + macroCard(t.sugar, num(g.sugar), 'Sugar', 'var(--sugar)', true) +
      '<div class="mcard"><div class="mv">' + (lw != null ? lw + '<small>kg</small>' : '–') + '</div><div class="ml">Weight</div><div class="mring"><span style="font-size:1.8rem">⚖️</span></div></div>';

    var entries = dayEntries(ui.date);
    $('#entryCount').textContent = entries.length ? entries.length + (entries.length === 1 ? ' item' : ' items') : '';
    $('#meals').innerHTML = MEALS.map(function (m) {
      var list = entries.filter(function (e) { return e.meal === m.id; });
      var mt = zero(); list.forEach(function (e) { sumInto(mt, e.n); });
      return '<div class="meal-group" data-meal="' + m.id + '"><div class="meal-head"><div><h3>' + MEAL_ICON[m.id] + ' ' + m.name + '</h3><div class="meta">' +
        (list.length ? Math.round(mt.kcal) + ' kcal · P ' + fmt(mt.protein) + ' · C ' + fmt(mt.carbs) + ' · F ' + fmt(mt.fat) : 'Nothing logged yet') + '</div></div>' +
        '<div class="meal-actions">' + (list.length > 1 ? '<button class="btn small" data-save-meal="' + m.id + '" title="Save as reusable meal">Save</button>' : '') +
        '<button class="add-mini" data-add-meal="' + m.id + '" aria-label="Add to ' + m.name + '">+</button></div></div>' +
        list.map(entryRow).join('') + '</div>';
    }).join('');

    var w = state.weights[ui.date];
    $('#weightQuick').innerHTML = '<form class="row-form" id="weightQuickForm"><input type="number" step="0.1" min="20" max="400" inputmode="decimal" ' +
      'id="weightQuickKg" placeholder="Weight (kg) — optional" aria-label="Weight in kg" value="' + (w != null ? w : '') + '"><button class="btn primary" type="submit">' +
      (w != null ? 'Update' : 'Log weight') + '</button></form>';
  }
  function entryRow(e) {
    var amt = e.quick ? 'Quick add' : (e.servings ? r1(e.servings) + ' × ' + servingLabel(e.food) + ' · ' : '') + r1(e.amount) + ' ' + (e.unit || 'g');
    var time = e.ts ? new Date(e.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    return '<button class="food-card" data-entry="' + e.id + '"><span class="thumb" aria-hidden="true">' + MEAL_ICON[e.meal] + '</span><span class="fc-main">' +
      '<span class="fc-top"><span class="fc-name">' + esc(e.name) + '</span><span class="fc-time">' + time + '</span></span>' +
      '<span class="fc-kcal">🔥 ' + Math.round(e.n.kcal) + ' kcal</span>' +
      '<span class="fc-sub">' + esc(amt) + '</span>' +
      '<span class="macro-chips"><span><i style="background:var(--protein)"></i>' + fmt(e.n.protein) + 'g</span><span><i style="background:var(--carbs)"></i>' +
      fmt(e.n.carbs) + 'g</span><span><i style="background:var(--fat)"></i>' + fmt(e.n.fat) + 'g</span></span></span></button>';
  }

  // ---------- food lists (search) ----------
  function foodKey(f) { return (f.source || 'x') + ':' + (f.barcode || f.id || f.name); }
  function foodRow(f, extra) {
    var tag = f.source === 'custom' ? '<span class="tag">mine</span>' : f.source === 'recipe' ? '<span class="tag">recipe</span>' :
      f.source === 'off' ? '<span class="tag">OFF</span>' : '';
    var per = f.source === 'recipe' && f.serving_g ? Math.round(f.kcal * f.serving_g / 100) + ' kcal / serving' :
      Math.round(f.kcal) + ' kcal / 100 ' + unitOf(f);
    return '<button class="item" data-food="' + esc(extra) + '"><div class="main"><div class="name">' + esc(f.name) + tag + '</div><div class="sub">' +
      (f.brand ? esc(f.brand) + ' · ' : '') + 'P ' + fmt(f.protein) + ' C ' + fmt(f.carbs) + ' F ' + fmt(f.fat) + '</div></div><div class="kcal small">' +
      per + '</div></button>';
  }
  var listCache = {}; // key -> food object for click handling
  function listFoods(container, foods, emptyMsg) {
    container.innerHTML = foods.length ? foods.map(function (f) {
      var k = 'k' + uid(); listCache[k] = f; return foodRow(f, k);
    }).join('') : '<div class="empty">' + esc(emptyMsg || 'No results') + '</div>';
  }
  function recipeAsFood(r) {
    var t = zero(); var w = 0;
    (r.items || []).forEach(function (it) { sumInto(t, it.n); w += num(it.amount); });
    var servings = Math.max(1, num(r.servings) || 1);
    var total = num(r.totalWeight) > 0 ? num(r.totalWeight) : w;
    if (total <= 0) total = 100 * servings; // recipe made only of quick-adds
    var f = { id: r.id, name: r.name, source: 'recipe', serving_g: r1(total / servings), serving_name: 'serving' };
    NUTR.forEach(function (k) { f[k] = t[k] / total * 100; });
    return f;
  }
  function allLocalFoods() {
    var mine = state.customFoods.map(function (f) { return Object.assign({ source: 'custom' }, f); });
    return mine.concat(state.recipes.map(recipeAsFood), FOODS);
  }
  function searchLocal(q) {
    q = q.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean);
    var res = [];
    allLocalFoods().forEach(function (f) {
      var n = (f.name + ' ' + (f.brand || '')).toLowerCase();
      var wordStart = 0;
      var all = words.every(function (w) {
        var i = n.indexOf(w);
        if (i >= 0) { if (i === 0 || /[^a-z0-9\u00c0-\u024f]/.test(n[i - 1])) wordStart++; return true; }
        // simple plural tolerance ("oats" -> "oat"), only at the start of a word so "oats" doesn't match "goat"
        if (w.length > 3 && /s$/.test(w)) {
          var stem = w.slice(0, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp('(^|[^a-z0-9\u00c0-\u024f])' + stem).test(n)) { wordStart++; return true; }
        }
        return false;
      });
      if (!all) return;
      var score = n.indexOf(q) === 0 ? 0 : n.indexOf(q) > 0 ? 1 : 2;
      if (wordStart < words.length) score += 1.5;
      if (f.source !== 'builtin') score -= 0.5;
      res.push({ f: f, s: score, l: f.name.length });
    });
    res.sort(function (a, b) { return a.s - b.s || a.l - b.l; });
    return res.slice(0, 60).map(function (x) { return x.f; });
  }
  function renderLocalResults() {
    var q = $('#localSearch').value, box = $('#localResults');
    if (q.trim()) { listFoods(box, searchLocal(q), 'No match. Try the Online tab or Quick add.'); return; }
    var html = '';
    box.innerHTML = '';
    var favs = state.favorites.slice(0, 30), rec = state.recent.slice(0, 20);
    var tmp = document.createElement('div');
    if (favs.length) { listFoods(tmp, favs); html += '<div class="section-label">★ Favorites</div>' + tmp.innerHTML; }
    if (rec.length) { listFoods(tmp, rec); html += '<div class="section-label">Recent</div>' + tmp.innerHTML; }
    if (!html) html = '<div class="empty">Type to search ' + FOODS.length + ' built-in foods, your own foods and recipes. Foods you log appear here as recent.</div>';
    box.innerHTML = html;
  }

  // ---------- add dialog ----------
  function mealOptions(sel) {
    return MEALS.map(function (m) { return '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + m.name + '</option>'; }).join('');
  }
  function defaultMeal() {
    var h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snacks';
  }
  function openAdd(meal, mode) {
    ui.addMode = mode || 'log';
    ui.addMeal = meal || defaultMeal();
    $('#addMeal').innerHTML = mealOptions(ui.addMeal);
    $('#mealPickWrap').hidden = ui.addMode !== 'log';
    $('#addTitle').textContent = ui.addMode === 'ingredient' ? 'Add ingredient' : 'Add food · ' + dateLabel(ui.date);
    $('[data-tab="quick"]', $('#addTabs')).hidden = ui.addMode === 'ingredient';
    switchTab('search');
    $('#localSearch').value = '';
    renderLocalResults();
    $('#barcodeResult').innerHTML = '';
    $('#photoOut').innerHTML = '';
    $('#addDialog').showModal();
    setTimeout(function () { if (window.innerWidth > 700) $('#localSearch').focus(); }, 50);
  }
  function switchTab(t) {
    $$('#addTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    $$('#addDialog .tab-panel').forEach(function (p) { p.classList.toggle('active', p.dataset.panel === t); });
    if (t !== 'barcode') stopScan();
    if (t === 'photo') initPhotoTab();
    if (t === 'barcode') {
      var ok = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      $('#startScan').hidden = !ok;
      $('#scanMsg').textContent = ok ? '' : 'Camera scanning is not supported in this browser (works in Chrome/Edge on Android and some desktops). Type the barcode number below instead.';
    }
  }

  function chooseFood(f) {
    openAmount(f, { mode: ui.addMode === 'ingredient' ? 'ingredient' : 'log', meal: ui.addMeal });
    if (ui.addMode === 'ingredient') $('#addDialog').close();
  }

  // ---------- amount dialog ----------
  var amt = null; // {food, mode:'log'|'edit'|'ingredient', entry, meal}
  function openAmount(food, opts) {
    opts = opts || {};
    amt = { food: food, mode: opts.mode || 'log', entry: opts.entry || null, meal: opts.meal || ui.addMeal, ingIndex: opts.ingIndex };
    var u = unitOf(food);
    $('#amtTitle').textContent = food.name;
    $('#amtSub').textContent = (food.brand ? food.brand + ' · ' : '') + Math.round(food.kcal) + ' kcal per 100 ' + u +
      (food.serving_g ? ' · ' + servingLabel(food) + ' = ' + r1(food.serving_g) + ' ' + u : '');
    $('#amtInfo').innerHTML = '<summary>Details &amp; source</summary><p>Per 100 ' + u + ': ' + exact(food.kcal) + ' kcal · protein ' + exact(food.protein) +
      ' g · carbs ' + exact(food.carbs) + ' g · fat ' + exact(food.fat) + ' g · fiber ' + exact(food.fiber) + ' g · sugar ' + exact(food.sugar) + ' g</p>' +
      (food.serving_g ? '<p>Serving: ' + esc(servingLabel(food)) + ' = ' + exact(food.serving_g) + ' ' + u + '</p>' : '') +
      '<p>Source: ' + esc(food.ref || ({ builtin: 'Built-in food list', off: 'Open Food Facts' + (food.barcode ? ' (barcode ' + food.barcode + ')' : '') + ', ODbL', custom: 'My foods', recipe: 'My recipe' })[food.source] || 'Unknown') + '</p>';
    var units = '<option value="unit">' + u + '</option>';
    if (food.serving_g) units += '<option value="serving">× ' + esc(servingLabel(food)) + ' (' + r1(food.serving_g) + ' ' + u + ')</option>';
    $('#amtUnit').innerHTML = units;
    var e = amt.entry;
    if (e && e.servings && food.serving_g) { $('#amtUnit').value = 'serving'; $('#amtValue').value = r1(e.servings); }
    else if (e) { $('#amtUnit').value = 'unit'; $('#amtValue').value = r1(e.amount); }
    else if (food.serving_g && (food.source === 'recipe')) { $('#amtUnit').value = 'serving'; $('#amtValue').value = 1; }
    else { $('#amtUnit').value = 'unit'; $('#amtValue').value = food.serving_g ? r1(food.serving_g) : 100; }
    $('#amtMeal').innerHTML = mealOptions(amt.meal);
    $('#amtMealWrap').hidden = amt.mode === 'ingredient';
    $('#amtDelete').hidden = amt.mode !== 'edit';
    $('#amtSaveFood').hidden = food.source !== 'off';
    $('#amtSubmit').textContent = amt.mode === 'edit' ? 'Save' : amt.mode === 'ingredient' ? 'Add ingredient' : 'Add to ' + dateLabel(ui.date);
    $('#amtFav').hidden = amt.mode === 'ingredient';
    updateFavBtn();
    renderQuickAmts();
    updateAmountPreview();
    $('#amountDialog').showModal();
  }
  function renderQuickAmts() {
    var f = amt.food, u = unitOf(f), b = [];
    if ($('#amtUnit').value === 'serving') b = [0.5, 1, 1.5, 2, 3].map(function (x) { return '<button type="button" data-q="' + x + '">' + x + '×</button>'; });
    else b = [25, 50, 100, 150, 200, 250].map(function (x) { return '<button type="button" data-q="' + x + '">' + x + ' ' + u + '</button>'; });
    $('#quickAmts').innerHTML = b.join('');
  }
  function currentAmount() {
    var v = num($('#amtValue').value);
    if ($('#amtUnit').value === 'serving') return { amount: v * amt.food.serving_g, servings: v };
    return { amount: v, servings: null };
  }
  function updateAmountPreview() {
    if (!amt) return;
    var a = currentAmount(), n = scale(amt.food, a.amount);
    $('#amtPreview').innerHTML = NUTR.map(function (k) {
      return '<div class="nutri"><b style="color:var(--' + k + ')">' + fmt(n[k], k) + '</b><span>' + (k === 'kcal' ? 'kcal' : k + ' g') + '</span></div>';
    }).join('');
  }
  function foodSnapshot(f) {
    var o = { name: f.name, source: f.source || 'custom' };
    ['brand', 'barcode', 'id', 'unit', 'serving_g', 'serving_name', 'ref'].forEach(function (k) { if (f[k] != null && f[k] !== '') o[k] = f[k]; });
    NUTR.forEach(function (k) { o[k] = num(f[k]); });
    return o;
  }
  function isFav(f) { var k = foodKey(f); return state.favorites.some(function (x) { return foodKey(x) === k; }); }
  function updateFavBtn() { var on = isFav(amt.food); $('#amtFav').textContent = on ? '★' : '☆'; $('#amtFav').style.color = on ? '#f59e0b' : ''; }
  function toggleFav(f) {
    var k = foodKey(f);
    if (isFav(f)) state.favorites = state.favorites.filter(function (x) { return foodKey(x) !== k; });
    else state.favorites.unshift(foodSnapshot(f));
    save();
  }
  function pushRecent(f) {
    var s = foodSnapshot(f), k = foodKey(s);
    state.recent = [s].concat(state.recent.filter(function (x) { return foodKey(x) !== k; })).slice(0, 30);
  }
  function submitAmount() {
    var a = currentAmount();
    if (!(a.amount > 0)) { toast('Enter an amount'); return; }
    var f = amt.food, n = scale(f, a.amount);
    if (amt.mode === 'ingredient') {
      recipeDraft.items.push({ name: f.name, amount: r1(a.amount), unit: unitOf(f), n: n, food: foodSnapshot(f) });
      $('#amountDialog').close();
      renderRecipeDraft();
      return;
    }
    var meal = $('#amtMeal').value;
    if (amt.mode === 'edit') {
      var e = amt.entry;
      e.amount = r1(a.amount); e.servings = a.servings; e.n = n; e.meal = meal;
      save(); $('#amountDialog').close(); render(); toast('Updated');
      return;
    }
    var entry = { id: uid(), meal: meal, name: f.name + (f.brand ? ' (' + f.brand + ')' : ''), amount: r1(a.amount), unit: unitOf(f),
      servings: a.servings, n: n, food: foodSnapshot(f), ts: Date.now() };
    (state.days[ui.date] = state.days[ui.date] || []).push(entry);
    pushRecent(f);
    save();
    $('#amountDialog').close();
    if ($('#addDialog').open) $('#addDialog').close();
    render();
    toast('Added ' + Math.round(n.kcal) + ' kcal to ' + MEALS.filter(function (m) { return m.id === meal; })[0].name);
  }
  function editEntry(id) {
    var e = dayEntries(ui.date).filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (e.quick) { openQuickEdit(e); return; }
    openAmount(e.food, { mode: 'edit', entry: e, meal: e.meal });
  }
  function deleteEntry(id) {
    state.days[ui.date] = dayEntries(ui.date).filter(function (x) { return x.id !== id; });
    if (!state.days[ui.date].length) delete state.days[ui.date];
    save(); render();
  }
  function openQuickEdit(e) {
    // quick-add entries are edited via the quick form
    openAdd(e.meal);
    switchTab('quick');
    var fm = $('#quickForm');
    fm.name.value = e.name === 'Quick add' ? '' : e.name;
    NUTR.forEach(function (k) { fm[k].value = e.n[k] || ''; });
    fm.dataset.editId = e.id;
    $('[type=submit]', fm).textContent = 'Save changes';
  }

  // ---------- Open Food Facts ----------
  function offToFood(p) {
    var nm = p.nutriments || {};
    var kcal = nm['energy-kcal_100g'];
    if (kcal == null && nm.energy_100g != null) kcal = num(nm.energy_100g) / 4.184; // kJ -> kcal
    if (kcal == null && nm['energy-kj_100g'] != null) kcal = num(nm['energy-kj_100g']) / 4.184;
    var name = p.product_name_en || p.product_name || p.product_name_nl || p.generic_name || '';
    if (!name || kcal == null) return null;
    var f = { name: String(name).trim(), brand: (p.brands || '').split(',')[0].trim(), source: 'off', barcode: p.code || p._id || '',
      kcal: num(kcal), protein: num(nm.proteins_100g), carbs: num(nm.carbohydrates_100g), fat: num(nm.fat_100g),
      fiber: num(nm.fiber_100g), sugar: num(nm.sugars_100g) };
    if (/ml|cl|\bl\b/i.test(p.quantity || '') && /beverage|drink|milk|juice|water/i.test((p.categories_tags || []).join(' '))) f.unit = 'ml';
    var sq = num(p.serving_quantity);
    if (sq > 0) { f.serving_g = sq; f.serving_name = p.serving_size ? String(p.serving_size) : 'serving'; }
    return f;
  }
  var offCtl = null;
  function offSearch(q) {
    var box = $('#offResults');
    if (!q.trim()) return;
    if (!navigator.onLine) { box.innerHTML = '<div class="empty">You appear to be offline.</div>'; return; }
    box.innerHTML = '<div class="spinner">Searching Open Food Facts…</div>';
    if (offCtl && offCtl.abort) offCtl.abort();
    offCtl = window.AbortController ? new AbortController() : null;
    var fields = 'code,product_name,product_name_en,product_name_nl,generic_name,brands,nutriments,serving_quantity,serving_size,quantity,categories_tags';
    var url = OFF + '/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=30&fields=' + fields;
    var alt = 'https://search.openfoodfacts.org/search?q=' + encodeURIComponent(q) + '&page_size=30&fields=' + fields;
    var sig = offCtl ? { signal: offCtl.signal } : {};
    function get(u) { return fetch(u, sig).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
    function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
    // search.pl is occasionally overloaded (503 without CORS headers => "Failed to fetch"): retry, then try search-a-licious
    get(url).catch(function (e) {
      if (e && e.name === 'AbortError') throw e;
      box.innerHTML = '<div class="spinner">Open Food Facts is busy, retrying…</div>';
      return wait(1500).then(function () { return get(url); });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') throw e;
      return wait(4000).then(function () { return get(url); });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') throw e;
      return get(alt).then(function (j) { return { products: j.hits || [] }; });
    }).then(function (j) {
      var foods = (j.products || []).map(offToFood).filter(Boolean);
      listFoods(box, foods, 'No products with nutrition data found. Try another term.');
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      box.innerHTML = '<div class="empty">Search failed (' + esc(err.message) + '). Open Food Facts may be busy or rate-limiting searches — try again in a moment, or use the barcode lookup.</div>';
    });
  }
  function lookupBarcode(code) {
    code = String(code || '').replace(/\D/g, '');
    var box = $('#barcodeResult');
    if (code.length < 6) { box.innerHTML = '<div class="empty">Enter a valid barcode (6–14 digits).</div>'; return Promise.resolve(); }
    var mine = state.customFoods.filter(function (f) { return f.barcode === code; })[0];
    if (mine) { box.innerHTML = ''; chooseFood(Object.assign({ source: 'custom' }, mine)); return Promise.resolve(); }
    box.innerHTML = '<div class="spinner">Looking up ' + esc(code) + '…</div>';
    return fetch(OFF + '/api/v2/product/' + code + '.json?fields=code,product_name,product_name_en,product_name_nl,generic_name,brands,nutriments,serving_quantity,serving_size,quantity,categories_tags')
      .then(function (r) { if (!r.ok && r.status !== 404) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var f = j && j.status === 1 && j.product ? offToFood(Object.assign({ code: code }, j.product)) : null;
        if (!f) {
          box.innerHTML = '<div class="empty">Product ' + esc(code) + ' not found (or has no nutrition data) in Open Food Facts.</div>' +
            '<button class="btn block" id="createFromBarcode" data-code="' + esc(code) + '">Create custom food with this barcode</button>';
          return;
        }
        box.innerHTML = '';
        listFoods(box, [f]);
        chooseFood(f);
      }).catch(function (err) {
        box.innerHTML = '<div class="empty">Lookup failed (' + esc(err.message) + '). Check your internet connection.</div>';
      });
  }

  // ---------- camera barcode scanning ----------
  var scan = { stream: null, timer: null, detector: null };
  function startScan() {
    if (!('BarcodeDetector' in window)) return;
    try { scan.detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] }); }
    catch (e) { scan.detector = new window.BarcodeDetector(); }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (stream) {
      scan.stream = stream;
      var v = $('#scanVideo'); v.srcObject = stream; v.play();
      $('#videoWrap').hidden = false; $('#startScan').hidden = true;
      $('#scanMsg').textContent = 'Point the camera at a barcode…';
      scan.timer = setInterval(function () {
        if (v.readyState < 2) return;
        scan.detector.detect(v).then(function (codes) {
          if (codes && codes.length) {
            var c = codes[0].rawValue;
            stopScan();
            if (navigator.vibrate) navigator.vibrate(80);
            $('#barcodeInput').value = c;
            $('#scanMsg').textContent = 'Found ' + c;
            lookupBarcode(c);
          }
        }).catch(function () {});
      }, 300);
    }).catch(function (err) {
      $('#scanMsg').textContent = 'Camera unavailable: ' + (err && err.message ? err.message : err) + '. (Camera needs HTTPS or localhost and permission.)';
    });
  }
  function stopScan() {
    clearInterval(scan.timer); scan.timer = null;
    if (scan.stream) scan.stream.getTracks().forEach(function (t) { t.stop(); });
    scan.stream = null;
    var vw = $('#videoWrap'); if (vw) vw.hidden = true;
    if ('BarcodeDetector' in window) $('#startScan').hidden = false;
  }

  // ---------- photo recognition (on-device) ----------
  function photoSupported() {
    if (window.SINGLE_FILE || !/^https?:/.test(location.protocol))
      return 'Photo recognition isn\'t available in this single-file version: the recognition model (about 25 MB) can\'t be embedded in one HTML file. Open the hosted app (e.g. your GitHub Pages or Netlify address, or run it with a local web server) to use it. All other features work here.';
    if (!window.WebAssembly) return 'Photo recognition needs WebAssembly, which this browser doesn\'t support.';
    return '';
  }
  function initPhotoTab() {
    var msg = photoSupported();
    $('#photoUnsupported').hidden = !msg; $('#photoUnsupported').textContent = msg;
    $('#photoControls').hidden = !!msg;
  }
  var photoScript = null;
  function loadPhotoModule() {
    if (window.FoodPhoto) return Promise.resolve(window.FoodPhoto);
    if (!photoScript) photoScript = new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = 'photo.js';
      sc.onload = function () { res(window.FoodPhoto); };
      sc.onerror = function () { photoScript = null; rej(new Error('Could not load photo.js')); };
      document.head.appendChild(sc);
    });
    return photoScript;
  }
  function photoProgress(frac, msg) {
    $('#photoProgress').hidden = frac >= 1;
    $('#photoProgressFill').style.width = Math.round(frac * 100) + '%';
    $('#photoProgressMsg').textContent = msg || '';
  }
  // Downscale a photo to max 640px (keeps memory low; the model itself uses 192x192)
  function downscalePhoto(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 640, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('This image format can\'t be read by the browser.')); };
      img.src = url;
    });
  }
  function photoMatches(label, max) {
    var out = [], seen = {};
    window.FoodPhoto.searchTerms(label).some(function (t) {
      searchLocal(t).forEach(function (f) { var k = foodKey(f); if (!seen[k] && out.length < max) { seen[k] = 1; out.push(f); } });
      return out.length >= max;
    });
    return out;
  }
  var lastPhoto = null;
  function handlePhoto(file) {
    if (!file) return;
    var out = $('#photoOut');
    out.innerHTML = '';
    var canvas;
    downscalePhoto(file).then(function (c) {
      canvas = c;
      out.innerHTML = '<div class="photo-preview"><img alt="Your photo" src="' + c.toDataURL('image/jpeg', 0.8) + '"><div class="muted small" id="photoStatus">Recognizing…</div></div>';
      return loadPhotoModule();
    }).then(function (FP) {
      return FP.load(photoProgress).then(function () { return FP.classify(canvas, 5); });
    }).then(function (r) {
      lastPhoto = r;
      renderPhotoResults(r);
    }).catch(function (e) {
      photoProgress(1);
      out.innerHTML += '<div class="empty">Photo recognition failed: ' + esc(e && e.message ? e.message : e) +
        (navigator.onLine ? '' : ' — you seem to be offline and the model hasn\'t been downloaded yet. Connect once to download it.') + '</div>';
    });
  }
  function renderPhotoResults(r) {
    var st = $('#photoStatus');
    var best = r.top[0];
    if (st) st.innerHTML = r.background > 0.5 || !best ? 'No food recognized with confidence. Try a closer, well-lit photo of one dish.' :
      (best.p < 0.25 ? 'Not very sure — pick the closest match or search manually.' : 'Top guesses (on-device, ' + r.ms + ' ms):');
    var html = r.top.map(function (g, i) {
      var foods = photoMatches(g.label, 3), tmp = document.createElement('div');
      listFoods(tmp, foods, '');
      return '<div class="guess" data-guess="' + i + '"><div class="guess-head"><b>' + esc(g.label) + '</b><span>' + Math.round(g.p * 100) + '%</span></div>' +
        '<div class="track"><div class="fill" style="width:' + Math.max(2, Math.round(g.p * 100)) + '%"></div></div>' +
        (foods.length ? '<div class="list">' + tmp.innerHTML + '</div>' : '<div class="none">No matching food in the list.</div>') +
        '<button type="button" class="link-btn" data-photo-search="' + esc(g.label) + '">Search for “' + esc(g.label) + '”…</button></div>';
    }).join('');
    $('#photoOut').insertAdjacentHTML('beforeend', '<div class="note">Tap a food to set the amount before logging. Portion sizes default to a typical serving and are only estimates — adjust the grams to what you actually ate.</div>' + html);
  }

  // ---------- custom foods ----------
  var editingFoodId = null;
  function openFoodDialog(f, prefill) {
    editingFoodId = f ? f.id : null;
    var fm = $('#foodForm'); fm.reset();
    var src = f || prefill || {};
    ['name', 'brand', 'serving_g', 'barcode'].concat(NUTR).forEach(function (k) { if (src[k] != null) fm[k].value = typeof src[k] === 'number' ? r1(src[k]) : src[k]; });
    fm.unit.value = unitOf(src);
    $('#foodDlgTitle').textContent = f ? 'Edit food' : 'New food';
    $('#foodDelete').hidden = !f;
    $('#foodDialog').showModal();
  }
  function saveFoodForm() {
    var fm = $('#foodForm');
    var f = { id: editingFoodId || uid(), name: fm.name.value.trim(), brand: fm.brand.value.trim(), unit: fm.unit.value,
      serving_g: num(fm.serving_g.value) || undefined, barcode: fm.barcode.value.replace(/\D/g, '') || undefined };
    NUTR.forEach(function (k) { f[k] = num(fm[k].value); });
    if (!f.name) return;
    var i = state.customFoods.findIndex(function (x) { return x.id === f.id; });
    if (i >= 0) state.customFoods[i] = f; else state.customFoods.push(f);
    save(); $('#foodDialog').close(); render(); toast('Food saved');
    if ($('#addDialog').open) renderLocalResults();
  }

  // ---------- recipes ----------
  var recipeDraft = null;
  function openRecipe(r) {
    recipeDraft = r ? JSON.parse(JSON.stringify(r)) : { id: uid(), name: '', servings: 1, totalWeight: '', items: [] };
    recipeDraft._isNew = !r;
    var fm = $('#recipeForm');
    fm.name.value = recipeDraft.name; fm.servings.value = recipeDraft.servings || 1; fm.totalWeight.value = recipeDraft.totalWeight || '';
    $('#recipeDlgTitle').textContent = r ? 'Edit recipe' : 'New recipe';
    $('#recipeDelete').hidden = !r;
    renderRecipeDraft();
    $('#recipeDialog').showModal();
  }
  function renderRecipeDraft() {
    var d = recipeDraft, t = zero(), w = 0;
    $('#ingredientList').innerHTML = d.items.length ? d.items.map(function (it, i) {
      sumInto(t, it.n); w += num(it.amount);
      return '<div class="item"><div class="main"><div class="name">' + esc(it.name) + '</div><div class="sub">' + (it.amount ? r1(it.amount) + ' ' + (it.unit || 'g') + ' · ' : '') +
        Math.round(it.n.kcal) + ' kcal</div></div><button type="button" class="icon-btn" data-rm-ing="' + i + '" aria-label="Remove">✕</button></div>';
    }).join('') : '<div class="empty">No ingredients yet</div>';
    var s = Math.max(1, num($('#recipeForm').servings.value) || 1);
    $('#recipeTotals').innerHTML = 'Total: <b>' + Math.round(t.kcal) + ' kcal</b> · P ' + fmt(t.protein) + ' · C ' + fmt(t.carbs) + ' · F ' + fmt(t.fat) +
      ' · ' + r1(w) + ' g<br>Per serving: <b>' + Math.round(t.kcal / s) + ' kcal</b> · P ' + fmt(t.protein / s) + ' · C ' + fmt(t.carbs / s) + ' · F ' + fmt(t.fat / s);
  }
  function saveRecipe() {
    var fm = $('#recipeForm'), d = recipeDraft;
    d.name = fm.name.value.trim(); d.servings = Math.max(1, num(fm.servings.value) || 1); d.totalWeight = num(fm.totalWeight.value) || '';
    if (!d.name) return;
    if (!d.items.length) { toast('Add at least one ingredient'); return; }
    delete d._isNew;
    var i = state.recipes.findIndex(function (x) { return x.id === d.id; });
    if (i >= 0) state.recipes[i] = d; else state.recipes.push(d);
    save(); $('#recipeDialog').close(); render(); toast('Recipe saved');
  }
  function saveMealAsRecipe(mealId) {
    var list = dayEntries(ui.date).filter(function (e) { return e.meal === mealId; });
    if (!list.length) return;
    var name = prompt('Name for this meal:', MEALS.filter(function (m) { return m.id === mealId; })[0].name + ' ' + dateLabel(ui.date));
    if (!name) return;
    state.recipes.push({ id: uid(), name: name.trim(), servings: 1, totalWeight: '',
      items: list.map(function (e) { return { name: e.name, amount: e.quick ? 0 : e.amount, unit: e.unit || 'g', n: Object.assign({}, e.n), food: e.food || null }; }) });
    save(); toast('Saved "' + name + '" to recipes');
  }

  // ---------- foods view ----------
  function renderFoods() {
    $('#myFoodsList').innerHTML = state.customFoods.length ? state.customFoods.map(function (f) {
      return '<button class="item" data-edit-food="' + f.id + '"><div class="main"><div class="name">' + esc(f.name) + '</div><div class="sub">' +
        (f.brand ? esc(f.brand) + ' · ' : '') + 'P ' + fmt(f.protein) + ' C ' + fmt(f.carbs) + ' F ' + fmt(f.fat) + (f.barcode ? ' · ' + esc(f.barcode) : '') +
        '</div></div><div class="kcal small">' + Math.round(f.kcal) + ' kcal/100' + unitOf(f) + '</div></button>';
    }).join('') : '<div class="empty">Create foods that aren\'t in the database. Products from Open Food Facts can also be saved here.</div>';
    $('#recipesList').innerHTML = state.recipes.length ? state.recipes.map(function (r) {
      var f = recipeAsFood(r);
      return '<button class="item" data-edit-recipe="' + r.id + '"><div class="main"><div class="name">' + esc(r.name) + '</div><div class="sub">' +
        r.items.length + ' ingredient' + (r.items.length === 1 ? '' : 's') + ' · ' + r.servings + ' serving' + (r.servings == 1 ? '' : 's') +
        '</div></div><div class="kcal small">' + Math.round(f.kcal * f.serving_g / 100) + ' kcal/serving</div></button>';
    }).join('') : '<div class="empty">Combine foods into a recipe or reusable meal. Tip: use “Save” on a meal in the Today view.</div>';
    $('#favList').innerHTML = state.favorites.length ? state.favorites.map(function (f, i) {
      return '<div class="item"><div class="main"><div class="name">★ ' + esc(f.name) + '</div><div class="sub">' + Math.round(f.kcal) + ' kcal / 100 ' + unitOf(f) +
        '</div></div><button class="icon-btn" data-unfav="' + i + '" aria-label="Remove favorite">✕</button></div>';
    }).join('') : '<div class="empty">Tap ☆ when adding a food to make it a favorite.</div>';
  }

  // ---------- settings ----------
  function renderSettings() {
    var g = state.settings.goals, fm = $('#goalsForm');
    NUTR.forEach(function (k) { fm[k].value = g[k]; });
    updateGoalPct();
    var p = state.settings.profile, hf = $('#helperForm');
    ['sex', 'age', 'height', 'weight', 'activity', 'goal'].forEach(function (k) { if (p[k] != null) hf[k].value = p[k]; });
    var lw = latestWeight(); if (lw) hf.weight.value = lw;
    applyTheme();
    $('#foodDbInfo').textContent = 'Built-in food list: ' + FOODS.length + ' foods (' + foodSource + '). Stored days: ' + Object.keys(state.days).length + '.';
  }
  function updateGoalPct() {
    var fm = $('#goalsForm'), k = num(fm.kcal.value), p = num(fm.protein.value), c = num(fm.carbs.value), f = num(fm.fat.value);
    var mk = p * 4 + c * 4 + f * 9;
    $('#goalPct').textContent = k > 0 ? 'Macro split: protein ' + Math.round(p * 4 / k * 100) + '% · carbs ' + Math.round(c * 4 / k * 100) + '% · fat ' +
      Math.round(f * 9 / k * 100) + '% (macros add up to ' + Math.round(mk) + ' kcal)' : '';
  }
  function latestWeight() {
    var ks = Object.keys(state.weights).sort(); return ks.length ? state.weights[ks[ks.length - 1]] : null;
  }
  function calcGoals(p) {
    var w = num(p.weight), h = num(p.height), a = num(p.age), act = num(p.activity) || 1.2;
    var bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : 5);
    var tdee = bmr * act;
    var kcal = p.goal === 'lose' ? tdee - 500 : p.goal === 'gain' ? tdee + 300 : tdee;
    var floor = p.sex === 'female' ? 1200 : 1500;
    if (p.goal === 'lose') kcal = Math.max(kcal, floor);
    kcal = Math.round(kcal / 10) * 10;
    var protein = Math.round(w * (p.goal === 'maintain' ? 1.6 : 1.8));
    var fat = Math.round(kcal * 0.28 / 9);
    var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), goals: { kcal: kcal, protein: protein, carbs: carbs, fat: fat,
      fiber: Math.round(kcal / 1000 * 14), sugar: Math.round(kcal * 0.10 / 4) } };
  }

  // ---------- history & charts ----------
  function svgEl(w, h, inner) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>'; }
  function niceMax(v) { // returns a max that divides into 4 "nice" steps
    if (v <= 0) return 40;
    var raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p * 4;
  }
  function barChart(labels, series, opts) {
    opts = opts || {};
    var W = 340, H = 180, L = 34, R = 6, T = 10, B = 22, iw = W - L - R, ih = H - T - B, n = labels.length;
    var totals = labels.map(function (_, i) { return series.reduce(function (s, se) { return s + (opts.stacked ? se.values[i] : 0); }, 0) || Math.max.apply(null, series.map(function (se) { return se.values[i]; })); });
    var max = niceMax(Math.max(opts.goal || 0, Math.max.apply(null, totals.concat([1]))) * 1.05);
    var y = function (v) { return T + ih - v / max * ih; };
    var g = '';
    for (var t = 0; t <= 4; t++) {
      var v = max * t / 4;
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/>' +
        '<text x="' + (L - 4) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + (v >= 1000 ? (Math.round(v / 100) / 10) + 'k' : Math.round(v)) + '</text>';
    }
    var bw = iw / n, gap = Math.max(1, bw * (n > 14 ? 0.2 : 0.3));
    labels.forEach(function (lab, i) {
      var x = L + i * bw + gap / 2, w = bw - gap;
      if (opts.stacked) {
        var acc = 0;
        series.forEach(function (se) {
          var v = se.values[i]; if (v <= 0) return;
          g += '<rect x="' + x.toFixed(1) + '" y="' + y(acc + v).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (y(acc) - y(acc + v)).toFixed(1) + '" fill="' + se.color + '"><title>' + lab.full + ': ' + se.name + ' ' + fmt(v) + '</title></rect>';
          acc += v;
        });
      } else {
        var v = series[0].values[i], over = opts.goal && v > opts.goal * 1.05;
        if (v > 0) g += '<rect rx="2" x="' + x.toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (T + ih - y(v)).toFixed(1) + '" fill="' + (over ? 'var(--danger)' : series[0].color) + '"><title>' + lab.full + ': ' + Math.round(v) + ' kcal</title></rect>';
      }
      if (n <= 14 || i % Math.ceil(n / 10) === 0) g += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + lab.short + '</text>';
    });
    if (opts.goal) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(opts.goal) + '" y2="' + y(opts.goal) + '" stroke="var(--text)" stroke-dasharray="4 3" stroke-width="1.2" opacity=".7"/>' +
      '<text x="' + (W - R) + '" y="' + (y(opts.goal) - 3) + '" text-anchor="end">goal ' + Math.round(opts.goal) + '</text>';
    return svgEl(W, H, g);
  }
  function lineChart(points) { // [{k,v}]
    var W = 340, H = 170, L = 34, R = 8, T = 10, B = 22, iw = W - L - R, ih = H - T - B;
    if (!points.length) return '<div class="empty">No weight entries yet.</div>';
    var vs = points.map(function (p) { return p.v; });
    var mn = Math.floor(Math.min.apply(null, vs) - 1), mx = Math.ceil(Math.max.apply(null, vs) + 1);
    var t0 = parseKey(points[0].k).getTime(), t1 = parseKey(points[points.length - 1].k).getTime(), span = Math.max(1, t1 - t0);
    var X = function (k) { return points.length === 1 ? L + iw / 2 : L + (parseKey(k).getTime() - t0) / span * iw; };
    var Y = function (v) { return T + ih - (v - mn) / (mx - mn) * ih; };
    var g = '';
    for (var i = 0; i <= 4; i++) { var v = mn + (mx - mn) * i / 4; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + r1(v) + '</text>'; }
    g += '<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="' + points.map(function (p) { return X(p.k).toFixed(1) + ',' + Y(p.v).toFixed(1); }).join(' ') + '"/>';
    points.forEach(function (p) { g += '<circle cx="' + X(p.k).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.5" fill="var(--accent)"><title>' + p.k + ': ' + p.v + ' kg</title></circle>'; });
    var fl = function (k) { var d = parseKey(k); return d.getDate() + '/' + (d.getMonth() + 1); };
    g += '<text x="' + L + '" y="' + (H - 6) + '">' + fl(points[0].k) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + fl(points[points.length - 1].k) + '</text>';
    return svgEl(W, H, g);
  }
  function renderHistory() {
    var n = ui.range, end = addDays(todayKey(), -ui.rangeOffset * n), start = addDays(end, -(n - 1));
    var keys = []; for (var i = 0; i < n; i++) keys.push(addDays(start, i));
    var fmtD = function (k, o) { return parseKey(k).toLocaleDateString('en-GB', o); };
    $('#rangeLabel').textContent = fmtD(start, { day: 'numeric', month: 'short' }) + ' – ' + fmtD(end, { day: 'numeric', month: 'short', year: 'numeric' });
    $('#rangeNext').disabled = ui.rangeOffset === 0;
    $$('#rangeSeg button').forEach(function (b) { b.classList.toggle('active', +b.dataset.range === n); });
    var labels = keys.map(function (k) { var d = parseKey(k); return { short: n <= 7 ? fmtD(k, { weekday: 'short' }) : String(d.getDate()), full: fmtD(k, { weekday: 'short', day: 'numeric', month: 'short' }) }; });
    var tots = keys.map(dayTotals);
    var g = state.settings.goals;
    $('#chartKcal').innerHTML = barChart(labels, [{ name: 'kcal', color: 'var(--kcal)', values: tots.map(function (t) { return t.kcal; }) }], { goal: g.kcal });
    var ms = [{ k: 'protein', name: 'Protein' }, { k: 'carbs', name: 'Carbs' }, { k: 'fat', name: 'Fat' }];
    $('#chartMacros').innerHTML = barChart(labels, ms.map(function (m) { return { name: m.name, color: 'var(--' + m.k + ')', values: tots.map(function (t) { return t[m.k]; }) }; }), { stacked: true });
    $('#macroLegend').innerHTML = ms.map(function (m) { return '<span><i style="background:var(--' + m.k + ')"></i>' + m.name + '</span>'; }).join('');
    var logged = keys.filter(function (k) { return dayEntries(k).length; });
    var avg = zero(); logged.forEach(function (k) { sumInto(avg, dayTotals(k)); });
    var d = Math.max(1, logged.length);
    $('#avgTable').innerHTML = '<table><tr><th>Nutrient</th><th>Avg/day</th><th>Goal</th><th>%</th></tr>' + NUTR.map(function (k) {
      var a = avg[k] / d; return '<tr><td>' + (k === 'kcal' ? 'Calories' : k[0].toUpperCase() + k.slice(1)) + '</td><td>' + fmt(a, k) + (k === 'kcal' ? '' : ' g') + '</td><td>' + fmt(num(g[k]), k) + '</td><td>' + (g[k] ? Math.round(a / g[k] * 100) + '%' : '–') + '</td></tr>';
    }).join('') + '</table><p class="muted small">' + logged.length + ' of ' + n + ' days logged.</p>';
    // weight + streak cards
    var wAll = Object.keys(state.weights).sort();
    var lastW = wAll.length ? state.weights[wAll[wAll.length - 1]] : null, firstW = wAll.length ? state.weights[wAll[0]] : null;
    var diff = lastW != null && wAll.length > 1 ? r1(lastW - firstW) : null;
    $('#weightCard').innerHTML = '<div class="sl">My weight</div><div class="sv">' + (lastW != null ? lastW + ' kg' : '–') + '</div><div class="muted small">' +
      (diff != null ? (diff > 0 ? '+' : '') + diff + ' kg since ' + parseKey(wAll[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Log to track change') +
      '</div><button class="btn primary" id="logWeightBtn" type="button">Log weight <span aria-hidden="true">›</span></button>';
    var st = streak(), ws = weekStart(todayKey()), dots = '';
    for (var j = 0; j < 7; j++) { var dk = addDays(ws, j); dots += '<span>' + 'MTWTFSS'[j] + '<i class="' + (dayEntries(dk).length ? 'on' : '') + '"></i></span>'; }
    $('#streakCard').innerHTML = '<div class="flame" aria-hidden="true">🔥</div><div class="sv">' + st + '</div><div class="sl">Day streak</div><div class="streak-dots">' + dots + '</div>';
    if (!$('#weightDate').value) $('#weightDate').value = todayKey();
    var wk = Object.keys(state.weights).sort();
    var pts = wk.filter(function (k) { return k >= addDays(end, -Math.max(n, 90) + 1) && k <= end; }).map(function (k) { return { k: k, v: num(state.weights[k]) }; });
    $('#chartWeight').innerHTML = lineChart(pts);
    $('#weightList').innerHTML = wk.slice(-10).reverse().map(function (k) {
      return '<div class="item"><div class="main"><div class="name">' + state.weights[k] + ' kg</div><div class="sub">' + fmtD(k, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
        '</div></div><button class="icon-btn" data-del-weight="' + k + '" aria-label="Delete weight">✕</button></div>';
    }).join('');
  }

  // ---------- export / import ----------
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var rows = [['date', 'meal', 'food', 'amount', 'unit', 'servings', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g']];
    Object.keys(state.days).sort().forEach(function (k) {
      state.days[k].forEach(function (e) {
        rows.push([k, e.meal, e.name, e.quick ? '' : e.amount, e.quick ? '' : e.unit, e.servings || '', Math.round(e.n.kcal), r1(e.n.protein), r1(e.n.carbs), r1(e.n.fat), r1(e.n.fiber), r1(e.n.sugar)]);
      });
    });
    download('calorie-log-' + todayKey() + '.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n'), 'text/csv');
  }
  function exportCsvDaily() {
    var rows = [['date', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'weight_kg']];
    var ks = Object.keys(state.days).concat(Object.keys(state.weights)).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort();
    ks.forEach(function (k) { var t = dayTotals(k); rows.push([k, Math.round(t.kcal), r1(t.protein), r1(t.carbs), r1(t.fat), r1(t.fiber), r1(t.sugar), state.weights[k] || '']); });
    download('calorie-daily-' + todayKey() + '.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n'), 'text/csv');
  }
  function exportJson() {
    var data = Object.assign({ app: 'calorie-counter', exportedAt: new Date().toISOString() }, state);
    download('calorie-backup-' + todayKey() + '.json', JSON.stringify(data, null, 1), 'application/json');
  }
  function importJson(file) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var d = JSON.parse(rd.result);
        if (!d || typeof d !== 'object' || (!d.days && !d.settings)) throw new Error('Not a calorie counter backup');
        if (!confirm('Replace all current data with this backup? (' + Object.keys(d.days || {}).length + ' days)')) return;
        delete d.app; delete d.exportedAt;
        state = normalize(d); save(); applyTheme(); render(); toast('Backup imported');
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    rd.readAsText(file);
  }

  // ---------- events ----------
  function bind() {
    $('#tabbar').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) showView(b.dataset.view); });
    $('#prevDay').onclick = function () { setDate(addDays(ui.date, -1)); };
    $('#nextDay').onclick = function () { setDate(addDays(ui.date, 1)); };
    $('#todayBtn').onclick = function () { setDate(todayKey()); };
    $('#datePicker').addEventListener('click', function () { try { if (this.showPicker) this.showPicker(); } catch (e) { /* ignore */ } });
    $('#datePicker').addEventListener('change', function () { if (this.value) setDate(this.value); });
    $('#weekStrip').addEventListener('click', function (e) { var b = e.target.closest('[data-day]'); if (b) setDate(b.dataset.day); });
    $('#macroPager').addEventListener('scroll', function () {
      var p = this, i = Math.round(p.scrollLeft / Math.max(1, p.scrollWidth - p.clientWidth));
      $$('#pagerDots button').forEach(function (d) { d.classList.toggle('active', +d.dataset.page === i); });
    }, { passive: true });
    $('#pagerDots').addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]'); if (!b) return; var p = $('#macroPager');
      p.scrollTo({ left: +b.dataset.page * (p.scrollWidth - p.clientWidth), behavior: 'smooth' });
    });
    $('#customizeBtn').onclick = function () { showView('customize'); };
    $('#openCustomize').onclick = function () { showView('customize'); };
    $('#backBtn').onclick = function () { showView('settings'); };
    $('#view-history').addEventListener('click', function (e) {
      if (e.target.closest('#logWeightBtn')) { $('#weightSection').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { $('#weightKg').focus(); }, 300); }
    });
    // customization
    $('#accentGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-accent]'); if (b) setLook(function (l) { l.accent = b.dataset.accent; }); });
    $('#accentCustom').addEventListener('input', function () { var v = this.value.toLowerCase(); if (isHex(v)) { state.settings.look.accent = v; save(); applyLook(); } });
    $('#accentCustom').addEventListener('change', function () { var v = this.value.toLowerCase(); if (isHex(v)) setLook(function (l) { l.accent = v; }); });
    $('#ringColors').addEventListener('input', function (e) { var i = e.target.closest('[data-ring]'); if (i && isHex(i.value)) { state.settings.look.rings[i.dataset.ring] = i.value.toLowerCase(); save(); applyLook(); var dot = i.parentNode.querySelector('.dot'); if (dot) dot.style.setProperty('--c', getComputedStyle(document.documentElement).getPropertyValue('--' + i.dataset.ring)); } });
    $('#ringColors').addEventListener('change', function () { renderCustomize(); });
    $('#resetRings').onclick = function () { setLook(function (l) { l.rings = defaultLook().rings; }); toast('Ring colors reset'); };
    $('#fontGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-font]'); if (b) setLook(function (l) { l.font = b.dataset.font; }); });
    $('#sizeSeg').addEventListener('click', function (e) { var b = e.target.closest('[data-size]'); if (b) setLook(function (l) { l.size = b.dataset.size; }); });
    $('#resetLook').onclick = function () { state.settings.look = defaultLook(); state.settings.theme = 'auto'; save(); applyLook(); renderCustomize(); toast('Look reset to default'); };
    $('#fab').onclick = function () { openAdd(); };

    $('#meals').addEventListener('click', function (e) {
      var b = e.target.closest('[data-add-meal]'); if (b) { openAdd(b.dataset.addMeal); return; }
      var s = e.target.closest('[data-save-meal]'); if (s) { saveMealAsRecipe(s.dataset.saveMeal); return; }
      var it = e.target.closest('[data-entry]'); if (it) editEntry(it.dataset.entry);
    });
    $('#weightQuick').addEventListener('submit', function (e) {
      e.preventDefault(); var v = num($('#weightQuickKg').value);
      if (v > 0) { state.weights[ui.date] = r1(v); save(); render(); toast('Weight saved'); }
    });

    // dialogs: close buttons, stop scanner on close
    $$('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) d.close();
        else if (e.target === d) { var r = d.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) d.close(); }
      });
    });
    $('#addDialog').addEventListener('close', function () {
      stopScan();
      var fm = $('#quickForm'); delete fm.dataset.editId; $('[type=submit]', fm).textContent = 'Add';
    });

    $('#addTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) switchTab(b.dataset.tab); });
    $('#addMeal').addEventListener('change', function () { ui.addMeal = this.value; });
    $('#localSearch').addEventListener('input', renderLocalResults);
    $('#addDialog').addEventListener('click', function (e) {
      var it = e.target.closest('[data-food]');
      if (it && listCache[it.dataset.food]) chooseFood(listCache[it.dataset.food]);
      var cb = e.target.closest('#createFromBarcode');
      if (cb) openFoodDialog(null, { barcode: cb.dataset.code });
    });
    ['#photoCamera', '#photoFile'].forEach(function (id) {
      $(id).addEventListener('change', function () { var f = this.files && this.files[0]; this.value = ''; handlePhoto(f); });
    });
    $('#photoOut').addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo-search]');
      if (b) {
        var terms = window.FoodPhoto ? window.FoodPhoto.searchTerms(b.dataset.photoSearch) : [];
        var q = terms.filter(function (t) { return searchLocal(t).length; })[0] || b.dataset.photoSearch;
        switchTab('search'); $('#localSearch').value = q; renderLocalResults();
      }
    });
    $('#offForm').addEventListener('submit', function (e) { e.preventDefault(); offSearch($('#offQuery').value); });
    $('#barcodeForm').addEventListener('submit', function (e) { e.preventDefault(); lookupBarcode($('#barcodeInput').value); });
    $('#startScan').onclick = startScan;
    $('#stopScan').onclick = stopScan;
    $('#quickForm').addEventListener('submit', function (e) {
      e.preventDefault(); var fm = this, n = {};
      NUTR.forEach(function (k) { n[k] = r1(num(fm[k].value)); });
      var name = fm.name.value.trim() || 'Quick add';
      if (fm.dataset.editId) {
        var ent = dayEntries(ui.date).filter(function (x) { return x.id === fm.dataset.editId; })[0];
        if (ent) { ent.name = name; ent.n = n; ent.meal = $('#addMeal').value; }
      } else {
        (state.days[ui.date] = state.days[ui.date] || []).push({ id: uid(), meal: $('#addMeal').value, name: name, quick: true, n: n, ts: Date.now() });
      }
      save(); fm.reset(); $('#addDialog').close(); render(); toast('Saved ' + Math.round(n.kcal) + ' kcal');
    });

    // amount dialog
    $('#amtValue').addEventListener('input', updateAmountPreview);
    $('#amtUnit').addEventListener('change', function () {
      var f = amt.food, v = num($('#amtValue').value);
      $('#amtValue').value = this.value === 'serving' ? r1(v / f.serving_g) || 1 : r1(v * f.serving_g);
      renderQuickAmts(); updateAmountPreview();
    });
    $('#quickAmts').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (b) { $('#amtValue').value = b.dataset.q; updateAmountPreview(); } });
    $('#amountForm').addEventListener('submit', function (e) { e.preventDefault(); submitAmount(); });
    $('#amtFav').onclick = function () { toggleFav(amt.food); updateFavBtn(); };
    $('#amtDelete').onclick = function () { deleteEntry(amt.entry.id); $('#amountDialog').close(); toast('Deleted'); };
    $('#amtSaveFood').onclick = function () {
      var f = amt.food;
      if (state.customFoods.some(function (x) { return f.barcode && x.barcode === f.barcode; })) { toast('Already in My foods'); return; }
      var c = foodSnapshot(f); c.id = uid(); c.source = undefined; delete c.source;
      state.customFoods.push(c); save(); toast('Saved to My foods');
    };

    // foods view
    $('#newFoodBtn').onclick = function () { openFoodDialog(null); };
    $('#newRecipeBtn').onclick = function () { openRecipe(null); };
    $('#view-foods').addEventListener('click', function (e) {
      var f = e.target.closest('[data-edit-food]');
      if (f) openFoodDialog(state.customFoods.filter(function (x) { return x.id === f.dataset.editFood; })[0]);
      var r = e.target.closest('[data-edit-recipe]');
      if (r) openRecipe(state.recipes.filter(function (x) { return x.id === r.dataset.editRecipe; })[0]);
      var u = e.target.closest('[data-unfav]');
      if (u) { state.favorites.splice(+u.dataset.unfav, 1); save(); renderFoods(); }
    });
    $('#foodForm').addEventListener('submit', function (e) { e.preventDefault(); saveFoodForm(); });
    $('#foodDelete').onclick = function () {
      if (!confirm('Delete this food? Logged entries are kept.')) return;
      state.customFoods = state.customFoods.filter(function (x) { return x.id !== editingFoodId; });
      save(); $('#foodDialog').close(); render();
    };
    $('#recipeForm').addEventListener('submit', function (e) { e.preventDefault(); saveRecipe(); });
    $('#recipeForm').servings.addEventListener('input', renderRecipeDraft);
    $('#addIngredient').onclick = function () { openAdd(null, 'ingredient'); };
    $('#ingredientList').addEventListener('click', function (e) { var b = e.target.closest('[data-rm-ing]'); if (b) { recipeDraft.items.splice(+b.dataset.rmIng, 1); renderRecipeDraft(); } });
    $('#recipeDelete').onclick = function () {
      if (!confirm('Delete this recipe?')) return;
      state.recipes = state.recipes.filter(function (x) { return x.id !== recipeDraft.id; });
      save(); $('#recipeDialog').close(); render();
    };

    // history
    $('#rangeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { ui.range = +b.dataset.range; ui.rangeOffset = 0; renderHistory(); } });
    $('#rangePrev').onclick = function () { ui.rangeOffset++; renderHistory(); };
    $('#rangeNext').onclick = function () { if (ui.rangeOffset > 0) { ui.rangeOffset--; renderHistory(); } };
    $('#weightForm').addEventListener('submit', function (e) {
      e.preventDefault(); var k = $('#weightDate').value, v = num($('#weightKg').value);
      if (k && v > 0) { state.weights[k] = r1(v); save(); $('#weightKg').value = ''; renderHistory(); toast('Weight saved'); }
    });
    $('#weightList').addEventListener('click', function (e) { var b = e.target.closest('[data-del-weight]'); if (b) { delete state.weights[b.dataset.delWeight]; save(); renderHistory(); } });

    // settings
    $('#goalsForm').addEventListener('input', updateGoalPct);
    $('#goalsForm').addEventListener('submit', function (e) {
      e.preventDefault(); var fm = this; NUTR.forEach(function (k) { state.settings.goals[k] = Math.max(0, num(fm[k].value)); });
      save(); toast('Goals saved');
    });
    $('#helperForm').addEventListener('submit', function (e) {
      e.preventDefault(); var fm = this, p = {};
      ['sex', 'age', 'height', 'weight', 'activity', 'goal'].forEach(function (k) { p[k] = fm[k].value; });
      state.settings.profile = p; save();
      var r = calcGoals(p), g = r.goals;
      $('#helperResult').innerHTML = '<div class="helper-out"><p>BMR: <b>' + r.bmr + ' kcal</b> · Maintenance (TDEE): <b>' + r.tdee + ' kcal</b></p>' +
        '<p>Suggested: <b>' + g.kcal + ' kcal</b> · Protein ' + g.protein + ' g · Carbs ' + g.carbs + ' g · Fat ' + g.fat + ' g · Fiber ' + g.fiber + ' g · Sugar ≤ ' + g.sugar + ' g</p>' +
        '<button type="button" class="btn primary block" id="applyGoals">Use these goals</button><p class="muted small">Estimates only — adjust based on your progress.</p></div>';
      $('#applyGoals').onclick = function () { state.settings.goals = g; save(); renderSettings(); toast('Goals updated'); };
    });
    $('#themeSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { state.settings.theme = b.dataset.theme; save(); applyLook(); renderCustomize(); } });
    $('#exportJson').onclick = exportJson;
    $('#exportCsv').onclick = exportCsv;
    $('#exportCsvDaily').onclick = exportCsvDaily;
    $('#importJson').addEventListener('change', function () { if (this.files[0]) importJson(this.files[0]); this.value = ''; });
    $('#clearAll').onclick = function () {
      if (!confirm('Delete ALL data (log, foods, recipes, weights, goals)? This cannot be undone. Export a backup first!')) return;
      state = defaults(); save(); applyTheme(); render(); toast('All data deleted');
    };

    // re-render when the day changes (app left open overnight) and on theme change
    document.addEventListener('visibilitychange', function () { if (!document.hidden && ui.view === 'today') renderToday(); });
    window.addEventListener('storage', function (e) { if (e.key === STORE_KEY) { state = load(); applyLook(); render(); } });
  }

  // ---------- service worker ----------
  function registerSW() {
    if (window.SINGLE_FILE || !('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // ---------- init ----------
  applyLook();
  bind();
  registerSW();
  showView('today');
  initFoods().then(function () { if (ui.view === 'settings') renderSettings(); });

  // expose a tiny debug hook (used by tests)
  window.CalorieApp = { state: function () { return state; }, foods: function () { return FOODS; }, foodSource: function () { return foodSource; }, calcGoals: calcGoals, look: function () { return JSON.parse(JSON.stringify(state.settings.look)); }, resolvedLook: resolveLook, fonts: FONTS, swatches: SWATCHES, photoMatches: function (l, m) { return photoMatches(l, m || 3); } };
})();
