/* Jobello : les atouts qui le distinguent des autres carnets de candidatures.
   1. Mes chances, honnêtement : pour chaque offre, trois repères lisibles (le profil colle-t-il ? l'offre est-elle fraîche ?
      as-tu un accès direct à quelqu'un chez eux ?) plutôt qu'un simple « 80 % de match ». Calculé dans l'appli, sans IA,
      à partir de la note de l'offre, de sa date, de tes contacts et de tes propres résultats passés.
      Aussi sur chaque candidature en cours (cartes du suivi, tâches de l'accueil, haut de la fiche) : une fois envoyée,
      le repère « moment » devient le délai depuis l'envoi, comparé au délai habituel de tes réponses.
      Un contact compte selon son étape : quelqu'un qui t'a répondu compte pleinement, une invitation pas encore acceptée pas encore.
   2. Qui contacter : pour chaque offre ou candidature, les trois personnes à trouver sur LinkedIn (recruteur, futur
      responsable, quelqu'un qui fait déjà ce métier chez eux) avec un message prêt à copier. Rien n'est envoyé tout seul.
   3. Mon bilan de la semaine : envois, réponses, entretiens et messages réseau, comparés à TON rythme habituel,
      avec une phrase juste et rassurante.
   Ce fichier se charge après la page de l'appli, plus.js et postuler.js : il utilise leurs données (state) et leurs outils. */
