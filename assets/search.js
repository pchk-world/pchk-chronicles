/* Поиск по хроникам: индекс /search.json (собирает viz/search.py) грузится при первом обращении.
   pchkSearch.attach(input) — подсказки под полем в шапке; pchkSearch.page() — страница /search/. */
window.pchkSearch = window.pchkSearch || (() => {
  let data = null, loading = null;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/(\d)(?=[a-zа-я])/g, '$1 ').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const END = ['иями','ями','ами','ого','его','ому','ему','ыми','ими','ией','иях','ах','ях','ов','ев','ей','ой','ий','ый','ая','яя','ое','ее','ую','юю','ом','ем','ам','ям','ия','ие','ии','ию','а','я','о','е','ы','и','у','ю','ь','й'];
  const stem = w => { if (w.length <= 4 || /[a-z0-9]/.test(w)) return w; for (const e of END) if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length); return w; };
  const LAT = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.`', CYR = 'йцукенгшщзхъфывапролджэячсмитьбюё';
  const swapLayout = q => q.toLowerCase().replace(/./g, c => { const i = LAT.indexOf(c); return i < 0 ? c : CYR[i]; });

  function load(){
    if (data) return Promise.resolve(data);
    return loading = loading || fetch('/search.json').then(r => r.json()).then(j => {
      data = {types: j.types, items: j.items.map(([t, title, url, sub, alt, text]) => ({t, title, url, sub, text,
        nt: ' ' + norm(title) + ' ', st: norm(title).split(' ').map(stem).join(' '), na: ' ' + norm(alt) + ' ', nx: ' ' + norm(sub + ' ' + text) + ' '}))};
      return data;
    }).catch(e => { loading = null; throw e; });
  }
  /* вес типа: сущности выше событий, события выше записей подкастов (порядок типов — viz/search.py) */
  const WEIGHT = [12, 10, 10, 10, 10, 6, 6, 4, 0];
  const count = (f, s) => { let n = 0, i = -1; while ((i = f.indexOf(' ' + s, i + 1)) >= 0 && n < 4) n++; return n; };
  function run(q){
    const nq = norm(q); if (!nq) return [];
    const toks = nq.split(' '), stems = toks.map(stem), out = [];
    for (const it of data.items) {
      let score = 0, ok = true;
      for (let i = 0; i < stems.length && ok; i++) {
        const s = stems[i];
        if (it.nt.includes(' ' + s)) score += it.nt.includes(' ' + toks[i] + ' ') || it.nt.includes(' ' + s + ' ') ? 40 : 30;
        else if (it.na.includes(' ' + s)) score += 20;
        else { const n = count(it.nx, s); if (n) score += 3 + n; else ok = false; }
      }
      if (!ok) continue;
      const sq = stems.join(' ');
      if (it.st === sq) score += 100; else if (it.st.startsWith(sq + ' ')) score += 50 * sq.length / it.st.length;
      out.push({it, score: score + (WEIGHT[it.t] || 0) - Math.min(it.nt.length, 120) * 0.05});
    }
    return out.sort((a, b) => b.score - a.score).map(r => r.it);
  }
  /* результаты; если пусто, а запрос набран латиницей — пробует русскую раскладку */
  function search(q){
    let res = run(q), fixed = null;
    if (!res.length && /[a-z]/i.test(q)) { const alt = swapLayout(q); res = run(alt); if (res.length) fixed = alt; }
    return {res, stems: norm(fixed || q).split(' ').map(stem).filter(Boolean), fixed};
  }
  const rx = stems => stems.length ? new RegExp('(^|[^a-zа-яё0-9])(' + stems.map(s => s.replace(/е/g, '[её]')).join('|') + ')', 'gi') : null;
  function mark(text, stems){
    const r = rx(stems); if (!r) return esc(text);
    let out = '', last = 0, m;
    while ((m = r.exec(text))) { const st = m.index + m[1].length; out += esc(text.slice(last, st)) + '<mark>' + esc(m[2]) + '</mark>'; last = st + m[2].length; }
    return out + esc(text.slice(last));
  }
  function snippet(text, stems, len = 180){
    if (!text) return '';
    const r = rx(stems), m = r && r.exec(text);
    let a = m ? Math.max(0, m.index - 60) : 0;
    if (a) { const sp = text.indexOf(' ', a); a = sp > 0 && sp < a + 20 ? sp + 1 : a; }
    const s = text.slice(a, a + len);
    return (a ? '…' : '') + mark(s, stems) + (a + len < text.length ? '…' : '');
  }

  /* подсказки под полем в шапке (паттерн combobox) */
  function attach(input){
    const form = input.form, list = document.createElement('ul');
    list.id = 'nav-sugg'; list.className = 'nav-sugg'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Подсказки'); list.hidden = true;
    form.appendChild(list);
    Object.entries({role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'nav-sugg', autocomplete: 'off'})
      .forEach(([k, v]) => input.setAttribute(k, v));
    let opts = [], cur = -1, timer = 0;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); cur = -1; };
    const setCur = i => {
      cur = i; opts.forEach((o, k) => o.setAttribute('aria-selected', k === i));
      if (i >= 0) { input.setAttribute('aria-activedescendant', opts[i].id); opts[i].scrollIntoView({block: 'nearest'}); } else input.removeAttribute('aria-activedescendant');
    };
    const all = q => '/search/?q=' + encodeURIComponent(q);
    function render(){
      const q = input.value.trim();
      if (!q) { close(); return; }
      load().then(d => {
        if (input.value.trim() !== q) return;
        const {res, stems, fixed} = search(q);
        list.innerHTML = (fixed ? `<li class="sfix" role="presentation">Раскладка: «${esc(fixed)}»</li>` : '') +
          res.slice(0, 7).map((it, i) => `<li role="option" id="sugg-${i}" class="sopt" data-url="${esc(it.url)}" aria-selected="false">
            <span class="stype">${esc(d.types[it.t])}</span><span class="stitle">${mark(it.title, stems)}</span>${it.sub ? `<span class="ssub">${esc(it.sub)}</span>` : ''}</li>`).join('') +
          (res.length ? `<li role="option" id="sugg-all" class="sopt sall" data-url="${esc(all(q))}" aria-selected="false">Все результаты: ${res.length} →</li>`
                      : `<li class="sempty" role="presentation">Ничего не нашлось</li>`);
        opts = [...list.querySelectorAll('[role="option"]')]; cur = -1;
        list.hidden = false; input.setAttribute('aria-expanded', 'true');
      }, () => { list.innerHTML = '<li class="sempty" role="presentation">Не удалось загрузить индекс поиска</li>'; list.hidden = false; });
    }
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 80); });
    input.addEventListener('focus', () => { load().catch(() => {}); if (input.value.trim()) render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (list.hidden) { render(); return; }
        e.preventDefault(); const n = opts.length; if (!n) return;
        setCur(e.key === 'ArrowDown' ? (cur + 1) % n : (cur <= 0 ? n - 1 : cur - 1));
      } else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); location.href = opts[cur].dataset.url; close(); }
      else if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); } else input.blur(); }
    });
    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => { const o = e.target.closest('[data-url]'); if (o) { location.href = o.dataset.url; close(); } });
    input.addEventListener('blur', close);
    form.addEventListener('submit', e => { if (!input.value.trim()) e.preventDefault(); });
  }

  /* страница /search/ */
  function page(){
    const input = document.getElementById('sq'), box = document.getElementById('sresults'), status = document.getElementById('sstatus'), fl = document.getElementById('sfilters');
    let type = null, limit = 50, timer = 0;
    input.value = new URLSearchParams(location.search).get('q') || '';
    function render(){
      const q = input.value.trim();
      history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
      document.title = (q ? `«${q}» — поиск` : 'Поиск') + ' · Хроники Понии';
      if (!q) { box.innerHTML = fl.innerHTML = ''; status.textContent = ''; return; }
      status.textContent = 'Загружаю индекс…';
      load().then(d => {
        const {res, stems, fixed} = search(q);
        const by = {}; res.forEach(it => by[it.t] = (by[it.t] || 0) + 1);
        if (type !== null && !by[type]) type = null;
        fl.innerHTML = res.length ? Object.keys(by).map(Number).sort((a, b) => a - b)
          .map(t => `<button class="chip" type="button" data-t="${t}" aria-pressed="${type === t}">${esc(d.types[t])} <small>${by[t]}</small></button>`).join('') : '';
        const shown = type === null ? res : res.filter(it => it.t === type);
        status.textContent = res.length ? `${fixed ? `Показаны результаты для «${fixed}». ` : ''}Найдено: ${res.length}` + (type !== null ? `, из них ${d.types[type].toLowerCase()}: ${shown.length}` : '')
                                        : 'Ничего не нашлось. Попробуйте другое написание или начало слова.';
        box.innerHTML = shown.slice(0, limit).map(it => `<li><a class="sres" href="${esc(it.url)}">
          <span class="stype">${esc(d.types[it.t])}</span><b class="stitle">${mark(it.title, stems)}</b>${it.sub ? `<span class="ssub">${esc(it.sub)}</span>` : ''}
          ${it.text ? `<span class="ssnip">${snippet(it.text, stems)}</span>` : ''}</a></li>`).join('') +
          (shown.length > limit ? `<li><button class="chip smore" type="button">Показать ещё ${Math.min(50, shown.length - limit)}</button></li>` : '');
      }, () => { status.textContent = 'Не удалось загрузить индекс поиска. Обновите страницу.'; });
    }
    input.addEventListener('input', () => { clearTimeout(timer); limit = 50; timer = setTimeout(render, 120); });
    input.form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); render(); });
    fl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; type = type === +b.dataset.t ? null : +b.dataset.t; limit = 50; render(); });
    box.addEventListener('click', e => { if (e.target.closest('.smore')) { limit += 50; render(); } });
    render();
  }

  const ready = () => { const q = document.querySelector('.nav-search input'); if (q) attach(q); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ready) : ready();
  return {load, search, attach, page};
})();
