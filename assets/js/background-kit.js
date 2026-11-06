(function() {
  'use strict';
  var kit = document.querySelector('.canvas-style-kit');
  if (!kit || !document.body.classList.contains('portfolio-home')) return;
  var root = document.documentElement;
  var toggle = kit.querySelector('.canvas-kit-toggle');
  var panel = kit.querySelector('.canvas-kit-panel');
  var strength = kit.querySelector('#canvas-strength');
  var spacing = kit.querySelector('#canvas-spacing');
  var patterns = ['plain', 'dots', 'grid', 'crosshairs', 'grain', 'rules'];
  var tones = {
    white: '#ffffff', chalk: '#f6f7f5', warm: '#faf8f4',
    oat: '#f2eee5', sand: '#f3ecde', mist: '#eef2f4',
    sage: '#eef3ed', rose: '#f7eeee', lilac: '#f2eff7'
  };
  var defaults = { pattern: 'plain', strength: 4, spacing: 32, tone: 'white' };
  var settings = Object.assign({}, defaults);
  try {
    var saved = JSON.parse(localStorage.getItem('anchit-background-kit'));
    if (saved && typeof saved === 'object') Object.assign(settings, saved);
  } catch (error) {}

  function clamp(value, low, high, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
  }

  function apply() {
    if (patterns.indexOf(settings.pattern) < 0) settings.pattern = defaults.pattern;
    if (!Object.prototype.hasOwnProperty.call(tones, settings.tone)) settings.tone = defaults.tone;
    settings.strength = clamp(settings.strength, 0, 12, defaults.strength);
    settings.spacing = clamp(settings.spacing, 16, 80, defaults.spacing);
    document.body.dataset.canvasPattern = settings.pattern;
    root.style.setProperty('--canvas-paper', tones[settings.tone]);
    root.style.setProperty('--canvas-strength', settings.strength / 100);
    root.style.setProperty('--canvas-spacing', settings.spacing + 'px');
    strength.value = settings.strength;
    spacing.value = settings.spacing;
    strength.disabled = spacing.disabled = settings.pattern === 'plain';
    kit.querySelector('#canvas-strength-value').textContent = settings.strength + '%';
    kit.querySelector('#canvas-spacing-value').textContent = settings.spacing + 'px';
    kit.querySelectorAll('[data-canvas-choice]').forEach(function(button) {
      button.setAttribute('aria-pressed', String(button.dataset.canvasChoice === settings.pattern));
    });
    kit.querySelectorAll('[data-canvas-tone]').forEach(function(button) {
      button.setAttribute('aria-pressed', String(button.dataset.canvasTone === settings.tone));
    });
  }

  function save() {
    try { localStorage.setItem('anchit-background-kit', JSON.stringify(settings)); } catch (error) {}
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function() {
    var open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
  kit.querySelectorAll('[data-canvas-choice]').forEach(function(button) {
    button.addEventListener('click', function() { settings.pattern = button.dataset.canvasChoice; apply(); save(); });
  });
  kit.querySelectorAll('[data-canvas-tone]').forEach(function(button) {
    button.addEventListener('click', function() { settings.tone = button.dataset.canvasTone; apply(); save(); });
  });
  strength.addEventListener('input', function() { settings.strength = strength.value; apply(); save(); });
  spacing.addEventListener('input', function() { settings.spacing = spacing.value; apply(); save(); });
  kit.querySelector('.canvas-kit-reset').addEventListener('click', function() { settings = Object.assign({}, defaults); apply(); save(); });
  kit.querySelector('.canvas-kit-close').addEventListener('click', function() { close(); toggle.focus(); });
  kit.addEventListener('keydown', function(event) { if (event.key === 'Escape') { close(); toggle.focus(); } });
  document.addEventListener('click', function(event) { if (!kit.contains(event.target)) close(); });
  apply();
})();
