/* Плавающий плеер выпуска, общий для всех страниц (window.pchkPlayer). Пока он открыт, переходы по сайту идут
   без перезагрузки: подменяется только <main> и скрипты страницы, поэтому видео не прерывается.
   Синхронизацию с таймлайном делает episode.js; здесь — сам плеер и мягкая навигация. */
(() => {
  if (window.pchkPlayer) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wide = matchMedia('(min-width: 1100px)');
  let yt = null, box = null, cur = null;  // cur: {videoId, label, url}

  function loadApi() {
    if (window.YT && YT.Player) return Promise.resolve();
    return new Promise(res => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
    });
  }
  function bar() {
    box.querySelector('.ep-player-t').innerHTML = cur.url && location.pathname !== cur.url
      ? `<a href="${esc(cur.url)}" title="Вернуться к таймлайну выпуска">Выпуск #${esc(cur.label)} ↩</a>` : `Выпуск #${esc(cur.label)}`;
    document.body.classList.toggle('mini', location.pathname !== cur.url);
  }
  async function start({ videoId, label, url, sec = 0 }) {
    if (!wide.matches) return false;
    const same = cur && cur.videoId === videoId;
    cur = { videoId, label, url };
    if (!box) {
      box = document.createElement('div'); box.className = 'ep-player'; box.id = 'ep-player';
      box.innerHTML = '<div class="ep-player-bar"><span class="ep-player-t"></span><button type="button" class="ep-player-x" aria-label="Закрыть плеер">×</button></div><div class="ep-player-frame"><div id="yt-frame"></div></div>';
      document.body.appendChild(box);
      box.querySelector('.ep-player-x').addEventListener('click', stop);
      bar();
      await loadApi();
      await new Promise(res => {
        yt = new YT.Player('yt-frame', { videoId, playerVars: { start: Math.floor(sec), autoplay: 1, rel: 0, playsinline: 1 },
          events: { onReady: () => { yt.playVideo(); res(); } } });
      });
    } else {
      bar();
      if (same) { yt.seekTo(sec, true); yt.playVideo(); } else yt.loadVideoById({ videoId, startSeconds: Math.floor(sec) });
    }
    return true;
  }
  function stop() {
    if (!box) return;
    try { yt && yt.destroy(); } catch (e) {}
    yt = null; box.remove(); box = null; cur = null;
    document.body.classList.remove('mini');
    document.dispatchEvent(new CustomEvent('pchk:player-stop'));
  }
  const ready = () => !!(yt && yt.getCurrentTime);
  window.pchkPlayer = {
    start, stop,
    get videoId() { return cur && cur.videoId; },
    active: () => !!box,
    time: () => ready() ? yt.getCurrentTime() || 0 : 0,
    seek: sec => { if (ready()) { yt.seekTo(sec, true); yt.playVideo(); } },
  };
  wide.addEventListener('change', () => { if (!wide.matches) stop(); });

  /* мягкая навигация: только пока открыт плеер (и после неё — для «назад/вперёд») */
  const SKIP = /^\/(watch|summaries)\/|\.(md|json|xml|txt|png|jpe?g|webp|svg|pdf)$/i;
  let soft = false, shown = location.pathname + location.search;  // адрес страницы, что сейчас на экране
  const loaded = () => new Set([...document.scripts].map(s => s.src).filter(Boolean));
  const RERUN = /\/assets\/episode\.js$/;  // скрипты страницы, которые надо запускать заново

  async function go(url, push) {
    let doc;
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (!r.ok && r.status !== 404) throw new Error(r.status);
      doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    } catch (e) { location.href = url; return; }
    const main = doc.querySelector('main');
    if (!main || !document.querySelector('main')) { location.href = url; return; }
    document.dispatchEvent(new CustomEvent('pchk:leave'));
    if (push) history.pushState({ soft: true }, '', url);
    soft = true; shown = location.pathname + location.search;
    document.title = doc.title;
    // стили головы новой страницы, которых ещё нет
    const have = new Set([...document.head.querySelectorAll('link[rel=stylesheet],style')].map(n => n.outerHTML));
    doc.head.querySelectorAll('link[rel=stylesheet],style').forEach(n => { if (!have.has(n.outerHTML)) document.head.appendChild(n.cloneNode(true)); });
    const canon = doc.querySelector('link[rel=canonical]'), mine = document.querySelector('link[rel=canonical]');
    if (canon && mine) mine.href = canon.href;
    document.querySelector('main').replaceWith(document.adoptNode(main));
    // скрипты тела (кроме шапки) — по порядку, как при обычной загрузке
    const got = loaded();
    document.querySelectorAll('body > script[data-soft]').forEach(s => s.remove());
    for (const old of doc.body.querySelectorAll('script')) {
      if (old.closest('header.site-nav') || old.closest('main')) continue;
      const src = old.src;
      if (src && got.has(src) && !RERUN.test(src)) continue;
      if (!src && /classList\.add\('nav-js'\)/.test(old.textContent)) continue;
      const s = document.createElement('script');
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.dataset.soft = '';
      if (src) { s.async = false; await new Promise(res => { s.onload = s.onerror = res; document.body.appendChild(s); }); }
      else { s.textContent = old.textContent; document.body.appendChild(s); }
    }
    // comments.app и прочие виджеты внутри main
    main.querySelectorAll('script').forEach(old => { const s = document.createElement('script'); for (const a of old.attributes) s.setAttribute(a.name, a.value); s.textContent = old.textContent; old.replaceWith(s); });
    const h = new URL(url, location.href).hash;
    const el = h && document.getElementById(decodeURIComponent(h.slice(1)));
    if (el) el.scrollIntoView(); else if (push) window.scrollTo(0, 0);
    if (window.navSync) navSync();
    if (cur) bar();
    if (typeof gtag === 'function') gtag('event', 'page_view', { page_location: location.href, page_title: document.title });
  }
  document.addEventListener('click', e => {
    if (!box || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target && a.target !== '_self' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || SKIP.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search && u.hash) return;  // якорь на этой же странице
    e.preventDefault(); go(u.href, true);
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (!box || !f.matches('form.nav-search') || f.method.toLowerCase() !== 'get') return;
    e.preventDefault(); go(f.action + '?' + new URLSearchParams(new FormData(f)), true);
  });
  window.addEventListener('popstate', () => { if (soft && location.pathname + location.search !== shown) go(location.href, false); });
})();
