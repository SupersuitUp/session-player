// The one-tag embed (0.6.0, Gary, 2026-10-11: "make it easier to embed in any website").
//
//   <script src="https://continentalworks.ai/simulator/embed.js" async></script>
//   <session-player scenario="phone-rescue"></session-player>
//
// A plain script with no imports and no React: it works on any page, in any framework or none.
// Each <session-player> becomes an iframe of the embed page that served this script, sized to the
// player's content (the player posts its height; no fixed 720px), transparent around the device.
// Defaults: Auto device, Autoplay on, waits for Start. Attributes, all optional: scenario, device
// (auto|iphone|macbook), autoplay ("off"), start ("auto"), background or bg (a CSS colour or
// "theme"), artifacts ("off"), timeline ("off"), height (the device's height, e.g. "640px"),
// title, and src (another embed page). A plain <iframe> of the embed page on the same page is
// resized too. Each iframe also fires `session-player:done` (bubbling) when its session ends.
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sessionPlayerLoader) return;
  window.__sessionPlayerLoader = true;

  var me = document.currentScript;
  var base = (me && me.getAttribute('data-embed')) || (me && me.src ? new URL('embed', me.src).href : '/simulator/embed');
  var PASS = { scenario: 'scenario', device: 'device', autoplay: 'autoplay', start: 'start', background: 'bg', bg: 'bg', artifacts: 'artifacts', timeline: 'timeline' };

  // The device's height, from the HOST's window: inside the iframe 100svh would be the iframe's
  // own height, which this script sets from the content, so it would chase itself.
  function deviceHeight() {
    var v = window.innerHeight || 800;
    return Math.max(480, Math.min(760, v - 120));
  }

  function srcFor(el) {
    var u = new URL(el.getAttribute('src') || base, location.href);
    for (var k in PASS) {
      var v = el.getAttribute(k);
      if (v != null) u.searchParams.set(PASS[k], v);
    }
    if (!u.searchParams.has('height')) u.searchParams.set('height', el.getAttribute('height') || deviceHeight() + 'px');
    return u.href;
  }

  function mount(el) {
    if (el.__sessionPlayerFrame) return;
    var f = document.createElement('iframe');
    f.src = srcFor(el);
    f.title = el.getAttribute('title') || 'Case study';
    f.setAttribute('loading', 'lazy');
    f.setAttribute('allow', 'clipboard-write');
    f.setAttribute('allowtransparency', 'true');
    // color-scheme normal keeps the frame transparent on a dark-mode host page.
    f.style.cssText = 'display:block;width:100%;border:0;background:transparent;color-scheme:normal;height:' + (deviceHeight() + 90) + 'px';
    el.style.display = 'block';
    el.appendChild(f);
    el.__sessionPlayerFrame = f;
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string' || d.type.indexOf('session-player:') !== 0) return;
    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow !== e.source) continue;
      if (d.type === 'session-player:height' && d.height > 0) frames[i].style.height = Math.ceil(d.height) + 'px';
      frames[i].dispatchEvent(new CustomEvent(d.type, { detail: d, bubbles: true }));
    }
  });

  if (window.customElements && !window.customElements.get('session-player')) {
    window.customElements.define('session-player', class extends HTMLElement {
      connectedCallback() { mount(this); }
    });
  }
})();
