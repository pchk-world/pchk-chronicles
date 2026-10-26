// Правки читателей — чистые функции окна правки (без DOM): контекст выделения, данные правки, проверка перед отправкой.
// В браузере — window.PchkEdits (подключается перед viz/edits.js), в node — module.exports (тесты viz/tests/).
(function () {
  const MAX = 2000;

  function contextAround(fullText, start, end, n = 200) {
    return { before: fullText.slice(Math.max(0, start - n), start), sel: fullText.slice(start, end), after: fullText.slice(end, end + n) };
  }

  // Строки обрезаются до MAX знаков, пустые поля и пустые вложенные объекты выбрасываются.
  function clean(v) {
    if (typeof v === "string") { const t = v.trim(); return t ? t.slice(0, MAX) : undefined; }
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, x] of Object.entries(v)) { const c = clean(x); if (c !== undefined) o[k] = c; }
      return Object.keys(o).length ? o : undefined;
    }
    return v === null ? undefined : v;
  }

  function buildPayload(f) {
    return { v: 1, ...clean(f) };
  }

  function validate(p) {
    if (!p || p.v !== 1 || !p.kind || !p.op || !p.page) return "Не получилось собрать правку — обновите страницу";
    if (p.kind === "text") {
      if (!p.sel || !p.sel.sel) return "Выделите текст, который нужно исправить";
      if ((p.op === "fix" || p.op === "add") && !p.fix) return "Напишите, как должно быть";
    }
    if (p.kind === "image") {
      if (!p.image || !p.image.src) return "Не получилось определить картинку";
      if (p.op === "replace" && !p.replace) return "Укажите ссылку на картинку или выпуск с таймкодом";
    }
    return null;
  }

  const api = { contextAround, buildPayload, validate, MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else window.PchkEdits = api;
})();
