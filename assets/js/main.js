/**
* Template Name: MyPortfolio - v2.1.0
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function($) {
  "use strict";

  if (new URLSearchParams(window.location.search).get('version') === 'no-mascot') {
    document.body.classList.add('portfolio-home--no-mascot');
  }

  var balanceProjectGrids = function() {
    var gridView = document.body.getAttribute('data-project-view') === 'grid';
    document.querySelectorAll('.portfolio-home #portfolio-grid, .portfolio-home #tech-art > .container > .row.no-gutter').forEach(function(grid) {
      grid.style.removeProperty('--preview-row-height');
      var cards = Array.from(grid.children).filter(function(card) { return card.classList.contains('item'); });
      cards.forEach(function(card) {
        card.style.removeProperty('grid-column');
        card.style.removeProperty('grid-row');
      });
      if (!gridView) return;
      var gridStyle = getComputedStyle(grid);
      var columnWidths = gridStyle.gridTemplateColumns.trim().split(/\s+/);
      var columns = columnWidths.length;
      if (columns < 2) return;
      // Scale previews with their column width, including on very wide displays.
      var rowGap = parseFloat(gridStyle.rowGap) || 0;
      var rowHeight = Math.max(48, (parseFloat(columnWidths[0]) * .75 - rowGap) / 2);
      grid.style.setProperty('--preview-row-height', rowHeight + 'px');
      var visible = cards.filter(function(card) { return getComputedStyle(card).display !== 'none'; });
      var nextRows = Array(columns).fill(1);
      var lastCards = Array(columns).fill(null);

      // Fill the shortest column while retaining the tall-center rhythm.
      visible.forEach(function(card, index) {
        var column = nextRows.indexOf(Math.min.apply(null, nextRows));
        var span = index % 6 === 1 || index % 6 === 3 ? 3 : 2;
        var start = nextRows[column];
        card.style.gridColumn = String(column + 1);
        card.style.gridRow = start + ' / span ' + span;
        nextRows[column] += span;
        lastCards[column] = { card: card, start: start };
      });

      // Extend only each column's final preview to a shared section baseline.
      var bottom = Math.max.apply(null, nextRows);
      lastCards.forEach(function(last) {
        if (last) last.card.style.gridRow = last.start + ' / span ' + (bottom - last.start);
      });
    });
  };
  $(balanceProjectGrids);
  var gridBalanceFrame;
  window.addEventListener('resize', function() {
    window.cancelAnimationFrame(gridBalanceFrame);
    gridBalanceFrame = window.requestAnimationFrame(balanceProjectGrids);
  });

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
      balanceProjectGrids();
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
      balanceProjectGrids();
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
      $stack.addClass('label-treatment').attr('data-treatment', 'filled');
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

    var attachPreview = function($link, $project, index) {
      $link.on('mouseenter focus', function(event) {
        $previewImage.attr('src', $project.find('img').first().attr('src'));
        $preview[0].style.setProperty('--preview-angle', (index % 2 === 0 ? '-4' : '4') + 'deg');
        $preview.toggleClass('is-visible', placePreview(this, event.clientY));
      }).on('mousemove', function(event) {
        placePreview(this, event.clientY);
      }).on('mouseleave blur', hidePreview);
    };

    $projects.each(function(index) {
      var $project = $(this);
      var title = $project.find('h3').first().text();
      var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var id = 'project-' + String(index + 1).padStart(2, '0') + '-' + slug;
      var projectHref = $project.find('a.item-wrap').first().attr('href');
      $project.attr('id', id);
      var $link = $('<a class="project-toc-link"></a>').attr({ href: projectHref, title: title }).text(title);
      attachPreview($link, $project, index);
      $('<li></li>').append($link).appendTo($list);
    });

    var collapseExpandedList = null;
    var expandableList = function($items, $button, limit) {
      var expanded = false;
      var update = function() {
        $items.children().slice(limit).prop('hidden', !expanded);
        $button.attr('aria-expanded', String(expanded)).text(expanded ? 'Show less' : 'Show more (' + ($items.children().length - limit) + ')');
        if (!expanded) $items.scrollTop(0);
        hidePreview();
      };
      var collapse = function() { expanded = false; update(); };
      $button.prop('hidden', $items.children().length <= limit).on('click', function() {
        var pageY = window.scrollY;
        if (!expanded && collapseExpandedList) collapseExpandedList();
        expanded = !expanded;
        collapseExpandedList = expanded ? collapse : null;
        update();
        $button[0].getBoundingClientRect();
        window.scrollTo({ top: pageY, behavior: 'instant' });
      });
      $items.on('scroll', hidePreview);
      update();
    };

    $toc.find('.project-toc-count').text($projects.length);
    $sectionLinks.each(function() {
      var $section = $($(this).attr('href'));
      var $entries = $section.find('.item, .writing-list > li');
      $(this).find('.toc-section-count').text($entries.length);
      var $details = $(this).siblings('.toc-detail-list');
      var listId = $section.attr('id') + '-toc-list';
      $details.attr('id', listId);
      $entries.each(function(index) {
        var $entry = $(this);
        var isProject = $entry.hasClass('item');
        var $sourceLink = $entry.find(isProject ? 'a.item-wrap' : 'a.writing-link').first();
        var title = isProject ? $entry.find('h3').first().text() : $sourceLink.find('span').first().text();
        var href = $sourceLink.attr('href');
        if (!href) {
          var id = $section.attr('id') + '-entry-' + (index + 1);
          $entry.attr('id', id);
          href = '#' + id;
        }
        var $link = $('<a class="project-toc-link toc-detail-link"></a>').attr({ href: href, title: title }).text(title);
        if ($sourceLink.attr('target') === '_blank') $link.attr({ target: '_blank', rel: 'noopener noreferrer' });
        if (isProject) attachPreview($link, $entry, index);
        $('<li></li>').append($link).appendTo($details);
      });
      var $sectionMore = $('<button class="project-toc-more toc-section-more" type="button"></button>').attr({ 'aria-expanded': 'false', 'aria-controls': listId }).insertAfter($details);
      expandableList($details, $sectionMore, 2);
    });
    expandableList($list, $more, 5);
    $toc.prop('hidden', false);
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

  var detailPageLayout = function() {
    var $shell = $('.project-page .project-shell').first();
    if (!$shell.length) return;

    var $header = $shell.children('.project-header').first();
    var $copy = $shell.children('.project-copy').first();
    if (!$header.length || !$copy.length) return;

    $('.custom-navbar').attr('aria-hidden', 'true').hide();
    $('body').addClass('detail-layout');
    $('<link rel="stylesheet" href="assets/css/page-background.css">').appendTo('head');
    $('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500&display=swap">').appendTo('head');
    var $sidebar = $('<aside class="detail-sidebar" aria-label="Page contents"><div class="detail-sidebar-inner"></div></aside>').appendTo('body');
    var $sidebarInner = $sidebar.children();
    var $sidebarContent = $('<div class="detail-sidebar-content"></div>').appendTo($sidebarInner);
    $shell.children('.project-back').detach().addClass('detail-home-card').appendTo($sidebarInner);

    var $overview = $('<section class="project-overview"></section>').attr('aria-label', $shell.attr('data-overview-label') || 'Project overview');
    var $heading = $header.find('.project-heading').first();
    var $facts = $header.find('.project-facts').first();
    var $description = $('<div class="project-overview-description"></div>');
    var inBody = false;

    $copy.children().each(function() {
      var $child = $(this);
      if ($child.is('h3, h4, .project-section-title')) {
        inBody = true;
      }
      if (!inBody) $description.append($child.detach());
    });

    if (!$description.children().length) {
      var $firstParagraph = $copy.find('p').first();
      if ($firstParagraph.length) $description.append($firstParagraph.detach());
    }

    $heading.find('.project-actions-label').remove();
    $heading.find('.project-actions a').each(function() {
      $(this).contents().wrapAll('<span class="project-link-label"></span>');
      $(this).prepend('<svg class="project-link-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>');
    });
    $overview.append($heading.detach());
    $overview.append('<div class="project-overview-rule" aria-hidden="true"></div>');
    var $overviewGrid = $('<div class="project-overview-grid"></div>');
    $overviewGrid.append($description);
    if ($facts.length) $('<div class="detail-metadata"></div>').append($facts.detach()).appendTo($sidebarContent);
    $overview.append($overviewGrid);
    $header.replaceWith($overview);

    // Moving the intro into the overview can leave an empty section heading.
    // Only retain sections that still have their own text or media.
    var sectionSelector = 'h3, h4, .project-section-title';
    $copy.children(sectionSelector).each(function() {
      var $sectionHeading = $(this);
      var $content = $sectionHeading.nextUntil(sectionSelector);
      if (!$content.text().trim() && !$content.find('img, video, iframe, audio').addBack('img, video, iframe, audio').length) {
        $content.remove();
        $sectionHeading.remove();
      }
    });
    $shell.children('.project-media-section').each(function() {
      var $section = $(this);
      if (!$section.find('img, video, iframe, audio').length && !$section.children().not('h2, h3, h4').text().trim()) $section.remove();
    });

    var $headings = $copy.find(sectionSelector);
    $shell.children('.project-media-section').each(function() {
      $headings = $headings.add($(this).find('.project-media-label').first());
    });

    if ($headings.length) {
      var $toc = $('<nav class="project-page-toc" aria-label="Table of contents"><span class="project-page-toc-label">Table of contents:</span><ol></ol></nav>');
      var $list = $toc.find('ol');
      $headings.each(function(index) {
        var $heading = $(this);
        var id = $heading.attr('id') || 'page-section-' + (index + 1);
        $heading.attr('id', id);
        $('<li><a></a></li>').find('a').attr('href', '#' + id).text($heading.text()).end().appendTo($list);
      });
      $('<div class="detail-contents"></div>').append($toc).prependTo($sidebarContent);
    }
  };
  detailPageLayout();



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
