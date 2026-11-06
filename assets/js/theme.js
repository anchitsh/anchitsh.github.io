(function() {
  'use strict';
  var root = document.documentElement;
  var current = 'light';
  try { if (localStorage.getItem('anchit-theme') === 'dark') current = 'dark'; } catch (error) {}
  // Run in the head so a saved dark theme is applied before the page paints.
  root.dataset.theme = current;

  function mount() {
    if (document.querySelector('.theme-switch')) return;
    var control = document.createElement('div');
    control.className = 'theme-switch';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Color theme');
    var icons = {
      light: '<circle cx="8" cy="8" r="3"/><path d="M8 1v1M8 14v1M1 8h1M14 8h1M3 3l1 1m8 8 1 1M3 13l1-1m8-8 1-1"/>',
      dark: '<path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z"/>'
    };

    function apply(theme, persist) {
      current = theme;
      root.dataset.theme = theme;
      control.querySelectorAll('button').forEach(function(button) {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
      });
      if (persist) {
        try { localStorage.setItem('anchit-theme', theme); } catch (error) {}
      }
    }

    ['light', 'dark'].forEach(function(theme) {
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.themeChoice = theme;
      button.setAttribute('aria-label', theme === 'light' ? 'Light theme' : 'Dark theme');
      button.title = theme === 'light' ? 'Light theme' : 'Dark theme';
      button.innerHTML = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[theme] + '</svg>';
      button.addEventListener('click', function() { apply(theme, true); });
      control.appendChild(button);
    });
    document.body.appendChild(control);
    apply(current, false);
    window.addEventListener('storage', function(event) {
      if (event.key === 'anchit-theme') apply(event.newValue === 'dark' ? 'dark' : 'light', false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
