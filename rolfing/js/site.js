/* site.js -- renders all CMS content on public pages */
(function() {
  var BASE = (function() {
    if (location.pathname.indexOf('/blog/') !== -1) return '../';
    return '';
  })();

  var settings = {};
  var pages = {};
  var loaded = { settings: false, pages: false };

  function fetchJSON(file, callback) {
    fetch(BASE + 'content/' + file)
      .then(function(r) { return r.json(); })
      .then(callback)
      .catch(function(err) { console.warn('Failed to load ' + file, err); });
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ===== FONTS & COLORS =====
  function applyTheme() {
    if (!settings.colorAccent) return;
    var root = document.documentElement;
    root.style.setProperty('--color-accent', settings.colorAccent);
    root.style.setProperty('--color-accent-dark', settings.colorAccent);
    root.style.setProperty('--color-secondary', settings.colorSecondary || '#C4846C');
    root.style.setProperty('--color-bg', settings.colorBg || '#FAF8F5');
    root.style.setProperty('--color-bg-light', settings.colorBgLight || '#F0EDE8');
    root.style.setProperty('--color-heading', settings.colorHeading || '#1A1A1A');
    root.style.setProperty('--color-text', settings.colorText || '#2D2D2D');
    if (settings.fontHeading) root.style.setProperty('--font-heading', settings.fontHeading);
    if (settings.fontBody) root.style.setProperty('--font-body', settings.fontBody);
    document.body.style.background = settings.colorBg || '';
  }

  // ===== LOGO =====
  function renderLogos() {
    if (!settings.logo) return;
    document.querySelectorAll('.logo-dark, .logo-footer img').forEach(function(img) {
      img.src = BASE + settings.logo;
    });
  }

  // ===== NAVIGATION =====
  function renderNav() {
    if (!loaded.settings || !loaded.pages) return;
    var navEls = document.querySelectorAll('header nav');
    if (!navEls.length) return;

    var items = [];
    Object.keys(pages).forEach(function(key) {
      var p = pages[key];
      if (p.showInNav) {
        items.push({ label: p.navLabel || p.title, url: BASE + (p.url || key + '.html'), order: p.navOrder || 99 });
      }
    });
    (settings.customNavLinks || []).forEach(function(link) {
      items.push({ label: link.label, url: link.url, order: link.order || 99 });
    });
    items.sort(function(a, b) { return a.order - b.order; });

    navEls.forEach(function(nav) {
      var socialLink = nav.querySelector('.nav-social');
      var socialHTML = socialLink ? socialLink.outerHTML : '';
      var bookLink = nav.querySelector('.btn-book');
      var bookHTML = bookLink ? bookLink.outerHTML : '';

      var html = '';
      items.forEach(function(item) {
        html += '<a href="' + item.url + '">' + item.label + '</a>';
      });
      html += socialHTML;
      html += bookHTML;
      nav.innerHTML = html;
    });
  }

  // ===== FOOTER =====
  function renderFooter() {
    document.querySelectorAll('.footer-address p').forEach(function(el) {
      if (settings.address) {
        el.innerHTML = 'Our Clinic is located at<br>' + settings.address;
      }
    });
    var footerNav = document.querySelector('.footer-nav');
    if (footerNav && loaded.pages && loaded.settings) {
      var items = [];
      Object.keys(pages).forEach(function(key) {
        var p = pages[key];
        if (p.showInNav) {
          items.push({ label: p.navLabel || p.title, url: BASE + (p.url || key + '.html'), order: p.navOrder || 99 });
        }
      });
      items.sort(function(a, b) { return a.order - b.order; });
      var html = '';
      items.forEach(function(item) {
        html += '<a href="' + item.url + '">' + item.label + '</a>';
      });
      html += '<a href="' + BASE + 'booking.html">Book A Session</a>';
      footerNav.innerHTML = html;
    }
  }

  // ===== MAP =====
  function renderMap() {
    if (!settings.mapCoords) return;
    document.querySelectorAll('.map-section iframe').forEach(function(iframe) {
      iframe.src = 'https://maps.google.com/maps?q=' + settings.mapCoords + '&z=12&t=m&output=embed';
    });
  }

  // ===== SETTINGS-DRIVEN CONTENT =====
  function renderSettingsContent() {
    document.querySelectorAll('[data-cms-setting]').forEach(function(el) {
      var key = el.dataset.cmsSetting;
      var val = settings[key];
      if (!val) return;
      if (key === 'quoteText') {
        el.innerHTML = '\u201c' + val + '\u201d';
      } else if (key === 'quoteBody') {
        el.textContent = val;
      } else {
        el.innerHTML = val;
      }
    });
  }

  // ===== DYNAMIC PAGE CONTENT (for CMS-generated pages) =====
  function renderDynamicPage() {
    var target = document.getElementById('page-content');
    if (!target) return;
    var pageKey = detectCurrentPage();
    if (!pageKey || !pages[pageKey]) return;
    var html = '';
    pages[pageKey].sections.forEach(function(section) {
      var type = section.type || 'text';
      if (type === 'text-image' && section.image) {
        var imgRight = section.imagePosition === 'right';
        var imgHtml = '<img src="' + BASE + section.image + '" alt="" style="max-width:100%;border-radius:12px;">';
        var txtHtml = '<div>' + (section.heading ? '<h2 class="section-title">' + section.heading + '</h2>' : '') + (section.body || '') + '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;margin-bottom:40px;">';
        html += imgRight ? txtHtml + '<div>' + imgHtml + '</div>' : '<div>' + imgHtml + '</div>' + txtHtml;
        html += '</div>';
      } else if (type === 'images' && section.images && section.images.length) {
        html += '<div style="margin-bottom:40px;">';
        if (section.heading) html += '<h2 class="section-title">' + section.heading + '</h2>';
        if (section.body) html += section.body;
        html += '<div style="display:flex;gap:16px;margin-top:16px;">';
        section.images.forEach(function(src) {
          html += '<div style="flex:1;min-width:0;"><img src="' + BASE + src + '" alt="" style="width:100%;border-radius:12px;display:block;"></div>';
        });
        html += '</div></div>';
      } else if (type === 'accent') {
        html += '<div style="background:var(--color-bg-light);padding:40px;border-radius:12px;margin-bottom:40px;">';
        if (section.heading) html += '<h2 class="section-title">' + section.heading + '</h2>';
        if (section.body) html += section.body;
        html += '</div>';
      } else if (type === 'two-column') {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:40px;">';
        html += '<div>';
        if (section.heading) html += '<h2 class="section-title">' + section.heading + '</h2>';
        if (section.body) html += section.body;
        html += '</div><div>';
        if (section.heading2) html += '<h2 class="section-title">' + section.heading2 + '</h2>';
        if (section.body2) html += section.body2;
        html += '</div></div>';
      } else if (type === 'banner' && section.image) {
        html += '<div style="background-image:url(' + BASE + section.image + ');background-size:cover;background-position:center;padding:80px 30px;border-radius:12px;position:relative;text-align:center;margin-bottom:40px;">';
        html += '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);border-radius:12px;"></div>';
        html += '<div style="position:relative;color:#fff;">';
        if (section.heading) html += '<h2 style="font-family:var(--font-heading);font-size:2rem;color:#fff;">' + section.heading + '</h2>';
        if (section.body) html += section.body;
        html += '</div></div>';
      } else {
        html += '<div style="margin-bottom:40px;">';
        if (section.heading) html += '<h2 class="section-title">' + section.heading + '</h2>';
        if (section.image) html += '<img src="' + BASE + section.image + '" alt="" style="max-width:100%;border-radius:12px;margin-bottom:16px;">';
        if (section.body) html += section.body;
        html += '</div>';
      }
    });
    target.innerHTML = html;
  }

  // ===== PAGE SECTIONS =====
  // Quote heading/body from pages.json
  function renderQuoteSections() {
    document.querySelectorAll('[data-cms-quote-heading]').forEach(function(el) {
      var pageKey = el.dataset.cmsPage;
      var sectionId = el.dataset.cmsQuoteHeading;
      if (!pages[pageKey]) return;
      var section = pages[pageKey].sections.find(function(s) { return s.id === sectionId; });
      if (section && section.heading) {
        el.innerHTML = '\u201c' + section.heading + '\u201d';
      }
    });
    document.querySelectorAll('[data-cms-quote-body]').forEach(function(el) {
      var pageKey = el.dataset.cmsPage;
      var sectionId = el.dataset.cmsQuoteBody;
      if (!pages[pageKey]) return;
      var section = pages[pageKey].sections.find(function(s) { return s.id === sectionId; });
      if (section && section.body) {
        el.innerHTML = section.body.replace(/<\/?p>/g, '');
      }
    });
  }

  function renderPageSections() {
    document.querySelectorAll('[data-cms-section]').forEach(function(el) {
      var pageKey = el.dataset.cmsPage;
      var sectionId = el.dataset.cmsSection;
      if (!pages[pageKey]) return;
      var section = pages[pageKey].sections.find(function(s) { return s.id === sectionId; });
      if (!section) return;
      el.innerHTML = section.body;
      // Apply font size
      if (section.fontSize) {
        el.style.fontSize = section.fontSize + 'px';
      }
      var heading = el.previousElementSibling;
      if (heading && heading.classList.contains('section-title')) {
        heading.innerHTML = section.heading;
      }
    });
  }

  // Apply font/image sizes to sections identified by data-cms-section-size
  function applySectionSizes() {
    var pageKey = detectCurrentPage();
    if (!pageKey || !pages[pageKey]) return;
    pages[pageKey].sections.forEach(function(section) {
      // Font size on section containers
      var els = document.querySelectorAll('[data-cms-section="' + section.id + '"]');
      els.forEach(function(el) {
        if (section.fontSize) el.style.fontSize = section.fontSize + 'px';
      });
      // Image size on section images
      var imgEls = document.querySelectorAll('[data-cms-section-img="' + section.id + '"]');
      imgEls.forEach(function(el) {
        if (section.imageSize && el.tagName === 'IMG') {
          el.style.width = section.imageSize + 'px';
          el.style.height = 'auto';
        }
        // Note: imagePosition is used by CMS-generated pages and the admin preview.
        // Existing hardcoded HTML pages have their own layout order.
      });
    });
  }

  // ===== HERO + SECTION IMAGES =====
  function detectCurrentPage() {
    var path = location.pathname;
    if (path.match(/index\.html$/) || path.match(/\/$/)) return 'home';
    // Match against pages.json URLs
    var keys = Object.keys(pages);
    for (var i = 0; i < keys.length; i++) {
      var p = pages[keys[i]];
      if (p.url && path.indexOf(p.url) >= 0) return keys[i];
    }
    // Fallback: match filename against page keys
    var filename = path.split('/').pop().replace('.html', '');
    if (pages[filename]) return filename;
    return null;
  }

  function renderHeroImage() {
    var pageKey = detectCurrentPage();
    if (!pageKey || !pages[pageKey]) return;
    var heroImage = pages[pageKey].heroImage;
    if (!heroImage) return;
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.style.backgroundImage = "url('" + BASE + heroImage + "')";
    }
  }

  function renderSectionImages() {
    var pageKey = detectCurrentPage();
    if (!pageKey || !pages[pageKey]) return;
    var sectionImgs = document.querySelectorAll('[data-cms-section-img]');
    sectionImgs.forEach(function(el) {
      var sectionId = el.dataset.cmsSectionImg;
      var section = pages[pageKey].sections.find(function(s) { return s.id === sectionId; });
      if (!section || !section.image) return;
      if (el.tagName === 'IMG') {
        el.src = BASE + section.image;
      } else {
        el.style.backgroundImage = "url('" + BASE + section.image + "')";
      }
    });
  }

  // ===== BLOG LISTING =====
  function renderBlogList() {
    var target = document.getElementById('blog-list');
    if (!target) return;
    fetchJSON('blog-posts.json', function(posts) {
      var published = posts.filter(function(p) { return p.published; });
      published.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
      var html = '';
      published.forEach(function(post) {
        html += '<a href="blog/post.html#' + post.id + '" class="blog-card" style="color:inherit;">';
        html += '<div class="blog-card-body">';
        html += '<p class="date">' + formatDate(post.date) + '</p>';
        html += '<h3>' + post.title + '</h3>';
        html += '<p>' + post.excerpt + '</p>';
        html += '<span class="read-more">Read More &rarr;</span>';
        html += '</div></a>';
      });
      target.innerHTML = html;
    });
  }

  // ===== SINGLE BLOG POST =====
  function renderBlogPost() {
    var target = document.getElementById('blog-post-content');
    if (!target) return;
    var postId = location.hash.replace('#', '');
    if (!postId) { location.href = '../blog.html'; return; }
    fetchJSON('blog-posts.json', function(posts) {
      var post = posts.find(function(p) { return p.id === postId; });
      if (!post) { target.innerHTML = '<p>Post not found.</p>'; return; }
      document.title = post.title + ' \u2014 Salt Spring Rolfing';
      target.innerHTML =
        '<h1>' + post.title + '</h1>' +
        '<p class="post-meta">By ' + post.author + ' &bull; ' + formatDate(post.date) + '</p>' +
        post.body +
        '<p><a href="../blog.html">&larr; Back to Blog</a></p>';
    });
  }

  // ===== TESTIMONIALS =====
  function renderTestimonials() {
    var target = document.getElementById('reviewsCarousel');
    if (!target) return;
    fetchJSON('testimonials.json', function(reviews) {
      var html = '';
      reviews.forEach(function(r) {
        html += '<div class="review-card">';
        html += '<p>&ldquo;' + r.quote + '&rdquo;</p>';
        html += '<span class="reviewer">' + r.name;
        if (r.credentials) html += '<br><em>' + r.credentials + '</em>';
        html += '</span></div>';
      });
      target.innerHTML = html;
      initCarousel();
    });
  }

  // ===== FAQ ACCORDION =====
  function renderFAQs() {
    var target = document.getElementById('faq-content');
    if (!target) return;
    fetchJSON('faqs.json', function(faqs) {
      faqs.sort(function(a, b) { return a.order - b.order; });
      var html = '';
      faqs.forEach(function(faq) {
        html += '<div class="faq-item">';
        html += '<button class="faq-question">' + faq.question + '</button>';
        html += '<div class="faq-answer"><div class="faq-answer-inner">' + faq.answer + '</div></div>';
        html += '</div>';
      });
      target.innerHTML = html;
      document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var item = this.parentElement;
          var wasActive = item.classList.contains('active');
          document.querySelectorAll('.faq-item').forEach(function(el) { el.classList.remove('active'); });
          if (!wasActive) item.classList.add('active');
        });
      });
    });
  }

  // ===== CAROUSEL =====
  function initCarousel() {
    var carousel = document.getElementById('reviewsCarousel');
    var prevBtn = document.getElementById('carouselPrev');
    var nextBtn = document.getElementById('carouselNext');
    if (!carousel || !prevBtn || !nextBtn || !carousel.firstElementChild) return;
    var shifting = false;

    nextBtn.addEventListener('click', function() {
      if (shifting) return;
      shifting = true;
      var cardW = carousel.firstElementChild.offsetWidth + 20;
      carousel.style.transition = 'transform 0.4s ease';
      carousel.style.transform = 'translateX(-' + cardW + 'px)';
      setTimeout(function() {
        carousel.style.transition = 'none';
        carousel.style.transform = '';
        carousel.appendChild(carousel.firstElementChild);
        shifting = false;
      }, 400);
    });

    prevBtn.addEventListener('click', function() {
      if (shifting) return;
      shifting = true;
      var cardW = carousel.firstElementChild.offsetWidth + 20;
      carousel.style.transition = 'none';
      carousel.insertBefore(carousel.lastElementChild, carousel.firstElementChild);
      carousel.style.transform = 'translateX(-' + cardW + 'px)';
      carousel.offsetHeight;
      carousel.style.transition = 'transform 0.4s ease';
      carousel.style.transform = '';
      setTimeout(function() { shifting = false; }, 400);
    });
  }

  // ===== INIT =====
  fetchJSON('site-settings.json', function(s) {
    settings = s;
    loaded.settings = true;
    applyTheme();
    renderLogos();
    renderNav();
    renderFooter();
    renderMap();
    renderSettingsContent();
  });

  fetchJSON('pages.json', function(p) {
    pages = p;
    loaded.pages = true;
    renderNav();
    renderFooter();
    renderPageSections();
    renderQuoteSections();
    renderDynamicPage();
    renderHeroImage();
    renderSectionImages();
    applySectionSizes();
  });

  renderBlogList();
  renderBlogPost();
  renderTestimonials();
  renderFAQs();
})();
