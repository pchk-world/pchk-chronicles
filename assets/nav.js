/* Верхнее меню: подсветка текущего пункта по адресу, временный показ
   подразделов при наведении, мобильная панель с аккордеоном, «/» — фокус в поиск. Разметка — viz/nav.py. */
(() => {
  const hd = document.querySelector('.site-nav'); if (!hd) return;
  const $$ = s => [...hd.querySelectorAll(s)];
  const desk = hd.querySelector('.nav-desk'), secs = $$('.nav-sec'), groups = $$('.nav-group');
  const burger = hd.querySelector('.nav-burger'), panel = hd.querySelector('#nav-panel');
  const idle = hd.dataset.idle === undefined ? -1 : +hd.dataset.idle;
  let active = -1, preview = null, timer = 0;

  const matches = m => m === '/' ? location.pathname === '/' : location.pathname.startsWith(m);
  const mark = (el, on, cur) => { el.classList.toggle('on', on); on ? el.setAttribute('aria-current', cur) : el.removeAttribute('aria-current'); };

  function show(i){
    if (i < 0) i = idle;
    groups.forEach(g => g.hidden = +g.dataset.sec !== i);
    hd.classList.toggle('no-sub', i < 0);
    secs.forEach(s => s.classList.toggle('peek', preview !== null && +s.dataset.sec === i));
  }
  function sync(){
    active = -1;
    $$('a[data-match]').forEach(a => {
      const on = a.dataset.match.split(' ').some(matches);
      mark(a, on, 'page');
      if (on) active = +a.closest('[data-sec]').dataset.sec;
    });
    secs.forEach(s => mark(s, +s.dataset.sec === active, 'true'));
    $$('.nav-card').forEach(c => c.classList.toggle('on', +c.dataset.sec === active));
    if (!hd.classList.contains('open')) expandActive();
    show(preview ?? active);
  }

  /* десктоп: наведение и клавиатура временно переключают второй ряд */
  const peek = i => { clearTimeout(timer); preview = i; show(i); };
  const unpeek = () => { clearTimeout(timer); preview = null; show(active); };
  secs.forEach(s => {
    const i = +s.dataset.sec;
    s.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => peek(i), 120); });
    s.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== ' ') return;
      e.preventDefault(); peek(i);
      const first = groups[i].querySelector('a'); if (first) first.focus();
    });
  });
  desk.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(unpeek, 120); });
  desk.addEventListener('mouseenter', () => { if (preview !== null) clearTimeout(timer); });
  desk.addEventListener('focusout', e => { if (preview !== null && !desk.contains(e.relatedTarget)) unpeek(); });
  groups.forEach(g => g.addEventListener('keydown', e => {
    if ((e.key === 'Escape' || e.key === 'ArrowUp') && preview !== null) { e.preventDefault(); const i = preview; unpeek(); secs[i].focus(); }
  }));

  /* мобильная панель */
  const cards = $$('.nav-card .nav-acc[aria-controls]');
  const expand = (b, on) => { b.setAttribute('aria-expanded', on); document.getElementById(b.getAttribute('aria-controls')).hidden = !on; };
  function expandActive(){ cards.forEach(b => expand(b, +b.closest('.nav-card').dataset.sec === active)); }
  cards.forEach(b => b.addEventListener('click', () => expand(b, b.getAttribute('aria-expanded') !== 'true')));
  const others = () => [...document.body.children].filter(el => el !== hd && el.tagName !== 'SCRIPT');
  function setOpen(on, refocus){
    hd.classList.toggle('open', on);
    document.documentElement.classList.toggle('nav-lock', on);
    burger.setAttribute('aria-expanded', on);
    burger.setAttribute('aria-label', on ? 'Закрыть меню' : 'Меню');
    others().forEach(el => el.inert = on);
    if (on) { expandActive(); (panel.querySelector('.nav-card.on .nav-acc') || panel.querySelector('.nav-acc')).focus(); }
    else if (refocus) burger.focus();
  }
  burger.addEventListener('click', () => setOpen(!hd.classList.contains('open'), true));
  panel.addEventListener('click', e => { if (e.target === panel) setOpen(false, true); else if (e.target.closest('a')) setOpen(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches && hd.classList.contains('open')) setOpen(false); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hd.classList.contains('open')) { setOpen(false, true); return; }
    const q = hd.querySelector('.nav-search input');
    if (e.key !== '/' || !q || e.ctrlKey || e.metaKey || e.altKey || !q.offsetParent) return;
    const t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    e.preventDefault(); q.focus();
  });

  window.navSync = sync;
  sync();
})();

