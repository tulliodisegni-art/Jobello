/* Jobello : « Mon CV vu par un recruteur » (idées du tri de CV).
   - Les 20 intitulés de poste pour lesquels tu es le plus qualifié (la veille cherche aussi avec eux).
   - Les mots-clés exacts que cherchent les logiciels de tri (ATS), avec ceux que ton CV contient déjà.
   - Des phrases plus percutantes (formule XYZ de Google : résultat, mesuré par, grâce à), à compléter par tes chiffres.
   - Les signaux d'alerte qu'un recruteur repère en moins de 10 secondes, et leur correction.
   - Dans chaque candidature : les mots-clés de l'offre retrouvés (ou non) dans ton CV.
   - Dans les offres : un tableau offre / score / âge / CV adapté, le filtre « 7 derniers jours » et « Préparer les 3 meilleures ».
   L'analyse est rangée dans profil/ciblage. Sans clé Anthropic, « Refaire l'analyse » envoie la demande à Claude du projet
   (demandes/ciblage), comme « Préparer mon dossier ». Ce fichier se charge après plus.js et utilise ses outils (state, esc, toast…). */
(function () {
  const css = `
  .cib .cib-sub{margin:2px 0 0;font-size:.86rem}
  .cib details.sec{margin-top:10px}
  .cib .cb-chips,.cb-ats .cb-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .cib .cb-chips button,.cib .cb-chips i,.cb-ats .cb-chips i{font:inherit;font-style:normal;font-size:.82rem;padding:4px 10px;border-radius:99px;border:1px solid var(--line);background:var(--surface);color:var(--fg);cursor:pointer}
  .cib .cb-chips .cb-core{border-color:color-mix(in srgb,var(--accent) 45%,var(--line));background:var(--accent-soft)}
  .cib .cb-chips i.cb-y,.cb-ats .cb-chips i.cb-y{border-color:color-mix(in srgb,var(--s-offer) 50%,var(--line));color:var(--s-offer)}
  .cib .cb-chips i.cb-n,.cb-ats .cb-chips i.cb-n{border-color:color-mix(in srgb,var(--s-follow) 55%,var(--line));color:var(--s-follow)}
  .cib .cb-xyz{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid var(--line)}
  .cib .cb-xyz:first-of-type{border-top:0}
  .cib .cb-xyz .cb-av{font-size:.82rem;color:var(--muted);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--muted) 50%,transparent)}
  .cib .cb-xyz .cb-ap{font-size:.92rem}
  .cib .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .cib .row button{flex:none;width:auto;white-space:nowrap}
  .cib .cb-xyz .row{flex-wrap:nowrap}.cib .cb-xyz input{flex:1;min-width:0;width:auto}
  .cib .cb-al{display:flex;flex-direction:column;gap:4px;padding:10px 0;border-top:1px solid var(--line)}
  .cib .cb-al:first-of-type{border-top:0}
  .cib .cb-al b{font-size:.94rem}.cib .cb-al .cb-st{font-size:.78rem;font-weight:700}
  .cib .cb-al.cb-good b::before{content:"✓ ";color:var(--s-offer)}
  .cib .cb-al.cb-todo b::before{content:"! ";color:var(--s-follow)}
  .cib .cb-meter{height:8px;border-radius:9px;background:var(--surface-2);overflow:hidden;margin-top:6px}
  .cib .cb-meter i{display:block;height:100%;background:var(--accent)}
  .cb-ats{display:flex;flex-direction:column;gap:4px;margin-top:6px}
  .cb-ats .lbl{font-weight:600}
  .cb-tab{width:100%;border-collapse:collapse;font-size:.9rem}
  .cb-tab th{text-align:left;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:6px 6px 8px}
  .cb-tab td{padding:9px 6px;border-top:1px solid var(--line);vertical-align:middle}
  .cb-tab td.cb-sc{font-weight:700;white-space:nowrap}
  .cb-tab td.cb-cv{text-align:right;white-space:nowrap}
  .cb-tab a.cb-t{font-weight:600;color:var(--fg);text-decoration:none}.cb-tab small{display:block;color:var(--muted);font-size:.78rem}
  .cb-tab .cb-ok{display:inline-block;font-size:.78rem;font-weight:700;padding:4px 10px;border-radius:99px;background:var(--accent);color:var(--accent-ink);border:0;cursor:pointer}
  .cb-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const OWN = "profil/ciblage", DEM = "demandes/ciblage";
  let cib = null, dem = null, subscribed = false, vue = (() => { try { return localStorage.getItem("offresVue") || "cartes"; } catch { return "cartes"; } })(), sept = false;
  const nt = (s) => " " + normTxt(s) + " ";
  const has = (txt, k) => [k.mot, ...(k.variantes || [])].some((v) => v && txt.includes(" " + normTxt(v) + " "));
  const baseCVs = () => state.docs.filter((d) => d.type === "cv" && !d.adapte && d.contenu);
  const cvTxt = () => nt(baseCVs().map((d) => d.contenu).join("\n"));
  const save = async (patch, msg) => {
    if (!state.db) return toast("Connecte-toi à Jobello pour enregistrer");
    cib = { ...(cib || {}), ...patch, updatedAt: new Date().toISOString() };
    try { await state.db.doc(OWN).set(cib); if (msg) toast(msg); } catch { toast("Pas enregistré. Réessaie."); }
    drawPanel();
  };

  /* ---------- Carte « Mon CV vu par un recruteur » (onglet CV) ---------- */
  function ensurePanel() {
    let p = document.getElementById("cib-panel");
    if (!p) {
      const anchor = document.getElementById("photo-panel"); if (!anchor) return null;
      anchor.insertAdjacentHTML("afterend", `<div class="panel cib" id="cib-panel"></div>`);
      p = document.getElementById("cib-panel");
    }
    return p;
  }
  function drawPanel() {
    const p = ensurePanel(); if (!p) return;
    const enCours = dem && dem.statut === "en_attente";
    const head = `<div class="row between" style="align-items:center"><div style="min-width:0"><h2 style="margin:0">Mon CV vu par un recruteur</h2>
      <p class="muted cib-sub">${cib ? `Analyse du ${esc(fmt(cib.date) || cib.date)} : les postes qui te vont, les mots-clés des logiciels de tri, et ce qu'un recruteur repère en 10 secondes.` : "Claude lit ton CV comme un recruteur senior : les 20 postes qui te vont, les mots-clés des logiciels de tri et les signaux d'alerte."}</p></div>
      <button type="button" class="small" data-cib="refaire" ${enCours ? "disabled" : ""}>${enCours ? "Demandé à Claude ⏳" : cib ? "Refaire l'analyse" : "Analyser mon CV"}</button></div>`;
    if (!cib) { p.innerHTML = head; return; }
    const txt = cvTxt(), mk = cib.motsCles || [], pres = mk.filter((k) => has(txt, k)), abs = mk.filter((k) => !has(txt, k));
    const pct = mk.length ? Math.round((pres.length / mk.length) * 100) : 0;
    const intit = cib.intitules || [];
    const todo = (cib.alertes || []).filter((a) => a.statut === "a_corriger"), xyz = cib.xyz || [], xyzOk = xyz.filter((x) => (x.reponse || "").trim()).length;
    p.innerHTML = head + `
      <details class="sec"><summary>Les ${intit.length} postes pour lesquels tu es le plus qualifié <small>la veille les cherche chaque matin</small></summary><div class="body">
        <p class="muted" style="margin:0;font-size:.85rem">Touche un intitulé pour chercher les offres. Les plus foncés sont ton cœur de métier.</p>
        <div class="cb-chips">${intit.map((x) => `<button type="button" class="${x.niveau === "coeur" ? "cb-core" : ""}" data-cib-q="${esc(x.titre)}">${esc(x.titre)}</button>`).join("")}</div>
        <textarea id="cib-intit" hidden>${esc(intit.map((x) => x.titre).join("\n"))}</textarea>
        <div class="row" style="margin-top:8px">${copyBtn("cib-intit", "Copier la liste (alertes LinkedIn, APEC…)")}</div></div></details>
      <details class="sec"><summary>Mots-clés des logiciels de tri <small>${pres.length} sur ${mk.length} dans tes CV</small></summary><div class="body">
        <div class="cb-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <p class="muted" style="margin:6px 0 0;font-size:.85rem">Les logiciels de tri (ATS) cherchent ces mots exacts dans le CV. En vert, ceux que tes CV contiennent déjà.</p>
        <div class="cb-chips">${pres.map((k) => `<i class="cb-y">${esc(k.mot)}</i>`).join("")}</div>
        ${abs.length ? `<span class="lbl" style="display:block;margin-top:10px;font-weight:600">Absents de tes CV</span><p class="muted" style="margin:0;font-size:.85rem">À ajouter seulement si tu l'as vraiment pratiqué : ce sera regardé en entretien.</p><div class="cb-chips">${abs.map((k) => `<i class="cb-n">${esc(k.mot)}</i>`).join("")}</div>` : ""}
      </div></details>
      <details class="sec"><summary>Des phrases plus percutantes <small>formule XYZ · ${xyzOk} sur ${xyz.length} complétées</small></summary><div class="body">
        <p class="muted" style="margin:0;font-size:.85rem">Un recruteur retient un résultat, pas une tâche : « J'ai obtenu X, mesuré par Y, grâce à Z ». Je n'invente aucun chiffre : réponds à la question en une ligne, et tes prochains CV adaptés utiliseront la phrase avec tes vrais chiffres.</p>
        ${xyz.map((x) => `<div class="cb-xyz"><span class="cb-av">${esc(x.avant)}</span><span class="cb-ap">${esc(x.apres)}</span>
          <label class="muted" style="font-size:.82rem" for="cib-r-${esc(x.id)}">${esc(x.question)}</label>
          <div class="row"><input id="cib-r-${esc(x.id)}" value="${esc(x.reponse || "")}" placeholder="Ta réponse en une ligne"><button type="button" class="small" data-cib-r="${esc(x.id)}">OK</button></div></div>`).join("")}
      </div></details>
      <details class="sec"${todo.length ? " open" : ""}><summary>Signaux d'alerte <small>${todo.length ? todo.length + " à corriger" : "rien d'inquiétant"}</small></summary><div class="body">
        ${(cib.alertes || []).map((a) => `<div class="cb-al ${a.statut === "ok" ? "cb-good" : a.statut === "a_corriger" ? "cb-todo" : ""}"><b>${esc(a.signal)}</b>
          <span style="font-size:.88rem">${esc(a.pourquoi)}</span><span class="muted" style="font-size:.85rem">${esc(a.correction)}</span>
          ${a.statut === "a_corriger" ? `<div class="row"><button type="button" class="small primary" data-cib-a="${esc(a.id)}" data-v="valide">Corrige-le dans mes CV</button><button type="button" class="small ghost" data-cib-a="${esc(a.id)}" data-v="ignore">Laisser comme ça</button></div>`
            : a.statut === "valide" ? `<span class="cb-st v-fonce">Corrigé dans tes prochains CV adaptés</span>` : a.statut === "ignore" ? `<span class="cb-st muted">Laissé tel quel</span>` : ""}</div>`).join("")}
      </div></details>`;
  }
  async function refaire() {
    if (!state.db) return toast("Connecte-toi à Jobello pour l'envoyer à Claude");
    try { dem = { statut: "en_attente", demandeLe: new Date().toISOString() }; await state.db.doc(DEM).set(dem); }
    catch { return toast("La demande n'a pas pu être envoyée. Réessaie."); }
    drawPanel(); toast("C'est envoyé à Claude : la nouvelle analyse arrive ici dans la journée.");
  }

  /* ---------- Contrôle « logiciels de tri » dans une candidature ---------- */
  function atsHTML(c) {
    const kws = (c.motsCles || []).filter(Boolean); if (!kws.length) return "";
    const doc = state.docs.find((d) => d.id === c.cvAdapte) || state.docs.find((d) => d.id === c.cv);
    if (!doc || !doc.contenu) return "";
    const txt = nt(doc.contenu), ok = kws.filter((k) => has(txt, { mot: k })), no = kws.filter((k) => !has(txt, { mot: k }));
    const pct = Math.round(ok.length * 100 / kws.length), cls = pct >= 80 ? "v-fonce" : pct >= 50 ? "v-tente" : "v-bof";
    const f = formatCV(doc.contenu), fcls = f.pct >= 95 ? "v-fonce" : f.pct >= 75 ? "v-tente" : "v-bof";
    return `<div class="cb-ats"><span class="lbl">Format lisible par les robots de tri : <b class="cb-st ${fcls}">${f.pct} %</b> <span class="muted" style="font-size:.84rem">(objectif 95 %)</span></span>
      ${f.ko.length ? `<span class="muted" style="font-size:.84rem">À revoir : ${f.ko.map(esc).join(" ; ")}.</span>` : `<span class="muted" style="font-size:.84rem">Rubriques, coordonnées, dates et mise en forme passent les logiciels de tri.</span>`}
      <span class="lbl" style="margin-top:6px">Correspondance avec le poste : <b class="cb-st ${cls}">${pct} %</b></span>
      <span class="muted" style="font-size:.84rem">${ok.length} mot${ok.length > 1 ? "s" : ""}-clé${ok.length > 1 ? "s" : ""} de l'offre sur ${kws.length} dans ${doc.adapte ? "ton CV adapté" : "ton CV"}. Ce chiffre reste honnête : on n'ajoute jamais ce que tu n'as pas fait, et 50 à 70 % suffit souvent pour postuler.</span>
      ${no.length ? `<span class="muted" style="font-size:.84rem">Pas dans le CV : à glisser tel quel seulement si tu l'as vraiment fait.</span><div class="cb-chips">${no.map((k) => `<i class="cb-n">${esc(k)}</i>`).join("")}</div>` : ""}</div>`;
  }

  /* Format du CV pour les logiciels de tri (ATS), indépendant du poste */
  function formatCV(contenu) {
    const t = String(contenu || ""), u = normTxt(t).toUpperCase(), tests = [
      [/\bPROFIL\b|\bRESUME\b|\bA PROPOS\b/.test(u), "rubrique PROFIL"],
      [/\bEXPERIENCES?\b/.test(u), "rubrique EXPÉRIENCE PROFESSIONNELLE"],
      [/\bFORMATIONS?\b/.test(u), "rubrique FORMATION"],
      [/\bCOMPETENCES?\b/.test(u), "rubrique COMPÉTENCES"],
      [/\bLANGUES?\b/.test(u), "rubrique LANGUES"],
      [/[\w.+-]+@[\w-]+\.[\w.]+/.test(t), "adresse e-mail en texte"],
      [/(\+33|0)\s?[1-9]([\s.]?\d{2}){4}/.test(t), "téléphone en texte"],
      [/recherche|poste d|ing[ée]nieur/i.test(t.split("\n").slice(0, 4).join(" ")), "intitulé de poste en haut du CV"],
      [!/[→⇒➜►▶★☆✓✔●◆■▪❖➤]/.test(t), "symboles décoratifs ou flèches (mal lus par les robots)"],
      [(t.match(/\b(19|20)\d{2}\b/g) || []).length >= 3, "dates de chaque expérience"],
      [t.length <= 6000, "CV trop long pour une page"],
    ];
    const ko = tests.filter(([okk]) => !okk).map(([, l]) => l);
    return { pct: Math.round((tests.length - ko.length) * 100 / tests.length), ko };
  }

  /* ---------- Offres : tableau, 7 derniers jours, préparer les 3 meilleures ---------- */
  const isP = (o) => (o.mode || guessMode(o.entreprise, o.titre)) === "prestataire";
  function lignes() {
    let offres = openOffers().filter((o) => o.score == null || o.score >= 55);
    if (sept) offres = offres.filter((o) => { const a = offerAge(o); return a !== null && a <= 7; });
    offres.sort((x, y) => isP(x) - isP(y) || (y.score ?? 50) - (x.score ?? 50));
    const prets = state.cands.filter((c) => c.statut === "a_envoyer" && c.cvAdapte).sort((a, b) => (b.analyse?.score ?? 0) - (a.analyse?.score ?? 0));
    return { offres, prets };
  }
  const aPreparer = (offres) => offres.filter((o) => !demandeOf(o) || demandeOf(o).statut === "erreur");
  function barHTML(offres) {
    const n = Math.min(3, aPreparer(offres).length);
    return `<div class="cb-bar"><div class="seg" role="group" aria-label="Affichage des offres"><button type="button" data-ovue="cartes" aria-pressed="${vue === "cartes"}">Cartes</button><button type="button" data-ovue="tableau" aria-pressed="${vue === "tableau"}">Tableau</button></div>
      <button type="button" class="small${sept ? " primary" : ""}" data-osept="1" aria-pressed="${sept}">7 derniers jours</button>
      ${n ? `<button type="button" class="small" data-otop="${n}">Préparer les ${n > 1 ? n + " meilleures" : "meilleure"}</button>` : ""}</div>`;
  }
  function tableHTML() {
    const { offres, prets } = lignes();
    const cvCell = (o) => { const d = demandeOf(o); return d && d.statut !== "fait" && d.statut !== "erreur" ? `<span class="muted" title="Claude prépare CV, lettre et message">⏳ En cours</span>` : `<button type="button" class="small primary" data-prep="${esc(o.url)}">Adapter</button>`; };
    const rows = prets.map((c) => `<tr><td><a class="cb-t" href="#" data-open-cand="${esc(c.id)}">${esc(c.poste || "Poste")}</a><small>${esc(c.entreprise || "")}${c.ville ? " · " + esc(c.ville) : ""}</small></td>
        <td class="cb-sc ${c.analyse ? "v-" + esc(c.analyse.verdict || "tente") : ""}">${c.analyse?.score != null ? c.analyse.score + " %" : "–"}</td><td><small>prêt</small></td>
        <td class="cb-cv"><button type="button" class="cb-ok" data-open-cand="${esc(c.id)}">Adapté ✓</button></td></tr>`).join("")
      + offres.map((o) => `<tr><td><a class="cb-t" href="${esc(offerHref(o))}" target="_blank" rel="noopener">${esc(o.titre)}</a><small>${esc(o.entreprise || "")}${o.ville ? " · " + esc(o.ville) : ""}${isP(o) ? " · prestataire" : ""}</small></td>
        <td class="cb-sc ${o.score != null ? "v-" + esc(o.verdict || "tente") : ""}">${o.score != null ? o.score + " %" : "–"}</td><td>${ageTag(o)}</td><td class="cb-cv">${cvCell(o)}</td></tr>`).join("");
    return rows ? `<table class="cb-tab"><thead><tr><th>Offre</th><th>Score</th><th>Publiée</th><th style="text-align:right">CV</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<p class="muted" style="margin:0">${sept ? "Aucune offre publiée ces 7 derniers jours pour l'instant." : "Aucune offre pour l'instant."}</p>`;
  }
  function decorateAlerts() {
    const el = document.getElementById("alerts"); if (!el) return;
    const { offres } = lignes();
    if (vue === "tableau") {
      const relance = el.querySelector("[data-action='alerts-run']"); const foot = relance ? relance.closest(".row").outerHTML : "";
      el.innerHTML = barHTML(offres) + tableHTML() + foot;
    } else {
      if (sept) el.querySelectorAll(".offer").forEach((card) => { const a = card.querySelector(".age"); const m = a && /il y a (\d+) j/.exec(a.textContent); if (m && +m[1] > 7 || (a && a.classList.contains("unk"))) card.remove(); });
      el.insertAdjacentHTML("afterbegin", barHTML(offres));
    }
  }
  async function preparerMeilleures(n) {
    const { offres } = lignes(), top = aPreparer(offres).slice(0, n);
    if (!top.length) return toast("Rien à préparer");
    for (const o of top) await demanderDossier(o);
    toast(`${top.length} dossier${top.length > 1 ? "s" : ""} demandé${top.length > 1 ? "s" : ""} à Claude : ils arriveront dans Suivi.`);
  }

  /* ---------- Branchements ---------- */
  function subscribe() {
    if (subscribed || !state.db) return; subscribed = true;
    state.db.doc(OWN).onSnapshot((s) => { cib = s.exists ? s.data() : null; drawPanel(); }, () => {});
    state.db.doc(DEM).onSnapshot((s) => { dem = s.exists ? s.data() : null; drawPanel(); }, () => {});
  }
  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { subscribe(); drawPanel(); } catch (e) {} return r; };
  const _alerts = renderAlerts;
  renderAlerts = function () { const r = _alerts.apply(this, arguments); try { decorateAlerts(); } catch (e) {} return r; };
  const _draw = drawCandSum;
  drawCandSum = function () {
    const r = _draw.apply(this, arguments), c = editing, sh = document.querySelector("#overlay .sheet");
    try { const brief = sh && sh.querySelector(".brief"), h = c && atsHTML(c); if (brief && h) brief.insertAdjacentHTML("beforeend", h); } catch (e) {}
    return r;
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-cib],[data-cib-q],[data-cib-r],[data-cib-a],[data-ovue],[data-osept],[data-otop],[data-open-cand]"); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.cib === "refaire") return refaire();
    if (t.dataset.cibQ) {
      location.hash = "#plateformes";
      setTimeout(() => { const q = document.getElementById("s-q"); if (!q) return; q.value = t.dataset.cibQ; try { renderPlats(); } catch {} document.getElementById("search-form").requestSubmit(); document.getElementById("search-form").scrollIntoView({ block: "start" }); }, 80);
      return;
    }
    if (t.dataset.cibR) {
      const id = t.dataset.cibR, v = (document.getElementById("cib-r-" + id)?.value || "").trim();
      return save({ xyz: (cib.xyz || []).map((x) => x.id === id ? { ...x, reponse: v } : x) }, v ? "Noté : tes prochains CV adaptés l'utiliseront" : "Réponse effacée");
    }
    if (t.dataset.cibA) return save({ alertes: (cib.alertes || []).map((a) => a.id === t.dataset.cibA ? { ...a, statut: t.dataset.v } : a) }, t.dataset.v === "valide" ? "Noté : ce sera corrigé dans tes prochains CV adaptés" : "D'accord, on n'y touche pas");
    if (t.dataset.ovue) { vue = t.dataset.ovue; try { localStorage.setItem("offresVue", vue); } catch {} return renderAlerts(); }
    if (t.dataset.osept) { sept = !sept; return renderAlerts(); }
    if (t.dataset.otop) return preparerMeilleures(+t.dataset.otop);
    if (t.dataset.openCand) return openCand(t.dataset.openCand);
  }, true);
  try { subscribe(); drawPanel(); renderAlerts(); } catch (e) {}
})();