(function () {
  const css = `
  .ch-pill{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:.72rem;font-weight:600;padding:2px 8px;border-radius:99px;border:1px solid transparent;background:var(--surface-2);color:var(--fg);cursor:pointer;white-space:nowrap;line-height:1.5}
  .ch-pill i{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
  .ch-pill.n4{background:var(--accent-soft);color:var(--accent)} .ch-pill.n3{background:color-mix(in srgb,var(--s-sent) 14%,var(--surface));color:var(--s-sent)}
  .ch-pill.n2{background:color-mix(in srgb,var(--s-follow) 14%,var(--surface));color:var(--s-follow)} .ch-pill.n1{background:var(--surface-2);color:var(--muted)}
  .ch-line{display:flex;flex-direction:column;gap:2px;font-size:.84rem;padding:7px 10px;border-radius:12px;border:1px solid var(--line)}
  .ch-line b{font-size:.88rem} .ch-line span{color:var(--muted)}
  .ch-head{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--surface)}
  .ch-head .ch-big{flex:none;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:1.05rem}
  .ch-head .ch-big.n4{background:var(--accent-soft);color:var(--accent)} .ch-head .ch-big.n3{background:color-mix(in srgb,var(--s-sent) 14%,var(--surface));color:var(--s-sent)}
  .ch-head .ch-big.n2{background:color-mix(in srgb,var(--s-follow) 14%,var(--surface));color:var(--s-follow)} .ch-head .ch-big.n1{background:var(--surface-2);color:var(--muted)}
  .ch-head b{display:block;font-size:1.02rem} .ch-head span{color:var(--muted);font-size:.86rem}
  .ch-f{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)}
  .ch-f:last-child{border-bottom:0} .ch-f .ch-t{font-weight:600;font-size:.92rem} .ch-f p{grid-column:1/-1;margin:0;font-size:.88rem;color:var(--muted)}
  .ch-dots{display:inline-flex;gap:3px;justify-self:end} .ch-dots i{width:9px;height:9px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line)}
  .ch-dots i.on{background:var(--accent);border-color:var(--accent)}
  .ch-tip{margin:0;padding:10px 12px;border-radius:12px;background:var(--accent-soft);font-size:.9rem}
  .ch-note{margin:0;font-size:.8rem;color:var(--muted)}
  .rs-who{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid var(--line)} .rs-who:last-of-type{border-bottom:0}
  .rs-who .rs-t{font-weight:600} .rs-who .rs-s{font-size:.86rem;color:var(--muted);margin:0}
  .rs-who textarea{width:100%;box-sizing:border-box;font:inherit;font-size:.9rem}
  .rs-cnt{font-size:.75rem;color:var(--muted)} .rs-cnt.over{color:var(--s-refused)}
  .bil{display:flex;flex-direction:column;gap:10px}
  .bil-msg{margin:0;font-size:.95rem;line-height:1.45}
  .bil-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .bil-k{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:12px;background:var(--surface-2);text-align:center}
  .bil-k b{font-size:1.2rem;line-height:1.1} .bil-k span{font-size:.72rem;color:var(--muted)}
  .bil-obj{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center;font-size:.84rem}
  .bil-obj .bar{height:7px;border-radius:9px;background:var(--surface-2);overflow:hidden} .bil-obj .bar i{display:block;height:100%;background:var(--accent);border-radius:9px}
  .bil-hist{display:flex;align-items:flex-end;gap:8px;height:74px;margin-top:6px}
  .bil-hist div{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:.7rem;color:var(--muted)}
  .bil-hist .col{width:100%;max-width:34px;display:flex;flex-direction:column-reverse;border-radius:6px 6px 2px 2px;overflow:hidden;background:var(--surface-2);height:48px}
  .bil-hist .col i{display:block;background:var(--s-sent)} .bil-hist .col i.r{background:var(--accent)}
  .bil-hist div.cur{color:var(--fg);font-weight:600}
  .cc-top .ch-pill{margin-left:auto;cursor:inherit;font-size:.68rem;padding:1px 7px}
  .task-txt .ch-mini{display:inline-flex;align-items:center;gap:5px;font-size:.76rem;font-weight:600;color:var(--muted)}
  .task-txt .ch-mini i{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
  .task-txt .ch-mini.n4{color:var(--accent)} .task-txt .ch-mini.n3{color:var(--s-sent)} .task-txt .ch-mini.n2{color:var(--s-follow)}
  .ch-brief{display:flex;flex-direction:column;gap:4px;padding:9px 11px;border-radius:12px;border:1px solid var(--line);background:var(--surface)}
  .ch-brief .ch-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ch-brief p{margin:0;font-size:.86rem;color:var(--muted)}
  .ch-brief .ch-why{all:unset;cursor:pointer;font-size:.8rem;color:var(--accent);text-decoration:underline;text-underline-offset:3px}
  .bil-leg{display:flex;gap:12px;font-size:.75rem;color:var(--muted)} .bil-leg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;background:var(--s-sent)} .bil-leg i.r{background:var(--accent)}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const ready = () => typeof state !== "undefined" && state && state.loaded;
  const today = () => todayISO();
  const pl = (n, w, ws) => `${n} ${n > 1 ? (ws || w + "s") : w}`;

  /* ========== Outils communs ========== */
  const posteCourt = (p) => String(p || "").replace(/\s*\(?\b[FH]\s*\/\s*[FHX]\b\)?/gi, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+[-–|].*$/, "").replace(/\s+/g, " ").trim();
  const capNom = (n) => String(n || "").trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  const moi = () => {
    const p = state.profil || {}, f = p.fiche || {};
    const titre = String(p.titre || (p.postes || [])[0] || "").split(/\s*[·|,;]\s*/)[0].trim();
    const ans = (String(p.pitch || "").match(/(\d{1,2})\s*ans/) || [])[1] || (String(f.experience || "").match(/(\d{1,2})/) || [])[1] || "";
    return { titre, ans, nom: capNom(p.nom), prenom: capNom(firstName(p.nom)) };
  };
  // Le mot qui décrit le métier, pour chercher le futur responsable (« responsable essais », « responsable bureau d'études »…)
  const METIERS = [[/essai|validation|qualification|test/, "essais"], [/bureau d.?etude|conception|etudes|design/, "bureau d'études"], [/industrialisation|methode|process/, "industrialisation"],
    [/qualite|quality/, "qualité"], [/r ?& ?d|recherche|developpement|r d/, "R&D"], [/projet|project/, "projets"], [/maintenance/, "maintenance"], [/production|fabrication/, "production"], [/achat/, "achats"]];
  const metierDe = (poste) => { const t = normTxt(poste); const m = METIERS.find(([re]) => re.test(t)); return m ? m[1] : posteCourt(poste).replace(/^(ing[ée]nieur|ingenieur|responsable|charg[ée] d'?)\S*\s*/i, "").split(/\s+/).slice(0, 2).join(" "); };
  const societe = (x) => String(x.groupe && x.groupe.length < (x.entreprise || "").length ? x.groupe : x.entreprise || x.groupe || "").trim();
  const sameSoc = (a, b) => { const x = socKey(a), y = socKey(b); return !!x && !!y && (x === y || x.split(" ")[0] === y.split(" ")[0]); };

  /* ========== 1. Mes chances ========== */
  // Tes propres résultats : sur les candidatures envoyées il y a plus de 3 semaines (le temps qu'une réponse arrive)
  function mesChiffres() {
    const lim = addDays(today(), -21);
    const mures = state.cands.filter((c) => c.dateEnvoi && c.dateEnvoi <= lim && c.statut !== "a_envoyer");
    const rep = (L) => L.filter((c) => answered(c) || !!c.dateReponse && !c.refusAuto).length;
    const par = (f) => { const L = mures.filter(f); return { n: L.length, r: rep(L) }; };
    return { tout: par(() => true), site: par((c) => c.canal === "site"), plateforme: par((c) => c.canal === "plateforme"), contact: par((c) => !!c.relancePar),
      haut: par((c) => (c.analyse?.score ?? 0) >= 65), bas: par((c) => c.analyse && c.analyse.score < 65) };
  }
  const pct = (x) => Math.round(x.r / x.n * 100);

  // Délai habituel des réponses : 3 réponses sur 4 arrivent avant ce nombre de jours (tes chiffres dès 6 réponses datées, sinon 21 jours)
  function delaiReponse() {
    const d = state.cands.filter((c) => c.dateEnvoi && c.dateReponse && !c.refusAuto).map((c) => daysBetween(c.dateEnvoi, c.dateReponse)).filter((x) => x >= 0).sort((a, b) => a - b);
    if (d.length < 6) return { j: 21, perso: false };
    return { j: Math.min(30, Math.max(7, d[Math.ceil(d.length * 0.75) - 1])), perso: true };
  }
  // Date de publication d'une candidature à envoyer : celle de l'offre d'origine si on la retrouve dans les alertes
  function dateAnnonce(c) {
    if (!c || !c.statut) return "";
    const L = [...(state.alertes?.offres || []), ...(state.sites?.offres || [])];
    const o = L.find((x) => (c.lien && x.url === c.lien) || offerKey(x) === offerKey(c));
    return o ? o.date || "" : "";
  }
  function chances(o) {
    const ent = o.entreprise || o.groupe || "", isCand = !!o.statut;
    const score = o.score ?? o.analyse?.score ?? null, verdict = o.verdict || o.analyse?.verdict || "";
    const mode = o.mode || (isCand ? modeOf(o) : guessMode(o.entreprise, o.titre)) || "direct";
    // 1. Correspondance avec ton profil
    let A, At;
    if (score == null) { A = 2; At = "Offre pas encore notée : ouvre l'annonce pour juger si ton profil colle."; }
    else if (score >= 75) { A = 4; At = `Ton profil colle bien à l'annonce (${score} %).`; }
    else if (score >= 60) { A = 3; At = `Profil proche de l'annonce (${score} %), avec un ou deux points à rassurer dans ta lettre.`; }
    else if (score >= 45) { A = 2; At = `Correspondance partielle (${score} %) : plusieurs attentes de l'annonce ne sont pas dans ton parcours.`; }
    else { A = 1; At = `Écart important avec l'annonce (${score} %).`; }
    // 2. Le moment. Avant l'envoi : fraîcheur de l'annonce (plus on postule tôt, plus le dossier est lu avec attention).
    //    Après l'envoi : depuis combien de temps tu attends, comparé au délai habituel des réponses.
    const sent = isCand && ["envoyee", "relancee"].includes(o.statut) && !!o.dateEnvoi;
    const age = sent ? null : offerAge({ date: o.date || o.datePublication || dateAnnonce(o) });
    let F, Ft, Fl = sent ? "Le délai de réponse" : "Le moment";
    if (sent) {
      const D = Math.max(0, daysBetween(o.dateEnvoi, today())), dl = delaiReponse();
      const hab = dl.perso ? `chez toi, 3 réponses sur 4 arrivent en moins de ${dl.j} jours` : `la plupart des réponses arrivent en moins de ${dl.j} jours`;
      const relance = o.statut === "relancee" ? " Tu as déjà relancé, c'est bien." : "";
      if (D <= dl.j) { F = 3; Ft = `${D === 0 ? "Envoyée aujourd'hui" : D === 1 ? "Envoyée hier" : `Envoyée il y a ${D} jours`} : ${hab}.${relance}`; }
      else if (D <= Math.min(2 * dl.j, 35)) { F = 2; Ft = `Pas de nouvelles depuis ${D} jours, plus que d'habitude (${hab}). Ce n'est pas un non, mais un signe de ta part aide.${relance}`; }
      else { F = 0; Ft = `Sans nouvelles depuis ${D} jours, bien plus que d'habitude (${hab}) : une réponse reste possible, mais devient rare.`; }
    }
    else if (age === null) { F = 2; Ft = "Date de publication inconnue : si l'annonce a plus de deux semaines, le tri a sans doute commencé."; }
    else if (age <= 2) { F = 4; Ft = `Publiée ${age === 0 ? "aujourd'hui" : age === 1 ? "hier" : "il y a 2 jours"} : tu fais partie des premiers dossiers.`; }
    else if (age <= 6) { F = 3; Ft = `Publiée il y a ${age} jours : c'est encore le bon moment.`; }
    else if (age <= 10) { F = 2; Ft = `Publiée il y a ${age} jours : le recruteur a déjà des candidats, il faut sortir du lot.`; }
    else if (age <= 14) { F = 1; Ft = `Publiée il y a ${age} jours : les premiers entretiens ont peut-être commencé.`; }
    else { F = 0; Ft = `Publiée il y a ${age} jours : le poste est sûrement en voie d'être pourvu.`; }
    // 3. Accès à quelqu'un chez eux. Une personne qui t'a répondu compte vraiment ; une invitation pas encore acceptée, pas encore.
    const RANG = { repondu: 4, rdv: 4, connecte: 3, message: 3, relance: 3, invitation: 2, a_contacter: 1 };
    const rang = (p) => RANG[p.etape || "a_contacter"] || 1;
    const via = isCand && typeof viaContact === "function" ? viaContact(o) : null;
    const contact = [via, ...state.contacts.filter((p) => !archivedC(p) && sameSoc(p.entreprise, ent))].filter(Boolean).sort((a, b) => rang(b) - rang(a))[0] || null;
    const lien = contact ? rang(contact) : 0; // 4 t'a répondu, 3 en lien, 2 invitation envoyée, 1 à inviter, 0 personne
    const nom = contact ? contact.nom || "ton contact" : "", pre = contact ? firstName(contact.nom) || "ton contact" : "";
    const refus = state.cands.filter((c) => c !== o && c.id !== o.id && c.statut === "refus" && !c.refusAuto && sameSoc(c.entreprise, ent) && (c.dateReponse || c.dateEnvoi || "") >= addDays(today(), -90));
    const enCours = state.cands.filter((c) => c.id !== o.id && !archivedCand(c) && c.statut !== "a_envoyer" && sameSoc(c.entreprise, ent));
    let R, Rt;
    if (lien === 4) { R = 4; Rt = `${nom} t'a déjà répondu : un mot de sa part fait souvent passer ton dossier en haut de la pile.`; }
    else if (lien === 3) { R = 3; Rt = `Tu es en lien avec ${nom} chez eux, sans réponse pour l'instant : dès qu'un échange démarre, un mot de sa part peut tout changer.`; }
    else {
      const attente = lien === 2 ? `Invitation envoyée à ${nom}, pas encore acceptée : elle comptera dès que vous serez en lien.` : lien === 1 ? `${nom} est dans ta liste à inviter : tant que l'invitation n'est pas partie, ça ne compte pas encore.` : "";
      if (mode === "prestataire") { R = 3; Rt = "Société de prestation : elles recrutent en continu et répondent plus souvent, mais c'est ton deuxième choix." + (attente ? " " + attente : ""); }
      else { R = 2; Rt = attente || "Pas encore de contact chez eux : une candidature en ligne seule se perd facilement dans la masse."; }
    }
    if (refus.length) { R = Math.max(1, R - 1); Rt += ` Refus chez eux le ${fmt(refus[0].dateReponse || refus[0].dateEnvoi)} : vise un poste vraiment différent ou passe par une personne.`; }
    const total = Math.round((A * 0.5 + F * 0.3 + R * 0.2) * 25);
    let n = total >= 80 ? 4 : total >= 60 ? 3 : total >= 42 ? 2 : 1;
    if (n === 4 && lien < 4) n = 3; // sans une personne qui t'a répondu chez eux, on ne promet pas « très bonnes chances »
    if (sent && F === 0) n = Math.min(n, 2); // un long silence pèse plus lourd que la note de l'offre
    const label = ["", "Chances faibles", "Chances moyennes", "Bonnes chances", "Très bonnes chances"][n];
    // Ce qui ferait monter tes chances, le levier le plus fort d'abord (tournures sans il/elle : on ne devine pas le genre d'un contact)
    let conseil;
    if (sent) {
      if (typeof isDue === "function" && isDue(o)) conseil = lien >= 3 ? `C'est le moment de relancer : passe par ${pre}.` : "C'est le moment de relancer : touche « Relancer » plus bas sur cette fiche.";
      else if (lien >= 3) conseil = `Demande à ${pre} de glisser un mot à l'équipe qui recrute.`;
      else if (F === 0) conseil = o.statut === "relancee" ? "Tu as déjà relancé : garde-la en tête, mais mise surtout sur tes nouvelles candidatures." : "Relance une fois, puis mise surtout sur tes nouvelles candidatures.";
      else if (lien === 2) conseil = `Dès que ${pre} accepte ton invitation, demande-lui de glisser un mot à l'équipe qui recrute.`;
      else if (lien === 1) conseil = `Invite ${pre} sur LinkedIn : sur une candidature déjà envoyée, c'est ce qui fait le plus bouger les choses.`;
      else if (mode !== "prestataire") conseil = `Écris à une personne de chez ${ent || "eux"} : sur une candidature déjà envoyée, c'est ce qui fait le plus bouger les choses.`;
      else conseil = "Laisse-leur quelques jours, puis relance si tu n'as pas de nouvelles.";
    }
    else if (A <= 1) conseil = "Garde ton énergie pour les offres mieux notées, sauf si cette société t'attire vraiment.";
    else if (lien >= 3) conseil = `Préviens ${pre} quand tu postules et demande-lui de transmettre ton CV.`;
    else if (lien === 2) conseil = `Postule ${F >= 3 ? "dans les 48 heures" : "vite"}, et dès que ${pre} accepte ton invitation, demande-lui de transmettre ton CV.`;
    else if (lien === 1 && mode !== "prestataire") conseil = `Postule ${F >= 3 ? "dans les 48 heures" : "vite"} et invite ${pre} sur LinkedIn : c'est ce qui fait le plus monter tes chances.`;
    else if (mode !== "prestataire" && F >= 2) conseil = `Postule ${F >= 3 ? "dans les 48 heures" : "vite"} et envoie un message à une personne de chez ${ent || "eux"} : c'est ce qui fait le plus monter tes chances.`;
    else if (mode !== "prestataire") conseil = `L'annonce n'est plus toute neuve : un message à une personne de chez ${ent || "eux"} est ta meilleure carte.`;
    else conseil = "Postule tant que l'annonce est fraîche, puis relance au bout d'une semaine.";
    return { n, label, total, A, At, F, Ft, Fl, R, Rt, conseil, enCours, contact, lien, ent, mode, sent };
  }
  const dots = (k) => `<span class="ch-dots" aria-label="${k} sur 4">${[1, 2, 3, 4].map((i) => `<i class="${i <= k ? "on" : ""}"></i>`).join("")}</span>`;
  function chiffresHTML(c) {
    const M = mesChiffres(), out = [];
    const canal = c.statut ? c.canal : /site carri|careers|jobs\.|recrutement\./i.test(`${c.source || ""} ${c.url || ""}`) || /site/i.test(c.source || "") ? "site" : "plateforme";
    const g = M[canal];
    if (g && g.n >= 8) out.push(`Sur tes ${g.n} candidatures ${canal === "site" ? "par site carrière" : "par plateforme (Indeed, LinkedIn…)"}, ${pct(g)} % ont eu une réponse.`);
    if (M.contact.n >= 3) out.push(`Quand tu avais un contact, ${pct(M.contact)} % ont répondu (${M.contact.r} sur ${M.contact.n}).`);
    if (M.haut.n >= 5 && M.bas.n >= 5) out.push(`Tes offres notées 65 % ou plus ont eu ${pct(M.haut)} % de réponses, contre ${pct(M.bas)} % pour les autres.`);
    if (!out.length) return `<p class="ch-note">Tes propres chiffres s'afficheront ici dès que tu auras assez de candidatures envoyées depuis plus de 3 semaines (${M.tout.n} pour l'instant).</p>`;
    return `<p class="ch-note"><b>Tes chiffres :</b> ${esc(out.join(" "))}</p>`;
  }
  function chancesBody(x, ch) {
    return `<div class="ch-head"><span class="ch-big n${ch.n}">${ch.n}/4</span><div><b>${esc(ch.label)}</b><span>Une estimation honnête, pas une promesse</span></div></div>
      <div><div class="ch-f"><span class="ch-t">Ton profil et l'annonce</span>${dots(ch.A)}<p>${esc(ch.At)}</p></div>
      <div class="ch-f"><span class="ch-t">${esc(ch.Fl)}</span>${dots(ch.F)}<p>${esc(ch.Ft)}</p></div>
      <div class="ch-f"><span class="ch-t">Ton accès à l'entreprise</span>${dots(ch.R)}<p>${esc(ch.Rt)}</p></div></div>
      <p class="ch-tip">${esc(ch.conseil)}</p>
      ${ch.enCours.length && !ch.sent ? `<p class="ch-note">Déjà en cours chez eux : ${ch.enCours.slice(0, 3).map((c) => esc(c.poste || "candidature")).join(", ")}. Cite-le dans ta lettre, ça montre ta motivation pour la société.</p>` : ""}
      ${chiffresHTML(x)}
      <p class="ch-note">Calculé dans Jobello à partir de la note de l'offre, de sa date de publication, de tes contacts et de tes résultats passés. Aucune donnée n'est envoyée ailleurs.</p>`;
  }
  // Pastille dans les listes d'offres ; un toucher ouvre le détail
  window.jobelloChancesPill = (o) => { try { if (!ready()) return ""; const ch = chances(o); return `<button type="button" class="ch-pill n${ch.n}" data-chances="${esc(o.url || "")}" title="Voir le détail de mes chances"><i></i>${esc(ch.label)}</button>`; } catch (e) { return ""; } };
  // Une ligne lisible sur la carte du swipe (pas de fenêtre par-dessus le swipe)
  window.jobelloChancesLigne = (o) => { try { if (!ready()) return ""; const ch = chances(o); return `<span class="ch-line"><b class="ch-pill n${ch.n}" style="cursor:default;align-self:flex-start"><i></i>${esc(ch.label)}</b><span>${esc(ch.conseil)}</span></span>`; } catch (e) { return ""; } };
  window.jobelloChances = chances;

  /* ========== 2. Qui contacter sur LinkedIn ========== */
  const MAXI = 200; // sans abonnement payant, LinkedIn limite la note d'invitation à 200 caractères
  function couper(t, max) { if (t.length <= max) return t; return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…"; }
  function messages(x) {
    const m = moi(), ent = societe(x) || "votre société", poste = posteCourt(x.poste || x.titre).replace(/^[A-ZÉ](?=[a-zéèà])/, (c) => c.toLowerCase()) || "ce poste", fait = x.statut && x.statut !== "a_envoyer";
    const low = (t) => t ? t.charAt(0).toLowerCase() + t.slice(1) : "";
    const qui = [low(m.titre), m.ans && `${m.ans} ans d'expérience`].filter(Boolean).join(", ");
    const jeSuis = qui ? `Je suis ${qui}.` : "";
    const quiCourt = low(m.titre).split(/\s+/).slice(0, 3).join(" "), jeSuisCourt = quiCourt ? `Je suis ${quiCourt}${m.ans ? ` (${m.ans} ans)` : ""}.` : "";
    const sig = m.prenom || "";
    // Une invitation tient en 200 caractères : on essaie la version complète, puis des versions plus courtes, sans jamais couper une phrase
    const inv = (f) => {
      const essais = [[poste, jeSuis, ent], [poste, jeSuisCourt, ent], [couper(poste, 45), jeSuisCourt, ent], [couper(poste, 45), "", ent], [couper(poste, 35), "", ""]];
      for (const [po, js, en] of essais) { const t = f(po, js, en).replace(/\s+/g, " ").replace(/ \./g, ".").trim(); if (t.length <= MAXI) return t; }
      return f(couper(poste, 30), "", "").replace(/\s+/g, " ").trim();
    };
    const suite = (role) => `Bonjour,\n\nMerci d'avoir accepté mon invitation. ${fait ? `J'ai postulé ${x.dateEnvoi ? "le " + fmt(x.dateEnvoi, { day: "numeric", month: "long" }) + " " : ""}au poste ${dePoste(poste)}` : `Je prépare ma candidature au poste ${dePoste(poste)}`} chez ${ent}. ${jeSuis}\n\n${role === "rh"
      ? "Pourriez-vous me dire où en est ce recrutement et à qui transmettre mon dossier ? Je vous envoie volontiers mon CV ici."
      : role === "manager" ? "Les projets de votre équipe m'intéressent vraiment. Auriez-vous un quart d'heure, au téléphone ou en visio, pour m'en dire un peu plus ? Ce serait précieux pour moi."
        : "Comme vous faites ce métier chez eux, j'aimerais beaucoup avoir votre regard : comment se passent le travail et l'équipe au quotidien ? Dix minutes d'échange m'aideraient beaucoup."}\n\nBonne journée,\n${m.nom || ""}`.trim();
    return {
      rh: { t: "Le recruteur ou la personne RH", s: "Elle peut te dire où en est le recrutement et sortir ton dossier du lot.",
        q: `"${ent}" talent acquisition OR recrutement OR recruteur OR RH`,
        inv: inv((po, js) => `Bonjour, ${fait ? "j'ai postulé" : "je postule"} à votre offre ${dePoste(po)}. ${js} J'aimerais beaucoup échanger avec vous à son sujet. Merci, ${sig}`), suite: suite("rh"), type: "Recruteur / RH" },
      manager: { t: "Ton futur responsable", s: "C'est souvent lui qui décide : un échange avec lui vaut plus qu'une lettre.",
        q: `"${ent}" responsable ${metierDe(x.poste || x.titre)}`,
        inv: inv((po, js, en) => `Bonjour, ${fait ? "j'ai postulé" : "je postule"} au poste ${dePoste(po)}${en ? " chez " + en : " dans votre équipe"}. ${js} Vos projets m'intéressent vraiment : pourrions-nous en parler ? ${sig}`), suite: suite("manager"), type: "Manager" },
      pair: { t: "Quelqu'un qui fait ce métier chez eux", s: "Les collègues répondent le plus volontiers et peuvent te recommander en interne (cooptation).",
        q: `"${ent}" ${posteCourt(x.poste || x.titre).split(/\s+/).slice(0, 3).join(" ")}`,
        inv: inv((po, js, en) => `Bonjour, je m'intéresse au poste ${dePoste(po)}${en ? " chez " + en : ""}. ${js} Accepteriez-vous de me dire en deux mots comment ça se passe chez vous ? Merci, ${sig}`), suite: suite("pair"), type: "Ingénieur / collègue" },
    };
  }
  let cible = null; // l'offre ou la candidature dont on cherche les contacts
  function reseauHTML(x) {
    cible = x;
    const M = messages(x), ent = societe(x), deja = contactsOf(x.entreprise).concat(x.groupe ? contactsOf(x.groupe) : []).filter((p) => !archivedC(p));
    const n = sentToday();
    return (deja.length ? `<p class="ch-note">Déjà dans tes contacts chez ${esc(ent)} : ${deja.slice(0, 3).map((p) => `<button type="button" class="small" data-contact="${esc(p.id)}">${esc(p.nom || "Contact")}</button>`).join(" ")}</p>` : "")
      + Object.entries(M).map(([k, r]) => `<div class="rs-who"><span class="rs-t">${esc(r.t)}</span><p class="rs-s">${esc(r.s)}</p>
        <textarea class="rs-ta" id="rs-${k}" rows="3" data-max="${MAXI}">${esc(r.inv)}</textarea><span class="rs-cnt">${r.inv.length} / ${MAXI} caractères</span>
        <div class="row">${copyBtn("rs-" + k, "Copier l'invitation")}<a class="btn small primary" href="${esc(liPeople(r.q))}" target="_blank" rel="noopener">Chercher sur LinkedIn</a><button type="button" class="small" data-rs-found="${k}">J'ai trouvé la personne</button></div></div>`).join("")
      + `<p class="ch-note">Jobello n'envoie rien à ta place : choisis la personne, « Se connecter », « Ajouter une note », colle et envoie. Le message de suite est prêt dans sa fiche contact. Aujourd'hui : ${n} / ${LI_LIMIT} messages envoyés${n >= LI_LIMIT ? ", garde la suite pour demain" : ""}.</p>`;
  }
  function trouve(k) {
    const x = cible; if (!x) return;
    const r = messages(x)[k], ent = societe(x), cand = x.statut ? x : state.cands.find((c) => (x.url && c.lien === x.url) || offerKey(c) === offerKey(x));
    closeSheet();
    openContact(null, { entreprise: ent, type: r.type, role: k === "manager" ? "Responsable " + metierDe(x.poste || x.titre) : "", canal: "LinkedIn", etape: "a_contacter",
      inviteTexte: (document.getElementById("rs-" + k)?.value || r.inv), messageTexte: r.suite, ...(cand && cand.id ? { _forCand: cand.id } : {}),
      notes: `Pour ${cand && cand.statut !== "a_envoyer" ? "ma candidature" : "l'offre"} « ${posteCourt(x.poste || x.titre)} »${x.source ? " (" + x.source + ")" : ""}.` });
  }

  /* Fenêtre « Mes chances » d'une offre, avec qui contacter */
  function ouvrirOffre(url) {
    const o = offerByUrl(url); if (!o) return;
    const ch = chances(o);
    openSheet(`<div class="sheet-head"><div style="min-width:0"><span class="label">Mes chances</span><h2>${esc(o.entreprise || "Société ?")} · ${esc(posteCourt(o.titre))}</h2></div><button type="button" class="ghost" data-act="close">Fermer</button></div>
      ${chancesBody(o, ch)}
      <details class="sec"><summary>Qui contacter chez ${esc(societe(o) || "eux")} <small>3 personnes, messages prêts</small></summary><div class="body">${reseauHTML({ ...o, poste: o.titre })}</div></details>
      <div class="sheet-foot"><div class="row">${typeof prepBtn === "function" ? prepBtn(o) : ""}<a class="btn" href="${esc(offerHref(o))}" target="_blank" rel="noopener">Voir l'annonce</a><button type="button" class="ghost" data-act="close">Fermer</button></div></div>`, "chances");
  }

  /* Sur la fiche d'une candidature en cours : mes chances (en haut, avec « Pourquoi ? ») et qui contacter */
  const _draw = drawCandSum;
  drawCandSum = function () {
    const r = _draw.apply(this, arguments), c = editing, sh = document.querySelector("#overlay .sheet");
    if (!c || !sh || sheetKind !== "candsum") return r;
    try {
      const brief = sh.querySelector(".brief"); if (!brief) return r;
      let html = "";
      if (avecChances(c)) {
        const ch = chances(c);
        brief.insertAdjacentHTML("beforeend", `<div class="ch-brief"><div class="ch-row"><span class="ch-pill n${ch.n}" style="cursor:default"><i></i>${esc(ch.label)}</span><button type="button" class="ch-why" data-ch-why="1">Pourquoi ?</button></div><p>${esc(ch.conseil)}</p></div>`);
        html += `<details class="sec" id="sec-chances"><summary>Mes chances <small>${esc(ch.label)}</small></summary><div class="body">${chancesBody(c, ch)}</div></details>`;
      }
      if (!archivedCand(c) && !viaContact(c) && c.entreprise && !["offre"].includes(c.statut)) html += `<details class="sec" id="sec-reseau"><summary>Qui contacter chez ${esc(societe(c))} <small>messages prêts</small></summary><div class="body">${reseauHTML(c)}</div></details>`;
      if (html) brief.insertAdjacentHTML("afterend", html);
    } catch (e) {}
    return r;
  };

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-chances],[data-rs-found],[data-ch-why]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.chWhy) { const f = document.getElementById("sec-chances"); if (f) { f.open = true; f.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (b.dataset.chances != null) return ouvrirOffre(b.dataset.chances);
    if (b.dataset.rsFound) return trouve(b.dataset.rsFound);
  }, true);
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t.classList || !t.classList.contains("rs-ta")) return;
    const c = t.nextElementSibling, max = +t.dataset.max || MAXI; if (!c) return;
    c.textContent = `${t.value.length} / ${max} caractères${t.value.length > max ? " : trop long pour une invitation" : ""}`; c.classList.toggle("over", t.value.length > max);
  });

  /* ========== 1 bis. Mes chances là où tu passes : suivi, accueil ========== */
  const avecChances = (c) => !!c && !archivedCand(c) && ["a_envoyer", "envoyee", "relancee"].includes(c.statut);
  // Suivi : une pastille sur chaque carte de candidature en cours (la carte ouvre la fiche, où tout est expliqué)
  const _item = itemHTML;
  itemHTML = function (c) {
    const h = _item.apply(this, arguments);
    try {
      if (!ready() || !avecChances(c)) return h;
      const ch = chances(c);
      return h.replace(/(<span class="cc-top">[\s\S]*?)(<\/span>\s*<span class="cc-po">)/, `$1<span class="ch-pill n${ch.n}" title="${esc(ch.conseil)}"><i></i>${esc(ch.label)}</span>$2`);
    } catch (e) { return h; }
  };
  // Accueil : sous chaque tâche liée à une candidature en cours (« Postuler chez… », « Relancer… », « Trouver un contact… »)
  function chancesAccueil() {
    document.querySelectorAll("#todo .task[data-open]").forEach((row) => {
      const c = state.cands.find((x) => x.id === row.dataset.open), tx = row.querySelector(".task-txt");
      if (!tx || tx.querySelector(".ch-mini") || !avecChances(c)) return;
      const ch = chances(c);
      tx.insertAdjacentHTML("beforeend", `<span class="ch-mini n${ch.n}"><i></i>${esc(ch.label)}</span>`);
    });
  }

  /* ========== 3. Mon bilan de la semaine ========== */
  const OBJ_ENVOIS = 5, OBJ_RESEAU = 3;
  function semaine(debut, fin) {
    const dans = (d) => !!d && d >= debut && d <= fin;
    const envois = state.cands.filter((c) => dans(c.dateEnvoi)).length;
    const reps = state.cands.filter((c) => dans(c.dateReponse) && !c.refusAuto);
    const refus = reps.filter((c) => c.statut === "refus").length;
    const ent = new Set();
    state.cands.forEach((c) => { if (dans(c.dateEntretien)) ent.add(c.id + c.dateEntretien); (c.entretiens || []).forEach((r) => { if (dans(r.date)) ent.add(c.id + r.date); }); });
    const reseau = state.contacts.reduce((n, p) => n + (p.historique || []).filter((h) => dans(h.date) && LI_SENT_RE.test(h.texte)).length, 0);
    const relances = state.cands.reduce((n, c) => n + (c.historique || []).filter((h) => dans(h.date) && /^Relance envoyée/.test(h.texte)).length, 0);
    return { envois, reponses: reps.length, refus, entretiens: ent.size, reseau, relances };
  }
  function bilan() {
    const t = today(), lun = mondayOf(t), S = semaine(lun, t);
    const passees = [1, 2, 3, 4].map((k) => { const d = addDays(lun, -7 * k); return { debut: d, ...semaine(d, addDays(d, 6)) }; });
    const actives = passees.filter((w) => w.envois || w.reponses || w.reseau);
    const moy = actives.length ? Math.round(actives.reduce((n, w) => n + w.envois, 0) / actives.length * 10) / 10 : 0;
    const enLecture = state.cands.filter((c) => ACTIVE.includes(c.statut) && c.dateEnvoi && c.dateEnvoi >= addDays(t, -21)).length;
    const totEnv = state.cands.filter((c) => c.dateEnvoi).length, totEnt = state.cands.filter((c) => (c.entretiens || []).length || ["entretien", "offre"].includes(c.statut) || (c.dateEntretien && c.statut !== "a_envoyer")).length;
    const jour = (new Date(t + "T12:00:00").getDay() + 6) % 7; // 0 = lundi
    // La phrase juste : on part de ce qui s'est vraiment passé
    const P = [];
    if (S.entretiens) P.push(`${pl(S.entretiens, "entretien")} cette semaine : c'est exactement ce que tes envois devaient produire.`);
    if (S.envois >= OBJ_ENVOIS) P.push(`${pl(S.envois, "candidature envoyée", "candidatures envoyées")} : c'est un très bon rythme, pas besoin d'en faire plus.`);
    else if (S.envois && moy && S.envois >= moy) P.push(`${pl(S.envois, "envoi")}, au-dessus de ton rythme habituel (${String(moy).replace(".", ",")} par semaine).`);
    else if (S.envois) P.push(`${pl(S.envois, "envoi")} pour l'instant. Mieux vaut quelques dossiers soignés que beaucoup d'envois à la chaîne.`);
    else if (jour <= 1) P.push("La semaine commence : deux ou trois candidatures soignées suffisent pour avancer.");
    else P.push("Pas encore d'envoi cette semaine. Une seule candidature bien ciblée aujourd'hui, et la semaine est lancée.");
    if (S.refus) P.push(`${pl(S.refus, "refus")} : ${S.refus > 1 ? "ils veulent" : "il veut"} dire que ton dossier a été lu. Ce n'est pas un jugement sur toi.`);
    if (totEnt && totEnv >= 5) { const k = Math.max(1, Math.round(totEnv / totEnt)); P.push(`Chez toi, il faut en moyenne ${k} candidatures pour décrocher un entretien : chaque envoi te rapproche du suivant.`); }
    else if (enLecture) P.push(`${pl(enLecture, "candidature")} ${enLecture > 1 ? "sont" : "est"} encore en lecture : les réponses arrivent souvent en une à trois semaines.`);
    return { S, passees, moy, P, lun };
  }
  function bilanHTML() {
    const { S, passees, P, lun } = bilan();
    const k = (n, l) => `<div class="bil-k"><b>${n}</b><span>${l}</span></div>`;
    const bar = (n, obj) => `<span class="bar"><i style="width:${Math.min(100, Math.round(n / obj * 100))}%"></i></span>`;
    const weeks = [...passees].reverse().concat([{ debut: lun, ...S, cur: true }]), mx = Math.max(1, ...weeks.map((w) => w.envois));
    const hist = weeks.map((w) => `<div class="${w.cur ? "cur" : ""}"><span class="col" title="${w.envois} envois, ${w.reponses} réponses"><i style="height:${Math.round((w.envois - Math.min(w.reponses, w.envois)) / mx * 100)}%"></i><i class="r" style="height:${Math.round(Math.min(w.reponses, w.envois) / mx * 100)}%"></i></span>${w.cur ? "cette sem." : fmt(w.debut, { day: "numeric", month: "short" }).replace(".", "")}</div>`).join("");
    return `<div class="bil"><p class="bil-msg">${esc(P.slice(0, 3).join(" "))}</p>
      <div class="bil-grid">${k(S.envois, S.envois > 1 ? "envois" : "envoi")}${k(S.reponses, S.reponses > 1 ? "réponses" : "réponse")}${k(S.entretiens, S.entretiens > 1 ? "entretiens" : "entretien")}${k(S.reseau, "réseau")}</div>
      <details class="sec"><summary>Mon objectif et mes 4 dernières semaines <small>${S.envois}/${OBJ_ENVOIS} envois · ${S.reseau}/${OBJ_RESEAU} messages</small></summary><div class="body">
        <div class="bil-obj"><span>Candidatures</span>${bar(S.envois, OBJ_ENVOIS)}<b>${S.envois} / ${OBJ_ENVOIS}</b><span>Messages réseau</span>${bar(S.reseau, OBJ_RESEAU)}<b>${S.reseau} / ${OBJ_RESEAU}</b>${S.relances ? `<span>Relances</span><span></span><b>${S.relances}</b>` : ""}</div>
        <div class="bil-hist">${hist}</div><div class="bil-leg"><span><i></i>envois</span><span><i class="r"></i>dont réponses</span></div>
        <p class="ch-note">Objectif conseillé : ${OBJ_ENVOIS} candidatures soignées et ${OBJ_RESEAU} messages à des personnes par semaine. Le réseau compte autant que les envois.</p></div></details></div>`;
  }
  function renderBilan() {
    if (!ready()) return;
    let sec = document.getElementById("bilan-panel");
    const grid = document.querySelector("#accueil .home-grid") || document.querySelector(".home-grid");
    if (!grid) return;
    if (!state.cands.length) { if (sec) sec.hidden = true; return; }
    if (!sec) { sec = document.createElement("section"); sec.className = "home-block"; sec.id = "bilan-panel"; (document.getElementById("picks-panel") || grid).after(sec); }
    sec.hidden = false;
    sec.innerHTML = `<div class="row between"><h2 class="home-h">Mon bilan de la semaine</h2><span class="home-more">depuis lundi</span></div>${bilanHTML()}`;
  }
  window.jobelloBilan = bilan;
  const _rh = renderHome;
  renderHome = function () { const r = _rh.apply(this, arguments); try { chancesAccueil(); } catch (e) {} try { renderBilan(); } catch (e) {} return r; };
  if (ready()) { try { chancesAccueil(); renderBilan(); if (typeof renderCands === "function") renderCands(); } catch (e) {} }
})();
