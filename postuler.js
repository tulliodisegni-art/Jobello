/* Jobello : « Swipe et ça part ».
   - Sur le téléphone, on fait défiler les offres : à droite = je postule, à gauche = pas pour moi.
   - Chaque offre validée part dans la file des agents (demandes/dossiers, auto:true).
   - La tâche « Agents Jobello » (Claude du projet) prépare CV + lettre, puis plusieurs agents
     remplissent et envoient les candidatures en même temps dans Chrome, sur l'ordinateur.
   - L'appli prépare les PDF à joindre (lien temporaire) et montre l'avancement de chaque agent.
   Suivi d'une candidature : c.envoi = { statut: a_valider | valide | en_cours | envoyee | bloquee, auto, valideLe,
     fichiers: [{ type, nom, url }], fichiersLe, debut, fin, raison, agent }.
   Réglages : docs path demandes/envois = { valider: false, passage: { le, chrome, texte } }.
   Départ immédiat : une fois le téléphone et l'ordi reliés (jeton de la tâche collé ici, rangé dans Vault),
     la base réveille la tâche dès qu'une offre est swipée (fonctions agents_* de Supabase).
   Ce fichier se charge après la page de l'appli : il utilise ses données (state) et ses outils. */
(function () {
  const css = `
  .ag-go{display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:0 0 10px;padding:14px;border-radius:16px;border:0;background:var(--hero);color:var(--hero-fg);font:inherit;cursor:pointer;box-shadow:0 6px 18px color-mix(in srgb,#0b2e6b 22%,transparent)}
  .ag-go .ic{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,#fff 18%,transparent);font-size:1.25rem}
  .ag-go .tx{flex:1;min-width:0;display:flex;flex-direction:column}.ag-go b{font-size:1.02rem}.ag-go small{color:var(--hero-muted);font-size:.82rem}
  .ag-go .ch{flex:none;font-size:1.4rem}
  .ag-list{display:flex;flex-direction:column;gap:6px}
  .ag-it{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;background:var(--surface);border:1px solid var(--line);cursor:pointer}
  .ag-it .dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--s-todo)}
  .ag-it.run .dot{background:var(--accent);animation:agp 1.1s ease-in-out infinite}
  .ag-link{display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:0 0 10px;padding:11px 14px;border-radius:14px;border:1.5px dashed var(--accent);background:var(--surface);color:var(--fg);font:inherit;cursor:pointer}
  .ag-link.on{border-style:solid;border-color:var(--line)}.ag-link.ko{border-color:var(--s-follow)}
  .ag-link .ic{flex:none;font-size:1.25rem}.ag-link .tx{flex:1;min-width:0;display:flex;flex-direction:column}.ag-link small{color:var(--muted);font-size:.82rem}.ag-link .ch{flex:none;font-size:1.3rem;color:var(--muted)}
  .ag-steps{margin:14px 0;padding-left:22px;display:flex;flex-direction:column;gap:12px;line-height:1.45}
  .ag-steps input{width:100%;margin-top:6px}
  .ag-it.ok .dot{background:var(--accent)}.ag-it.ko .dot{background:#e8782f}
  .ag-it .t{flex:1;min-width:0;display:flex;flex-direction:column}.ag-it .t b{font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ag-it .t span{font-size:.8rem;color:var(--muted)}
  .ag-it .st{flex:none;font-size:.74rem;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--surface-2);white-space:nowrap}
  .ag-it.ok .st{background:var(--accent-soft);color:var(--accent)}.ag-it.ko .st{background:var(--warn-bg);color:var(--warn-fg)}
  .ag-meta{font-size:.8rem;color:var(--muted);margin:8px 2px 0}
  .ag-set{display:flex!important;flex-direction:row!important;align-items:center;gap:8px;font-size:.84rem;color:var(--muted);margin-top:8px;font-weight:400}.ag-set input{width:auto!important;margin:0;flex:none}
  @keyframes agp{50%{opacity:.35}}
  .sw-ov{position:fixed;inset:0;z-index:38;background:var(--bg);display:flex;flex-direction:column;padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain}
  .sw-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .sw-top h2{margin:0;font-family:var(--display);font-size:1.15rem}.sw-top .n{color:var(--muted);font-size:.85rem}
  .sw-stack{position:relative;flex:1;min-height:0;max-width:520px;width:100%;margin:0 auto}
  .sw-card{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;padding:18px;border-radius:22px;background:var(--surface);border:1px solid var(--line);box-shadow:0 12px 30px color-mix(in srgb,#000 14%,transparent);touch-action:pan-y;user-select:none;-webkit-user-select:none;overflow:hidden;will-change:transform}
  .sw-card.back{transform:scale(.95) translateY(12px);opacity:.7;pointer-events:none}
  .sw-card .ent{font-family:var(--display);font-size:1.5rem;font-weight:700;line-height:1.15}
  .sw-card .pst{font-size:1.06rem;font-weight:600}
  .sw-card .inf{font-size:.86rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .sw-card .why{font-size:.92rem;padding:8px 10px;border-radius:12px;background:var(--accent-soft)}
  .sw-card .desc{flex:1;min-height:0;overflow:auto;font-size:.86rem;color:var(--muted);white-space:pre-line;-webkit-mask-image:linear-gradient(#000 80%,transparent);mask-image:linear-gradient(#000 80%,transparent)}
  .sw-card .lnk{font-size:.85rem}
  .sw-stamp{position:absolute;top:22px;padding:4px 12px;border:3px solid;border-radius:10px;font-weight:800;font-size:1.25rem;opacity:0;transform:rotate(-12deg);pointer-events:none}
  .sw-stamp.yes{left:18px;color:var(--accent);border-color:var(--accent)}.sw-stamp.no{right:18px;color:#d0573a;border-color:#d0573a;transform:rotate(12deg)}
  .sw-btns{display:flex;justify-content:center;align-items:center;gap:22px;padding-top:14px}
  .sw-btns button{width:62px;height:62px;border-radius:50%;font-size:1.6rem;display:grid;place-items:center;padding:0;border:1px solid var(--line);background:var(--surface);box-shadow:0 4px 12px color-mix(in srgb,#000 10%,transparent)}
  .sw-btns .no{color:#d0573a}.sw-btns .yes{width:74px;height:74px;background:var(--accent);color:var(--accent-ink);border:0}
  .sw-btns .undo{width:46px;height:46px;font-size:1.1rem;color:var(--muted)}
  .sw-help{text-align:center;font-size:.8rem;color:var(--muted);margin-top:8px}
  .sw-end{margin:auto;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center;max-width:380px}
  .sw-end .big{font-size:2.6rem}
  `;
  const stEl = document.createElement("style"); stEl.textContent = css; document.head.appendChild(stEl);

  const ENVOI_URL = "https://tulliodisegni-art.github.io/Jobello/";
  /* Passages de la tâche « Agents Jobello » : toutes les heures, de 8h17 à 21h17 (heure de Paris) */
  const AG_SLOTS = Array.from({ length: 14 }, (_, i) => (8 + i) * 60 + 17);
  const ready = () => !!(state && state.loaded && state.db);
  let cfg = { valider: false };
  let lien = null; // départ immédiat : état du lien téléphone ↔ ordi (fonction agents_status de la base)
  const relie = () => !!(lien && lien.relie);
  const cand = (id) => state.cands.find((c) => c.id === id);
  const nextSlot = () => { const m = parisMin(), s = AG_SLOTS.find((x) => x > m); return s != null ? hhmm(s) : "demain " + hhmm(AG_SLOTS[0]); };
  const quand = () => relie() ? "tout de suite" : "vers " + nextSlot();

  /* ---------- File d'attente (écritures l'une après l'autre, pour ne rien perdre en swipant vite) ---------- */
  let chain = Promise.resolve();
  const queue = (fn) => (chain = chain.then(fn, fn));
  async function reread(path) { try { const s = await state.db.doc(path).get(); return s.exists ? s.data() : null; } catch { return null; } }

  function offreOf(o) {
    return { titre: o.titre || "", entreprise: o.entreprise || "", ville: o.ville || "", url: o.url || "", jobId: o.jobId || "", type: o.type || "", salaire: o.salaire || "", source: o.source || "", description: String(o.description || "").slice(0, 8000), score: o.score ?? null, pourquoi: o.pourquoi || "", mode: o.mode || "" };
  }
  const postuler = (o) => queue(async () => {
    const cur = (await reread("demandes/dossiers")) || state.demandes || { liste: [] };
    const liste = (cur.liste || []).filter((d) => !(d.url === o.url && d.statut === "erreur"));
    const d = liste.find((x) => x.url === o.url || x.cle === offerKey(o));
    if (d) d.auto = true; else liste.push({ url: o.url, cle: offerKey(o), offre: offreOf(o), statut: "en_attente", auto: true, demandeLe: new Date().toISOString() });
    const doc = { ...cur, liste: liste.slice(-60) };
    await state.db.doc("demandes/dossiers").set(doc); state.demandes = doc;
  });
  const annulerDemande = (o) => queue(async () => {
    const cur = (await reread("demandes/dossiers")) || { liste: [] };
    const liste = (cur.liste || []).filter((d) => !((d.url === o.url || d.cle === offerKey(o)) && d.statut === "en_attente" && d.auto));
    const doc = { ...cur, liste }; await state.db.doc("demandes/dossiers").set(doc); state.demandes = doc;
  });
  const marquerVu = (o, retirer) => queue(async () => {
    const a = (await reread("alertes/jour")) || state.alertes || { offres: [], vus: [] }, k = [o.url, offerKey(o)];
    a.vus = retirer ? (a.vus || []).filter((x) => !k.includes(x)) : [...(a.vus || []), ...k].slice(-400);
    await state.db.doc("alertes/jour").set(a); state.alertes = a;
  });

  /* ---------- Les offres à faire défiler ---------- */
  const isP = (o) => (o.mode || guessMode(o.entreprise, o.titre)) === "prestataire";
  const aDefiler = () => openOffers().filter((o) => !demandeOf(o)).sort((x, y) => isP(x) - isP(y) || (y.score ?? 50) - (x.score ?? 50));

  /* ---------- Le deck ---------- */
  let deck = null;
  function openDeck() {
    if (!ready()) return toast("Connecte-toi d'abord");
    const list = aDefiler();
    deck = { list, i: 0, hist: [], oui: 0 };
    let ov = document.getElementById("sw-ov");
    if (!ov) { ov = document.createElement("div"); ov.id = "sw-ov"; ov.className = "sw-ov"; document.body.appendChild(ov); }
    ov.hidden = false; try { lockScroll(); } catch {}
    drawDeck();
  }
  function closeDeck() {
    const ov = document.getElementById("sw-ov"); if (ov) { ov.hidden = true; ov.innerHTML = ""; }
    try { unlockScroll(); } catch {}
    if (deck && deck.oui) toast(`${deck.oui} candidature${deck.oui > 1 ? "s" : ""} confiée${deck.oui > 1 ? "s" : ""} aux agents`);
    deck = null; render();
  }
  function cardHTML(o, back) {
    const sal = o.salaire && o.salaire !== "N/A" ? o.salaire : "";
    return `<div class="sw-card${back ? " back" : ""}">
      ${back ? "" : `<span class="sw-stamp yes">POSTULER</span><span class="sw-stamp no">NON</span>`}
      <span class="inf">${modeTag(o.mode || guessMode(o.entreprise, o.titre) || "direct")}${o.score != null ? `<span class="fit-pill v-${esc(o.verdict || "tente")}">${o.score} % pour toi</span>` : ""}${ageTag(o)}</span>
      <span class="ent">${esc(o.entreprise || "Société ?")}</span>
      <span class="pst">${esc(o.titre || "")}</span>
      <span class="inf">${esc([o.ville, sal, o.type].filter(Boolean).join(" · "))}</span>
      ${o.pourquoi ? `<span class="why">${esc(o.pourquoi)}</span>` : ""}
      <div class="desc">${esc(String(o.description || "").slice(0, 2500)) || "<i>Description complète sur l'annonce.</i>"}</div>
      <a class="lnk" href="${esc(offerHref(o))}" target="_blank" rel="noopener">Voir l'annonce ›</a>
    </div>`;
  }
  function drawDeck() {
    const ov = document.getElementById("sw-ov"); if (!ov || !deck) return;
    const o = deck.list[deck.i], nx = deck.list[deck.i + 1], reste = deck.list.length - deck.i;
    const head = `<div class="sw-top"><div><h2>Swipe et ça part</h2><span class="n">${o ? `${reste} offre${reste > 1 ? "s" : ""} · ${deck.oui} envoyée${deck.oui > 1 ? "s" : ""} aux agents` : ""}</span></div><button type="button" class="ghost" data-sw="close">Fermer</button></div>`;
    if (!o) {
      ov.innerHTML = head + `<div class="sw-end"><span class="big">${deck.oui ? "🚀" : "✨"}</span>
        <b>${deck.oui ? `${deck.oui} candidature${deck.oui > 1 ? "s" : ""} confiée${deck.oui > 1 ? "s" : ""} aux agents` : "Plus d'offre à trier pour l'instant"}</b>
        <span class="muted">${deck.oui ? `Claude prépare CV et lettre pendant que les agents postulent en même temps sur ton ordinateur (Chrome ouvert). ${relie() ? "Ça part tout de suite." : `Prochain passage vers ${nextSlot()}.`} Tu suis tout sur l'accueil, dans « Mes agents ».` : "La veille en ajoute chaque matin. Reviens demain !"}</span>
        <button type="button" class="primary" data-sw="close">${deck.oui ? "Voir mes agents" : "Fermer"}</button></div>`;
      return;
    }
    ov.innerHTML = head + `<div class="sw-stack">${nx ? cardHTML(nx, true) : ""}${cardHTML(o)}</div>
      <div class="sw-btns"><button type="button" class="no" data-sw="no" aria-label="Pas pour moi">✕</button><button type="button" class="undo" data-sw="undo" aria-label="Annuler le dernier" ${deck.hist.length ? "" : "disabled"}>↶</button><button type="button" class="yes" data-sw="yes" aria-label="Postuler">✓</button></div>
      <p class="sw-help">À droite : je postule (les agents envoient tout seuls). À gauche : pas pour moi.</p>`;
    bindSwipe(ov.querySelector(".sw-card:not(.back)"));
  }
  function bindSwipe(el) {
    if (!el) return; let x0 = null, y0 = 0, dx = 0, drag = false;
    const yes = el.querySelector(".sw-stamp.yes"), no = el.querySelector(".sw-stamp.no");
    el.addEventListener("pointerdown", (e) => { if (e.target.closest("a")) return; x0 = e.clientX; y0 = e.clientY; dx = 0; drag = false; el.style.transition = "none"; });
    el.addEventListener("pointermove", (e) => {
      if (x0 == null) return; dx = e.clientX - x0; const dy = e.clientY - y0;
      if (!drag && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { drag = true; try { el.setPointerCapture(e.pointerId); } catch {} }
      if (!drag) return;
      el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 90)); no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    const up = () => {
      if (x0 == null) return; x0 = null;
      if (drag && Math.abs(dx) > 90) return decide(dx > 0, el);
      el.style.transition = "transform .2s"; el.style.transform = ""; yes.style.opacity = 0; no.style.opacity = 0;
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }
  function decide(oui, el) {
    if (!deck) return; const o = deck.list[deck.i]; if (!o) return;
    el = el || document.querySelector("#sw-ov .sw-card:not(.back)");
    if (el) { el.style.transition = "transform .25s ease-in, opacity .25s"; el.style.transform = `translateX(${oui ? 600 : -600}px) rotate(${oui ? 25 : -25}deg)`; el.style.opacity = "0"; }
    try { navigator.vibrate && navigator.vibrate(oui ? 18 : 8); } catch {}
    deck.hist.push({ o, oui }); if (oui) deck.oui++;
    (oui ? postuler(o) : marquerVu(o)).catch(() => toast("Pas enregistré : vérifie ta connexion"));
    setTimeout(() => { if (!deck) return; deck.i++; drawDeck(); }, 210);
  }
  function undo() {
    if (!deck || !deck.hist.length) return; const h = deck.hist.pop();
    if (h.oui) { deck.oui--; annulerDemande(h.o).catch(() => {}); } else marquerVu(h.o, true).catch(() => {});
    deck.i = Math.max(0, deck.i - 1); drawDeck();
  }

  /* ---------- Où en sont les agents ---------- */
  function suivi() {
    const L = [], seen = new Set(), now = Date.now();
    (state.demandes?.liste || []).filter((d) => d.auto).forEach((d) => {
      const c = d.candidature && cand(d.candidature);
      if (c) return; // la candidature existe : on la suit plus bas
      if (d.statut === "erreur") return L.push({ k: "ko", t: d.offre?.entreprise, s: d.offre?.titre, st: "Échec", d: d.raison || "Dossier non préparé", url: d.url });
      L.push({ k: "wait", t: d.offre?.entreprise, s: d.offre?.titre, st: d.statut === "en_preparation" ? "CV et lettre…" : "En file", d: d.statut === "en_preparation" ? "Claude écrit ta lettre et adapte ton CV" : relie() ? "Les agents démarrent sur ton ordinateur" : `Prochain passage des agents vers ${nextSlot()}`, url: d.url, at: d.demandeLe });
    });
    state.cands.filter((c) => c.envoi && c.envoi.auto !== false).forEach((c) => {
      if (seen.has(c.id)) return; seen.add(c.id); const e = c.envoi;
      const recent = (iso) => iso && now - new Date(iso).getTime() < 3 * 864e5;
      if (e.statut === "envoyee" || c.statut !== "a_envoyer") { if (recent(e.fin || c.dateEnvoi)) L.push({ k: "ok", id: c.id, t: c.entreprise, s: c.poste, st: "Envoyée ✓", d: `Partie ${e.fin ? "le " + fmt(e.fin.slice(0, 10), { day: "numeric", month: "long" }) + " à " + new Date(e.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}${e.via ? " via " + e.via : ""}`, at: e.fin }); return; }
      if (e.statut === "bloquee") return L.push({ k: "ko", id: c.id, t: c.entreprise, s: c.poste, st: "À finir toi-même", d: e.raison || "L'agent n'a pas pu terminer" });
      if (e.statut === "en_cours") return L.push({ k: "run", id: c.id, t: c.entreprise, s: c.poste, st: "Agent au travail", d: e.etape || "Remplit le formulaire sur le site", at: e.debut });
      if (e.statut === "a_valider") return L.push({ k: "wait", id: c.id, t: c.entreprise, s: c.poste, st: "À valider", d: "Touche pour relire et lancer l'envoi" });
      L.push({ k: "wait", id: c.id, t: c.entreprise, s: c.poste, st: "Prête", d: `CV et lettre prêts${e.fichiers?.length ? "" : " (PDF en cours)"} · envoi ${quand()}` });
    });
    const ord = { run: 0, ko: 1, wait: 2, ok: 3 };
    return L.sort((a, b) => ord[a.k] - ord[b.k]);
  }
  function panelHTML() {
    const n = ready() ? aDefiler().length : 0, L = suivi(), cfgP = cfg.passage;
    const run = L.filter((x) => x.k === "run").length, ok = L.filter((x) => x.k === "ok").length, enAttente = L.filter((x) => x.k === "wait").length;
    const go = `<button type="button" class="ag-go" data-sw="open"><span class="ic">👆</span><span class="tx"><b>${n ? `Swipe ${n} offre${n > 1 ? "s" : ""}` : "Swipe et ça part"}</b><small>${n ? "À droite : les agents postulent pour toi" : "Plus d'offre à trier pour l'instant"}</small></span><span class="ch">›</span></button>`;
    if (!L.length) return go + lienHTML();
    const pc = cfgP && cfgP.le && Date.now() - new Date(cfgP.le).getTime() < 2 * 3600e3 ? (cfgP.chrome ? `Dernier passage ${new Date(cfgP.le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : Chrome connecté.` : `Dernier passage ${new Date(cfgP.le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : ton ordinateur n'était pas joignable. Allume-le, ouvre Chrome et l'extension Claude.`) : "";
    return go + lienHTML() + `<div class="row between" style="margin:4px 2px 8px"><h2 class="home-h" style="margin:0">Mes agents</h2><span class="home-more">${[run && run + " au travail", enAttente && enAttente + " en attente", ok && ok + " envoyée" + (ok > 1 ? "s" : "")].filter(Boolean).join(" · ")}</span></div>
      <div class="ag-list">${L.slice(0, 12).map((x) => `<div class="ag-it ${x.k}" ${x.id ? `data-open="${esc(x.id)}"` : ""}><span class="dot"></span><span class="t"><b>${esc(x.t || "Offre")}</b><span>${esc(x.s || "")}${x.d ? " · " + esc(x.d) : ""}</span></span><span class="st">${esc(x.st)}</span></div>`).join("")}</div>
      ${pc ? `<p class="ag-meta">${esc(pc)}</p>` : `<p class="ag-meta">${relie() ? "Les agents partent dès que tu swipes et travaillent dans Chrome sur ton ordinateur : laisse-le allumé avec Chrome ouvert." : "Les agents passent toutes les heures (8h17-21h17) et travaillent dans Chrome sur ton ordinateur : laisse-le allumé avec Chrome ouvert."}</p>`}
      <label class="ag-set"><input type="checkbox" data-sw="valider" ${cfg.valider ? "checked" : ""}> Me demander un dernier OK avant chaque envoi</label>`;
  }
  /* ---------- Départ immédiat : relier le téléphone et l'ordi ---------- */
  const heure = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  function lienHTML() {
    if (!lien || !lien.disponible) return "";
    if (!relie()) return `<button type="button" class="ag-link" data-sw="lier"><span class="ic">⚡</span><span class="tx"><b>Relier mon téléphone et mon ordi</b><small>Une seule fois : ensuite chaque swipe part tout de suite</small></span><span class="ch">›</span></button>`;
    const ko = lien.statut && lien.statut >= 400;
    const sub = ko ? "La clé ne marche plus : touche ici pour la remplacer" : lien.enCours ? "Les agents travaillent sur ton ordi en ce moment" : "Chaque swipe part tout de suite" + (lien.dernier ? " · dernier départ " + heure(lien.dernier) : "");
    return `<button type="button" class="ag-link on${ko ? " ko" : ""}" data-sw="lier"><span class="ic">⚡</span><span class="tx"><b>Téléphone et ordi reliés</b><small>${esc(sub)}</small></span><span class="ch">›</span></button>`;
  }
  const tacheURL = () => lien && /^trig_[A-Za-z0-9]+$/.test(lien.tache || "") ? "https://claude.ai/code/routines/" + lien.tache : "https://claude.ai/code/routines";
  function openLien() {
    const on = relie();
    openSheet(`<div class="sheet-head"><div style="min-width:0"><span class="label">Départ immédiat</span><h2>Relier mon téléphone et mon ordi</h2></div><button type="button" class="ghost" data-act="close">Fermer</button></div>
      <p>${on ? "C'est relié : chaque offre swipée à droite part tout de suite dans Chrome sur ton ordinateur, sans attendre l'heure. Pour changer de clé, refais les étapes ci-dessous." : "À faire une seule fois, sur ton ordinateur. Ensuite, chaque offre swipée à droite part tout de suite dans Chrome, sans attendre l'heure."}</p>
      <ol class="ag-steps">
        <li>Ouvre ta tâche Claude « Agents Jobello » : <a href="${tacheURL()}" target="_blank" rel="noopener">ouvrir la tâche</a></li>
        <li>Clique sur la petite flèche à côté de son nom, puis sur « Modifier ».</li>
        <li>Dans « Déclencheur », clique sur + puis sur « API ». Clique sur « Générer un token » et copie-le.</li>
        <li>Colle-le ici (Ctrl+V) :<input id="lien-tok" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"></li>
      </ol>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="primary" data-sw="lien-ok">Relier</button>${on ? `<button type="button" class="ghost" data-sw="lien-off">Couper le lien</button>` : ""}</div>
      <p class="ag-meta">Le jeton reste rangé dans le coffre de ta base Jobello : l'appli ne le réaffiche jamais. Il sert seulement à réveiller tes agents.</p>`, "lien");
  }
  async function majLien() {
    if (!window.jobelloRpc) return;
    try { lien = await window.jobelloRpc("agents_status"); } catch (e) { return; }
    try { drawPanel(); } catch {}
  }
  async function lienAction(a) {
    try {
      if (a === "lien-ok") {
        const v = (document.getElementById("lien-tok")?.value || "").trim();
        if (!v) return toast("Colle d'abord le jeton");
        await window.jobelloRpc("agents_set_token", { p_token: v });
        closeSheet(); toast("C'est relié : chaque swipe part tout de suite sur ton ordi");
        await majLien(); reveil(true);
      } else if (a === "lien-off") {
        await window.jobelloRpc("agents_unlink");
        closeSheet(); toast("Lien coupé : les agents repassent toutes les heures"); await majLien();
      }
    } catch (e) { toast((e && e.message) || "Ça n'a pas marché : réessaie"); }
  }
  /* L'appli ouverte sur l'ordinateur réveille les agents s'il reste des candidatures en attente (ordi qui était éteint) */
  const surOrdi = () => !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && matchMedia("(pointer: fine)").matches;
  async function reveil(force) {
    if (!relie() || !ready() || !surOrdi()) return;
    const attente = (state.demandes?.liste || []).some((d) => d.auto && d.statut === "en_attente") || state.cands.some((c) => c.statut === "a_envoyer" && c.envoi && c.envoi.statut === "valide");
    if (!attente || lien.enCours) return;
    const p = cfg.passage; if (!force && p && p.chrome === false && Date.now() - new Date(p.le).getTime() < 30 * 60e3) return;
    const last = +localStorage.getItem("jb-reveil") || 0; if (!force && Date.now() - last < 10 * 60e3) return;
    localStorage.setItem("jb-reveil", String(Date.now()));
    try { await window.jobelloRpc("agents_reveil"); setTimeout(majLien, 4000); } catch {}
  }

  function drawPanel() {
    const home = document.getElementById("v-accueil") || document.querySelector("#prep-panel")?.parentElement; if (!home) return;
    let p = document.getElementById("ag-panel");
    if (!p) { p = document.createElement("section"); p.id = "ag-panel"; p.className = "home-block"; const ref = document.getElementById("prep-panel"); if (ref) ref.before(p); else return; }
    p.innerHTML = ready() ? panelHTML() : "";
    // Le bloc « Dossiers demandés à Claude » ne montre pas les demandes confiées aux agents (elles sont ici)
    const pp = document.getElementById("prep-list");
    if (pp) { const autos = new Set((state.demandes?.liste || []).filter((d) => d.auto).map((d) => d.url)); if (autos.size) { pp.querySelectorAll(".prep-it").forEach((it) => { const a = it.querySelector("a[href]"); if (a && autos.has(a.getAttribute("href"))) it.remove(); }); const P = document.getElementById("prep-panel"); if (P && !pp.children.length) P.hidden = true; } }
  }

  /* ---------- Les dossiers des agents : lien avec la candidature, validation, PDF à joindre ---------- */
  let busy = false;
  async function pdfDe(d) {
    const stored = d.assetId && d.pdfAJour !== false && !(d.type !== "cv" && d.pdfGenere) && /\.pdf$/i.test(d.fichier || ".pdf");
    let blob = stored ? await fetch("/_blob/" + d.assetId).then((r) => r.ok ? r.blob() : null).catch(() => null) : null;
    if (!blob && (d.contenu || "").trim()) blob = await buildPdf(d);
    return blob;
  }
  async function preparer() {
    if (busy || !ready() || !window.jobelloFileLink) return; busy = true;
    try {
      // 1. Les dossiers prêts d'une demande « agents » reçoivent leur suivi d'envoi
      for (const d of (state.demandes?.liste || []).filter((x) => x.auto && x.statut === "fait" && x.candidature)) {
        const c = cand(d.candidature); if (!c || c.envoi || c.statut !== "a_envoyer") continue;
        c.envoi = { statut: cfg.valider ? "a_valider" : "valide", auto: true, demandeLe: d.demandeLe || "", valideLe: cfg.valider ? "" : new Date().toISOString() };
        await saveCand(c);
      }
      // 2. Les PDF à joindre (CV adapté + lettre) : rangés dans tes fichiers, avec un lien temporaire pour l'agent
      // (aussi pendant qu'un agent remplit déjà le formulaire : les PDF partent dès que la lettre ET le CV adapté sont écrits)
      for (const c of state.cands.filter((x) => x.envoi && ["valide", "a_valider", "en_cours"].includes(x.envoi.statut) && !(x.envoi.fichiers || []).length && x.statut === "a_envoyer")) {
        const dCv = c.cvAdapte ? state.docs.find((d) => d.id === c.cvAdapte) : state.docs.find((d) => d.id === c.cv), dL = c.lettre ? state.docs.find((d) => d.id === c.lettre) : null;
        if (!dCv || (c.lettre && !dL)) continue; // les agents rédacteurs n'ont pas encore fini : jamais l'ancien CV à la place du CV adapté
        const docs = [["cv", dCv], ["lettre", dL]].filter(([, d]) => d);
        const fichiers = [];
        for (const [type, d] of docs) {
          try { const blob = await pdfDe(d); if (!blob) continue; const nom = docFileName(d); const url = await window.jobelloFileLink(`envois/${c.id}-${type}.pdf`, blob); fichiers.push({ type, nom, url }); } catch (e) {}
        }
        if (fichiers.length) { c.envoi = { ...c.envoi, fichiers, fichiersLe: new Date().toISOString() }; await saveCand(c); }
      }
    } catch (e) {}
    busy = false;
  }

  /* ---------- Fiche d'une candidature suivie par les agents ---------- */
  const _openCand = openCand;
  openCand = function (id) {
    const r = _openCand.apply(this, arguments);
    try {
      const c = cand(id), e = c && c.envoi; if (!e) return r;
      const sh = document.querySelector("#overlay .sheet .sheet-head"); if (!sh) return r;
      const box = document.createElement("div"); box.className = "relance-box";
      const t = { a_valider: "Les agents attendent ton OK pour envoyer cette candidature.", valide: relie() ? "Prête : un agent l'envoie tout de suite si ton ordinateur est allumé avec Chrome ouvert." : `Prête : un agent l'enverra au prochain passage (vers ${nextSlot()}).`, en_cours: "Un agent est en train de remplir le formulaire sur le site.", envoyee: `Envoyée par un agent${e.fin ? " le " + fmt(e.fin.slice(0, 10), { day: "numeric", month: "long" }) : ""}${e.via ? " via " + e.via : ""}.`, bloquee: `L'agent n'a pas pu finir : ${e.raison || "raison inconnue"}. Termine-la toi-même avec « Postuler » plus bas.` }[e.statut] || "";
      box.innerHTML = `<span class="lbl" style="font-weight:600">🤖 Agents Jobello</span><p style="margin:0">${esc(t)}</p>
        <div class="row">${e.statut === "a_valider" ? `<button type="button" class="small primary" data-ag="ok" data-id="${esc(c.id)}">Envoyer</button>` : ""}${["a_valider", "valide", "bloquee"].includes(e.statut) ? `<button type="button" class="small ghost" data-ag="stop" data-id="${esc(c.id)}">${e.statut === "bloquee" ? "Je m'en occupe" : "Ne pas l'envoyer"}</button>` : ""}${e.statut === "bloquee" ? `<button type="button" class="small" data-ag="retry" data-id="${esc(c.id)}">Réessayer</button>` : ""}</div>`;
      sh.after(box);
    } catch (err) {}
    return r;
  };
  async function agAction(a, id) {
    const c = cand(id); if (!c || !c.envoi) return;
    if (a === "ok") c.envoi = { ...c.envoi, statut: "valide", valideLe: new Date().toISOString() };
    if (a === "retry") c.envoi = { ...c.envoi, statut: "valide", raison: "", essais: (c.envoi.essais || 0) + 1 };
    if (a === "stop") c.envoi = { ...c.envoi, statut: "annulee", auto: false };
    if (await saveCand(c)) { toast(a === "stop" ? "D'accord, les agents n'y touchent plus" : relie() ? "C'est parti : un agent l'envoie tout de suite" : `Les agents l'enverront vers ${nextSlot()}`); closeSheet(); render(); preparer(); }
  }

  /* ---------- Branchements ---------- */
  document.addEventListener("click", (e) => {
    const s = e.target.closest && e.target.closest("[data-sw],[data-ag]"); if (!s) return;
    if (s.dataset.ag) { e.preventDefault(); e.stopPropagation(); return agAction(s.dataset.ag, s.dataset.id); }
    const a = s.dataset.sw; if (a === "valider") return; e.preventDefault(); e.stopPropagation();
    if (a === "lier") return openLien();
    if (a === "lien-ok" || a === "lien-off") return lienAction(a);
    if (a === "open") return openDeck();
    if (a === "close") { const vers = deck && deck.oui; closeDeck(); if (vers) document.getElementById("ag-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (a === "yes") return decide(true);
    if (a === "no") return decide(false);
    if (a === "undo") return undo();
  }, true);
  document.addEventListener("change", async (e) => {
    const s = e.target.closest && e.target.closest('[data-sw="valider"]'); if (!s) return;
    cfg = { ...cfg, valider: s.checked };
    try { await state.db.doc("demandes/envois").set(cfg, { merge: true }); toast(s.checked ? "Je te demanderai ton OK avant chaque envoi" : "Swipe à droite = envoi direct"); } catch { toast("Réglage non enregistré"); }
  });
  document.addEventListener("keydown", (e) => { if (!deck) return; if (e.key === "ArrowRight") decide(true); else if (e.key === "ArrowLeft") decide(false); else if (e.key === "Escape") closeDeck(); });

  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { drawPanel(); clearTimeout(render.agT); render.agT = setTimeout(preparer, 1500); } catch (e) {} return r; };
  clearInterval(window.__agTick); window.__agTick = setInterval(() => { try { if (!document.hidden) { drawPanel(); majLien().then(() => reveil()); } } catch {} }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) majLien().then(() => reveil()); });
  let hooked = false;
  (function hook() {
    if (!(state && state.db)) return setTimeout(hook, 800);
    if (hooked) return; hooked = true;
    state.db.doc("demandes/envois").onSnapshot((snap) => { cfg = { valider: false, ...(snap.exists ? snap.data() : {}) }; try { drawPanel(); } catch {} }, () => {});
    if (new URLSearchParams(location.search).has("swipe")) setTimeout(() => { if (ready()) openDeck(); }, 1200);
    setTimeout(() => majLien().then(() => reveil()), 2500);
  })();
})();
