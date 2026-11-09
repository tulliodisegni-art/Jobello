/* Jobello : petits plus qui ne prennent pas de place à l'écran.
   - « Envoyer mes dossiers à la suite » : les candidatures prêtes s'enchaînent une par une.
   - « Ajouter à Jobello » : une offre envoyée par le favori depuis Safari devient une candidature.
   - Pastille sur l'icône : le nombre de choses urgentes, comme pour les messages.
   - Antisèche d'entretien : l'essentiel à relire en deux minutes avant d'y aller.
   Ce fichier se charge après la page de l'appli et notifs.js : il utilise leurs données (state) et leurs outils. */
(function () {
  const css = `
  .serie-go{display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:0 0 10px;padding:12px 14px;border-radius:14px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));background:var(--accent-soft);color:var(--fg);font:inherit;cursor:pointer}
  .serie-go .sg-ic{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink);font-size:.9rem}
  .serie-go .sg-tx{flex:1;min-width:0;display:flex;flex-direction:column}.serie-go b{font-size:.97rem}.serie-go small{color:var(--muted);font-size:.8rem}
  .serie-go .sg-ch{flex:none;color:var(--accent);font-size:1.3rem;line-height:1}
  .serie-bar{display:flex;flex-direction:column;gap:8px;margin:0 0 12px;padding:12px 14px;border-radius:14px;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line))}
  .serie-bar .sb-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.9rem}
  .serie-bar .sb-dots{display:flex;gap:4px;flex:1;max-width:180px}.serie-bar .sb-dots i{flex:1;height:5px;border-radius:9px;background:color-mix(in srgb,var(--accent) 22%,var(--surface))}
  .serie-bar .sb-dots i.on{background:var(--accent)}.serie-bar .sb-dots i.cur{background:color-mix(in srgb,var(--accent) 55%,var(--surface))}
  .serie-bar .row{gap:8px}
  .anti .anti-when{font-size:1.02rem;margin:0}.anti .lbl{display:block;margin-top:4px}
  .anti ul{margin:4px 0 0;padding-left:20px}.anti p{margin:4px 0 0}
  .anti .qa summary{font-weight:600}
  .anti-btn{margin-top:2px}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const ready = () => !!(state && state.loaded);

  /* ========== 1. Envoyer mes dossiers à la suite ========== */
  const serie = { on: false, ids: [], i: 0, done: {} };
  const aEnvoyer = () => homeTasks().filter((x) => x.k === "send").map((x) => x.c.id);
  const candOf = (id) => state.cands.find((x) => x.id === id);
  const reste = () => serie.ids.filter((id) => !serie.done[id] && candOf(id) && candOf(id).statut === "a_envoyer");

  function serieStart() {
    const ids = aEnvoyer(); if (!ids.length) return toast("Aucun dossier à envoyer");
    Object.assign(serie, { on: true, ids, i: 0, done: {} });
    openCand(ids[0]);
  }
  function serieNext() {
    let i = serie.i + 1;
    while (i < serie.ids.length && (!candOf(serie.ids[i]) || candOf(serie.ids[i]).statut !== "a_envoyer")) i++;
    if (i >= serie.ids.length) return serieEnd(true);
    serie.i = i; closeSheet(); openCand(serie.ids[i]);
  }
  function serieEnd(fini) {
    const n = Object.keys(serie.done).length;
    serie.on = false; closeSheet(); render();
    if (fini) toast(n ? `Bravo : ${n} candidature${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} aujourd'hui` : "Série terminée");
  }
  function serieBar(c) {
    const n = serie.ids.length, pos = serie.i + 1, envoye = c.statut !== "a_envoyer";
    if (envoye) serie.done[c.id] = true;
    const suivant = serie.ids.slice(serie.i + 1).map(candOf).find((x) => x && x.statut === "a_envoyer");
    const dots = serie.ids.map((id, k) => `<i class="${serie.done[id] ? "on" : k === serie.i ? "cur" : ""}"></i>`).join("");
    return `<div class="serie-bar"><div class="sb-top"><span>${envoye ? "<b>Envoyée ✓</b>" : `Dossier <b>${pos}</b> sur ${n}`}</span><span class="sb-dots" aria-hidden="true">${dots}</span></div>
      <div class="row">${envoye
        ? (suivant ? `<button type="button" class="small primary" data-serie="next">Suivant : ${esc(suivant.entreprise || suivant.poste || "dossier")} ›</button>` : `<button type="button" class="small primary" data-serie="end">C'est fini 🎉</button>`)
        : `${suivant ? `<button type="button" class="small" data-serie="next">Passer ce dossier ›</button>` : ""}`}
        <button type="button" class="small ghost" data-serie="stop">Arrêter la série</button></div></div>`;
  }
  function homeSerie() {
    const panel = $("#todo-panel"), list = $("#todo"); if (!panel || !list) return;
    let b = panel.querySelector(".serie-go");
    const n = ready() ? aEnvoyer().length : 0, r = serie.on ? reste().length : 0;
    if (n < 2 && !r) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.className = "serie-go"; b.dataset.serie = "start"; list.before(b); }
    const repr = serie.on && r;
    b.dataset.serie = repr ? "resume" : "start";
    b.innerHTML = `<span class="sg-ic">▶</span><span class="sg-tx"><b>${repr ? `Reprendre mes envois · ${Object.keys(serie.done).length} sur ${serie.ids.length}` : `Envoyer mes ${n} dossiers à la suite`}</b><small>Un par un : CV, lettre et message sont prêts à chaque fois</small></span><span class="sg-ch">›</span>`;
  }

  /* ========== 3. Pastille sur l'icône ========== */
  let lastBadge = -1;
  function majPastille() {
    if (!ready()) return;
    let n = 0; try { n = homeTasks().filter((x) => x.p <= 2).length; } catch (e) { return; }
    if (n === lastBadge) return; lastBadge = n;
    try { if (navigator.setAppBadge) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
    try { navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type: "jobello-badge", n }); } catch (e) {}
  }

  /* ========== 4. Antisèche d'entretien ========== */
  const prochainEntretien = (c) => c && c.dateEntretien && c.dateEntretien >= todayISO();
  function antisecheHTML(c) {
    const s = societeOf(c), p = c.prepa || {}, Q = c.questionsEntretien || [];
    const when = c.dateEntretien ? fmt(c.dateEntretien, { weekday: "long", day: "numeric", month: "long" }) + (c.heureEntretien ? " à " + c.heureEntretien.replace(":", " h ") : "") : "Date à fixer";
    const ul = (a) => (a || []).filter(Boolean).length ? `<ul>${a.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const bloc = (titre, corps, open = true) => corps ? `<details class="sec"${open ? " open" : ""}><summary>${titre}</summary><div class="body anti">${corps}</div></details>` : "";
    const lieu = c.lieuEntretien ? `<p>📍 <a href="https://maps.apple.com/?q=${enc(c.lieuEntretien)}" target="_blank" rel="noopener">${esc(c.lieuEntretien)}</a></p>` : "";
    const qs = Q.length ? Q.map((x) => `<details class="qa"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")
      : (p.techniques || []).concat(p.rh || []).slice(0, 6).map((x) => `<details class="qa"><summary>${esc(x.q)}</summary><p>${esc(x.r)}</p></details>`).join("");
    const vide = !p.pitch && !qs && !(p.aPoser || []).length;
    return `<div class="sheet-head"><div style="min-width:0"><span class="label">Mon antisèche</span><h2>${esc(c.entreprise || "Entretien")}${c.poste ? " · " + esc(c.poste) : ""}</h2></div><button type="button" class="ghost" data-act="close">Fermer</button></div>
      <div class="brief anti"><p class="anti-when"><b>${esc(when)}</b>${c.typeEntretien ? " · " + esc(c.typeEntretien) : ""}</p>
        ${c.avecQui ? `<p>Avec ${esc(c.avecQui)}</p>` : ""}${lieu}${c.lienVisio ? joinHTML(c, "Rejoindre la visio") : ""}</div>
      ${vide ? `<p class="muted" style="margin:0 0 10px;font-size:.9rem">Pas encore de préparation pour cet entretien : ouvre la candidature et touche « Préparer avec Claude ».</p>` : ""}
      ${bloc("Ta présentation en 1 minute", p.pitch ? `<p class="pitch">${esc(p.pitch)}</p>` : "")}
      ${bloc("La société", s ? `${s.activite ? `<p>${esc(s.activite)}</p>` : ""}${(s.produits || []).length ? `<span class="lbl">Produits</span>${ul(s.produits.slice(0, 6))}` : ""}` : "")}
      ${bloc("Le poste", `${c.resume ? `<p>${esc(c.resume)}</p>` : ""}${(c.motsCles || []).length ? `<div class="kw">${c.motsCles.map((k) => `<i>${esc(k)}</i>`).join("")}</div>` : ""}`)}
      ${bloc("Questions probables", qs)}
      ${bloc("Tes questions à poser", ul(p.aPoser))}
      ${bloc("Si on te parle salaire", p.salaire ? `<p>${esc(p.salaire)}</p>` : "", false)}
      ${bloc("Points d'attention", ul(p.attention), false)}
      ${bloc("Mes notes", c.notes ? `<p style="white-space:pre-wrap">${esc(c.notes)}</p>` : "", false)}
      <div class="sheet-foot"><div class="row"><button type="button" class="primary" data-open="${esc(c.id)}">Ouvrir la candidature</button><button type="button" class="ghost" data-act="close">Fermer</button></div></div>`;
  }
  function openAntiseche(id) {
    const c = candOf(id); if (!c) return;
    editing = structuredClone(c); editing.historique = editing.historique || [];
    openSheet(antisecheHTML(c), "antiseche");
  }
  window.jobelloAntiseche = openAntiseche;

  /* ---------- Branchements sur l'appli ---------- */
  const _openCand = openCand;
  openCand = function (id, task, obj) { if (task === "antiseche" && candOf(id)) return openAntiseche(id); return _openCand.apply(this, arguments); };
  const _draw = drawCandSum;
  drawCandSum = function () {
    const r = _draw.apply(this, arguments), c = editing, sh = document.querySelector("#overlay .sheet");
    if (!c || !sh) return r;
    const head = sh.querySelector(".sheet-head");
    if (serie.on && c.id && c.id === serie.ids[serie.i] && head) head.insertAdjacentHTML("afterend", serieBar(c));
    const brief = sh.querySelector(".brief");
    if (prochainEntretien(c) && brief) brief.insertAdjacentHTML("beforeend", `<div class="row anti-btn"><button type="button" class="small" data-anti="${esc(c.id)}">📋 Mon antisèche</button></div>`);
    return r;
  };
  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { homeSerie(); majPastille(); } catch (e) {} return r; };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastBadge = -1; majPastille(); } });

  document.addEventListener("click", (e) => {
    const s = e.target.closest && e.target.closest("[data-serie],[data-anti]"); if (!s) return;
    e.preventDefault(); e.stopPropagation();
    if (s.dataset.anti) { const id = s.dataset.anti; closeSheet(); return openAntiseche(id); }
    const a = s.dataset.serie;
    if (a === "start") return serieStart();
    if (a === "resume") { const id = reste()[0]; serie.i = serie.ids.indexOf(id); return openCand(id); }
    if (a === "next") return serieNext();
    if (a === "end") return serieEnd(true);
    if (a === "stop") return serieEnd(false);
  }, true);

  /* ========== 2. Une offre ajoutée depuis le favori ========== */
  const PLATEFORMES = [[/indeed\./, "Indeed"], [/welcometothejungle/, "Welcome to the Jungle"], [/apec\.fr/, "APEC"], [/linkedin\./, "LinkedIn"], [/hellowork/, "HelloWork"], [/francetravail|pole-emploi/, "France Travail"], [/cadremploi/, "Cadremploi"], [/monster\./, "Monster"], [/jobteaser/, "JobTeaser"], [/glassdoor/, "Glassdoor"]];
  const norm = (u) => String(u || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  async function ajouterOffre(o) {
    const lien = safeUrl(o.u), host = (() => { try { return new URL(lien).hostname; } catch (e) { return ""; } })();
    const deja = state.cands.find((c) => (c.lien && norm(c.lien) === norm(lien)) || (o.t && o.e && normTxt(c.poste) === normTxt(o.t) && socKey(c.entreprise) === socKey(o.e)));
    if (deja) { toast("Cette offre est déjà dans tes candidatures"); return openCand(deja.id); }
    const pf = PLATEFORMES.find(([re]) => re.test(host));
    const c = Object.assign(blankCand(), {
      poste: String(o.t || "").slice(0, 160), entreprise: String(o.e || "").slice(0, 120), ville: String(o.v || "").slice(0, 80), lien,
      canal: pf ? "plateforme" : "site", source: pf ? pf[1] : "Site carrière", description: String(o.d || "").slice(0, 6000),
      datePublication: /^\d{4}-\d{2}-\d{2}/.test(o.dp || "") ? o.dp.slice(0, 10) : "",
      mode: guessMode(o.e, o.d), historique: [{ date: todayISO(), texte: "Offre ajoutée depuis le favori « Jobello »" }],
    });
    const id = await saveCand(c);
    if (id) { toast("Offre ajoutée à tes candidatures"); openCand(id, null, c); }
  }
  function attendreOffre() {
    let o = null; const q = new URLSearchParams(location.search);
    if (q.has("ajout")) { try { o = JSON.parse(q.get("ajout")); sessionStorage.setItem("jb-ajout", JSON.stringify(o)); } catch (e) {} try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {} }
    if (!o) { try { o = JSON.parse(sessionStorage.getItem("jb-ajout") || "null"); } catch (e) {} }
    if (!o || !o.u) return;
    let n = 0; const go = () => {
      if (state.loaded && state.db) { sessionStorage.removeItem("jb-ajout"); location.hash = "#accueil"; return ajouterOffre(o); }
      if (n++ === 8 && !state.db) toast("Connecte-toi : l'offre sera ajoutée juste après");
      setTimeout(go, n < 40 ? 250 : 1500);
    };
    go();
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", attendreOffre); else attendreOffre();
})();
