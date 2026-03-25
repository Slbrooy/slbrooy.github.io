/* site.js -- renders all CMS content + events + cart for Rhizome Springs */
(function() {
  var BASE = (function() {
    var path = location.pathname;
    if (path.indexOf('/events/') !== -1) return '../';
    if (path.indexOf('/blog/') !== -1) return '../';
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

  function formatDateShort(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  // ===== FONTS & COLORS =====
  // TEMPORARILY DISABLED: let CSS :root values take effect without JS override
  // The site-settings.json colors match the CSS, but this function's fallback
  // values were wrong and could override correct CSS if JSON fails to load.
  function applyTheme() {
    // disabled for testing - CSS has correct values from Squarespace source
  }

  // ===== LOGO =====
  function renderLogos() {
    if (!settings.logo) return;
    document.querySelectorAll('.logo img, .logo-footer img').forEach(function(img) {
      img.src = BASE + settings.logo;
    });
  }

  // ===== NAVIGATION =====
  function renderNav() {
    if (!loaded.settings || !loaded.pages) return;
    // Skip if using split nav (nav-left / nav-right) - those are hardcoded
    if (document.querySelector('.nav-left')) return;
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
      var cartLink = nav.querySelector('.cart-link');
      var cartHTML = cartLink ? cartLink.outerHTML : '';
      var ctaLink = nav.querySelector('.btn-cta');
      var ctaHTML = ctaLink ? ctaLink.outerHTML : '';

      var html = '';
      items.forEach(function(item) {
        html += '<a href="' + item.url + '">' + item.label + '</a>';
      });
      html += cartHTML;
      html += ctaHTML;
      nav.innerHTML = html;
    });
  }

  // ===== FOOTER =====
  function renderFooter() {
    // Footer links - don't overwrite, they're hardcoded with Get Involved mailto
    // Also handle legacy .footer-nav
    var footerNav = document.querySelector('.footer-nav');
    if (footerNav && loaded.pages) {
      var navItems = [];
      Object.keys(pages).forEach(function(key) {
        var p = pages[key];
        if (p.showInNav) {
          navItems.push({ label: p.navLabel || p.title, url: BASE + (p.url || key + '.html'), order: p.navOrder || 99 });
        }
      });
      navItems.sort(function(a, b) { return a.order - b.order; });
      var navHtml = '';
      navItems.forEach(function(item) {
        navHtml += '<a href="' + item.url + '">' + item.label + '</a>';
      });
      footerNav.innerHTML = navHtml;
    }
  }

  // ===== SETTINGS-DRIVEN CONTENT =====
  function renderSettingsContent() {
    document.querySelectorAll('[data-cms-setting]').forEach(function(el) {
      var key = el.dataset.cmsSetting;
      var val = settings[key];
      if (!val) return;
      if (key === 'quoteText') {
        el.innerHTML = '\u201c' + val + '\u201d';
      } else {
        el.innerHTML = val;
      }
    });
  }

  // ===== HERO IMAGE =====
  function detectCurrentPage() {
    var path = location.pathname;
    if (path.match(/index\.html$/) || path.match(/\/$/)) return 'home';
    var keys = Object.keys(pages);
    for (var i = 0; i < keys.length; i++) {
      var p = pages[keys[i]];
      if (p.url && path.indexOf(p.url) >= 0) return keys[i];
    }
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

  // ===== PAGE SECTIONS =====
  function renderPageSections() {
    document.querySelectorAll('[data-cms-section]').forEach(function(el) {
      var pageKey = el.dataset.cmsPage;
      var sectionId = el.dataset.cmsSection;
      if (!pages[pageKey]) return;
      var section = pages[pageKey].sections.find(function(s) { return s.id === sectionId; });
      if (!section) return;
      el.innerHTML = section.body;
      if (section.fontSize) {
        el.style.fontSize = section.fontSize + 'px';
      }
      var heading = el.previousElementSibling;
      if (heading && heading.classList.contains('section-title')) {
        heading.innerHTML = section.heading;
      }
    });
  }

  function renderSectionImages() {
    var pageKey = detectCurrentPage();
    if (!pageKey || !pages[pageKey]) return;
    document.querySelectorAll('[data-cms-section-img]').forEach(function(el) {
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

  // ===== DYNAMIC PAGE CONTENT (CMS-generated pages) =====
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

  // ===== EVENTS =====
  function renderEventsList() {
    var target = document.getElementById('events-list');
    if (!target) return;
    fetchJSON('events.json', function(events) {
      var now = new Date().toISOString().split('T')[0];
      var published = events.filter(function(e) { return e.published; });

      // Separate upcoming and past
      var upcoming = published.filter(function(e) { return e.endDate >= now || e.startDate >= now; });
      var past = published.filter(function(e) { return e.endDate < now && e.startDate < now; });

      upcoming.sort(function(a, b) { return a.startDate < b.startDate ? -1 : 1; });
      past.sort(function(a, b) { return a.startDate > b.startDate ? -1 : 1; });

      // Get categories for filter buttons
      var cats = {};
      published.forEach(function(e) { if (e.category) cats[e.category] = true; });
      var catList = Object.keys(cats).sort();

      // Filter buttons
      var filterEl = document.getElementById('event-filters');
      if (filterEl && catList.length > 1) {
        var filterHtml = '<button class="event-filter-btn active" data-cat="all">All</button>';
        catList.forEach(function(cat) {
          filterHtml += '<button class="event-filter-btn" data-cat="' + cat + '">' + cat + '</button>';
        });
        filterEl.innerHTML = filterHtml;
        filterEl.querySelectorAll('.event-filter-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            filterEl.querySelectorAll('.event-filter-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var cat = btn.dataset.cat;
            target.querySelectorAll('.event-card').forEach(function(card) {
              if (cat === 'all' || card.dataset.category === cat) {
                card.style.display = '';
              } else {
                card.style.display = 'none';
              }
            });
          });
        });
      }

      var html = '';
      if (upcoming.length > 0) {
        upcoming.forEach(function(ev) {
          html += renderEventListItem(ev);
        });
      } else {
        html += '<p style="text-align:center;color:var(--color-text-light);padding:40px 0;">No upcoming events at this time. Check back soon!</p>';
      }

      if (past.length > 0) {
        html += '<div style="margin-top:60px;">';
        html += '<h2 class="section-title" style="margin-bottom:30px;">Past Events</h2>';
        past.forEach(function(ev) {
          html += renderEventListItem(ev, true);
        });
        html += '</div>';
      }

      target.innerHTML = html;
    });
  }

  function renderEventListItem(ev, isPast) {
    var opacity = isPast ? 'opacity:0.6;' : '';
    var html = '<div class="event-list-item" style="' + opacity + '">';
    if (ev.image) {
      html += '<div class="event-list-image"><a href="' + BASE + 'events/event.html#' + ev.id + '"><img src="' + (ev.image.indexOf('http') === 0 ? ev.image : BASE + ev.image) + '" alt="' + ev.title + '"></a></div>';
    }
    html += '<div class="event-list-body">';
    html += '<h3><a href="' + BASE + 'events/event.html#' + ev.id + '" style="color:inherit;">' + ev.title + '</a></h3>';
    html += '<p class="event-dates">' + ev.dates + '</p>';
    if (ev.category) html += '<span class="event-category">' + ev.category + '</span>';
    if (ev.excerpt) html += '<p>' + ev.excerpt + '</p>';
    html += '<a href="' + BASE + 'events/event.html#' + ev.id + '" class="event-link">View Event</a>';
    if (ev.startDate) {
      var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ev.title) + '&dates=' + ev.startDate.replace(/-/g, '') + '/' + (ev.endDate || ev.startDate).replace(/-/g, '') + '&location=' + encodeURIComponent(ev.location || '');
      html += '<div class="calendar-links"><a href="' + gcalUrl + '" target="_blank">Google Calendar</a></div>';
    }
    html += '</div></div>';
    return html;
  }

  function renderEventCards(events) {
    var html = '<div class="events-grid">';
    events.forEach(function(ev) {
      html += renderEventCard(ev, false);
    });
    html += '</div>';
    return html;
  }

  function renderEventCard(ev, isPast) {
    var opacity = isPast ? 'opacity:0.7;' : '';
    var html = '<a href="' + BASE + 'events/event.html#' + ev.id + '" class="event-card" data-category="' + (ev.category || '') + '" style="color:inherit;text-decoration:none;' + opacity + '">';
    if (ev.image) {
      html += '<div class="event-card-image">';
      html += '<img src="' + (ev.image.indexOf('http') === 0 ? ev.image : BASE + ev.image) + '" alt="' + ev.title + '">';
      html += '</div>';
    }
    html += '<div class="event-card-body">';
    html += '<h3>' + ev.title + '</h3>';
    if (ev.facilitator) html += '<p class="event-meta">' + ev.facilitator + (ev.location ? ' / ' + ev.location : '') + '</p>';
    if (ev.excerpt) html += '<p>' + ev.excerpt + '</p>';
    html += '<span class="event-link">View Event &rarr;</span>';
    html += '</div></a>';
    return html;
  }

  function renderPreviewEventCard(ev) {
    // Parse startDate for date badge (e.g. "2026-05-15")
    var monthAbbrs = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var badgeMonth = '';
    var badgeDay = '';
    if (ev.startDate) {
      var sd = new Date(ev.startDate + 'T12:00:00');
      badgeMonth = monthAbbrs[sd.getMonth()];
      badgeDay = '' + sd.getDate();
    }

    // Build meta line: "May 15, 2026 - May 17, 2026 . Category"
    var meta = '';
    if (ev.startDate) meta += formatDate(ev.startDate);
    if (ev.endDate && ev.endDate !== ev.startDate) meta += ' - ' + formatDate(ev.endDate);
    if (ev.category) meta += ' \u00b7 ' + ev.category;

    var html = '<a href="' + BASE + 'events/event.html#' + ev.id + '" class="event-card" data-category="' + (ev.category || '') + '" style="color:inherit;text-decoration:none;">';
    if (ev.image) {
      html += '<div class="event-card-image">';
      html += '<img src="' + (ev.image.indexOf('http') === 0 ? ev.image : BASE + ev.image) + '" alt="' + ev.title + '">';
      if (badgeMonth) {
        html += '<div class="event-card-date"><span class="date-month">' + badgeMonth + '</span><span class="date-day">' + badgeDay + '</span></div>';
      }
      html += '</div>';
    }
    html += '<div class="event-card-body">';
    if (meta) html += '<p class="event-card-meta">' + meta + '</p>';
    html += '<h3>' + ev.title + '</h3>';
    html += '</div></a>';
    return html;
  }

  // Homepage events preview (shows ALL upcoming in compact cards)
  function renderEventsPreview() {
    var target = document.getElementById('events-preview');
    if (!target) return;
    fetchJSON('events.json', function(events) {
      var now = new Date().toISOString().split('T')[0];
      var upcoming = events
        .filter(function(e) { return e.published && (e.endDate >= now || e.startDate >= now); })
        .sort(function(a, b) { return a.startDate < b.startDate ? -1 : 1; });

      if (upcoming.length === 0) {
        target.innerHTML = '<p style="text-align:center;color:var(--color-text-light);">No upcoming events at this time.</p>';
        return;
      }

      var html = '<div class="events-grid">';
      upcoming.forEach(function(ev) { html += renderPreviewEventCard(ev); });
      html += '</div>';
      target.innerHTML = html;
    });
  }

  // ===== EVENT DETAIL =====
  function renderEventDetail() {
    var target = document.getElementById('event-detail-content');
    if (!target) return;
    var eventId = location.hash.replace('#', '');
    if (!eventId) { location.href = '../events.html'; return; }

    fetchJSON('events.json', function(events) {
      var ev = events.find(function(e) { return e.id === eventId; });
      if (!ev) { target.innerHTML = '<p>Event not found.</p>'; return; }

      document.title = ev.title + ' - Rhizome Springs';

      var html = '<h1>' + ev.title + '</h1>';
      html += '<div class="event-meta">';
      html += '<span>' + ev.dates + '</span>';
      if (ev.facilitator) html += '<span>Facilitated by ' + ev.facilitator + '</span>';
      if (ev.location) html += '<span>' + ev.location + '</span>';
      html += '</div>';

      // Description
      if (ev.description) {
        html += '<div class="event-description">' + ev.description + '</div>';
      }

      // Schedule
      if (ev.schedule) {
        html += '<h2 class="section-title" style="font-size:1.5rem;">Schedule</h2>';
        html += '<div class="event-description">' + ev.schedule + '</div>';
      }

      // Pricing
      if (ev.pricing && ev.pricing.length > 0) {
        html += '<h2 class="section-title" style="font-size:1.5rem;">Pricing</h2>';
        html += '<table class="pricing-table"><thead><tr><th>Option</th><th>Price</th><th></th></tr></thead><tbody>';
        ev.pricing.forEach(function(p) {
          var expired = p.until && p.until < new Date().toISOString().split('T')[0];
          html += '<tr' + (expired ? ' style="opacity:0.5;text-decoration:line-through;"' : '') + '>';
          html += '<td>' + p.label + (p.until ? ' (until ' + formatDateShort(p.until) + ')' : '') + '</td>';
          html += '<td class="price">$' + p.amount + ' ' + (p.currency || 'CAD') + '</td>';
          html += '<td>';
          if (!expired) {
            html += '<button class="btn-solid" style="padding:8px 20px;font-size:11px;" onclick="RhizomeCart.addEventToCart(\'' + ev.id + '\',\'' + p.label + '\',' + p.amount + ',\'' + (p.currency || 'CAD') + '\')">Add to Cart</button>';
          }
          html += '</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }

      // Register button
      if (ev.registrationUrl) {
        html += '<div style="margin:30px 0;"><a href="' + ev.registrationUrl + '" target="_blank" class="btn-solid">Register Now</a></div>';
      }
      if (ev.stripePaymentLink) {
        html += '<div style="margin:30px 0;"><a href="' + ev.stripePaymentLink + '" target="_blank" class="btn-solid">Pay Now</a></div>';
      }

      // Calendar export
      if (ev.startDate) {
        html += '<div class="calendar-links">';
        var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
          '&text=' + encodeURIComponent(ev.title) +
          '&dates=' + ev.startDate.replace(/-/g, '') + '/' + (ev.endDate || ev.startDate).replace(/-/g, '') +
          '&location=' + encodeURIComponent(ev.location || '') +
          '&details=' + encodeURIComponent(ev.excerpt || '');
        html += '<a href="' + gcalUrl + '" target="_blank">Add to Google Calendar</a>';
        html += '</div>';
      }

      // Payment alternatives
      if (settings.etransferEmail || settings.wiseLink) {
        html += '<div class="payment-alternatives">';
        html += '<h3>Alternative Payment Methods</h3>';
        if (settings.etransferEmail) {
          html += '<p>E-transfer: <a href="mailto:' + settings.etransferEmail + '">' + settings.etransferEmail + '</a></p>';
        }
        if (settings.wiseLink) {
          html += '<p>Wise: <a href="' + settings.wiseLink + '" target="_blank">Pay via Wise</a></p>';
        }
        html += '</div>';
      }

      html += '<p style="margin-top:40px;"><a href="' + BASE + 'events.html">&larr; Back to Events</a></p>';
      target.innerHTML = html;
    });
  }

  // ===== BLOG =====
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
      target.innerHTML = html || '<p style="text-align:center;color:var(--color-text-light);">No blog posts yet.</p>';
    });
  }

  function renderBlogPost() {
    var target = document.getElementById('blog-post-content');
    if (!target) return;
    var postId = location.hash.replace('#', '');
    if (!postId) { location.href = '../blog.html'; return; }
    fetchJSON('blog-posts.json', function(posts) {
      var post = posts.find(function(p) { return p.id === postId; });
      if (!post) { target.innerHTML = '<p>Post not found.</p>'; return; }
      document.title = post.title + ' - Rhizome Springs';
      target.innerHTML =
        '<h1>' + post.title + '</h1>' +
        '<p class="post-meta">By ' + post.author + ' &bull; ' + formatDate(post.date) + '</p>' +
        post.body +
        '<p><a href="../blog.html">&larr; Back to Blog</a></p>';
    });
  }

  // ===== CART =====
  var CART_KEY = 'rhizome-cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    var cart = getCart();
    var count = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
    document.querySelectorAll('.cart-badge').forEach(function(el) {
      el.textContent = count > 0 ? count : '';
    });
  }

  function addToCart(productId, title, price, currency, image) {
    var cart = getCart();
    var existing = cart.find(function(item) { return item.productId === productId; });
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: productId, title: title, price: price, currency: currency || 'CAD', image: image || '', quantity: 1 });
    }
    saveCart(cart);
    showCartToast('Added to cart!');
  }

  function addEventToCart(eventId, pricingLabel, amount, currency) {
    var productId = eventId + '-' + pricingLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addToCart(productId, pricingLabel, amount, currency, '');
  }

  function renderCart() {
    var target = document.getElementById('cart-content');
    if (!target) return;
    var cart = getCart();

    if (cart.length === 0) {
      target.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><p style="margin-top:16px;"><a href="events.html" class="btn">Browse Events</a></p></div>';
      return;
    }

    var html = '<div class="cart-items">';
    var total = 0;
    cart.forEach(function(item, i) {
      var subtotal = item.price * item.quantity;
      total += subtotal;
      html += '<div class="cart-item">';
      html += '<div>' + (item.image ? '<img src="' + BASE + item.image + '" alt="">' : '<div style="width:80px;height:80px;background:var(--color-bg-light);border-radius:8px;"></div>') + '</div>';
      html += '<div><div class="cart-item-title">' + item.title + '</div><div class="cart-item-price">$' + item.price + ' ' + item.currency + '</div></div>';
      html += '<div class="cart-qty">';
      html += '<button onclick="RhizomeCart.updateQty(' + i + ',-1)">-</button>';
      html += '<span>' + item.quantity + '</span>';
      html += '<button onclick="RhizomeCart.updateQty(' + i + ',1)">+</button>';
      html += '</div>';
      html += '<div><button class="cart-remove" onclick="RhizomeCart.removeItem(' + i + ')">Remove</button><div style="font-weight:600;margin-top:4px;">$' + subtotal.toFixed(2) + '</div></div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="cart-total"><span>Total</span><span>$' + total.toFixed(2) + ' CAD</span></div>';
    html += '<div style="text-align:right;margin-top:20px;">';
    html += '<button class="btn-solid" onclick="RhizomeCart.checkout()" style="font-size:14px;padding:16px 40px;">Proceed to Checkout</button>';
    html += '</div>';

    // Payment alternatives
    if (settings.etransferEmail || settings.wiseLink) {
      html += '<div class="payment-alternatives" style="margin-top:40px;">';
      html += '<h3>Alternative Payment Methods</h3>';
      if (settings.etransferEmail) {
        html += '<p>E-transfer: <a href="mailto:' + settings.etransferEmail + '">' + settings.etransferEmail + '</a></p>';
      }
      if (settings.wiseLink) {
        html += '<p>Wise: <a href="' + settings.wiseLink + '" target="_blank">Pay via Wise</a></p>';
      }
      html += '</div>';
    }

    target.innerHTML = html;
  }

  function updateQty(index, delta) {
    var cart = getCart();
    if (!cart[index]) return;
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }

  function removeItem(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }

  function checkout() {
    var cart = getCart();
    if (!cart.length) return;

    // If Stripe is configured, use it
    if (settings.stripePublishableKey && window.Stripe) {
      var stripe = Stripe(settings.stripePublishableKey);
      // Build line items from products.json matching
      fetchJSON('products.json', function(products) {
        var lineItems = [];
        cart.forEach(function(item) {
          var product = products.find(function(p) { return p.id === item.productId; });
          if (product && product.stripePriceId) {
            lineItems.push({ price: product.stripePriceId, quantity: item.quantity });
          }
        });
        if (lineItems.length > 0) {
          stripe.redirectToCheckout({
            lineItems: lineItems,
            mode: 'payment',
            successUrl: location.origin + location.pathname + '?success=true',
            cancelUrl: location.origin + location.pathname
          });
        } else {
          alert('Some items cannot be checked out online. Please use the alternative payment methods below.');
        }
      });
    } else {
      alert('Online checkout is not yet configured. Please use the alternative payment methods shown below.');
    }
  }

  function showCartToast(msg) {
    var existing = document.getElementById('cart-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;bottom:30px;right:30px;background:var(--color-accent);color:#fff;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:500;z-index:9999;animation:heroFadeUp 0.3s ease forwards;';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2500);
  }

  // Expose cart functions globally
  window.RhizomeCart = {
    addToCart: addToCart,
    addEventToCart: addEventToCart,
    updateQty: updateQty,
    removeItem: removeItem,
    checkout: checkout
  };

  // ===== NEWSLETTER =====
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type="email"]');
        var email = emailInput.value.trim();
        if (!email) return;

        var msgEl = form.querySelector('.newsletter-msg') || form.parentElement.querySelector('.newsletter-msg');
        if (!msgEl) {
          msgEl = document.createElement('p');
          msgEl.className = 'newsletter-msg';
          form.parentElement.appendChild(msgEl);
        }

        if (!settings.kitApiKey || !settings.kitFormId) {
          msgEl.textContent = 'Newsletter signup is not yet configured.';
          return;
        }

        var url = 'https://api.convertkit.com/v3/forms/' + settings.kitFormId + '/subscribe';
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: settings.kitApiKey, email: email })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.subscription) {
            msgEl.textContent = 'Thank you! Check your email to confirm.';
            emailInput.value = '';
          } else {
            msgEl.textContent = 'Something went wrong. Please try again.';
          }
        })
        .catch(function() {
          msgEl.textContent = 'Something went wrong. Please try again.';
        });
      });
    });
  }

  // ===== INIT =====
  fetchJSON('site-settings.json', function(s) {
    settings = s;
    loaded.settings = true;
    // CMS overrides disabled - CSS has correct values from Squarespace source
    // applyTheme();    // would override CSS vars with site-settings.json
    // renderLogos();   // would replace logo img src
    // renderNav();     // skips anyway (split nav detected)
    // renderFooter();  // would overwrite hardcoded footer links
    // renderSettingsContent(); // would overwrite data-cms-setting elements
    updateCartBadge();
    initNewsletter();
  });

  fetchJSON('pages.json', function(p) {
    pages = p;
    loaded.pages = true;
    // renderPageSections();  // would overwrite data-cms-section elements
    // renderDynamicPage();   // only for CMS-generated pages
    // renderHeroImage();     // would overwrite hero bg from pages.json
    // renderSectionImages(); // would overwrite section images
  });

  renderEventsList();
  renderEventsPreview();
  renderEventDetail();
  renderBlogList();
  renderBlogPost();
  renderCart();
})();
