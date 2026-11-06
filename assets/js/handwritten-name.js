(function() {
  'use strict';
  var fonts = window.portfolioSignatures;
  var name = document.querySelector('.identity-signature');
  var kit = document.querySelector('.signature-style-kit');
  if (!fonts || !name || !kit) return;
  var drawing = name.querySelector('.signature-drawing');
  var toggle = kit.querySelector('.signature-kit-toggle');
  var panel = kit.querySelector('.signature-kit-panel');
  var defaults = { family: 'capitol', size: 36, weight: 1.2, duration: 2.8 };
  var settings = Object.assign({}, defaults);
  try { Object.assign(settings, JSON.parse(localStorage.getItem('anchit-signature-style')) || {}); } catch (error) {}
  var ns = 'http://www.w3.org/2000/svg';

  function bounded(value, min, max, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  }

  function pathFor(stroke) {
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', stroke.d);
    return path;
  }

  function replay() {
    var font = fonts[settings.family];
    var total = font.strokes.reduce(function(sum, stroke) { return sum + stroke.length; }, 0);
    var pauses = .12 + font.strokes.reduce(function(sum, stroke) { return sum + stroke.pause + .012; }, 0);
    var inkTime = Math.max(.4, settings.duration - pauses);
    var delay = .12;
    var fragment = document.createDocumentFragment();
    font.strokes.forEach(function(stroke) {
      delay += stroke.pause;
      var duration = stroke.length / total * inkTime;
      var path = pathFor(stroke);
      path.classList.add('signature-stroke');
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--stroke-duration', duration.toFixed(4) + 's');
      path.style.setProperty('--stroke-delay', delay.toFixed(4) + 's');
      fragment.appendChild(path);
      delay += duration + .012;
    });
    drawing.replaceChildren(fragment);
    drawing.dataset.typeface = settings.family;
  }

  function apply(animate) {
    if (!Object.prototype.hasOwnProperty.call(fonts, settings.family)) settings.family = defaults.family;
    settings.size = bounded(settings.size, 28, 48, defaults.size);
    settings.weight = bounded(settings.weight, .75, 2.2, defaults.weight);
    settings.duration = bounded(settings.duration, 1.2, 5, defaults.duration);
    name.style.setProperty('--signature-width', (236 * settings.size / 36).toFixed(2) + 'px');
    name.style.setProperty('--signature-height', (40 * settings.size / 36).toFixed(2) + 'px');
    name.style.setProperty('--signature-ink', settings.weight);
    kit.querySelectorAll('[data-signature-font]').forEach(function(button) {
      button.setAttribute('aria-pressed', String(button.dataset.signatureFont === settings.family));
    });
    ['size', 'weight', 'duration'].forEach(function(key) { kit.querySelector('#signature-' + key).value = settings[key]; });
    kit.querySelector('#signature-size-value').textContent = settings.size + 'px';
    kit.querySelector('#signature-weight-value').textContent = settings.weight.toFixed(2) + 'px';
    kit.querySelector('#signature-duration-value').textContent = settings.duration.toFixed(1) + 's';
    if (animate) replay();
  }

  function save() {
    try { localStorage.setItem('anchit-signature-style', JSON.stringify(settings)); } catch (error) {}
  }

  function close() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }

  kit.querySelectorAll('[data-signature-font]').forEach(function(button) {
    var sample = document.createElementNS(ns, 'svg');
    sample.setAttribute('viewBox', '0 0 260 44');
    sample.setAttribute('aria-hidden', 'true');
    sample.setAttribute('focusable', 'false');
    sample.classList.add('signature-font-sample');
    fonts[button.dataset.signatureFont].strokes.forEach(function(stroke) { sample.appendChild(pathFor(stroke)); });
    button.appendChild(sample);
    button.addEventListener('click', function() { settings.family = button.dataset.signatureFont; apply(true); save(); });
  });
  kit.querySelectorAll('input[data-signature-setting]').forEach(function(input) {
    input.addEventListener('input', function() { settings[input.dataset.signatureSetting] = input.value; apply(false); save(); });
    input.addEventListener('change', function() { if (input.dataset.signatureSetting === 'duration') replay(); });
  });
  toggle.addEventListener('click', function() { var open = panel.hidden; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); });
  kit.querySelector('.signature-kit-replay').addEventListener('click', replay);
  kit.querySelector('.signature-kit-reset').addEventListener('click', function() { settings = Object.assign({}, defaults); apply(true); save(); });
  kit.querySelector('.signature-kit-close').addEventListener('click', function() { close(); toggle.focus(); });
  kit.addEventListener('keydown', function(event) { if (event.key === 'Escape') { close(); toggle.focus(); } });
  document.addEventListener('click', function(event) { if (!kit.contains(event.target)) close(); });
  apply(true);
})();
