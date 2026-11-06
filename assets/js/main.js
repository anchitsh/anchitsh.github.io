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
    var $navigator = $('.project-navigator');
    if (!$navigator.length) return;
    var $projects = $('#portfolio-grid > .item, #tech-art .item').filter(function() {
      return $(this).find('h3, img').length >= 2;
    });
    if (!$projects.length) return;

    var $panel = $navigator.find('.project-navigator-panel');
    var $toggle = $navigator.find('.project-index-toggle');
    var $grid = $navigator.find('.project-index-grid');
    var pinned = false;
    var active = -1;
    var queued = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var number = function(index) { return String(index + 1).padStart(2, '0'); };
    var total = String($projects.length).padStart(2, '0');

    var showPreview = function(index) {
      var $project = $projects.eq(index);
      $navigator.find('.project-index-image').attr('src', $project.find('img').first().attr('src'));
      $navigator.find('.project-index-name').text($project.find('h3').first().text());
      $navigator.find('.project-index-number').text(number(index) + ' / ' + total);
    };

    var setOpen = function(open) {
      $panel.prop('hidden', !open);
      $toggle.attr('aria-expanded', String(open));
    };

    $projects.each(function(index) {
      var $project = $(this);
      var title = $project.find('h3').first().text();
      var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var id = 'project-' + number(index) + '-' + slug;
      $project.attr('id', id);
      var $tile = $('<a class="project-index-tile"></a>').attr({
        href: '#' + id,
        'aria-label': number(index) + '. ' + title,
        title: title
      });
      $('<img alt="" loading="lazy" width="64" height="64">').attr('src', $project.find('img').first().attr('src')).appendTo($tile);
      $('<span aria-hidden="true"></span>').text(number(index)).appendTo($tile);
      $tile.on('mouseenter focus', function() { showPreview(index); });
      $tile.on('click', function(event) {
        event.preventDefault();
        if (!$project.is(':visible')) $('#filters a[data-filter="*"]').trigger('click');
        pinned = false;
        setOpen(false);
        $toggle[0].focus({ preventScroll: true });
        $project[0].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      });
      $grid.append($tile);
    });

    $navigator.find('.project-total').text($projects.length);
    $navigator.prop('hidden', false);
    showPreview(0);
    $navigator.on('mouseenter', function() { setOpen(true); });
    $navigator.on('mouseleave', function() { if (!pinned) setOpen(false); });
    $toggle.on('click', function() {
      pinned = !pinned;
      setOpen(pinned);
    });
    $navigator.on('focusout', function(event) {
      if (!this.contains(event.relatedTarget)) { pinned = false; setOpen(false); }
    });
    $(document).on('keydown', function(event) {
      if (event.key === 'Escape' && !$panel.prop('hidden')) {
        pinned = false;
        setOpen(false);
        $toggle[0].focus({ preventScroll: true });
      }
    }).on('click', function(event) {
      if (!$navigator[0].contains(event.target)) { pinned = false; setOpen(false); }
    });

    var updatePosition = function() {
      queued = false;
      var position = window.scrollY + window.innerHeight * .35;
      var next = -1;
      $projects.each(function(index) {
        if ($(this).is(':visible') && $(this).offset().top <= position) next = index;
      });
      if (next === active && $navigator.find('.project-index-position').text()) return;
      active = next;
      $navigator.find('.project-index-position').text((active < 0 ? '00' : number(active)) + ' / ' + total);
      $grid.children().removeAttr('aria-current');
      if (active >= 0) {
        $grid.children().eq(active).attr('aria-current', 'location');
        if ($panel.prop('hidden')) showPreview(active);
      }
    };
    $(window).on('scroll resize', function() {
      if (!queued) { queued = true; window.requestAnimationFrame(updatePosition); }
    });
    $('#filters a').on('click', updatePosition);
    updatePosition();
  };
  projectNavigator();

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
