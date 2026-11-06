(function() {
  'use strict';

  var section = document.getElementById('project-vortex');
  if (!section) return;
  var stage = section.querySelector('.project-vortex-stage');
  var canvas = section.querySelector('canvas');
  var sources = Array.from(document.querySelectorAll('#portfolio-grid > .item img, #tech-art .item img'));
  if (!sources.length) { section.hidden = true; return; }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pointer = [0, 0];
  var frame = 0;
  var initialized = false;
  var renderer = null;
  var disposed = false;
  var clamp = function(value, low, high) { return Math.max(low, Math.min(high, value)); };

  function fallback() {
    section.dataset.vortexRenderer = 'fallback';
    canvas.hidden = true;
    var gallery = section.querySelector('.project-vortex-fallback');
    gallery.hidden = false;
    sources.forEach(function(source) {
      var image = document.createElement('img');
      image.src = source.currentSrc || source.src;
      image.alt = '';
      image.decoding = 'async';
      gallery.appendChild(image);
    });
    renderer = null;
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) { fallback(); return; }

    try {
      function shader(type, source) {
        var result = gl.createShader(type);
        gl.shaderSource(result, source);
        gl.compileShader(result);
        if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Vortex shader compilation failed');
        return result;
      }

      var vertex = shader(gl.VERTEX_SHADER, [
        'attribute vec2 aPosition;',
        'varying vec2 vUV;',
        'void main() { vUV = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }'
      ].join('\n'));
      var fragment = shader(gl.FRAGMENT_SHADER, [
        'precision mediump float;',
        'varying vec2 vUV;',
        'uniform sampler2D uAtlas;',
        'uniform vec2 uResolution;',
        'uniform vec2 uPointer;',
        'uniform vec2 uAtlasGrid;',
        'uniform float uCount;',
        'uniform float uProgress;',
        'void main() {',
        '  vec2 center = vec2(0.5 + sin(uProgress * 3.0) * 0.045, 0.5 + cos(uProgress * 2.4) * 0.025) + uPointer * 0.025;',
        '  vec2 ray = (vUV - center) * vec2(uResolution.x / uResolution.y, 1.0);',
        '  float radius = max(length(ray), 0.025);',
        '  float depth = 1.45 / pow(radius, 0.94);',
        '  float angle = atan(ray.y, ray.x) / 6.2831853 + 0.5;',
        '  angle += depth * 0.019 + uProgress * 0.18;',
        '  vec2 wall = vec2(angle * 12.0, depth * 3.0 + uProgress * 38.0);',
        '  vec2 tile = fract(wall);',
        '  float column = floor(wall.x);',
        '  float row = floor(wall.y);',
        '  float index = mod(column + row * 7.0, uCount);',
        '  vec2 cell = vec2(mod(index, uAtlasGrid.x), uAtlasGrid.y - 1.0 - floor(index / uAtlasGrid.x));',
        '  vec2 localUV = vec2(mix(0.01, 0.99, tile.x), mix(0.99, 0.01, tile.y));',
        '  vec3 image = texture2D(uAtlas, (cell + localUV) / uAtlasGrid).rgb;',
        '  float seams = smoothstep(0.0, 0.012, tile.x) * smoothstep(0.0, 0.012, tile.y);',
        '  float distanceFade = 1.0 - smoothstep(12.0, 25.0, depth);',
        '  float light = 0.88 + 0.12 * cos(angle * 6.2831853);',
        '  vec3 dark = vec3(0.025, 0.03, 0.03);',
        '  gl_FragColor = vec4(mix(dark, image * light * seams, distanceFade), 1.0);',
        '}'
      ].join('\n'));
      var program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Vortex shader linking failed');
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.useProgram(program);

      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      var position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      var columns = 6;
      var rows = Math.ceil(sources.length / columns);
      var atlas = document.createElement('canvas');
      atlas.width = columns * 256;
      atlas.height = rows * 144;
      var context = atlas.getContext('2d');
      context.fillStyle = '#202424';
      context.fillRect(0, 0, atlas.width, atlas.height);
      var texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.uniform1i(gl.getUniformLocation(program, 'uAtlas'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'uAtlasGrid'), columns, rows);
      gl.uniform1f(gl.getUniformLocation(program, 'uCount'), sources.length);
      var resolution = gl.getUniformLocation(program, 'uResolution');
      var progressUniform = gl.getUniformLocation(program, 'uProgress');
      var pointerUniform = gl.getUniformLocation(program, 'uPointer');
      var dirty = true;

      renderer = function(progress) {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var width = Math.round(stage.clientWidth * dpr);
        var height = Math.round(stage.clientHeight * dpr);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
        if (dirty) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
          dirty = false;
        }
        gl.uniform2f(resolution, width, height);
        gl.uniform2f(pointerUniform, reducedMotion.matches ? 0 : pointer[0], reducedMotion.matches ? 0 : pointer[1]);
        gl.uniform1f(progressUniform, reducedMotion.matches ? 0.2 : progress);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      sources.forEach(function(image, index) {
        function paint() {
          if (disposed || !image.naturalWidth) return;
          var scale = Math.max(256 / image.naturalWidth, 144 / image.naturalHeight);
          var cropWidth = 256 / scale;
          var cropHeight = 144 / scale;
          context.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, (index % columns) * 256, Math.floor(index / columns) * 144, 256, 144);
          dirty = true;
          schedule();
        }
        if (image.complete && image.naturalWidth) paint();
        else {
          image.addEventListener('load', paint, { once: true });
          image.loading = 'eager';
        }
      });
      canvas.addEventListener('webglcontextlost', function(event) {
        event.preventDefault();
        if (!disposed) fallback();
      }, { once: true });
      section.dataset.vortexRenderer = 'webgl';
    } catch (error) {
      fallback();
      section.dataset.vortexRenderer = 'fallback';
    }
  }

  function render() {
    frame = 0;
    if (disposed) return;
    var bounds = section.getBoundingClientRect();
    var height = window.innerHeight;
    var visible = bounds.top < height && bounds.bottom > 0;
    document.body.classList.toggle('is-in-vortex', bounds.top <= 32 && bounds.bottom > 32);
    if (!visible) return;
    initialize();
    var entry = clamp((height - bounds.top) / height, 0, 1);
    var progress = clamp(-bounds.top / Math.max(1, section.offsetHeight - height), 0, 1);
    section.style.setProperty('--vortex-entry', entry);
    section.style.setProperty('--vortex-caption', clamp(1 - progress * 7, 0, 1));
    if (renderer) renderer(progress);
  }

  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  stage.addEventListener('pointermove', function(event) {
    if (reducedMotion.matches) return;
    var bounds = stage.getBoundingClientRect();
    pointer = [(event.clientX - bounds.left) / bounds.width - .5, .5 - (event.clientY - bounds.top) / bounds.height];
    schedule();
  });
  stage.addEventListener('pointerleave', function() { pointer = [0, 0]; schedule(); });
  reducedMotion.addEventListener('change', schedule);
  window.addEventListener('pagehide', function() {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
  }, { once: true });
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) { disposed = false; schedule(); }
  });
  schedule();
})();