/* Всплывающая подсказка: data-roll-img — картинка (кадр плашки броска, игровая карта), data-tip — текст (характеристики
   предмета, описание способности); ссылка на персонажа, предмет, место или участника — фото и одно предложение из
   /assets/tips.json (грузится при первом наведении; собирает viz/tips.py), data-where — приписка (метка на карте).
   У вложенных элементов — своя подсказка: срабатывает ближайший к курсору. */
(() => {
  let tip = null, ent = null, cur = null, tips = null, loading = null, last = null;
  const ENT = /^\/(c|a|place|p)\/[^/]+\/$/;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = () => loading = loading || fetch('/assets/tips.json').then(r => r.json()).then(j => { tips = j; }).catch(() => { loading = null; });
  const place = (box, e) => {
    const w = box.offsetWidth, h = box.offsetHeight, m = 14;
    let x = e.clientX + m, y = e.clientY + m;
    if (x + w > innerWidth - 8) x = Math.max(8, e.clientX - w - m);
    if (y + h > innerHeight - 8) y = Math.max(8, e.clientY - h - m);
    box.style.transform = `translate(${x}px, ${y}px)`;
  };
  const hide = () => { if (tip) tip.hidden = true; if (ent) ent.hidden = true; };
  const box = () => tip && !tip.hidden ? tip : ent && !ent.hidden ? ent : null;
  /* адрес сущности под ссылкой или строкой .linkto (на страницах-таблицах персонаж — span с id) */
  function entUrl(el) {
    if (el.matches('.linkto[data-ch]')) { const c = window.DATA && DATA.chars[el.dataset.ch]; return c && c.url; }
    if (el.origin !== location.origin || !ENT.test(el.pathname) || el.pathname === location.pathname) return null;
    return el.pathname;
  }
  function showEnt(el, url, e) {
    const t = tips[url]; if (!t) { hide(); return; }
    if (tip) tip.hidden = true;
    if (!ent) { ent = document.createElement('div'); ent.className = 'ent-tip'; ent.setAttribute('aria-hidden', 'true'); document.body.append(ent); }
    const [name, img, text] = t;
    ent.innerHTML = `${img ? `<img src="${esc(img)}" alt="">` : ''}<div><b>${esc(name)}</b>${text ? `<p>${esc(text)}</p>` : ''}${el.dataset.where ? `<small>${esc(el.dataset.where)}</small>` : ''}</div>`;
    ent.hidden = false; place(ent, e);
  }
  document.addEventListener('mouseover', e => {
    const t = e.target; if (!t.closest) return;
    last = e;
    const data = t.closest('[data-roll-img],[data-tip]'), link = t.closest('a[href],.linkto[data-ch]');
    const url = link && !(data && link.contains(data)) ? entUrl(link) : null;   // подсказка внутри ссылки — ближе к курсору
    const el = url ? link : data;
    if (el === cur) return;
    cur = el;
    if (!el) { hide(); return; }
    if (url) {
      if (tips) showEnt(el, url, e);
      else { hide(); load().then(() => { if (cur === el && tips) showEnt(el, url, last); }); }
      return;
    }
    if (ent) ent.hidden = true;
    if (!tip) { tip = document.createElement('div'); tip.className = 'roll-tip'; tip.setAttribute('aria-hidden', 'true'); tip.innerHTML = '<img alt=""><p></p>'; document.body.append(tip); }
    const [im, tx] = tip.children, src = el.dataset.rollImg || '', text = el.dataset.tip || '';
    im.hidden = !src; if (src) im.src = src;
    tx.hidden = !text; tx.textContent = text;
    tip.classList.toggle('text-only', !src);
    tip.classList.toggle('ok-1', el.dataset.ok === '1'); tip.classList.toggle('ok-0', el.dataset.ok === '0');
    tip.hidden = false; place(tip, e);
  });
  document.addEventListener('mousemove', e => { last = e; const b = cur && box(); if (b) place(b, e); }, { passive: true });
  const reset = () => { hide(); cur = null; };
  addEventListener('scroll', reset, { passive: true });
  document.addEventListener('click', reset);
  document.addEventListener('pchk:leave', reset);
})();
