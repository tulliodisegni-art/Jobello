/* Jobello : « Mon portfolio » (métiers créatifs : stylisme, design, archi, graphisme… mais aussi un ingénieur qui veut montrer ses projets).
   - Panneau en haut de « CV & lettres » (lien direct : #portfolio) : on ajoute des PDF et des images (rangés dans le stockage Jobello),
     et/ou un lien (site, Behance, Instagram, Canva…). Le premier fichier sert de couverture ; ‹ › pour changer l'ordre.
   - Visionneuse plein écran (images en galerie, PDF lisible), « Envoyer mon portfolio » : partage natif (fichiers sur iPhone),
     sinon les liens copiés ; « Créer un lien à envoyer » = un lien sécurisé vers chaque fichier, valable 1 an.
   - Option « Mettre le lien dans mes messages de candidature » ; ligne « Ton portfolio » dans « Postuler » et dans « Ma candidature ».
   - Étape facultative « Ton portfolio » dans la fiche d'accueil (window.jobelloPortfolioEtape).
   - Données : profil/main.portfolio = { lien, fichiers:[{id,nom,type,taille,date}], dansMessages, partage:{exp, liens:{id:url}}, maj }.
   Se charge après accueil.js et utilise les outils de l'appli (state, esc, toast, saveProfil, render, todayISO, copyText…). */
