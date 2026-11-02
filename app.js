(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ── storage (memory fallback when the browser blocks it) ── */
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return k in mem ? mem[k] : null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  };

  /* ── language ── */
  const plural = (n, a, b, c) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c; };
  const UI = {
    ru: {
      lib: "Стратегии", search: "Режим, карта или башня", all: "Все",
      empty: "Ничего не найдено. Измените запрос или сбросьте фильтры.", clear: "Сбросить",
      mods: "Модификаторы", notes: "Заметки", steps: "Шаги", reset: "Сбросить", sure: "Точно сбросить?",
      build: "Расстановка", towers: (n) => `${n} ${plural(n, "башня", "башни", "башен")}`,
      next: "Далее", notStarted: "Не начато", inProgress: "В процессе", finished: "Пройдено",
      allDone: "Всё выполнено", nextStep: (n) => `Дальше: шаг ${n}`, onlyWave: "Осталось условие по волне",
      wavesAria: "Шкала волн", theme: "Сменить тему",
      stepOf: (n, t) => `Шаг ${n} / ${t}`, byWave: "По волне", done: "Готово", back: "Назад",
      complete: "Все шаги выполнены", hint: "Пробел: готово, ←: назад", dock: "Панель шагов",
      map: "Карта", place: "Расставить башни", close: "Закрыть",
      mapEmpty: "Карты пока нет. Загрузи скриншот карты и расставь на ней башни.", upload: "Загрузить скриншот",
      undo: "Убрать последнюю", clearAll: "Очистить", copy: "Скопировать JSON", resetMap: "Вернуть как в файле",
      editHint: "Выбери башню и нажми на карту. Метки можно перетаскивать, двойной клик удаляет.",
      jsonHint: "Вставь это в поле markers в strats.js."
    },
    en: {
      lib: "Strategies", search: "Mode, map or tower", all: "All",
      empty: "Nothing found. Change the query or reset the filters.", clear: "Reset",
      mods: "Modifiers", notes: "Notes", steps: "Steps", reset: "Reset", sure: "Really reset?",
      build: "Build", towers: (n) => `${n} tower${n === 1 ? "" : "s"}`,
      next: "Next", notStarted: "Not started", inProgress: "In progress", finished: "Finished",
      allDone: "All done", nextStep: (n) => `Next: step ${n}`, onlyWave: "A wave-based step is left",
      wavesAria: "Wave timeline", theme: "Switch theme",
      stepOf: (n, t) => `Step ${n} / ${t}`, byWave: "By wave", done: "Done", back: "Back",
      complete: "All steps done", hint: "Space: done, ←: back", dock: "Step bar",
      map: "Map", place: "Place towers", close: "Close",
      mapEmpty: "No map yet. Upload a screenshot of the map and place the towers on it.", upload: "Upload screenshot",
      undo: "Remove last", clearAll: "Clear all", copy: "Copy JSON", resetMap: "Restore from file",
      editHint: "Pick a tower, then click the map. Drag markers to move them, double-click to delete.",
      jsonHint: "Paste this into markers in strats.js."
    }
  };
  let lang = store.get("tds-strats:lang");
  if (lang !== "ru" && lang !== "en") lang = /^(ru|uk|be)/i.test(navigator.language || "") ? "ru" : "en";
  const t = (k, ...a) => { const v = UI[lang][k]; return typeof v === "function" ? v(...a) : v; };
  const L = (o) => (typeof o === "string" ? o : (o && (o[lang] || o.en)) || "");

  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i]").forEach((el) => (el.textContent = t(el.dataset.i)));
    $$("[data-i-ph]").forEach((el) => (el.placeholder = t(el.dataset.iPh)));
    $$("[data-i-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.iAria)));
    $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $("#reset").textContent = t("reset");
  }

  /* ── towers ── */
  const TOWERS = {
    engineer:   { code: "ENG", v: "eng" },
    enforcer:   { code: "ENF", v: "enf" },
    hacker:     { code: "HCK", v: "hck" },
    dj:         { code: "DJ",  v: "dj" },
    juggernaut: { code: "JUG", v: "jug" }
  };
  const tkey = (name) => String(name).toLowerCase().replace(/(?:'s|s)$/, "").replace(/\s+/g, "");
  const towerCode = (n) => (TOWERS[tkey(n)] || { code: String(n).slice(0, 3).toUpperCase() }).code;
  const tcss = (n) => (TOWERS[tkey(n)] ? `var(--t-${TOWERS[tkey(n)].v})` : "var(--mute)");
  const tile = (n) => `<span class="mono-tile" style="--c:${tcss(n)}" title="${esc(n)}">${esc(towerCode(n))}</span>`;

  /* ── text with towers, levels, waves and tracks picked out ── */
  const W = "[\\p{L}\\p{N}_]";
  const RICH = new RegExp(
    `(?<!${W})(?:` +
      `(?<tw>Engineer|Enforcer|Hacker|Juggernaut|DJ)(?:'s|s)?` +
      `|(?<lv>(?:lvl|лвл) \\d+)` +
      `|(?<wv>(?:waves?|волн[аеуы]) \\d+(?:[–-]\\d+)?)` +
      `|(?<tr>(?:red|purple|красн\\p{L}*|фиолетов\\p{L}*) (?:track|трек\\p{L}*))` +
      `|(?<mx>max|макс\\p{L}*)` +
    `)(?!${W})`, "giu");
  function rich(text) {
    let out = "", last = 0, m;
    RICH.lastIndex = 0;
    while ((m = RICH.exec(text))) {
      out += esc(text.slice(last, m.index));
      const g = m.groups, s = m[0];
      if (g.tw) out += `<span class="tw tw-${tkey(g.tw)}">${esc(s)}</span>`;
      else if (g.lv) out += `<span class="lv">${esc(s)}</span>`;
      else if (g.wv) out += `<span class="wv">${esc(s)}</span>`;
      else if (g.tr) out += `<span class="tr tr-${/^(red|красн)/i.test(s) ? "red" : "purple"}">${esc(s)}</span>`;
      else out += `<b class="mx">${esc(s)}</b>`;
      last = m.index + s.length;
    }
    return out + esc(text.slice(last));
  }

  /* ── snowflake ── */
  const ART = {
    frost: `<svg viewBox="-120 -120 240 240" aria-hidden="true">
      <defs><g id="arm"><path d="M0 0V-114M0 -36l-18 -18M0 -36l18 -18M0 -64l-26 -26M0 -64l26 -26M0 -92l-13 -13M0 -92l13 -13"/></g></defs>
      <use href="#arm"/><use href="#arm" transform="rotate(60)"/><use href="#arm" transform="rotate(120)"/>
      <use href="#arm" transform="rotate(180)"/><use href="#arm" transform="rotate(240)"/><use href="#arm" transform="rotate(300)"/>
      <path d="M0 -24L20.8 -12V12L0 24L-20.8 12V-12Z"/>
    </svg>`
  };

  /* ── steps and progress ── */
  function items(s) {
    const list = []; let n = 0;
    s.steps.forEach((st) => {
      list.push({ o: st, sub: false, n: ++n });
      (st.sub || []).forEach((x) => list.push({ o: x, sub: true }));
    });
    return list;
  }
  const mainCount = (s) => s.steps.length;
  const pkey = (s) => "tds-strats:progress:" + s.id;
  function readState(s) {
    try { const a = JSON.parse(store.get(pkey(s)) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function info(s) {
    const total = items(s).length, st = readState(s);
    let done = 0;
    for (let i = 0; i < total; i++) if (st[i]) done++;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }
  const statusOf = (p) => (p.done === 0 ? t("notStarted") : p.done === p.total ? t("finished") : t("inProgress"));
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

  /* which step places which tower (read from the English step text) */
  function plan(s) {
    const slots = {};
    s.steps.forEach((st, i) => {
      const m = /^Place (\d+) .*?\b(Engineer|Enforcer|Hacker|Juggernaut|DJ)/i.exec(st.en || "");
      if (!m) return;
      const k = tkey(m[2]);
      slots[k] = slots[k] || [];
      for (let c = 0; c < +m[1]; c++) slots[k].push(i + 1);
    });
    return slots;
  }

  /* ── markers and map image ── */
  const mkKey = (s) => "tds-strats:markers:" + s.id;
  const imgKey = (s) => "tds-strats:mapimg:" + s.id;
  function getMarkers(s) {
    const raw = store.get(mkKey(s));
    if (raw) { try { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } catch (e) {} }
    return s.markers || [];
  }
  const setMarkers = (s, a) => store.set(mkKey(s), JSON.stringify(a));

  let cur = null, mapSrc = null, mapState = "loading", nextN = 0;
  let ovEdit = false, selTower = null;
  let dockOn = store.get("tds-strats:dock") === "1";

  function loadMap(s) {
    mapSrc = null; mapState = "loading";
    const mine = store.get(imgKey(s));
    if (mine) { mapSrc = mine; mapState = "ready"; renderStages(); return; }
    if (!s.mapImage) { mapState = "none"; renderStages(); return; }
    const im = new Image();
    im.onload = () => { if (cur === s) { mapSrc = s.mapImage; mapState = "ready"; renderStages(); } };
    im.onerror = () => { if (cur === s) { mapState = "none"; renderStages(); } };
    im.src = s.mapImage;
    renderStages();
  }

  function stageHTML(s) {
    if (mapState === "loading") return `<div class="stage-empty"></div>`;
    if (mapState === "none" || !mapSrc)
      return `<div class="stage-empty"><p>${esc(t("mapEmpty"))}</p><button class="btn" type="button" data-act="upload">${esc(t("upload"))}</button></div>`;
    const slots = plan(s);
    const mk = getMarkers(s).map((m, k) => {
      const step = (slots[tkey(m.tower)] || [])[m.n - 1] || 0;
      return `<span class="mk" data-k="${k}" data-step="${step}" data-tk="${tkey(m.tower)}" style="left:${m.x}%;top:${m.y}%;--c:${tcss(m.tower)}" title="${esc(m.tower)} ${m.n}">${esc(towerCode(m.tower))} ${m.n}</span>`;
    }).join("");
    return `<img src="${esc(mapSrc)}" alt="" draggable="false">${mk}`;
  }

  function renderStages() {
    if (!cur) return;
    $("#stage").innerHTML = stageHTML(cur);
    if (!$("#ov").hidden) $("#stageBig").innerHTML = stageHTML(cur);
    $("#stage").classList.toggle("is-empty", mapState !== "ready");
    $("#stageBig").classList.toggle("editing", ovEdit && mapState === "ready");
    paint();
  }

  function paint() {
    if (!cur) return;
    const st = readState(cur), list = items(cur), idxOfN = {};
    list.forEach((it, i) => { if (!it.sub) idxOfN[it.n] = i; });
    const slots = plan(cur);
    const nextText = nextN ? (cur.steps[nextN - 1].en || "") : "";
    const placing = nextN && Object.values(slots).some((a) => a.includes(nextN)) && /^Place /i.test(nextText);
    const named = new Set([...nextText.matchAll(/\b(Engineer|Enforcer|Hacker|Juggernaut|DJ)/gi)].map((m) => tkey(m[1])));
    $$(".mk").forEach((el) => {
      const step = +el.dataset.step, i = idxOfN[step];
      el.classList.toggle("pend", i != null && !st[i]);
      el.classList.toggle("hot", placing ? step === nextN : named.has(el.dataset.tk));
    });
  }

  /* ── map overlay + editor ── */
  function openOverlay(edit) {
    ovEdit = !!edit;
    $("#ov").hidden = false;
    document.body.style.overflow = "hidden";
    pickTower();
    renderOvTools();
    renderStages();
    $("#ovClose").focus();
  }
  function closeOverlay() {
    $("#ov").hidden = true;
    document.body.style.overflow = "";
    $("#stageBig").innerHTML = "";
  }
  const placed = (tower) => getMarkers(cur).filter((m) => m.tower === tower).length;
  function pickTower() {
    const b = (cur.build || []).find((x) => placed(x.tower) < x.n);
    if (!selTower || placed(selTower) >= (cur.build.find((x) => x.tower === selTower) || { n: 0 }).n) selTower = b ? b.tower : null;
  }
  function renderOvTools() {
    const box = $("#ovTools");
    if (!ovEdit) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML =
      `<div class="tb-row">${(cur.build || []).map((b) =>
        `<button class="tbtn" type="button" data-tw="${esc(b.tower)}" aria-pressed="${selTower === b.tower}" style="--c:${tcss(b.tower)}">${esc(towerCode(b.tower))} <b>${placed(b.tower)}/${b.n}</b></button>`).join("")}</div>
       <div class="tb-row">
         <button class="btn sm" type="button" data-act="undo-mk">${esc(t("undo"))}</button>
         <button class="btn sm" type="button" data-act="clear-mk">${esc(t("clearAll"))}</button>
         <button class="btn sm" type="button" data-act="upload">${esc(t("upload"))}</button>
         <button class="btn sm" type="button" data-act="reset-mk">${esc(t("resetMap"))}</button>
         <button class="btn sm" type="button" data-act="copy-mk">${esc(t("copy"))}</button>
       </div>
       <p class="hintline">${esc(t("editHint"))}</p>
       <div class="json" id="jsonBox" hidden><p>${esc(t("jsonHint"))}</p><textarea id="jsonOut" readonly rows="4"></textarea></div>`;
  }

  $("#ovTools").addEventListener("click", (e) => {
    const tw = e.target.closest("[data-tw]");
    if (tw) { selTower = tw.dataset.tw; renderOvTools(); return; }
    const a = e.target.closest("[data-act]");
    if (!a || !cur) return;
    const act = a.dataset.act;
    if (act === "upload") $("#mapFile").click();
    if (act === "undo-mk") { const ms = getMarkers(cur).slice(); ms.pop(); setMarkers(cur, ms); pickTower(); renderOvTools(); renderStages(); }
    if (act === "clear-mk") { setMarkers(cur, []); pickTower(); renderOvTools(); renderStages(); }
    if (act === "reset-mk") { store.set(mkKey(cur), ""); store.set(imgKey(cur), ""); pickTower(); loadMap(cur); renderOvTools(); }
    if (act === "copy-mk") {
      const json = JSON.stringify(getMarkers(cur));
      $("#jsonBox").hidden = false;
      const ta = $("#jsonOut"); ta.value = json; ta.focus(); ta.select();
      try { navigator.clipboard.writeText(json).catch(() => {}); } catch (x) {}
    }
  });

  $("#stage").addEventListener("click", (e) => {
    if (e.target.closest('[data-act="upload"]')) { $("#mapFile").click(); return; }
    if (mapState === "ready") openOverlay(false);
  });
  $("#mapEdit").addEventListener("click", () => openOverlay(true));
  $("#ovClose").addEventListener("click", closeOverlay);
  $("#stageBig").addEventListener("click", (e) => {
    if (e.target.closest('[data-act="upload"]')) $("#mapFile").click();
  });

  $("#stageBig").addEventListener("pointerdown", (e) => {
    if (!ovEdit || mapState !== "ready" || !cur) return;
    const stage = $("#stageBig");
    const pos = (ev) => { const r = stage.getBoundingClientRect(); return [clamp(((ev.clientX - r.left) / r.width) * 100), clamp(((ev.clientY - r.top) / r.height) * 100)]; };
    const mk = e.target.closest(".mk");
    if (mk) {
      e.preventDefault();
      const k = +mk.dataset.k; let p = null;
      mk.setPointerCapture(e.pointerId);
      const move = (ev) => { p = pos(ev); mk.style.left = p[0] + "%"; mk.style.top = p[1] + "%"; };
      const up = () => {
        mk.removeEventListener("pointermove", move); mk.removeEventListener("pointerup", up);
        if (p) { const ms = getMarkers(cur).map((m) => ({ ...m })); ms[k].x = r1(p[0]); ms[k].y = r1(p[1]); setMarkers(cur, ms); renderStages(); }
      };
      mk.addEventListener("pointermove", move); mk.addEventListener("pointerup", up);
      return;
    }
    if (!e.target.closest("img") || !selTower) return;
    const b = (cur.build || []).find((x) => x.tower === selTower);
    const ms = getMarkers(cur).map((m) => ({ ...m }));
    const have = ms.filter((m) => m.tower === selTower).length;
    if (!b || have >= b.n) return;
    const [x, y] = pos(e);
    ms.push({ tower: selTower, n: have + 1, x: r1(x), y: r1(y) });
    setMarkers(cur, ms);
    pickTower(); renderOvTools(); renderStages();
  });
  $("#stageBig").addEventListener("dblclick", (e) => {
    const mk = e.target.closest(".mk");
    if (!ovEdit || !mk || !cur) return;
    const ms = getMarkers(cur).map((m) => ({ ...m }));
    const [gone] = ms.splice(+mk.dataset.k, 1);
    let c = 0; ms.forEach((m) => { if (m.tower === gone.tower) m.n = ++c; });
    setMarkers(cur, ms); pickTower(); renderOvTools(); renderStages();
  });

  $("#mapFile").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f || !cur) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const sc = Math.min(1, 1600 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      let d; try { d = c.toDataURL("image/jpeg", 0.85); } catch (x) { d = url; }
      if (d.startsWith("data:")) store.set(imgKey(cur), d);
      mapSrc = d; mapState = "ready";
      renderStages(); if (!$("#ov").hidden) renderOvTools();
    };
    im.src = url; e.target.value = "";
  });

  /* ── library ── */
  const lib = { q: "", team: "all" };
  function renderLibrary() {
    const teams = [...new Set(STRATEGIES.map((s) => s.team))];
    const box = $("#teams");
    if (teams.length > 1) {
      box.hidden = false;
      box.innerHTML = ["all", ...teams].map((x) => `<button class="team-btn" type="button" data-team="${x}" aria-pressed="${lib.team === x}">${x === "all" ? esc(t("all")) : cap(x)}</button>`).join("");
    } else { box.hidden = true; lib.team = "all"; }

    const q = lib.q.trim().toLowerCase();
    const rows = STRATEGIES.filter((s) => (lib.team === "all" || s.team === lib.team) &&
      (!q || [s.mode, s.map, s.team, ...s.loadout, ...s.modifiers].join(" ").toLowerCase().includes(q)));

    $("#rows").innerHTML = rows.map((s) => {
      const p = info(s);
      return `<li><a class="row" href="#${s.id}">
        <div><span class="r-team">${esc(cap(s.team))}</span><h2>${esc(s.mode)}</h2><p>${esc(s.map)}</p></div>
        <div class="r-towers">${s.loadout.map(tile).join("")}</div>
        <div class="r-prog"><span class="r-n">${p.done}<small>/${p.total}</small></span><span class="meter"><i style="width:${p.pct}%"></i></span><span class="r-st">${esc(statusOf(p))}</span></div>
      </a></li>`;
    }).join("");
    $("#empty").hidden = rows.length > 0;
  }

  /* ── strategy page ── */
  function buildRuler(s) {
    const n = s.waves || 40, pc = (w) => ((w - 0.5) / n) * 100;
    let top = "", marks = "", band = "";
    (s.timeline || []).forEach((x) => {
      if (x.from != null) {
        band += `<i class="r-band" style="left:${((x.from - 1) / n) * 100}%;width:${((x.to - x.from + 1) / n) * 100}%"></i>`;
        top += `<span class="r-lab ${x.tone || "ice"}" style="left:${((x.from - 1) / n) * 100}%">${esc(L(x.label))} ${x.from}–${x.to}</span>`;
      } else {
        const end = x.at >= n - 1;
        marks += `<i class="r-mark" style="left:${pc(x.at)}%"></i>`;
        top += `<span class="r-lab ${x.tone || "warn"}" style="left:${pc(x.at)}%;${end ? "transform:translateX(-100%);padding-right:7px" : "padding-left:7px"}">${esc(L(x.label))}</span>`;
      }
    });
    let ticks = "";
    for (let w = 1; w <= n; w++) ticks += `<span class="tk${w % 5 === 0 || w === 1 ? " m5" : ""}"></span>`;
    const nums = [1, ...Array.from({ length: Math.floor(n / 10) }, (_, i) => (i + 1) * 10)];
    $("#ruler").innerHTML = `<div class="r-top">${top}</div>${marks}<div class="r-track">${band}${ticks}</div>
      <div class="r-nums">${nums.map((w) => `<span style="left:${pc(w)}%">${w}</span>`).join("")}</div>`;
  }

  const CHECK = `<span class="box"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg></span>`;

  function openStrategy(s, keepMap) {
    const fresh = cur !== s;
    cur = s;
    $("#crumb").hidden = false;
    $("#crumb").textContent = `${s.mode}, ${s.map}`;
    $("#topCount").hidden = false;
    $("#dockToggle").hidden = false;
    $("#mTeam").textContent = cap(s.team);
    $("#mMode").textContent = s.mode;
    $("#mMap").textContent = s.map;
    $("#mMods").innerHTML = s.modifiers.map((m) => `<li>${esc(m)}</li>`).join("");
    $("#art").innerHTML = ART[s.mode.toLowerCase()] || "";
    buildRuler(s);

    $("#notes").innerHTML = (s.notes || []).map((n) =>
      `<li><span class="tag ${n.tone || "mute"}">${esc(L(n.tag))}</span><span class="txt">${rich(L(n.text))}</span></li>`).join("");

    let idx = 0;
    $("#steps").innerHTML = s.steps.map((o) => {
      const mi = idx++, n = mi === 0 ? 1 : items(s)[mi].n;
      const subs = (o.sub || []).map((x) => {
        const si = idx++;
        return `<label class="item sub" data-i="${si}"><input class="sr sr-only" type="checkbox" data-i="${si}">${CHECK}<span class="txt">${rich(L(x))}</span></label>`;
      }).join("");
      return `<li><label class="item main" data-i="${mi}"><input class="sr sr-only" type="checkbox" data-i="${mi}">${CHECK}<span class="num">${n}</span><span class="txt">${rich(L(o))}</span><span class="now">${esc(t("next"))}</span></label>${subs ? `<div class="subs">${subs}</div>` : ""}</li>`;
    }).join("");

    const total = (s.build || []).reduce((a, b) => a + b.n, 0);
    $("#buildTotal").textContent = total ? t("towers", total) : "";
    $("#buildList").innerHTML = (s.build || []).map((b) =>
      `<li>${tile(b.tower)}<div><b class="tw tw-${tkey(b.tower)}">${esc(b.tower)}</b><small>${esc(L(b.final))}</small></div><span class="n">×${b.n}</span></li>`).join("");

    refresh();
    if (fresh || !keepMap) loadMap(s); else renderStages();
  }

  function nextIndex(s, st, list) {
    for (let i = 0; i < list.length; i++) if (!st[i] && !list[i].sub) return i;
    return -1;
  }

  function refresh() {
    const s = cur; if (!s) return;
    const st = readState(s), list = items(s);
    const next = nextIndex(s, st, list);
    $$("#steps .item").forEach((el) => {
      const i = +el.dataset.i, on = !!st[i];
      el.classList.toggle("done", on);
      el.classList.remove("next");
      $("input", el).checked = on;
    });
    if (next >= 0) $(`#steps .item[data-i="${next}"]`).classList.add("next");
    nextN = next >= 0 ? list[next].n : 0;

    const p = info(s);
    $("#pDone").textContent = p.done;
    $("#pTotal").textContent = "/" + p.total;
    $("#pBar").style.width = p.pct + "%";
    $("#topBar").style.width = p.pct + "%";
    $("#topCount").innerHTML = `<b>${p.done}</b> / ${p.total}`;
    $("#pStatus").textContent = p.done === p.total ? t("allDone") : p.done === 0 ? t("notStarted") : next >= 0 ? t("nextStep", list[next].n) : t("onlyWave");

    /* bottom bar */
    const dock = $("#dock"); dock.hidden = !dockOn;
    const pending = list.findIndex((it, i) => !st[i]);
    const anyDone = st.some(Boolean);
    $("#doneBtn").hidden = pending < 0;
    $("#undo").hidden = !anyDone;
    if (next >= 0) { $("#dockN").textContent = t("stepOf", list[next].n, mainCount(s)); $("#dockT").innerHTML = rich(L(list[next].o)); }
    else if (pending >= 0) { $("#dockN").textContent = t("byWave"); $("#dockT").innerHTML = rich(L(list[pending].o)); }
    else { $("#dockN").textContent = ""; $("#dockT").textContent = t("complete"); }
    paint();
  }

  function setItem(i, on) {
    const s = cur; if (!s) return;
    const st = readState(s), n = items(s).length;
    const out = Array.from({ length: n }, (_, k) => !!st[k]);
    out[i] = on;
    store.set(pkey(s), JSON.stringify(out));
    refresh();
  }
  function doneAction() {
    if (!cur) return;
    const st = readState(cur), list = items(cur);
    let i = nextIndex(cur, st, list);
    if (i < 0) i = list.findIndex((_, k) => !st[k]);
    if (i >= 0) setItem(i, true);
  }
  function undoAction() {
    if (!cur) return;
    const st = readState(cur);
    for (let i = items(cur).length - 1; i >= 0; i--) if (st[i]) { setItem(i, false); return; }
  }
  function applyDock() {
    $("#dockToggle").setAttribute("aria-pressed", String(dockOn));
    document.body.classList.toggle("has-dock", dockOn);
    $("#dock").hidden = !dockOn || !cur;
  }
  $("#dockToggle").addEventListener("click", (e) => { e.currentTarget.blur(); dockOn = !dockOn; store.set("tds-strats:dock", dockOn ? "1" : "0"); applyDock(); if (cur) refresh(); });
  $("#doneBtn").addEventListener("click", doneAction);
  $("#undo").addEventListener("click", undoAction);

  /* ── routing ── */
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const s = STRATEGIES.find((x) => x.id === id);
    $("#viewLib").hidden = !!s;
    $("#viewStrat").hidden = !s;
    closeOverlay();
    if (s) { cur = null; openStrategy(s); }
    else {
      cur = null;
      $("#crumb").hidden = true; $("#topCount").hidden = true; $("#dockToggle").hidden = true; $("#topBar").style.width = "0"; $("#dock").hidden = true;
      renderLibrary();
    }
    window.scrollTo(0, 0);
  }

  /* ── events ── */
  let ptr = false;
  $("#steps").addEventListener("pointerdown", () => { ptr = true; });
  $("#steps").addEventListener("change", (e) => {
    const el = e.target.closest("input[data-i]");
    if (!el) return;
    setItem(+el.dataset.i, el.checked);
    if (ptr) { el.blur(); ptr = false; }
  });

  let armTimer;
  $("#reset").addEventListener("click", function () {
    if (!cur) return;
    if (!this.classList.contains("armed")) {
      this.classList.add("armed"); this.textContent = t("sure");
      armTimer = setTimeout(disarm, 3000); return;
    }
    store.set(pkey(cur), "[]"); disarm(); refresh();
  });
  function disarm() { clearTimeout(armTimer); const b = $("#reset"); b.classList.remove("armed"); b.textContent = t("reset"); }

  $("#q").addEventListener("input", (e) => { lib.q = e.target.value; renderLibrary(); });
  $("#teams").addEventListener("click", (e) => { const b = e.target.closest("[data-team]"); if (b) { lib.team = b.dataset.team; renderLibrary(); } });
  $("#clear").addEventListener("click", () => { lib.q = ""; lib.team = "all"; $("#q").value = ""; renderLibrary(); });

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const a = document.activeElement;
    const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "checkbox";
    if (e.key === "Escape") {
      if (!$("#ov").hidden) { closeOverlay(); return; }
      if (a === $("#q")) a.blur();
      return;
    }
    if (typing) return;
    if (e.key === "/" && !$("#viewLib").hidden) { e.preventDefault(); $("#q").focus(); return; }
    if (!cur || !dockOn || !$("#ov").hidden) return;
    const free = !a || a === document.body;
    if (!free) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); doneAction(); }
    else if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); undoAction(); }
  });
  window.addEventListener("hashchange", route);

  /* language and theme */
  $$("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang; store.set("tds-strats:lang", lang);
    applyStatic();
    if (cur) { openStrategy(cur, true); if (!$("#ov").hidden) renderOvTools(); }
    else renderLibrary();
  }));

  const root = document.documentElement;
  const saved = store.get("tds-strats:theme");
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  $("#theme").addEventListener("click", () => {
    const explicit = root.getAttribute("data-theme");
    const sysLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches;
    const now = explicit || (sysLight ? "light" : "dark");
    const next = now === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    store.set("tds-strats:theme", next);
  });

  applyStatic();
  route();
  applyDock();
})();
