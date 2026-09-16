/**
* Template Name: MyPortfolio - v2.1.0
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function($) {
  "use strict";

  var siteIstotope = function() {
    var $container = $('#portfolio-grid').isotope({
      itemSelector: '.item',
      isFitWidth: true
    });
    var refreshLayout = function() {
      $container.isotope('layout');
    };

    $container.find('img').each(function() {
      if (!this.complete) {
        $(this).one('load error', refreshLayout);
      }
    });

    $(window).resize(function() {
      $container.isotope({
        columnWidth: '.col-sm-3'
      });
    });

    $container.isotope({
      filter: '*'
    });
    refreshLayout();

    $('#filters').on('click', 'a', function(e) {
      e.preventDefault();
      var filterValue = $(this).attr('data-filter');
      $container.isotope({
        filter: filterValue
      });
      $('#filters a').removeClass('active');
      $(this).addClass('active');
    });
  }
  $(window).on('load', function() {
    siteIstotope();
  });

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

  var siteOwlCarousel = function() {
    $('.testimonial-carousel').owlCarousel({
      center: true,
      items: 1,
      loop: true,
      margin: 0,
      autoplay: true,
      smartSpeed: 1000,
    });
  };
  siteOwlCarousel();

  $(window).on('load', function() {
    AOS.init({
      easing: 'ease',
      duration: 1000,
      once: true
    });
  });

})(jQuery);
