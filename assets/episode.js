/* Страница выпуска: история, таймлайн со скроллом, монеты, персонажи и связи. Данные — window.EPD. */
(function () {
  const D = window.EPD;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initials = s => String(s || '?').replace(/[«»"()]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const img = (src, cls, name) => src ? `<img class="${cls}" src="/${esc(src)}" alt="" loading="lazy">` : `<span class="${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
  const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
  const yt = sec => `https://youtu.be/${D.video_id}` + (sec != null ? `?t=${Math.round(sec)}` : '');
  const epLink = (k, label, title) => `<a href="/ep/${esc(k)}/" title="${esc(title || '')}">#${esc(label)}</a>`;
  const epUrl = k => `/ep/${k}/`;
  const link = (url, text) => url ? `<a href="${esc(url)}">${esc(text)}</a>` : esc(text);
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c;
  const isDead = f => /погиб|умер|убит|сожж|казн|мёртв|мертв|рассыпал/i.test(f || '');
  document.documentElement.style.setProperty('--c', D.branch_color);

  const coinEv = (D.coins && D.coins.events || []).filter(e => e.kind !== 'loot');
  const coinLabel = e => ({ earn: 'получает монету', spend: 'тратит монету', give: 'передаёт монету' }[e.kind] || 'монета');

  /* единый список: сцены + монеты, по времени */
  const items = D.scenes.map(s => ({ ...s, type: 'scene' }));
  coinEv.forEach(e => { if (e.sec != null) items.push({ sec: e.sec, t: e.t, type: 'coin', e }); });
  const rolls = D.rolls || [];
  rolls.forEach(r => items.push({ sec: r.sec, t: r.t, type: 'roll', r }));
  const TORD = { scene: 0, coin: 1, roll: 2 };
  items.sort((a, b) => (a.sec ?? 1e9) - (b.sec ?? 1e9) || TORD[a.type] - TORD[b.type]);
  const keySecs = D.key_events.map(k => k.sec).filter(x => x != null);
  items.forEach(it => { if (it.type === 'scene' && it.sec != null && keySecs.some(k => Math.abs(k - it.sec) <= 75)) it.key = true; });

  const T = D.duration;
  const anchor = (it, i) => 't-' + (it.sec != null ? fmt(it.sec).replace(/:/g, '-') : 'x') + (it.type === 'scene' ? '' : '-' + it.type + i);
  const rollLine = r => `🎲 <b>${link(r.who_url, r.who)}</b>${r.to ? ' → ' + link(r.to_url, r.to) : ''}${r.act ? ': ' + esc(r.act) : ''}${r.check ? ` <span class="note">· ${esc(r.check)}</span>` : ''}`;
  const rollsOf = url => url ? rolls.filter(r => r.who_url === url).length : 0;
  const pct = s => (Math.min(T, Math.max(0, s)) / T * 100).toFixed(3) + '%';
  const ticks = []; const stepT = T > 6000 ? 1800 : 900;
  for (let s = stepT; s < T - 300; s += stepT) ticks.push(s);

  const toc = [['story', 'История'], ['timeline', 'Таймлайн'], ['coins', 'Монеты'], ['people', 'Персонажи'], ['links', 'Связи'], ['world', 'Мир и цитаты']];
  if (D.pod_html) toc.push(['pod', 'Из подкастов']);

  $('#app').innerHTML = `
  <div class="crumbs"><a href="/">Хроники Понии</a> › <a href="/#eps">Выпуски</a> › #${esc(D.label)}</div>
  <header class="ep-hero">
    <a href="${yt()}" target="_blank" rel="noopener"><img class="thumb" src="https://i.ytimg.com/vi/${esc(D.video_id)}/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(D.video_id)}/hqdefault.jpg'" alt="Обложка выпуска"></a>
    <div>
      <span class="eyebrow">Выпуск #${esc(D.label)} · ${esc(D.date.split('-').reverse().join('.'))} · ${D.minutes} мин</span>
      <h1>${esc(D.title)}</h1>
      <div class="meta"><a class="badge" style="--c:${D.branch_color}" href="/#map"><i></i>${esc(D.branch)}</a>${D.place ? `<span>${esc(D.place)}</span>` : ''}</div>
      <p class="lead">${D.short_html}</p>
      <div class="ep-nav">
        <button type="button" class="ytb" id="watch-here-top" data-label="▶ Смотреть на странице" hidden>▶ Смотреть на странице</button>
        <a class="ytb" href="${yt()}" target="_blank" rel="noopener">▶ Смотреть на YouTube</a>
        ${D.anim ? `<a class="ytb anim" href="/watch/${esc(D.key)}/">🎭 Смотреть с анимацией</a>` : ''}
        ${D.podzem ? `<a class="btn" href="${esc(D.podzem)}" target="_blank" rel="noopener">Текст выпуска на podzem.cc ↗</a>` : ''}
        <button class="btn" data-copy="${epUrl(D.key)}">Скопировать ссылку</button>
        ${D.prev ? `<a class="btn" href="${epUrl(D.prev.key)}">← #${esc(D.prev.label)}</a>` : ''}
        ${D.next ? `<a class="btn" href="${epUrl(D.next.key)}">#${esc(D.next.label)} →</a>` : ''}
        ${D.prevBranch ? `<a class="btn" href="${epUrl(D.prevBranch.key)}" title="${esc(D.prevBranch.title)}">← в ветви: #${esc(D.prevBranch.label)}</a>` : ''}
        ${D.nextBranch ? `<a class="btn" href="${epUrl(D.nextBranch.key)}" title="${esc(D.nextBranch.title)}">в ветви: #${esc(D.nextBranch.label)} →</a>` : ''}
      </div>
      <nav class="ep-toc">${toc.map(([id, l]) => `<a class="chip" href="#${id}">${l}</a>`).join('')}</nav>
    </div>
  </header>

  <section class="ep-sec" id="story"><h2>История</h2>
    ${D.cast.length ? `<p class="party-line">${D.cast.map(p => link(p.url, p.name) + (p.actor ? ` <span>(${link(p.actor_url, p.actor.replace(/\s*\(.*\)$/, ''))})</span>` : '')).join(' · ')}</p>` : ''}
    <div class="ep-cols">
      <div><p style="margin:0">${D.summary_html}</p>${D.outcome_html ? `<div class="sec"><h3>Итог</h3><p style="margin:0">${D.outcome_html}</p></div>` : ''}</div>
      ${D.world_html.length ? `<div class="sec" style="margin:0"><h3>Что изменилось в мире</h3><ul class="plain">${D.world_html.map(w => `<li>— ${w}</li>`).join('')}</ul></div>` : ''}
    </div>
  </section>

  <section class="ep-sec" id="timeline"><h2>Таймлайн выпуска <small>${D.scenes.length} сцен · ${coinEv.length} событий с монетами${rolls.length ? ` · ${rolls.length} бросков` : ''}</small></h2>
    <div class="scrub" id="scrub">
      <div class="read"><span class="now" id="now">0:00:00</span><span class="what" id="what"></span><span class="read-btns"><button type="button" class="ytb" id="watch-here" data-label="▶ Смотреть здесь" hidden>▶ Смотреть здесь</button><a class="dur" id="watch" href="${yt(0)}" target="_blank" rel="noopener">▶ на YouTube с этого места</a></span></div>
      <div class="track" id="track">
        <div class="bar"></div><div class="fill" id="fill"></div>
        ${items.filter(i => i.sec != null && i.type === 'scene').map(i => `<span class="mk${i.key ? ' key' : ''}" style="left:${pct(i.sec)}"></span>`).join('')}
        ${coinEv.filter(e => e.sec != null).map(e => `<span class="mk coin${e.kind === 'spend' ? ' spend' : ''}" style="left:${pct(e.sec)}" title="${esc(e.t)} ${esc(e.who || '')}: ${esc(e.reason || '')}"></span>`).join('')}
        ${rolls.map(r => `<span class="mk roll" style="left:${pct(r.sec)}" title="${esc(r.t)} ${esc(r.who)}${r.act ? ': ' + esc(r.act) : ''}"></span>`).join('')}
        ${ticks.map(s => `<span class="tick" style="left:${pct(s)}">${fmt(s).replace(/:00$/, '')}</span>`).join('')}
        <div class="head" id="head"></div>
        <input type="range" id="range" min="0" max="${Math.round(T)}" step="1" value="0" aria-label="Промотать выпуск">
      </div>
      <div class="legendline"><span><i style="width:6px;height:14px;background:var(--c);border-radius:2px"></i>ключевое событие</span><span><i style="width:4px;height:10px;background:var(--muted);border-radius:2px"></i>сцена</span><span><i style="width:9px;height:9px;background:var(--link);border-radius:50%"></i>монета получена</span><span><i style="width:9px;height:9px;border:2px solid var(--link);border-radius:50%"></i>монета потрачена</span>${rolls.length ? '<span><i style="width:7px;height:7px;background:var(--roll);transform:rotate(45deg)"></i>бросок на экране</span>' : ''}<span>Тяните шкалу или прокручивайте список</span></div>
      <div class="tl-filter" role="group" aria-label="Что показывать в списке">
        <button type="button" data-f="coin" aria-pressed="true">Монеты</button>${rolls.length ? '<button type="button" data-f="roll" aria-pressed="true">Броски</button>' : ''}
      </div>
    </div>
    <ol class="scenes" id="scenes">${items.map((it, i) => it.type === 'roll'
      ? `<li class="scene roll" id="${anchor(it, i)}" data-i="${i}" data-sec="${it.sec}"><span class="t"><a href="${yt(it.sec)}" target="_blank" rel="noopener">${esc(it.t)}</a></span><span class="rail"></span><div class="body">${rollLine(it.r)}</div></li>`
      : it.type === 'scene'
      ? `<li class="scene${it.key ? ' key' : ''}" id="${anchor(it, i)}" data-i="${i}" data-sec="${it.sec ?? ''}"><span class="t">${it.sec != null ? `<a href="${yt(it.sec)}" target="_blank" rel="noopener" title="Смотреть с этого момента">${esc(it.t)}</a>` : esc(it.t || '')}</span><span class="rail"></span><div class="body">${it.html}${it.sec != null ? `<button class="share" data-copy="${epUrl(D.key)}#t=${fmt(it.sec)}" title="Скопировать ссылку на этот момент">🔗</button>` : ''}</div></li>`
      : `<li class="scene coin" id="${anchor(it, i)}" data-i="${i}" data-sec="${it.sec}"><span class="t"><a href="${yt(it.sec)}" target="_blank" rel="noopener">${esc(it.t)}</a></span><span class="rail"></span><div class="body"><b>${link(it.e.who_url, it.e.who || 'Игрок')}</b> ${coinLabel(it.e)}${it.e.to ? ' → ' + esc(it.e.to) : ''}: ${it.e.reason_html || esc(it.e.reason || '')}${it.e.result ? ` <span class="note">(${esc(it.e.result)})</span>` : ''}</div></li>`).join('')}</ol>
  </section>

  <section class="ep-sec" id="coins"><h2>Монеты <small>${D.coins ? coinEv.filter(e => e.kind === 'earn').length + ' выдано · ' + coinEv.filter(e => e.kind === 'spend').length + ' потрачено' : 'нет данных'}</small></h2>
    ${D.coins ? `
      <div class="coins-sum">${(D.coins.totals || []).map(t => `<div class="coin-card">${img(t.img, 'av', t.who)}<b>${link(t.who_url, t.who || '—')}</b><span>${link(t.actor_url, t.actor || '')} · <em>+${t.earned || 0}</em> / −${t.spent || 0}</span></div>`).join('')}</div>
      ${D.coins.notes ? `<p class="note" style="margin:0 0 10px">${esc(D.coins.notes)}</p>` : ''}
      <ul class="plain">${(D.coins.events || []).map(e => `<li>${e.sec != null ? `<a href="${yt(e.sec)}" target="_blank" rel="noopener" style="font:500 12px var(--mono)">${esc(e.t)}</a> ` : ''}<b style="font-weight:600">${link(e.who_url, e.who || 'Игрок')}</b> — ${e.kind === 'loot' ? 'деньги в игре' : coinLabel(e)}${e.to ? ' → ' + esc(e.to) : ''}: ${e.reason_html || esc(e.reason || '')}</li>`).join('')}</ul>`
      : '<p class="note">Разбор монет для этого выпуска пока не готов.</p>'}
  </section>

  <section class="ep-sec" id="people"><h2>Персонажи <small>${D.cast.length} в партии · ${D.npcs.length} NPC</small></h2>
    <h3 class="note" style="font:600 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--link);margin:0 0 10px">Партия</h3>
    <div class="people">${D.cast.map(person).join('')}</div>
    ${D.npcs.length ? `<h3 style="font:600 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--link);margin:22px 0 10px">Неигровые персонажи</h3><div class="people">${D.npcs.map(person).join('')}</div>` : ''}
  </section>

  <section class="ep-sec" id="links"><h2>Связи с другими выпусками</h2>
    ${D.links.length ? `<ul class="eplinks">${D.links.map(l => `<li style="--c:${l.color}"><span><a href="${epUrl(l.key)}" style="font:600 14px var(--mono)">#${esc(l.label)}</a><br><span class="dir">${l.dir === 'back' ? 'ссылается сюда' : 'отсылка'}</span></span><span><a href="${epUrl(l.key)}">${esc(l.title)}</a><br><span class="note">${l.note_html}</span></span></li>`).join('')}</ul>` : '<p class="note">Связей не найдено.</p>'}
  </section>

  <section class="ep-sec" id="world"><h2>Места, фракции, артефакты</h2>
    <div class="ep-cols">
      <div class="prose" style="max-width:none">${D.places_html || '<p class="note">—</p>'}</div>
      ${D.quotes_html.length ? `<div><h3 style="font:600 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--link);margin:0 0 10px">Яркие цитаты</h3><ul class="quotes">${D.quotes_html.map(q => `<li>${q}</li>`).join('')}</ul></div>` : ''}
    </div>
    <p class="note" style="margin-top:16px">Полный конспект: <a href="/summaries/ep${esc(D.key)}.md">summaries/ep${esc(D.key)}.md</a></p>
  </section>
  ${D.pod_html || ''}

  <nav class="ep-foot-nav">${D.prev ? `<a class="btn" href="${epUrl(D.prev.key)}">← #${esc(D.prev.label)} ${esc(D.prev.title)}</a>` : '<span></span>'}${D.next ? `<a class="btn" href="${epUrl(D.next.key)}">#${esc(D.next.label)} ${esc(D.next.title)} →</a>` : ''}</nav>
  ${D.comments ? '<section class="ep-sec comments" id="comments"><h2>Обсуждение</h2></section>' : ''}
  <footer>${D.footer}</footer>`;

  /* сноски из подкастов: номер раскрывает скрытый текст записи */
  document.addEventListener('click', e => {
    const b = e.target.closest('button.fn'); if (!b) return;
    const t = b.nextElementSibling; if (!t || !t.classList.contains('fnb')) return;
    t.hidden = !t.hidden; b.setAttribute('aria-expanded', String(!t.hidden));
  });
  /* фильтр записей подкастов по типу */
  document.querySelectorAll('.ptfilter').forEach(f => f.addEventListener('click', e => {
    const b = e.target.closest('.ptf'); if (!b) return;
    f.querySelectorAll('.ptf').forEach(x => x.classList.toggle('on', x === b));
    f.parentElement.querySelectorAll('.pnote').forEach(n => n.hidden = !!b.dataset.t && n.dataset.type !== b.dataset.t);
  }));

  /* comments.app встаёт на место своего скрипта; из innerHTML скрипты не запускаются, поэтому добавляем отдельно */
  if (D.comments) {
    const s = document.createElement('script');
    s.async = true; s.src = 'https://comments.app/js/widget.js?3';
    for (const [k, v] of Object.entries(D.comments)) s.setAttribute(k, v);
    $('#comments').appendChild(s);
  }

  function person(p) {
    const pic = p.url ? `<a href="${esc(p.url)}" tabindex="-1">${img(p.img, 'portrait', p.name)}</a>` : img(p.img, 'portrait', p.name);
    return `<article class="person${isDead(p.fate) ? ' dead' : ''}">
      ${pic}
      <div><h3>${link(p.url, p.name)}</h3>
        <div class="sub">${[p.actor ? link(p.actor_url, p.actor) : '', esc(p.race || p.role)].filter(Boolean).join(' · ')}</div>
        ${p.fate ? `<div class="${isDead(p.fate) ? 'fate d' : 'fate'}" style="margin-top:3px">${esc(p.fate)}</div>` : ''}
        ${rollsOf(p.url) ? `<div class="roll-n" title="Бросков на экране в этом выпуске">🎲 ${rollsOf(p.url)} ${plural(rollsOf(p.url), 'бросок', 'броска', 'бросков')}</div>` : ''}
        ${p.fn_html ? `<div class="fnrow">${p.fn_html}</div>` : ''}
        ${p.other.length ? `<div class="other"><span class="lbl">Ещё в:</span>${p.other.map(o => epLink(o.key, o.label, o.title)).join('')}</div>` : ''}
      </div></article>`;
  }

  /* таймлайн: шкала ↔ прокрутка списка (или ↔ встроенный плеер в режиме просмотра) */
  const all = [...document.querySelectorAll('#scenes .scene')];
  let rows = all;
  const range = $('#range'), head = $('#head'), fill = $('#fill'), now = $('#now'), what = $('#what'), watch = $('#watch');
  let cur = -1, scrubbing = false, player = null, watching = false, follow = 0;
  function setHead(sec, idx) {
    head.style.left = pct(sec); fill.style.width = pct(sec); range.value = Math.round(sec);
    now.textContent = fmt(sec); watch.href = yt(sec);
    if (idx !== cur || !rows[cur] || !rows[cur].classList.contains('on')) {
      all.forEach(r => r.classList.remove('on'));
      cur = idx; if (rows[cur]) { rows[cur].classList.add('on'); const b = rows[cur].querySelector('.body').cloneNode(true); b.querySelectorAll('.share').forEach(x => x.remove()); what.textContent = b.textContent.trim(); }
      return true;
    }
    return false;
  }
  function idxAt(sec) { let k = 0; rows.forEach((r, i) => { const s = r.dataset.sec; if (s !== '' && +s <= sec) k = i; }); return k; }
  range.addEventListener('input', () => {
    const sec = +range.value, i = idxAt(sec);
    if (watching) { player.seekTo(sec, true); setHead(sec, i); follow = 0; rows[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    scrubbing = true; setHead(sec, i); rows[i].scrollIntoView({ block: 'start' });
    clearTimeout(range._t); range._t = setTimeout(() => { scrubbing = false; }, 250);
  });
  function onScroll() {
    if (scrubbing || watching || !rows.length) return;
    const line = $('#scrub').getBoundingClientRect().bottom + 24;
    let i = 0; for (let k = 0; k < rows.length; k++) { if (rows[k].getBoundingClientRect().top <= line) i = k; else break; }
    const s = rows[i].dataset.sec; setHead(s !== '' ? +s : 0, i);
  }
  let raf = 0; window.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll); }, { passive: true });
  if (rows.length) setHead(rows[0].dataset.sec !== '' ? +rows[0].dataset.sec : 0, 0);

  /* фильтр списка: монеты и броски можно скрыть (выбор запоминается) */
  const FKEY = 'pchk-tl-hide';
  let hidden = new Set(); try { hidden = new Set(JSON.parse(localStorage.getItem(FKEY) || '[]')); } catch (e) {}
  function applyFilter() {
    document.querySelectorAll('.tl-filter button').forEach(b => b.setAttribute('aria-pressed', String(!hidden.has(b.dataset.f))));
    all.forEach(r => r.classList.toggle('hide', [...hidden].some(f => r.classList.contains(f))));
    rows = all.filter(r => !r.classList.contains('hide'));
    cur = -1; watching ? tick(true) : onScroll();
  }
  document.querySelectorAll('.tl-filter button').forEach(b => b.addEventListener('click', () => {
    hidden.has(b.dataset.f) ? hidden.delete(b.dataset.f) : hidden.add(b.dataset.f);
    try { localStorage.setItem(FKEY, JSON.stringify([...hidden])); } catch (e) {}
    applyFilter();
  }));
  if (hidden.size) applyFilter();

  /* просмотр выпуска на странице (широкие экраны): плеер YouTube справа, шкала прилипает к низу и идёт за видео */
  const wide = matchMedia('(min-width: 1100px)');
  const wbtn = $('#watch-here'), hbtn = $('#watch-here-top');
  const showBtns = () => [wbtn, hbtn].forEach(b => b && (b.hidden = !wide.matches));
  showBtns(); wide.addEventListener('change', () => { showBtns(); if (!wide.matches && watching) stopWatch(); });
  function loadApi() {
    if (window.YT && YT.Player) return Promise.resolve();
    return new Promise(res => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
    });
  }
  function tick(force) {
    if (!player || !player.getCurrentTime) return;
    const sec = player.getCurrentTime() || 0, i = idxAt(sec);
    if ((setHead(sec, i) || force) && Date.now() > follow && rows[i]) rows[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  let timer = 0, dockObs = null;
  async function startWatch(at) {
    if (!wide.matches) return false;
    const start = at ?? +range.value ?? 0;
    if (!watching) {
      watching = true; document.body.classList.add('watching');
      const box = document.createElement('div'); box.className = 'ep-player'; box.id = 'ep-player';
      box.innerHTML = '<div class="ep-player-bar"><span>Выпуск #' + esc(D.label) + '</span><button type="button" class="ep-player-x" aria-label="Закрыть плеер">×</button></div><div class="ep-player-frame"><div id="yt-frame"></div></div>';
      document.body.appendChild(box);
      box.querySelector('.ep-player-x').addEventListener('click', stopWatch);
      await loadApi();
      await new Promise(res => {
        player = new YT.Player('yt-frame', { videoId: D.video_id, playerVars: { start: Math.floor(start), autoplay: 1, rel: 0, playsinline: 1 },
          events: { onReady: () => { player.playVideo(); res(); } } });
      });
      timer = setInterval(tick, 250);
      dockObs = new ResizeObserver(() => document.body.style.setProperty('--dock-h', $('#scrub').offsetHeight + 'px'));
      dockObs.observe($('#scrub'));
      [wbtn, hbtn].forEach(b => b && (b.textContent = '■ Закрыть плеер'));
    } else if (player && player.seekTo) { player.seekTo(start, true); player.playVideo(); }
    follow = 0; tick(true);
    return true;
  }
  function stopWatch() {
    clearInterval(timer); timer = 0; if (dockObs) { dockObs.disconnect(); dockObs = null; }
    try { player && player.destroy(); } catch (e) {}
    player = null; watching = false; document.body.classList.remove('watching');
    const box = $('#ep-player'); if (box) box.remove();
    [wbtn, hbtn].forEach(b => b && (b.textContent = b.dataset.label));
    onScroll();
  }
  [wbtn, hbtn].forEach(b => b && b.addEventListener('click', () => watching ? stopWatch() : startWatch(b === hbtn ? (+range.value || 0) : undefined).then(() => { if (b === hbtn) $('#timeline').scrollIntoView({ block: 'start' }); })));
  /* пользователь сам листает список — не дёргаем прокрутку 6 секунд */
  ['wheel', 'touchmove', 'keydown'].forEach(ev => window.addEventListener(ev, e => {
    if (watching && !(e.type === 'keydown' && !/^(Arrow|Page|Home|End| )/.test(e.key))) follow = Date.now() + 6000;
  }, { passive: true }));
  /* в режиме просмотра тайм-коды перематывают встроенный плеер, а не открывают YouTube */
  document.addEventListener('click', e => {
    if (!watching) return;
    const a = e.target.closest('#scenes .t a, #watch'); if (!a) return;
    const li = a.closest('.scene'); const sec = li ? +li.dataset.sec : +range.value;
    e.preventDefault(); player.seekTo(sec, true); player.playVideo(); follow = 0; tick(true);
  });

  /* ссылки «скопировать» */
  document.querySelectorAll('[data-copy]').forEach(bt => bt.addEventListener('click', ev => {
    ev.preventDefault(); ev.stopPropagation();
    const url = location.origin + bt.dataset.copy, old = bt.textContent;
    const done = () => { bt.textContent = bt.classList.contains('share') ? '✓' : 'Ссылка скопирована'; setTimeout(() => bt.textContent = old, 1500); };
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(done, () => prompt('Ссылка:', url));
  }));

  /* переход к моменту: /ep/NN/#t=0:12:30 или #t=750 */
  function jump() {
    const m = decodeURIComponent(location.hash).match(/^#t=(?:(\d+):)?(\d+)(?::(\d+))?$/);
    if (!m) return;
    const sec = m[3] != null ? (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] : m[1] != null ? +m[1] * 60 + +m[2] : +m[2];
    if (watching) { player.seekTo(sec, true); follow = 0; tick(true); return; }
    const i = idxAt(sec); scrubbing = true; setHead(rows[i].dataset.sec !== '' ? +rows[i].dataset.sec : sec, i);
    rows[i].scrollIntoView({ block: 'start' }); rows[i].classList.add('on');
    setTimeout(() => { scrubbing = false; }, 400);
  }
  window.addEventListener('hashchange', jump);
  if (location.hash) setTimeout(jump, 50);
})();
