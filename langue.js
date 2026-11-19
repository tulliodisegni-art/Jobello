/* Jobello : postuler en français ou en anglais.
   Sur la fiche d'une candidature : « Postuler en : Auto · Français · English ».
   - c.langue = "fr" | "en" | absent (Auto : les agents regardent l'annonce et le site, et passent en anglais si le site est en anglais).
   - c.langueDocs = langue du CV adapté, de la lettre et du message actuels ("fr" par défaut).
   - c.versions = { fr: { cvAdapte, lettre, messageCandidature, inviteRecruteur }, en: { … } } : l'autre version est gardée,
     on rebascule tout de suite sans rien perdre.
   - S'il manque la version demandée, la demande part à Claude (demandes/dossiers, élément { traduire: "en", candidature }) :
     la tâche « Dossiers et CV demandés » (ou les agents, avant d'envoyer) écrit le CV et la lettre dans l'autre langue.
   Ce fichier se charge après postuler.js. */
(function () {
  const css = `
  .lg-box{display:flex;flex-direction:column;gap:6px;margin:0 0 10px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--surface)}
  .lg-box .row{gap:6px}
  .lg-box button{padding:4px 12px;border-radius:99px;font-size:.84rem;min-height:0}
  .lg-box button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}
  .lg-box p{margin:0;font-size:.84rem;color:var(--muted)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const KEYS = ["cvAdapte", "lettre", "messageCandidature", "inviteRecruteur"];
  const NOMS = { fr: "français", en: "anglais" };
  const cand = (id) => state.cands.find((c) => c.id === id);
  const docsLang = (c) => c.langueDocs || "fr";
  const demande = (c) => (state.demandes?.liste || []).find((d) => d.candidature === c.id && d.traduire && ["en_attente", "en_preparation"].includes(d.statut));

  function boxHTML(c) {
    const v = c.langue || "", dl = docsLang(c), dem = demande(c), aDocs = !!(c.lettre || c.cvAdapte);
    const btn = (k, l) => `<button type="button" class="small${v === k ? " on" : ""}" data-lg="${k}" data-id="${esc(c.id)}">${l}</button>`;
    let info;
    if (dem) info = `Claude écrit ton CV et ta lettre en ${NOMS[dem.traduire]} ⏳ Ils arrivent au prochain passage (toutes les heures à h47), ou avant si tes agents l'envoient.`;
    else if (!aDocs) info = v === "en" ? "Ton dossier sera écrit en anglais." : v === "fr" ? "Ton dossier sera écrit en français." : "Claude choisit d'après l'annonce et le site : en anglais si le site est en anglais.";
    else info = `Ton CV et ta lettre sont en ${NOMS[dl]}.${v ? "" : " En Auto, si le site est en anglais, les agents remplissent en anglais et font la version anglaise avant d'envoyer."}${c.versions && c.versions[dl === "fr" ? "en" : "fr"] ? ` La version ${NOMS[dl === "fr" ? "en" : "fr"]} est gardée aussi.` : ""}`;
    return `<span class="lbl" style="font-weight:600">🌐 Postuler en</span>
      <div class="row">${btn("", "Auto")}${btn("fr", "🇫🇷 Français")}${btn("en", "🇬🇧 English")}</div><p>${esc(info)}</p>`;
  }

  // Bascule : l'autre version existe déjà → échange immédiat ; sinon demande à Claude
  async function choisir(id, v) {
    const c = cand(id); if (!c) return;
    c.langue = v || ""; if (!v) delete c.langue;
    const aDocs = !!(c.lettre || c.cvAdapte), dl = docsLang(c);
    let msg = v === "en" ? "Candidature en anglais" : v === "fr" ? "Candidature en français" : "Langue choisie d'après le site";
    if (v && aDocs && v !== dl) {
      const autre = c.versions && c.versions[v];
      if (autre && autre.lettre) {
        c.versions = { ...(c.versions || {}), [dl]: Object.fromEntries(KEYS.map((k) => [k, c[k] || ""])) };
        KEYS.forEach((k) => { if (autre[k] != null) c[k] = autre[k]; });
        c.langueDocs = v;
        if (c.envoi && c.envoi.statut !== "envoyee") c.envoi = { ...c.envoi, fichiers: [] }; // les PDF à joindre sont refaits
        msg = `CV et lettre en ${NOMS[v]} remis`;
      } else {
        try {
          const s = await state.db.doc("demandes/dossiers").get(), cur = s.exists ? s.data() : { liste: [] };
          const liste = (cur.liste || []).filter((d) => !(d.candidature === c.id && d.traduire && d.statut === "en_attente"));
          liste.push({ url: `cand:${c.id}:${v}`, cle: `cand:${c.id}:${v}`, candidature: c.id, traduire: v, statut: "en_attente", demandeLe: new Date().toISOString(),
            offre: { titre: c.poste || "", entreprise: c.entreprise || "", ville: c.ville || "", url: c.lien || "" } });
          const doc = { ...cur, liste: liste.slice(-60) }; await state.db.doc("demandes/dossiers").set(doc); state.demandes = doc;
          msg = `Demandé à Claude : CV et lettre en ${NOMS[v]}`;
        } catch { toast("Demande non enregistrée : vérifie ta connexion"); }
      }
    }
    if (await saveCand(c)) { toast(msg); try { openCand(c.id); } catch {} render(); }
  }

  const _openCand = openCand;
  openCand = function (id) {
    const r = _openCand.apply(this, arguments);
    try {
      const c = cand(id); if (!c || !["a_envoyer"].includes(c.statut)) return r;
      const sh = document.querySelector("#overlay .sheet .sheet-head"); if (!sh) return r;
      const box = document.createElement("div"); box.className = "lg-box"; box.innerHTML = boxHTML(c);
      const ag = sh.nextElementSibling && sh.nextElementSibling.classList.contains("relance-box") ? sh.nextElementSibling : sh;
      ag.after(box);
    } catch (e) {}
    return r;
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-lg]"); if (!b) return;
    e.preventDefault(); e.stopPropagation(); choisir(b.dataset.id, b.dataset.lg);
  }, true);
})();
