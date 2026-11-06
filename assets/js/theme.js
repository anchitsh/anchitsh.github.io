(function() {
  'use strict';
  var root = document.documentElement;
  var current = 'light';
  try { if (localStorage.getItem('anchit-theme') === 'dark') current = 'dark'; } catch (error) {}
  // Run in the head so a saved dark theme is applied before the page paints.
  root.dataset.theme = current;

  // Create audio only after a switch press; never play on load or storage sync.
  var audioContext;
  var switchSounds = {};
  function playSwitchSound(on) {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext();
        switchSounds = {};
      }
      var context = audioContext;
      function play() {
        try {
          if (context.state !== 'running') return;
          var key = on ? 'on' : 'off';
          if (!switchSounds[key]) {
            var buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .09), context.sampleRate);
            var samples = buffer.getChannelData(0);
            var seed = 17;
            for (var i = 0; i < samples.length; i++) {
              var time = i / context.sampleRate;
              seed = (seed * 16807) % 2147483647;
              var noise = (seed / 2147483647) * 2 - 1;
              // Two tiny latch impacts, with a brighter click when the light turns on.
              var second = Math.max(0, time - .014);
              var impact = Math.exp(-time * 540) + (time >= .014 ? .55 * Math.exp(-second * 660) : 0);
              var resonance = Math.sin(2 * Math.PI * (on ? 1650 : 1050) * time) * Math.exp(-time * 95);
              var body = Math.sin(2 * Math.PI * (on ? 380 : 260) * time) * Math.exp(-time * 125);
              samples[i] = (noise * impact * .48 + resonance * .17 + body * .25) * Math.min(1, time / .0006);
            }
            switchSounds[key] = buffer;
          }
          var source = context.createBufferSource();
          var volume = context.createGain();
          source.buffer = switchSounds[key];
          volume.gain.value = .4;
          source.connect(volume);
          volume.connect(context.destination);
          source.onended = function() { source.disconnect(); volume.disconnect(); };
          source.start();
        } catch (error) { /* Feedback must never interrupt a theme change. */ }
      }
      if (context.state === 'suspended') context.resume().then(play).catch(function() {});
      else play();
    } catch (error) { /* Audio may be unavailable or blocked by the browser. */ }
  }

  function mount() {
    if (document.querySelector('.theme-switch')) return;
    var control = document.createElement('button');
    control.type = 'button';
    control.className = 'theme-switch';
    control.innerHTML = '<svg viewBox="0 0 48 116" width="48" height="116" fill="none" aria-hidden="true" focusable="false">' +
      '<defs><radialGradient id="theme-bulb-halo"><stop stop-color="#f6d371" stop-opacity=".45"/><stop offset="1" stop-color="#f6d371" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="bulb-cord"><path d="M24 0v60" stroke-width="1.4"/><path d="m22.8 5 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2m-2.4 4 2.4 2" stroke-width=".6" opacity=".45"/></g>' +
      '<g class="bulb-fixture"><circle class="bulb-halo" cx="24" cy="91" r="28" fill="url(#theme-bulb-halo)"/>' +
      '<path class="bulb-glass" d="M18 70v5c0 6-8 8-8 17a14 14 0 0 0 28 0c0-9-8-11-8-17v-5Z" stroke-width="1.2"/>' +
      '<path class="bulb-filament" d="m20 74 1 10-2 3 5 7 5-7-2-3 1-10M21 84h6" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M14 91c0 5 2 8 5 10" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".4"/>' +
      '<rect class="bulb-socket" x="16" y="60" width="16" height="13" rx="3" stroke-width=".8"/>' +
      '<path class="bulb-socket-ridges" d="M18 64h12m-12 4h12" stroke-width=".8" stroke-linecap="round"/></g></svg>';

    function apply(theme, persist) {
      current = theme;
      root.dataset.theme = theme;
      var on = theme === 'light';
      control.setAttribute('aria-pressed', String(on));
      control.setAttribute('aria-label', on ? 'Turn off the light' : 'Turn on the light');
      control.title = on ? 'Turn off the light · Dark theme' : 'Turn on the light · Light theme';
      if (persist) {
        try { localStorage.setItem('anchit-theme', theme); } catch (error) {}
      }
    }

    control.addEventListener('click', function() {
      var on = current !== 'light';
      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        control.classList.remove('is-pulling');
        void control.offsetWidth;
        control.classList.add('is-pulling');
      }
      apply(on ? 'light' : 'dark', true);
      playSwitchSound(on);
      if (!reducedMotion && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(on ? 12 : 8); } catch (error) {}
      }
    });
    control.addEventListener('animationend', function(event) { if (event.animationName === 'bulb-pull') control.classList.remove('is-pulling'); });
    document.body.appendChild(control);
    apply(current, false);
    window.addEventListener('storage', function(event) {
      if (event.key === 'anchit-theme') apply(event.newValue === 'dark' ? 'dark' : 'light', false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
