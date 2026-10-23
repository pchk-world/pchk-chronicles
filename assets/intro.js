/* Стартовое окно: что это за проект. Показывается один раз (localStorage), снова — по ссылке [data-intro] в подвале. */
(() => {
  const KEY = 'pchk-intro-seen';
  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return true; } };
  const remember = () => { try { localStorage.setItem(KEY, '1'); } catch (e) {} };
  let dlg = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'intro';
    dlg.setAttribute('aria-labelledby', 'intro-h');
    dlg.innerHTML = `
      <button class="intro-x" type="button" aria-label="Закрыть">×</button>
      <figure class="intro-pic">
        <img src="/img/intro-dobromraz.webp" width="214" height="312" alt="Добромраз, жулик-контрабандист">
        <figcaption>*Читать голосом Руслана «Кубик в Кубе». Добромраз ручается за каждое слово. Почти за каждое.</figcaption>
      </figure>
      <div class="intro-text">
        <span class="eyebrow">Дорогой друг, внемли зову приключений</span>
        <h2 id="intro-h">Привет, путник!<sup>*</sup></h2>
        <p>Я вижу твои ноги в пыли, а глаза покраснели от многочасовых выпусков. Значит, ты проделал долгий путь в поисках таинственного и неизведанного.
          Перед тобой «Хроники Понии» — <b>фанатская летопись</b> «Подземелий Чикен Карри».</p>
        <p>Летопись собрана <b>по канону</b> — по самим выпускам, подкастам «Ответы на вопросы» и «Хроникам Леониса Парфия» — и превращает их в <b>интерактивную карту мира</b>:
          хронология, сюжетные ветви, карты Понии, судьбы героев, монеты и броски, связи между выпусками.</p>
        <p>Подробные тексты, расшифровки и разборы выпусков живут на <a href="https://podzem.cc/" target="_blank" rel="noopener">podzem.cc</a>:
          загляни туда, если хочешь знать всё до последнего броска кубика.</p>
        <p class="note">Проект сделан зрителями и не связан с авторами шоу.</p>
        <div class="intro-btns">
          <button class="ytb intro-go" type="button">Добро пожаловать в игру</button>
          <a class="btn" href="https://podzem.cc/" target="_blank" rel="noopener">Открыть podzem.cc ↗</a>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    const close = () => { remember(); dlg.close(); };
    dlg.querySelector('.intro-x').addEventListener('click', close);
    dlg.querySelector('.intro-go').addEventListener('click', close);
    dlg.addEventListener('cancel', remember);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });  // щелчок по подложке
  }
  function open() {
    if (!dlg) build();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('.intro-go').focus();
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-intro]'); if (!a) return;
    e.preventDefault(); open();
  });
  window.pchkIntro = open;
  if (!seen() && !navigator.webdriver) open();
})();