(function () {
  const css = `
  .pf .pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-top:10px}
  .pf .pf-it{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface-2);aspect-ratio:3/4;width:100%;min-height:0;padding:0;margin:0;display:flex;flex-direction:column;cursor:pointer;text-align:left;font:inherit;color:inherit}
  .pf .pf-it img{width:100%;height:100%;object-fit:cover;display:block}
  .pf .pf-it .pf-pdf{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;font-size:.76rem;text-align:center;overflow-wrap:anywhere}
  .pf .pf-it .pf-pdf svg{width:30px;height:30px;color:var(--accent)}
  .pf .pf-it .pf-cov{position:absolute;left:6px;top:6px;background:var(--accent);color:#fff;font-size:.66rem;font-weight:700;padding:2px 7px;border-radius:999px}
  .pf .pf-tools{display:flex;justify-content:center;gap:4px;margin-top:4px}
  .pf .pf-tools button{font-size:.74rem;padding:2px 8px;min-height:0}
  .pf .pf-add{border:1px dashed color-mix(in srgb,var(--accent) 55%,var(--line));background:var(--accent-soft);align-items:center;justify-content:center;font-size:.84rem;font-weight:600;color:var(--accent);text-align:center;padding:8px}
  .pf .pf-lien{display:flex;gap:6px;margin-top:10px}.pf .pf-lien input{flex:1;min-width:0}.pf .pf-lien button{flex:none}
  .pf .pf-opt{display:flex;gap:8px;align-items:flex-start;font-size:.86rem;margin-top:10px;cursor:pointer}.pf .pf-opt input{margin-top:3px;width:auto;flex:none;min-height:0}
  .pf .pf-note{font-size:.84rem;color:var(--muted);margin:6px 0 0}
  .pf-ov .pf-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);color:#fff;border:0;border-radius:999px;width:40px;height:40px;font-size:1.4rem;line-height:1;padding:0}
  .pf-ov .pf-nav.g{left:8px}.pf-ov .pf-nav.d{right:8px}
  .pf-ov .pj-body{position:relative}
  .pf-ov .pj-body img{cursor:zoom-in}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const MAX = 45e6, AN = 365 * 86400;
  const owner = () => { try { return !!(window.jobelloIsOwner && window.jobelloIsOwner()); } catch { return false; } };
  const pf = () => { const p = state.profil?.portfolio || {}; return { lien: p.lien || "", fichiers: Array.isArray(p.fichiers) ? p.fichiers.filter((f) => f && f.id) : [], dansMessages: !!p.dansMessages, partage: p.partage || null, maj: p.maj || "" }; };
  const rempli = () => { const p = pf(); return !!(p.lien || p.fichiers.length); };
  const isImg = (f) => /^image\//.test(f.type || "");
  const nomDe = (f) => String(f.nom || "Fichier").replace(/\.(pdf|png|jpe?g|webp|heic|gif)$/i, "");
  const url = (u) => { u = String(u || "").trim(); if (!u) return ""; return /^https?:\/\//i.test(u) ? u : "https://" + u; };
  const PDF_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';

  async function garder(patch, msg) {
    const p = pf(), { partage, ...reste } = patch;
    const v = { ...p, ...reste, maj: new Date().toISOString() };
    if (partage !== undefined) v.partage = partage;
    const ok = await saveProfil({ portfolio: v }, msg);
    if (ok) dessiner();
    return ok;
  }

  /* ---------- Ajouter / retirer / ranger ---------- */
  let occupe = false;
  async function ajouter(files) {
    files = [...(files || [])]; if (!files.length || occupe) return;
    if (!state.db || !state.assets) return toast("Connecte-toi à Jobello pour ajouter ton portfolio");
    const bons = files.filter((f) => /^(image\/|application\/pdf)/.test(f.type || "") || /\.pdf$/i.test(f.name));
    if (bons.length < files.length) toast("Seuls les PDF et les images sont acceptés");
    const trop = bons.filter((f) => f.size > MAX); if (trop.length) toast(`Trop gros (45 Mo maximum) : ${trop.map((f) => f.name).join(", ")}`);
    const ok = bons.filter((f) => f.size <= MAX); if (!ok.length) return;
    occupe = true; dessiner(`Envoi de ${ok.length} fichier${ok.length > 1 ? "s" : ""}…`);
    const ajout = [];
    for (const f of ok) {
      try { const up = await state.assets.upload(f); ajout.push({ id: up.id, nom: f.name, type: f.type || "application/pdf", taille: f.size, date: todayISO() }); }
      catch { toast(`« ${f.name} » n'a pas pu être envoyé, réessaie.`); }
    }
    occupe = false;
    if (ajout.length) await garder({ fichiers: [...pf().fichiers, ...ajout], partage: null }, ajout.length > 1 ? `${ajout.length} fichiers ajoutés à ton portfolio` : "Ajouté à ton portfolio");
    else dessiner();
  }
  const armes = {};
  function retirer(i, btn) {
    const f = pf().fichiers[i]; if (!f) return;
    if (armes[f.id] !== true) { armes[f.id] = true; btn.textContent = "Sûr ?"; btn.classList.add("danger"); setTimeout(() => { armes[f.id] = false; dessiner(); }, 3500); return; }
    garder({ fichiers: pf().fichiers.filter((_, k) => k !== i), partage: null }, "Retiré du portfolio");
  }
  function deplacer(i, d) {
    const xs = pf().fichiers, j = i + d; if (j < 0 || j >= xs.length) return;
    [xs[i], xs[j]] = [xs[j], xs[i]]; garder({ fichiers: xs }, j === 0 ? "C'est la nouvelle couverture" : "Ordre changé");
  }

  /* ---------- Liens à envoyer ---------- */
  async function liens(force) {
    const p = pf(); let part = p.partage;
    const frais = part && part.exp && Date.parse(part.exp) > Date.now() + 14 * 86400e3 && p.fichiers.every((f) => part.liens?.[f.id]);
    if (!frais || force) {
      if (!p.fichiers.length) return { lien: url(p.lien), fichiers: [] };
      if (!window.jobelloFileLink) throw new Error("hors ligne");
      const ls2 = {};
      for (const f of p.fichiers) ls2[f.id] = await window.jobelloFileLink(f.id, null, AN);
      part = { exp: new Date(Date.now() + AN * 1000).toISOString(), liens: ls2 };
      await garder({ partage: part }, "Liens du portfolio prêts");
    }
    return { lien: url(p.lien), fichiers: p.fichiers.map((f) => ({ nom: nomDe(f), url: part.liens[f.id] })) };
  }
  // le lien principal : le site s'il y en a un, sinon le premier fichier
  async function lienPrincipal() { const L = await liens(); return L.lien || (L.fichiers[0] && L.fichiers[0].url) || ""; }
  function texte(L) {
    const nom = state.profil?.nom || "";
    const lignes = [];
    if (L.lien) lignes.push(`Mon portfolio : ${L.lien}`);
    if (L.fichiers.length === 1 && !L.lien) lignes.push(`Mon portfolio : ${L.fichiers[0].url}`);
    else if (L.fichiers.length) { lignes.push(L.lien ? "Et en fichiers :" : "Mon portfolio :"); L.fichiers.forEach((f) => lignes.push(`${f.nom} : ${f.url}`)); }
    return (lignes.join("\n") + (nom ? `\n\n${nom}` : "")).trim();
  }
  async function copier() {
    try { const t = texte(await liens()); await copie(t); toast("Liens du portfolio copiés"); } catch { toast("Impossible de créer les liens, vérifie ta connexion."); }
  }
  async function copie(t) {
    try { await navigator.clipboard.writeText(t); return; } catch {}
    if (typeof copyLegacy === "function") copyLegacy(t);
  }
  async function envoyer(c) {
    const p = pf(); if (!rempli()) return toast("Ajoute d'abord ton portfolio");
    const titre = `Portfolio${state.profil?.nom ? " de " + state.profil.nom : ""}`;
    // 1. partage natif avec les fichiers eux-mêmes (iPhone, Android) si le poids reste raisonnable
    const poids = p.fichiers.reduce((s, f) => s + (f.taille || 0), 0);
    if (!c && navigator.share && navigator.canShare && p.fichiers.length && poids < 30e6) {
      try {
        const files = [];
        for (const f of p.fichiers) { const u = await window.jobelloBlob?.(f.id); if (!u) throw 0; const b = await (await fetch(u)).blob(); files.push(new File([b], f.nom || "portfolio", { type: f.type || b.type })); }
        if (navigator.canShare({ files })) { await navigator.share({ files, title: titre, text: p.lien ? `Mon portfolio : ${url(p.lien)}` : titre }); return; }
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    // 2. sinon : des liens
    let t; try { t = texte(await liens()); } catch { return toast("Impossible de créer les liens, vérifie ta connexion."); }
    const mail = c && typeof recruiterOf === "function" ? recruiterOf(c).email : "";
    if (c && mail) { location.href = `mailto:${mail}?subject=${encodeURIComponent(titre + (c.poste ? " – " + c.poste : ""))}&body=${encodeURIComponent("Bonjour,\n\nComme convenu, voici mon portfolio.\n\n" + t)}`; return; }
    if (navigator.share) { try { await navigator.share({ title: titre, text: t }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    await copie(t); toast("Liens copiés : colle-les dans ton message");
  }

  /* ---------- Visionneuse ---------- */
  function voir(i) {
    const xs = pf().fichiers; if (!xs[i]) return;
    document.querySelector(".pj-ov")?.remove();
    const d = document.createElement("div"); d.className = "pj-ov pf-ov"; document.body.appendChild(d);
    const show = async (k) => {
      const f = xs[k]; i = k;
      d.innerHTML = `<div class="pj-bar"><b>${esc(nomDe(f))}${xs.length > 1 ? ` · ${k + 1}/${xs.length}` : ""}</b><span class="pj-acts"><a class="btn small" href="/_blob/${esc(f.id)}">Ouvrir</a><button type="button" class="btn small primary" data-pf-x>Fermer</button></span></div>
        <div class="pj-body"><div class="empty">Chargement…</div>${xs.length > 1 ? `<button type="button" class="pf-nav g" data-pf-nav="-1" aria-label="Précédent">‹</button><button type="button" class="pf-nav d" data-pf-nav="1" aria-label="Suivant">›</button>` : ""}</div>`;
      const u = await window.jobelloBlob?.(f.id); const body = d.querySelector(".pj-body"); if (!body || i !== k) return;
      const em = body.querySelector(".empty");
      if (!u) { em.textContent = "Fichier introuvable."; return; }
      em.outerHTML = isImg(f) ? `<img src="${u}" alt="${esc(nomDe(f))}">` : `<iframe src="${u}" title="${esc(nomDe(f))}"></iframe>`;
    };
    d.addEventListener("click", (e) => {
      if (e.target.closest("[data-pf-x]") || e.target === d) return d.remove();
      const n = e.target.closest("[data-pf-nav]"); if (n) return show((i + Number(n.dataset.pfNav) + xs.length) % xs.length);
      if (e.target.tagName === "IMG") e.target.classList.toggle("big");
    });
    show(i);
  }

  /* ---------- Le contenu (panneau et étape de la fiche) ---------- */
  function contenu(court) {
    const p = pf();
    const grid = `<div class="pf-grid">${p.fichiers.map((f, i) => `<div><button type="button" class="pf-it" data-pf-voir="${i}" aria-label="Voir ${esc(nomDe(f))}">${isImg(f) ? `<img src="/_blob/${esc(f.id)}" alt="" loading="lazy">` : `<span class="pf-pdf">${PDF_IC}<span>${esc(nomDe(f))}</span></span>`}${i === 0 && p.fichiers.length > 1 ? `<span class="pf-cov">Couverture</span>` : ""}</button>
        ${court ? "" : `<div class="pf-tools">${i > 0 ? `<button type="button" class="ghost" data-pf-mv="${i}:-1" aria-label="Avancer">‹</button>` : ""}<button type="button" class="ghost" data-pf-del="${i}">Retirer</button>${i < p.fichiers.length - 1 ? `<button type="button" class="ghost" data-pf-mv="${i}:1" aria-label="Reculer">›</button>` : ""}</div>`}</div>`).join("")}
      <label class="pf-it pf-add">${occupe ? esc(occupe === true ? "Envoi…" : occupe) : `+ Ajouter<br>PDF ou images`}<input type="file" accept="application/pdf,.pdf,image/*" multiple data-pf-file hidden></label></div>`;
    const lien = `<div class="pf-lien"><input type="url" inputmode="url" data-pf-lien placeholder="Lien : ton site, Behance, Instagram, Canva…" value="${esc(p.lien)}"><button type="button" class="small" data-pf-lien-ok>${p.lien ? "Changer" : "Ajouter"}</button></div>`;
    return grid + lien;
  }
  let msgOcc = "";
  function panneauHTML() {
    const p = pf(), n = p.fichiers.length;
    const resume = [n && `${n} fichier${n > 1 ? "s" : ""}`, p.lien && "1 lien"].filter(Boolean).join(" · ");
    const actions = rempli() ? `<div class="row" style="gap:6px;margin-top:12px"><button type="button" class="small primary" data-pf-env>Envoyer mon portfolio</button><button type="button" class="small" data-pf-copy>Copier le lien</button>${n ? `<button type="button" class="small" data-pf-voir="0">Le feuilleter</button>` : ""}${p.lien ? `<a class="btn small" href="${esc(url(p.lien))}" target="_blank" rel="noopener">Ouvrir le site</a>` : ""}</div>
      <label class="pf-opt"><input type="checkbox" data-pf-msg${p.dansMessages ? " checked" : ""}><span>Mettre le lien de mon portfolio dans mes messages de candidature</span></label>` : "";
    return `<h2 style="margin:0">Mon portfolio</h2><p class="muted" style="margin:2px 0 0;font-size:.86rem">${resume ? esc(resume) + ". Il est aussi proposé quand tu postules." : "Tes créations, tes projets, ton book : ajoute des PDF ou des photos, ou le lien de ton site. Tu pourras l'envoyer aux recruteurs d'un geste."}</p>
      ${msgOcc ? `<p class="pf-note" role="status">${esc(msgOcc)}</p>` : ""}${contenu(false)}${actions}`;
  }
  function dessiner(enCours) {
    if (enCours !== undefined) occupe = enCours || false;
    const el = document.getElementById("pf-panel"); if (el) { const b = el.querySelector(".pf-b") || el; b.innerHTML = panneauHTML(); }
    const et = document.getElementById("pf-etape"); if (et) et.innerHTML = etapeHTML();
  }
  function panneau() {
    const anchor = document.getElementById("photo-panel"); if (!anchor) return;
    let el = document.getElementById("pf-panel");
    // pour Tullio (et tout compte sans portfolio déjà bien rempli), un volet replié en bas pour ne pas encombrer
    const replie = owner() && !rempli();
    if (el && (el.tagName === "DETAILS") !== replie) { el.remove(); el = null; }
    if (!el) {
      if (replie) { const ref = document.getElementById("docs-arch") || anchor; ref.insertAdjacentHTML("beforebegin", `<details class="fold" id="pf-panel"><summary><span class="fold-t">Mon portfolio</span><span class="fold-s">facultatif</span></summary><div class="fold-b pf pf-b"></div></details>`); }
      else anchor.insertAdjacentHTML("beforebegin", `<div class="panel pf" id="pf-panel"><div class="pf-b"></div></div>`);
      el = document.getElementById("pf-panel");
    }
    if (!el.contains(document.activeElement)) dessiner();
  }

  /* ---------- Étape facultative de la fiche d'accueil ---------- */
  function etapeHTML() {
    return `<p class="fi-lead">Tu travailles dans un métier créatif (stylisme, design, graphisme, archi, photo…) ou tu as des projets à montrer ? Ajoute ton portfolio : il sera prêt à envoyer à chaque candidature. <b>C'est facultatif</b> : appuie sur « Continuer » pour passer.</p>
      <div class="pf">${contenu(true)}${rempli() ? `<p class="pf-note">C'est enregistré. Tu le retrouves dans « CV & lettres », « Mon portfolio ».</p>` : ""}</div>`;
  }
  window.jobelloPortfolioEtape = () => `<div id="pf-etape">${etapeHTML()}</div>`;

  /* ---------- Événements ---------- */
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches?.("[data-pf-file]")) { const fs = t.files; ajouter(fs); t.value = ""; return; }
    if (t.matches?.("[data-pf-msg]")) { prepTente = false; return garder({ dansMessages: t.checked }, t.checked ? "Le lien sera dans tes messages de candidature" : "Le lien ne sera plus ajouté"); }
  });
  document.addEventListener("click", (e) => {
    const t = e.target.closest?.("[data-pf-voir],[data-pf-del],[data-pf-mv],[data-pf-lien-ok],[data-pf-env],[data-pf-copy],[data-pf-cand]"); if (!t) return;
    const d = t.dataset;
    if (d.pfVoir !== undefined) return voir(+d.pfVoir);
    if (d.pfDel !== undefined) return retirer(+d.pfDel, t);
    if (d.pfMv) { const [i, k] = d.pfMv.split(":"); return deplacer(+i, +k); }
    if ("pfLienOk" in d) { const v = t.parentElement.querySelector("[data-pf-lien]")?.value || ""; const u = url(v);
      if (u && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u)) return toast("Ce lien ne semble pas valide");
      return garder({ lien: u }, u ? "Lien du portfolio enregistré" : "Lien retiré"); }
    if ("pfEnv" in d) return envoyer();
    if ("pfCopy" in d) return copier();
    if (d.pfCand) { const c = state.cands.find((x) => x.id === d.pfCand); return envoyer(c); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches?.("[data-pf-lien]")) { e.preventDefault(); e.target.parentElement.querySelector("[data-pf-lien-ok]")?.click(); } });

  /* ---------- Raccordements avec l'appli ---------- */
  // lien direct #portfolio : ouvre « CV & lettres » sur le panneau
  const aller = () => { if (location.hash !== "#portfolio") return; location.hash = "#documents"; setTimeout(() => { const el = document.getElementById("pf-panel"); if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 350); };
  addEventListener("hashchange", aller); setTimeout(aller, 600);
  window.jobelloPortfolio = { ouvrir: () => { location.hash = "#portfolio"; }, envoyer, lienPrincipal, rempli };

  // « Postuler » : une ligne « Ton portfolio » à côté du LinkedIn et de la photo
  window.jobelloPortfolioLi = (c) => !rempli() ? "" : `<li><b>Ton portfolio</b> <span class="muted" style="font-size:.82rem">si le site ou le recruteur le demande</span><div class="row"><button type="button" class="small primary" data-pf-copy>Copier le lien</button><button type="button" class="small" data-pf-voir="0"${pf().fichiers.length ? "" : " hidden"}>Voir</button>${pf().fichiers[0] ? `<a class="btn small" href="/_blob/${esc(pf().fichiers[0].id)}">⬇ Télécharger</a>` : ""}</div></li>`;
  // « Ma candidature » : envoyer le portfolio au recruteur de cette candidature
  if (typeof dossierDocsHTML === "function") {
    const _d = dossierDocsHTML;
    dossierDocsHTML = function (c) {
      const h = _d.apply(this, arguments); if (!rempli() || !c) return h;
      const mail = typeof recruiterOf === "function" ? recruiterOf(c).email : "";
      return h + `<div class="docs-pair"><span class="lbl" style="font-weight:600">Mon portfolio</span><div class="row"><button type="button" class="small" data-pf-cand="${esc(c.id || "")}">${mail ? "L'envoyer au recruteur par e-mail" : "Envoyer mon portfolio"}</button><button type="button" class="small" data-pf-copy>Copier le lien</button></div></div>`;
    };
  }
  // messages de candidature : le lien du portfolio ajouté si l'option est cochée (lien déjà créé, pour rester instantané)
  if (typeof candMessage === "function") {
    const _m = candMessage;
    candMessage = function () {
      const t = _m.apply(this, arguments), p = pf();
      if (!p.dansMessages || !rempli()) return t;
      const u = url(p.lien) || (p.fichiers[0] && p.partage?.liens?.[p.fichiers[0].id]) || "";
      if (!u || t.includes(u)) return t;
      const phrase = `Vous trouverez mon portfolio ici : ${u}`;
      return /sont joints\./.test(t) ? t.replace(/sont joints\./, `sont joints. ${phrase}.`) : t.replace(/\n\n(Bien cordialement|Cordialement)/, `\n\n${phrase}\n\n$1`);
    };
  }
  // si l'option est cochée sans site, on prépare le lien du fichier à l'avance
  let prepTente = false;
  const prepare = () => { const p = pf(); if (prepTente || !p.dansMessages || p.lien || !p.fichiers.length || p.partage || !state.db) return; prepTente = true; liens().catch(() => {}).finally(() => setTimeout(() => (prepTente = false), 60000)); };

  const _render = render;
  render = function () { _render.apply(this, arguments); try { panneau(); prepare(); } catch {} };
  try { panneau(); } catch {}
})();
