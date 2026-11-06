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

    $('#filters a').each(function() {
      var filter = $(this).attr('data-filter');
      var count = filter === '*' ? $container.children('.item').length : $container.children('.item').filter(filter).length;
      $(this).find('.filter-count').text(count);
    });

    $('#filters').on('keydown', 'a', function(e) {
      if (e.key === ' ') { e.preventDefault(); $(this).trigger('click'); }
    });

    $('#filters').on('click', 'a', function(e) {
      e.preventDefault();
      var filterValue = $(this).attr('data-filter');
      $container.children('.item').each(function() {
        var matches = filterValue === '*' || $(this).is(filterValue);
        $(this).toggle(matches);
      });
      $('#filters a').removeClass('active').attr('aria-pressed', 'false');
      $(this).addClass('active').attr('aria-pressed', 'true');
    });
  }
  // Thumbnails carry width/height attributes, so the grid can be laid out as soon as
  // the DOM is ready; image loads re-run the layout above.
  $(siteIstotope);

  var projectViews = function() {
    var $buttons = $('[data-project-layout]');
    if (!$buttons.length) return;
    $buttons.on('click', function() {
      var view = $(this).attr('data-project-layout');
      if (view !== 'grid' && view !== 'list') return;
      $('body').attr('data-project-view', view);
      $buttons.attr('aria-pressed', 'false');
      $(this).attr('aria-pressed', 'true');
      // Refresh the active sidebar title after the cards change position.
      $(window).trigger('resize');
    });
  };
  projectViews();

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
      $stack.addClass('label-treatment').attr('data-treatment', 'inline');
      var labels = $stack.text().split('/').map(function(label) {
        return label.trim();
      }).filter(Boolean);
      $stack.empty();
      labels.forEach(function(label) {
        $('<span class="tech-tag label-token"></span>').text(label).appendTo($stack);
      });
    });
  };
  splitTechTags();

  var labelStyleKit = function() {
    var $kit = $('.label-style-kit');
    if (!$kit.length) return;
    var $toggle = $kit.find('.label-kit-toggle');
    var $panel = $kit.find('.label-kit-panel');
    var defaults = { treatment: 'inline', size: 10, weight: 400, tracking: 0 };
    var settings = $.extend({}, defaults);
    try { settings = $.extend(settings, JSON.parse(localStorage.getItem('anchit-label-style-kit')) || {}); } catch (error) {}

    var apply = function() {
      if (['inline', 'outline', 'caps', 'filled'].indexOf(settings.treatment) < 0) settings.treatment = defaults.treatment;
      settings.size = Math.max(9, Math.min(14, Number(settings.size) || defaults.size));
      settings.weight = [400, 500, 600].indexOf(Number(settings.weight)) >= 0 ? Number(settings.weight) : defaults.weight;
      settings.tracking = Math.max(0, Math.min(.12, Number(settings.tracking) || 0));
      $('.work-tech.label-treatment').attr('data-treatment', settings.treatment);
      document.documentElement.style.setProperty('--label-size', settings.size + 'px');
      document.documentElement.style.setProperty('--label-weight', settings.weight);
      document.documentElement.style.setProperty('--label-tracking', settings.tracking + 'em');
      $kit.find('[data-label-choice]').each(function() {
        $(this).attr('aria-pressed', String($(this).attr('data-label-choice') === settings.treatment));
      });
      ['size', 'weight', 'tracking'].forEach(function(key) {
        $kit.find('#label-' + key).val(settings[key]);
      });
      $kit.find('#label-size-value').text(settings.size + 'px');
      $kit.find('#label-weight-value').text(settings.weight);
      $kit.find('#label-tracking-value').text(settings.tracking.toFixed(2) + 'em');
    };
    var save = function() {
      try { localStorage.setItem('anchit-label-style-kit', JSON.stringify(settings)); } catch (error) {}
    };
    var close = function() { $panel.prop('hidden', true); $toggle.attr('aria-expanded', 'false'); };
    $toggle.on('click', function() {
      var open = $panel.prop('hidden');
      $panel.prop('hidden', !open);
      $toggle.attr('aria-expanded', String(open));
    });
    $kit.find('[data-label-choice]').on('click', function() {
      settings.treatment = $(this).attr('data-label-choice');
      apply(); save();
    });
    $kit.find('input').on('input change', function() {
      settings[this.id.replace('label-', '')] = this.value;
      apply(); save();
    });
    $kit.find('.label-kit-reset').on('click', function() {
      settings = $.extend({}, defaults);
      apply(); save();
    });
    $kit.find('.label-kit-close').on('click', function() { close(); $toggle[0].focus(); });
    $kit.on('keydown', function(event) { if (event.key === 'Escape') { close(); $toggle[0].focus(); } });
    $(document).on('click', function(event) { if (!$kit[0].contains(event.target)) close(); });
    apply();
  };
  labelStyleKit();

  var projectNavigator = function() {
    var $toc = $('.project-toc');
    if (!$toc.length) return;
    var $projects = $('#portfolio-grid > .item').filter(function() {
      return $(this).find('h3, img').length >= 2;
    });
    if (!$projects.length) return;

    var $list = $toc.find('.project-toc-list');
    var $more = $toc.find('.project-toc-more');
    var $sectionLinks = $toc.find('.toc-section-link');
    var $preview = $('.project-hover-preview');
    var $previewImage = $preview.find('img');
    var active = -1;
    var queued = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var hidePreview = function() { $preview.removeClass('is-visible'); };
    var placePreview = function(link, pointerY) {
      var bounds = link.getBoundingClientRect();
      var contentLeft = document.getElementById('main').getBoundingClientRect().left;
      // Keep the tilted card inside the space to the left of the main content.
      var width = Math.min(240, contentLeft - 48);
      if (width < 96) { hidePreview(); return false; }
      $preview.css('width', width);
      var height = width * 9 / 16 + 8;
      var left = Math.max(20, bounds.left - width - 20);
      var centerY = typeof pointerY === 'number' ? pointerY : bounds.top + bounds.height / 2;
      var preferredTop = bounds.left - width - 20 >= 20 ? centerY - height / 2 : bounds.bottom + 16;
      var top = Math.max(20, Math.min(preferredTop, window.innerHeight - height - 20));
      $preview.css({ left: left, top: top });
      return true;
    };

    $projects.each(function(index) {
      var $project = $(this);
      var title = $project.find('h3').first().text();
      var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var id = 'project-' + String(index + 1).padStart(2, '0') + '-' + slug;
      var projectHref = $project.find('a.item-wrap').first().attr('href');
      $project.attr('id', id);
      var $link = $('<a class="project-toc-link"></a>').attr('href', projectHref).text(title);
      $link.on('mouseenter focus', function(event) {
        $previewImage.attr('src', $project.find('img').first().attr('src'));
        $preview[0].style.setProperty('--preview-angle', (index % 2 === 0 ? '-4' : '4') + 'deg');
        $preview.toggleClass('is-visible', placePreview(this, event.clientY));
      }).on('mousemove', function(event) {
        placePreview(this, event.clientY);
      }).on('mouseleave blur', hidePreview);
      $('<li></li>').append($link).appendTo($list);
    });

    $toc.find('.project-toc-count').text($projects.length);
    $sectionLinks.each(function() {
      var $section = $($(this).attr('href'));
      var count = $section.find('.item, .writing-list > li').length;
      $(this).find('.toc-section-count').text(count);
    });
    var previewLimit = 5;
    var expanded = false;
    var updateList = function() {
      $list.children().slice(previewLimit).prop('hidden', !expanded);
      $more.attr('aria-expanded', String(expanded)).text(expanded ? 'Show less' : 'Show more (' + ($projects.length - previewLimit) + ')');
      if (!expanded) $list.scrollTop(0);
      hidePreview();
    };
    $more.prop('hidden', $projects.length <= previewLimit).on('click', function() {
      var pageY = window.scrollY;
      expanded = !expanded;
      updateList();
      // Resolve the resized sidebar before restoring the document position.
      $more[0].getBoundingClientRect();
      window.scrollTo({ top: pageY, behavior: 'instant' });
    });
    updateList();
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
      var currentSection = null;
      var sectionPosition = window.scrollY + window.innerHeight * .5;
      $sectionLinks.each(function() {
        var $section = $($(this).attr('href'));
        if ($section.length && $section.offset().top <= sectionPosition) currentSection = this;
      }).removeAttr('aria-current');
      if (currentSection) {
        $(currentSection).attr('aria-current', 'location');
        next = -1;
      }
      if (next === active) return;
      active = next;
      var $links = $list.find('a').removeAttr('aria-current');
      if (active >= 0) {
        var link = $links.eq(active).attr('aria-current', 'location')[0];
        // Keep the current title in view without moving the main document.
        if ($(link).is(':visible') && (!document.activeElement || !$toc[0].contains(document.activeElement))) {
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
