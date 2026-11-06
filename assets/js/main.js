/**
* Template Name: MyPortfolio - v2.1.0
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function($) {
  "use strict";

  var siteIstotope = function() {
    var $container = $('#portfolio-grid');
    if (!$container.length) return;

    // Filtering changes the grid height, so AOS trigger offsets below it go stale; recompute them.
    $container.on('arrangeComplete', function() {
      if (window.AOS) AOS.refresh();
    });

    $('#filters').on('click', 'a', function(e) {
      e.preventDefault();
      var filterValue = $(this).attr('data-filter');
      $container.children('.item').each(function() {
        var matches = filterValue === '*' || $(this).is(filterValue);
        $(this).toggle(matches);
      });
      $('#filters a').removeClass('active');
      $(this).addClass('active');
    });
  }
  // Thumbnails carry width/height attributes, so the grid can be laid out as soon as
  // the DOM is ready; image loads re-run the layout above.
  $(siteIstotope);

  var siteProjectGalleries = function() {
    $('.project-gallery').each(function() {
      var $gallery = $(this);
      var layoutQueued = false;
      var refreshLayout = function() {
        if (layoutQueued) return;
        layoutQueued = true;
        window.requestAnimationFrame(function() {
          layoutQueued = false;
          $gallery.isotope('layout');
        });
      };

      var galleryGap = function() {
        return parseFloat(getComputedStyle($gallery[0]).getPropertyValue('--gallery-gap')) || 0;
      };

      $gallery.attr('data-count', Math.min($gallery.children('.project-gallery-item').length, 2));
      $gallery.addClass('project-gallery--masonry');
      // Size columns from a regular item; a full-width first item (e.g. a trailer) would otherwise force one column.
      var columnItem = '.project-gallery-item:not(.project-gallery-item--wide)';
      // Isotope replaces the whole masonry object when options are passed again, so always send every setting.
      var masonryOptions = function() {
        return {
          columnWidth: $gallery.children(columnItem).length ? columnItem : '.project-gallery-item',
          gutter: galleryGap()
        };
      };
      $gallery.isotope({
        itemSelector: '.project-gallery-item',
        layoutMode: 'masonry',
        masonry: masonryOptions()
      });

      $(window).on('resize', function() {
        $gallery.isotope({ masonry: masonryOptions() });
      });

      $gallery.find('img, iframe').each(function() {
        if (this.tagName === 'IFRAME' || !this.complete) {
          $(this).one('load error', refreshLayout);
        }
      });

      // Lazy-loaded media changes height after the first layout; repack whenever an item resizes.
      if ('ResizeObserver' in window) {
        var observer = new ResizeObserver(refreshLayout);
        $gallery.find('.project-gallery-item').each(function() {
          observer.observe(this);
        });
      }

      refreshLayout();
    });
  }
  $(window).on('load', function() {
    siteProjectGalleries();
  });

  var siteGalleryLightbox = function() {
    var $images = $('.project-gallery .project-gallery-image, .project-figure-image');
    if (!$images.length) return;

    var $lightbox = $(
      '<div class="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged image" hidden>' +
        '<button type="button" class="gallery-lightbox-close" aria-label="Close">&times;</button>' +
        '<button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="Previous image">&#8249;</button>' +
        '<img class="gallery-lightbox-image" alt="">' +
        '<button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="Next image">&#8250;</button>' +
      '</div>'
    ).appendTo('body');
    var $img = $lightbox.find('.gallery-lightbox-image');
    var group = [];
    var index = 0;
    var lastFocus = null;

    var show = function(i) {
      index = (i + group.length) % group.length;
      var source = group[index];
      $img.attr({ src: source.currentSrc || source.src, alt: source.alt });
      $lightbox.find('.gallery-lightbox-nav').prop('hidden', group.length < 2);
    };

    var close = function() {
      $lightbox.prop('hidden', true);
      $('body').removeClass('gallery-lightbox-open');
      $img.attr('src', '');
      if (lastFocus) lastFocus.focus();
    };

    $images.attr({ tabindex: 0, role: 'button' }).each(function() {
      this.setAttribute('aria-label', 'Enlarge image: ' + (this.alt || ''));
    });

    $(document).on('click keydown', '.project-gallery .project-gallery-image, .project-figure-image', function(e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      lastFocus = this;
      group = $(this).closest('.project-gallery, .project-copy').find('.project-gallery-image, .project-figure-image').get();
      show(group.indexOf(this));
      $lightbox.prop('hidden', false);
      $('body').addClass('gallery-lightbox-open');
      $lightbox.find('.gallery-lightbox-close').focus();
    });

    $lightbox.on('click', function(e) {
      // The image fills the overlay (object-fit), so clicks on it count as the backdrop too.
      if (e.target === this || e.target === $img[0]) close();
    });
    $lightbox.find('.gallery-lightbox-close').on('click', close);
    $lightbox.find('.gallery-lightbox-prev').on('click', function() { show(index - 1); });
    $lightbox.find('.gallery-lightbox-next').on('click', function() { show(index + 1); });

    $(document).on('keydown', function(e) {
      if ($lightbox.prop('hidden')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && group.length > 1) show(index - 1);
      if (e.key === 'ArrowRight' && group.length > 1) show(index + 1);
    });
  };
  siteGalleryLightbox();

  var splitTechTags = function() {
    $('.work-tech').each(function() {
      var $stack = $(this);
      var labels = $stack.text().split('/').map(function(label) {
        return label.trim();
      }).filter(Boolean);
      $stack.empty();
      labels.forEach(function(label) {
        $('<span class="tech-tag"></span>').text(label).appendTo($stack);
      });
    });
  };
  splitTechTags();

  var projectNavigator = function() {
    var $toc = $('.project-toc');
    if (!$toc.length) return;
    var $projects = $('#portfolio-grid > .item, #tech-art .item').filter(function() {
      return $(this).find('h3, img').length >= 2;
    });
    if (!$projects.length) return;

    var $list = $toc.find('.project-toc-list');
    var $preview = $('.project-hover-preview');
    var $previewImage = $preview.find('img');
    var active = -1;
    var queued = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var hidePreview = function() { $preview.removeClass('is-visible'); };
    var placePreview = function(link, pointerY) {
      var bounds = link.getBoundingClientRect();
      var width = $preview.outerWidth();
      var height = width * 9 / 16 + 8;
      var left = Math.min(bounds.right + 20, window.innerWidth - width - 24);
      var centerY = typeof pointerY === 'number' ? pointerY : bounds.top + bounds.height / 2;
      var top = Math.max(20, Math.min(centerY - height / 2, window.innerHeight - height - 20));
      $preview.css({ left: Math.max(20, left), top: top });
    };

    $projects.each(function(index) {
      var $project = $(this);
      var title = $project.find('h3').first().text();
      var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var id = 'project-' + String(index + 1).padStart(2, '0') + '-' + slug;
      $project.attr('id', id);
      var $link = $('<a class="project-toc-link"></a>').attr('href', '#' + id).text(title);
      $link.on('mouseenter focus', function(event) {
        $previewImage.attr('src', $project.find('img').first().attr('src'));
        $preview[0].style.setProperty('--preview-angle', (index % 2 === 0 ? '-4' : '4') + 'deg');
        placePreview(this, event.clientY);
        $preview.addClass('is-visible');
      }).on('mousemove', function(event) {
        placePreview(this, event.clientY);
      }).on('mouseleave blur', hidePreview).on('click', function(event) {
        event.preventDefault();
        if (!$project.is(':visible')) $('#filters a[data-filter="*"]').trigger('click');
        hidePreview();
        $project[0].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      });
      $('<li></li>').append($link).appendTo($list);
    });

    $toc.find('.project-toc-count').text($projects.length);
    $toc.prop('hidden', false);
    $list.on('scroll', hidePreview);
    $(document).on('keydown', function(event) { if (event.key === 'Escape') hidePreview(); });

    var updatePosition = function() {
      queued = false;
      var position = window.scrollY + window.innerHeight * .35;
      var next = -1;
      $projects.each(function(index) {
        if ($(this).is(':visible') && $(this).offset().top <= position) next = index;
      });
      if (next === active) return;
      active = next;
      var $links = $list.find('a').removeAttr('aria-current');
      if (active >= 0) {
        var link = $links.eq(active).attr('aria-current', 'location')[0];
        // Keep the current title in view without moving the main document.
        if (!document.activeElement || !$toc[0].contains(document.activeElement)) {
          var bounds = link.getBoundingClientRect();
          var listBounds = $list[0].getBoundingClientRect();
          if (window.innerWidth > 859) {
            if (bounds.top < listBounds.top) $list[0].scrollTop -= listBounds.top - bounds.top;
            else if (bounds.bottom > listBounds.bottom) $list[0].scrollTop += bounds.bottom - listBounds.bottom;
          }
        }
      }
    };
    $(window).on('scroll resize', function() {
      hidePreview();
      if (!queued) { queued = true; window.requestAnimationFrame(updatePosition); }
    });
    $('#filters a').on('click', updatePosition);
    updatePosition();
  };
  projectNavigator();

  var mascotDial = function() {
    var $dial = $('.mascot-dial');
    if (!$dial.length) return;
    var $toggle = $dial.find('.mascot-dial-toggle');
    var $panel = $dial.find('.mascot-dial-panel');
    var defaults = { style: 'ceramic', color: 'blue', size: 64, depth: 50, tilt: 0 };
    var settings = $.extend({}, defaults);
    try { settings = $.extend(settings, JSON.parse(localStorage.getItem('anchit-mascot-dial')) || {}); } catch (error) {}

    var apply = function() {
      var sources = { outline: 'assets/img/mascot-placeholder.svg', ceramic: 'assets/img/mascot-ceramic.png', glow: 'assets/img/mascot-ceramic.png' };
      if (!sources[settings.style]) settings.style = defaults.style;
      var hue = { blue: 0, sage: -75, rose: 100 }[settings.color] || 0;
      var depth = Math.max(0, Math.min(100, Number(settings.depth))) / 100;
      var shadow = settings.style === 'glow' ? 'drop-shadow(0 0 ' + (4 + depth * 12) + 'px rgba(79, 123, 245, .5))' : 'drop-shadow(0 ' + (depth * 4) + 'px ' + (depth * 5) + 'px rgba(27, 40, 78, ' + (depth * .25) + '))';
      $('.mascot-render').attr('src', sources[settings.style]);
      document.documentElement.style.setProperty('--mascot-filter', 'hue-rotate(' + hue + 'deg) ' + shadow);
      document.documentElement.style.setProperty('--mascot-size', settings.size + 'px');
      document.documentElement.style.setProperty('--mascot-tilt', settings.tilt + 'deg');
      Object.keys(settings).forEach(function(key) { $dial.find('#mascot-' + key).val(settings[key]); });
      $dial.find('#mascot-size-value').text(settings.size + 'px');
      $dial.find('#mascot-depth-value').text(settings.depth + '%');
      $dial.find('#mascot-tilt-value').text(settings.tilt + '°');
    };

    var close = function() { $panel.prop('hidden', true); $toggle.attr('aria-expanded', 'false'); };
    $toggle.on('click', function() {
      var open = $panel.prop('hidden');
      $panel.prop('hidden', !open);
      $toggle.attr('aria-expanded', String(open));
    });
    $dial.find('select, input').on('input change', function() {
      settings[this.id.replace('mascot-', '')] = this.value;
      apply();
      try { localStorage.setItem('anchit-mascot-dial', JSON.stringify(settings)); } catch (error) {}
    });
    $dial.find('.mascot-reset').on('click', function() {
      settings = $.extend({}, defaults);
      apply();
      try { localStorage.removeItem('anchit-mascot-dial'); } catch (error) {}
    });
    $(document).on('click', function(event) { if (!$dial[0].contains(event.target)) close(); });
    $dial.on('keydown', function(event) { if (event.key === 'Escape') { close(); $toggle[0].focus(); } });
    apply();
  };
  mascotDial();

  // Start the reveal animations on DOM ready rather than window.load, so content
  // isn't held invisible while every thumbnail finishes downloading.
  $(function() {
    AOS.init({
      easing: 'ease',
      duration: 600,
      once: true
    });
  });

})(jQuery);
