// Правки читателей: меню «Предложить исправление» по правой кнопке (на телефоне — долгое нажатие) на картинках и подсказка при
// выделении текста; окно правки; отправка на воркер (data-api) с проверкой Cloudflare Turnstile (data-sitekey).
// Чистые функции — viz/edits_core.js (window.PchkEdits). Вид — по макетам docs/superpowers/specs/2026-10-26-reader-edits/.
(function () {
  const E = window.PchkEdits;
  const me = document.currentScript;
  const API = me && me.dataset.api, SITEKEY = me && me.dataset.sitekey;
  if (!E || !API) return;
  const SKIP = 'nav, header.site-nav, .site-nav, .lightbox, #ep-player, .ed-menu, .ed-tip, .ed-dlg, .ed-toast, a.brand, button, input, textarea';
  let menu = null, tip = null, dlg = null, ts = { ready: null, id: null };

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const contentImg = t => t && t.tagName === 'IMG' && t.closest('main') && !t.closest(SKIP);
  const sectionOf = node => {
    const s = node && (node.nodeType === 1 ? node : node.parentElement).closest('section[id], [id].ep-sec');
    const h = s && s.querySelector('h1, h2, h3');
    return s ? { id: s.id, title: h ? h.firstChild && h.firstChild.textContent.trim() || h.textContent.trim() : '' } : null;
  };
  const pageTitle = () => (document.querySelector('main h1') || {}).textContent || document.title.replace(/ · Хроники Понии$/, '');

  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function closeTip() { if (tip) { tip.remove(); tip = null; } }

  // ---------- меню картинки ----------
  function openMenu(img, x, y) {
    closeMenu(); closeTip();
    menu = el('div', 'ed-menu');
    const it = el('div', 'ed-item', '✎ Предложить исправление');
    it.tabIndex = 0;
    it.addEventListener('click', () => { closeMenu(); openImageDialog(img); });
    it.addEventListener('keydown', e => { if (e.key === 'Enter') it.click(); });
    menu.appendChild(it);
    document.body.appendChild(menu);
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.min(x, scrollX + innerWidth - w - 8) + 'px';
    menu.style.top = Math.min(y, scrollY + innerHeight - h - 8) + 'px';
    it.focus();
  }
  document.addEventListener('contextmenu', e => {
    if (!contentImg(e.target)) return;
    e.preventDefault();
    openMenu(e.target, e.pageX, e.pageY);
  });
  let press = null;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (e.touches.length !== 1 || !contentImg(e.target)) return;
    press = { img: e.target, x: t.pageX, y: t.pageY, timer: setTimeout(() => { openMenu(press.img, press.x, press.y); press = null; }, 550) };
  }, { passive: true });
  const cancelPress = e => {
    if (!press) return;
    const t = e.touches && e.touches[0];
    if (!t || Math.hypot(t.pageX - press.x, t.pageY - press.y) > 10) { clearTimeout(press.timer); press = null; }
  };
  document.addEventListener('touchmove', cancelPress, { passive: true });
  document.addEventListener('touchend', () => { if (press) { clearTimeout(press.timer); press = null; } });
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeTip(); if (dlg) closeDialog(); } });
  addEventListener('scroll', closeMenu, { passive: true });

  // ---------- подсказка при выделении ----------
  function selectionInfo() {
    const s = getSelection();
    if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
    const r = s.getRangeAt(0);
    const text = s.toString().replace(/\s+/g, ' ').trim();
    const anc = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    if (text.length < 2 || text.length > E.MAX || !anc.closest('main') || anc.closest(SKIP)) return null;
    // контекст — текст ближайшего блока вокруг выделения
    const block = anc.closest('p, li, blockquote, td, dd, figcaption, h1, h2, h3, .ev, section') || anc;
    const norm = t => t.replace(/\s+/g, ' ');
    const full = norm(block.textContent);
    // смещение — по тексту от начала блока до начала выделения (то же вхождение, а не первое такое же слово)
    const pre = document.createRange(); pre.setStart(block, 0); pre.setEnd(r.startContainer, r.startOffset);
    let at = norm(pre.toString()).length;
    if (full.slice(at, at + text.length) !== text) { const t2 = full.indexOf(text, Math.max(0, at - 5)); at = t2 >= 0 ? t2 : full.indexOf(text); }
    const sel = at >= 0 ? E.contextAround(full, at, at + text.length) : { before: '', sel: text, after: '' };
    return { range: r, sel, section: sectionOf(anc) };
  }
  document.addEventListener('mouseup', e => {
    if (dlg || (tip && tip.contains(e.target))) return;
    setTimeout(() => {
      closeTip();
      const info = selectionInfo();
      if (info) showTip(info, false);
    }, 10);
  });
  function showTip(info, below) {
    const b = info.range.getBoundingClientRect();
    tip = el('button', 'ed-tip' + (below ? ' below' : ''), '✎ Предложить исправление');
    tip.type = 'button';
    tip.addEventListener('mousedown', ev => ev.preventDefault());    // не снимать выделение
    tip.addEventListener('click', () => { closeTip(); openTextDialog(info); });
    document.body.appendChild(tip);
    tip.style.left = Math.min(Math.max(8, b.left + scrollX + b.width / 2 - tip.offsetWidth / 2), scrollX + innerWidth - tip.offsetWidth - 8) + 'px';
    tip.style.top = (below ? b.bottom + scrollY + 14 : Math.max(8, b.top + scrollY - tip.offsetHeight - 10)) + 'px';
  }
  // телефон: выделение долгим нажатием не даёт событий мыши — подсказка по selectionchange (с паузой), под выделением,
  // чтобы её не закрыло системное меню выделения
  let touchy = false, selTimer = null;
  document.addEventListener('touchstart', () => { touchy = true; }, { passive: true, capture: true });
  document.addEventListener('selectionchange', () => {
    if (tip && !selectionInfo()) closeTip();
    if (!touchy || dlg) return;
    clearTimeout(selTimer);
    selTimer = setTimeout(() => {
      const info = selectionInfo();
      if (!info) return;
      closeTip(); showTip(info, true);
    }, 600);
  });

  // ---------- Turnstile ----------
  function loadTurnstile() {
    if (ts.ready) return ts.ready;
    ts.ready = new Promise((ok, bad) => {
      if (window.turnstile) return ok(window.turnstile);
      const s = el('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
      s.onload = () => { if (window.turnstile) ok(window.turnstile); else { ts.ready = null; bad(new Error('turnstile')); } };
      s.onerror = () => { ts.ready = null; bad(new Error('turnstile')); };
      document.head.appendChild(s);
    });
    return ts.ready;
  }
  function getToken(box) {
    return loadTurnstile().then(t => new Promise((ok, bad) => {
      const fail = () => { clearTimeout(timer); bad(new Error('turnstile')); };
      const timer = setTimeout(fail, 60000);                     // проверка не ответила за минуту
      if (ts.id !== null) { try { t.remove(ts.id); } catch (_) {} }
      ts.id = t.render(box, { sitekey: SITEKEY, appearance: 'interaction-only',
                              callback: tok => { clearTimeout(timer); ok(tok); },
                              'error-callback': fail, 'timeout-callback': fail, 'expired-callback': fail, 'unsupported-callback': fail });
    }));
  }

  // ---------- окно ----------
  function closeDialog() { if (dlg) { dlg.shade.remove(); dlg.box.remove(); dlg = null; } }
  function dialog(sub, bodyHtml, collect) {
    closeDialog();
    const shade = el('div', 'ed-shade'), box = el('div', 'ed-dlg');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Предложить исправление');
    box.innerHTML = `<h3>Предложить исправление</h3><div class="ed-sub">${esc(sub)}</div>${bodyHtml}
      <div class="ed-ts"></div><div class="ed-err" role="alert"></div>
      <div class="ed-foot"><div class="ed-note">Защищено Cloudflare Turnstile</div>
      <div class="ed-row"><button type="button" class="ed-btn ed-cancel">Отмена</button><button type="button" class="ed-btn ed-pri ed-send">Отправить</button></div></div>`;
    shade.addEventListener('click', closeDialog);
    box.querySelector('.ed-cancel').addEventListener('click', closeDialog);
    const send = box.querySelector('.ed-send'), err = box.querySelector('.ed-err');
    send.addEventListener('click', () => {
      const payload = E.buildPayload(collect(box));
      const problem = E.validate(payload);
      if (problem) { err.textContent = problem; return; }
      err.textContent = ''; send.disabled = true; send.textContent = 'Отправляю…';
      getToken(box.querySelector('.ed-ts'))
        .then(token => fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload, token }) }))
        .then(r => r.json().catch(() => ({})).then(j => { if (!r.ok || !j.issue) throw new Error(j.error || 'Не получилось отправить, попробуйте ещё раз'); return j; }))
        .then(j => { closeDialog(); toast(j.issue, j.url); })
        .catch(e => { err.textContent = e.message === 'turnstile' ? 'Проверка Turnstile не прошла — попробуйте ещё раз'
                                      : e instanceof TypeError ? 'Нет связи — попробуйте ещё раз' : (e.message || 'Нет связи — попробуйте ещё раз'); })
        .finally(() => { if (send.isConnected) { send.disabled = false; send.textContent = 'Отправить'; } });
    });
    document.body.append(shade, box);
    dlg = { shade, box };
    loadTurnstile().catch(() => {});
    const first = box.querySelector('textarea, input, button'); if (first) first.focus();
    return box;
  }
  function seg(name, items) {
    return `<div class="ed-seg" data-name="${name}">${items.map(([v, t], i) => `<button type="button" data-v="${v}"${i ? '' : ' class="on"'}>${t}</button>`).join('')}</div>`;
  }
  function wireSeg(box, onChange) {
    box.querySelectorAll('.ed-seg, .ed-opts').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      g.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b));
      if (onChange) onChange(b.dataset.v);
    }));
  }
  const pick = (box, name) => (box.querySelector(`[data-name="${name}"] .on`) || {}).dataset?.v;
  const val = (box, name) => (box.querySelector(`[name="${name}"]`) || {}).value || '';

  function openTextDialog(info) {
    const s = info.sel;
    const box = dialog(`${pageTitle()}${info.section && info.section.title ? ' → ' + info.section.title : ''}`,
      `${seg('op', [['fix', 'Исправление'], ['add', 'Дополнение'], ['delete', 'Удаление']])}
       <label>Было</label><div class="ed-was">…${esc(s.before.slice(-80))} <del>${esc(s.sel)}</del> ${esc(s.after.slice(0, 80))}…</div>
       <label class="ed-fixl">Должно быть</label><textarea name="fix" maxlength="${E.MAX}">${esc(s.sel)}</textarea>
       <label>Источник (необязательно)</label><input type="text" name="source" maxlength="${E.MAX}" placeholder="ссылка на выпуск с таймкодом, подкаст, пост группы">`,
      b => ({ kind: 'text', op: pick(b, 'op'), page: location.pathname, title: pageTitle().trim(), section: info.section, sel: s,
              fix: pick(b, 'op') === 'delete' ? '' : val(b, 'fix'), source: val(b, 'source') }));
    wireSeg(box, v => {
      const show = v !== 'delete';
      box.querySelector('.ed-fixl').hidden = !show; box.querySelector('[name="fix"]').hidden = !show;
      box.querySelector('.ed-fixl').textContent = v === 'add' ? 'Что добавить' : 'Должно быть';
    });
  }

  function openImageDialog(img) {
    const fig = img.closest('figure');
    const cap = (fig && fig.querySelector('figcaption') || {}).textContent || img.alt || '';
    const u = new URL(img.getAttribute('src'), location.href);
    const src = u.origin === location.origin ? u.pathname : u.href;          // превью YouTube и др. — полным адресом
    const opts = [['remove', 'Удалить', 'не тот персонаж, мусор, повтор'], ['main', 'Сделать основной', 'показывать на всех страницах'],
                  ['replace', 'Заменить', 'ссылка на картинку или выпуск с таймкодом']];
    const box = dialog(`${pageTitle()}${cap ? ' · ' + cap.trim() : ''}`,
      `<div class="ed-row ed-top"><img class="ed-thumb" src="${esc(img.currentSrc || img.src)}" alt="">
       <div class="ed-opts" data-name="op">${opts.map(([v, t, s], i) => `<button type="button" class="ed-opt${i ? '' : ' on'}" data-v="${v}"><span class="ed-dot"></span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div></div>
       <label class="ed-repl" hidden>На что заменить</label><input class="ed-repl" type="text" name="replace" maxlength="${E.MAX}" placeholder="ссылка на картинку или «выпуск #54, 1:23:45»" hidden>
       <label>Почему (необязательно)</label><textarea name="why" maxlength="${E.MAX}"></textarea>
       <label>Источник (необязательно)</label><input type="text" name="source" maxlength="${E.MAX}" placeholder="ссылка на выпуск с таймкодом">`,
      b => ({ kind: 'image', op: pick(b, 'op'), page: location.pathname, title: pageTitle().trim(), section: sectionOf(img),
              image: { src, caption: cap.trim() }, replace: pick(b, 'op') === 'replace' ? val(b, 'replace') : '',
              why: val(b, 'why'), source: val(b, 'source') }));
    wireSeg(box, v => box.querySelectorAll('.ed-repl').forEach(x => { x.hidden = v !== 'replace'; }));
  }

  function toast(n, url) {
    const t = el('div', 'ed-toast');
    t.setAttribute('role', 'status');
    t.innerHTML = `<b>Спасибо!</b> Правка отправлена на проверку: <a href="${esc(url)}" target="_blank" rel="noopener">issue #${esc(n)}</a>. Если её примут, на странице появится отметка.`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 12000);
    t.addEventListener('click', e => { if (e.target.tagName !== 'A') t.remove(); });
  }
})();
