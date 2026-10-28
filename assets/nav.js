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
   предмета, описание способности); у вложенных элементов — своя подсказка (значок способности внутри строки броска). */
(() => {
  let tip = null, cur = null;
  const place = e => {
    const w = tip.offsetWidth, h = tip.offsetHeight, m = 14;
    let x = e.clientX + m, y = e.clientY + m;
    if (x + w > innerWidth - 8) x = Math.max(8, e.clientX - w - m);
    if (y + h > innerHeight - 8) y = Math.max(8, e.clientY - h - m);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-roll-img],[data-tip]');
    if (el === cur) return;
    cur = el;
    if (!el) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'roll-tip'; tip.setAttribute('aria-hidden', 'true'); tip.innerHTML = '<img alt=""><p></p>'; document.body.append(tip); }
    const [im, tx] = tip.children, src = el.dataset.rollImg || '', text = el.dataset.tip || '';
    im.hidden = !src; if (src) im.src = src;
    tx.hidden = !text; tx.textContent = text;
    tip.classList.toggle('text-only', !src);
    tip.hidden = false; place(e);
  });
  document.addEventListener('mousemove', e => { if (cur && tip && !tip.hidden) place(e); }, { passive: true });
  addEventListener('scroll', () => { if (tip) tip.hidden = true; cur = null; }, { passive: true });
})();
