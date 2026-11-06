(function() {
  'use strict';

  var section = document.getElementById('project-vortex');
  if (!section) return;
  var stage = section.querySelector('.project-vortex-stage');
  var canvas = section.querySelector('canvas');
  var projects = Array.from(document.querySelectorAll('#portfolio-grid > .item img'));
  var techArt = Array.from(document.querySelectorAll('#tech-art .item img'));
  var sources = [];
  // Mix the two sections throughout the rings, rather than hiding Tech Art at the back.
  for (var i = 0; i < Math.max(projects.length, techArt.length); i++) {
    if (projects[i]) sources.push(projects[i]);
    if (techArt[i]) sources.push(techArt[i]);
  }
  if (!sources.length) { section.hidden = true; return; }
  var wallColumns = 12;
  section.dataset.vortexSources = sources.length;
  section.dataset.vortexDepth = 'continuous';
  section.dataset.vortexProjects = projects.length;
  section.dataset.vortexTechArt = techArt.length;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var frame = 0;
  var initialized = false;
  var renderer = null;
  var disposed = false;
  var clamp = function(value, low, high) { return Math.max(low, Math.min(high, value)); };
  var hoverPoint = null;
  var hovered = -1;
  var card = document.createElement('div');
  card.className = 'project-vortex-card';
  card.hidden = true;
  card.setAttribute('aria-hidden', 'true');
  var cardTitle = document.createElement('h3');
  var cardRole = document.createElement('p');
  cardRole.className = 'project-vortex-card-role';
  var cardDescription = document.createElement('p');
  cardDescription.className = 'project-vortex-card-description';
  card.append(cardTitle, cardRole, cardDescription);
  stage.appendChild(card);
  var details = sources.map(function(image) {
    var item = image.closest('.item');
    var title = item.querySelector('h3');
    var role = item.querySelector('.work-role');
    var tech = item.querySelector('.work-tech');
    var link = item.querySelector('a.item-wrap[href]');
    var technologies = tech ? Array.from(tech.querySelectorAll('.tech-tag')).map(function(tag) { return tag.textContent.trim(); }).join(', ') || tech.textContent.trim() : '';
    return {
      title: title ? title.textContent.trim() : image.alt.replace(/ preview$/i, ''),
      role: role ? role.textContent.trim() : '',
      description: technologies ? 'Built with ' + technologies.replace(/\s*\/\s*/g, ', ') + '.' : '',
      url: link ? link.href : '',
      loading: false
    };
  });

  function hideCard() {
    card.hidden = true;
    hovered = -1;
  }

  function loadDescription(index) {
    var detail = details[index];
    if (detail.loading || !detail.url) return;
    var url = new URL(detail.url, window.location.href);
    if (url.origin !== window.location.origin || !/\.html$/i.test(url.pathname)) return;
    detail.loading = true;
    fetch(url.href).then(function(response) {
      if (!response.ok) throw new Error('Project description unavailable');
      return response.text();
    }).then(function(html) {
      var page = new DOMParser().parseFromString(html, 'text/html');
      var paragraph = page.querySelector('.project-copy > p, .project-overview-description p');
      if (!paragraph) return;
      var text = paragraph.textContent.replace(/\s+/g, ' ').trim();
      if (text.length > 220) text = text.slice(0, 217).replace(/\s+\S*$/, '') + '…';
      if (text) detail.description = text;
      if (hovered === index) { cardDescription.textContent = detail.description; schedule(); }
    }).catch(function() { /* Keep the existing role and technology details. */ });
  }

  // Match the shader's fixed center and scroll-driven wall coordinates.
  function previewAt(point, bounds, progress) {
    var x = (point.x - bounds.left) / bounds.width;
    var y = 1 - (point.y - bounds.top) / bounds.height;
    var rayX = (x - .5) * (canvas.width / canvas.height);
    var rayY = y - .5;
    var depth = 1.45 / Math.pow(Math.max(Math.hypot(rayX, rayY), .025), .94);
    if (depth >= 25) return -1;
    var row = depth * 3 + progress * 38;
    var angle = Math.atan2(rayY, rayX) / (Math.PI * 2) + .5 + depth * .019 + progress * .18;
    return (Math.floor(angle * wallColumns) + Math.floor(row) * 7) % sources.length;
  }

  function updateCard(progress) {
    if (!hoverPoint) { hideCard(); return; }
    var bounds = stage.getBoundingClientRect();
    var index = renderer ? previewAt(hoverPoint, bounds, progress) : hoverPoint.fallbackIndex;
    if (index == null || index < 0) { hideCard(); return; }
    if (hovered !== index) {
      hovered = index;
      cardTitle.textContent = details[index].title;
      cardRole.textContent = details[index].role;
      cardDescription.textContent = details[index].description;
      card.dataset.projectIndex = index;
      loadDescription(index);
    }
    card.hidden = false;
    var x = hoverPoint.x - bounds.left;
    var y = hoverPoint.y - bounds.top;
    var left = x + 20;
    var top = y + 20;
    if (left + card.offsetWidth > bounds.width - 16) left = x - card.offsetWidth - 20;
    if (top + card.offsetHeight > bounds.height - 80) top = y - card.offsetHeight - 20;
    card.style.left = clamp(left, 16, Math.max(16, bounds.width - card.offsetWidth - 16)) + 'px';
    card.style.top = clamp(top, 16, Math.max(16, bounds.height - card.offsetHeight - 80)) + 'px';
  }

  function fallback() {
    section.dataset.vortexRenderer = 'fallback';
    canvas.hidden = true;
    var gallery = section.querySelector('.project-vortex-fallback');
    gallery.hidden = false;
    sources.forEach(function(source, index) {
      var image = document.createElement('img');
      image.src = source.currentSrc || source.src;
      image.alt = '';
      image.decoding = 'async';
      image.dataset.vortexIndex = index;
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
      var precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? 'highp' : 'mediump';
      var fragment = shader(gl.FRAGMENT_SHADER, [
        'precision ' + precision + ' float;',
        'varying vec2 vUV;',
        'uniform sampler2D uAtlas;',
        'uniform vec2 uResolution;',
        'uniform vec2 uAtlasSize;',
        'uniform vec2 uCellSize;',
        'uniform float uAtlasColumns;',
        'uniform float uWallColumns;',
        'uniform float uCount;',
        'uniform float uProgress;',
        'void main() {',
        '  vec2 center = vec2(0.5);',
        '  vec2 ray = (vUV - center) * vec2(uResolution.x / uResolution.y, 1.0);',
        '  float radius = max(length(ray), 0.025);',
        '  float depth = 1.45 / pow(radius, 0.94);',
        '  vec3 dark = vec3(0.025, 0.03, 0.03);',
        '  float angle = atan(ray.y, ray.x) / 6.2831853 + 0.5;',
        '  angle += depth * 0.019 + uProgress * 0.18;',
        '  vec2 wall = vec2(angle * uWallColumns, depth * 3.0 + uProgress * 38.0);',
        '  vec2 tile = fract(wall);',
        '  float column = floor(wall.x);',
        '  float row = floor(wall.y);',
        '  float index = mod(column + row * 7.0, uCount);',
        '  vec2 cell = vec2(mod(index, uAtlasColumns) * uCellSize.x, uAtlasSize.y - (floor(index / uAtlasColumns) + 1.0) * uCellSize.y);',
        '  vec2 inset = vec2(8.0) / uCellSize;',
        '  vec2 localUV = mix(inset, 1.0 - inset, vec2(tile.x, 1.0 - tile.y));',
        '  vec3 image = texture2D(uAtlas, (cell + localUV * uCellSize) / uAtlasSize).rgb;',
        '  float seams = smoothstep(0.0, 0.012, tile.x) * smoothstep(0.0, 0.012, tile.y);',
        '  float distanceFade = 1.0 - smoothstep(12.0, 25.0, depth);',
        '  float light = 0.88 + 0.12 * cos(angle * 6.2831853);',
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

      var columns = 8;
      var rows = Math.ceil(sources.length / columns);
      var maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      var cellWidth = Math.min(512, Math.pow(2, Math.floor(Math.log2(maxTexture / columns))));
      var cellHeight = Math.round(cellWidth * 9 / 16);
      var powerOfTwo = function(value) { return Math.pow(2, Math.ceil(Math.log2(value))); };
      var atlas = document.createElement('canvas');
      atlas.width = powerOfTwo(columns * cellWidth);
      atlas.height = powerOfTwo(rows * cellHeight);
      var context = atlas.getContext('2d');
      context.fillStyle = '#202424';
      context.fillRect(0, 0, atlas.width, atlas.height);
      var texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var anisotropy = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
      if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.uniform1i(gl.getUniformLocation(program, 'uAtlas'), 0);
      gl.uniform2f(gl.getUniformLocation(program, 'uAtlasSize'), atlas.width, atlas.height);
      gl.uniform2f(gl.getUniformLocation(program, 'uCellSize'), cellWidth, cellHeight);
      gl.uniform1f(gl.getUniformLocation(program, 'uAtlasColumns'), columns);
      gl.uniform1f(gl.getUniformLocation(program, 'uWallColumns'), wallColumns);
      gl.uniform1f(gl.getUniformLocation(program, 'uCount'), sources.length);
      var resolution = gl.getUniformLocation(program, 'uResolution');
      var progressUniform = gl.getUniformLocation(program, 'uProgress');
      var dirty = true;

      renderer = function(progress) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var width = Math.round(stage.clientWidth * dpr);
        var height = Math.round(stage.clientHeight * dpr);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
        if (dirty) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
          gl.generateMipmap(gl.TEXTURE_2D);
          dirty = false;
        }
        gl.uniform2f(resolution, width, height);
        gl.uniform1f(progressUniform, reducedMotion.matches ? 0.2 : progress);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };

      sources.forEach(function(image, index) {
        function paint() {
          if (disposed || !image.naturalWidth) return;
          var scale = Math.max(cellWidth / image.naturalWidth, cellHeight / image.naturalHeight);
          var cropWidth = cellWidth / scale;
          var cropHeight = cellHeight / scale;
          context.drawImage(image, (image.naturalWidth - cropWidth) / 2, (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, (index % columns) * cellWidth, Math.floor(index / columns) * cellHeight, cellWidth, cellHeight);
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
      section.dataset.vortexTextureWidth = cellWidth;
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
    if (!visible) { hideCard(); return; }
    initialize();
    var entry = clamp((height - bounds.top) / height, 0, 1);
    var progress = clamp(-bounds.top / Math.max(1, section.offsetHeight - height), 0, 1);
    section.style.setProperty('--vortex-entry', entry);
    section.style.setProperty('--vortex-caption', clamp(1 - progress * 7, 0, 1));
    if (renderer) renderer(progress);
    updateCard(reducedMotion.matches ? .2 : progress);
  }

  function schedule() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', function() { hoverPoint = null; hideCard(); schedule(); }, { passive: true });
  window.addEventListener('resize', function() { hoverPoint = null; hideCard(); schedule(); });
  stage.addEventListener('pointermove', function(event) {
    if (event.pointerType === 'touch' || event.target.closest('a, button')) { hoverPoint = null; hideCard(); return; }
    hoverPoint = { x: event.clientX, y: event.clientY, fallbackIndex: event.target.hasAttribute('data-vortex-index') ? Number(event.target.dataset.vortexIndex) : null };
    schedule();
  });
  stage.addEventListener('pointerleave', function() { hoverPoint = null; hideCard(); schedule(); });
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
