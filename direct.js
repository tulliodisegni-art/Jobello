/* Jobello : « En direct ». On regarde les agents travailler, comme dans un film :
   - l'agent Lettre écrit la lettre de motivation sous tes yeux,
   - l'agent CV adapte le CV, section par section,
   - l'agent Candidature ouvre l'offre, télécharge les PDF, les importe dans le formulaire et postule.
   Les agents (tâche Claude « Agents Jobello ») écrivent leur avancement dans docs path direct/<id de la candidature> :
     { entreprise, poste, lettre: { texte, fini }, cv: { texte, fini }, journal: [{ le, qui: chef|lettre|cv|postuleur, n, t }], fin }
   Les documents définitifs restent documents/<lettre> et documents/<cvAdapte> (l'écran les montre dès qu'ils existent).
   S'ouvre avec le bouton « Regarder en direct » (accueil, fin du swipe), ou avec ?direct dans l'adresse
   (la tâche ouvre https://…/Jobello/?agent=1&direct=1 dans Chrome sur l'ordinateur). */
(function () {
  const css = `
  .dv-ov{position:fixed;inset:0;z-index:40;background:var(--bg);display:flex;flex-direction:column;padding:calc(10px + env(safe-area-inset-top,0px)) 14px calc(12px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain}
  .dv-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .dv-top h2{margin:0;font-family:var(--display);font-size:1.2rem;display:flex;align-items:center;gap:8px}
  .dv-live{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:800;letter-spacing:.06em;color:#fff;background:#d0473a;padding:2px 8px;border-radius:99px}
  .dv-live i{width:7px;height:7px;border-radius:50%;background:#fff;animation:dvp 1s ease-in-out infinite}
  .dv-live.off{background:var(--surface-2);color:var(--muted)}.dv-live.off i{animation:none;background:var(--muted)}
  .dv-sub{flex:1;min-width:0;font-size:.84rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dv-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
  .dv-tab{flex:none;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;border:1px solid var(--line);background:var(--surface);font:inherit;font-size:.84rem;color:var(--fg);cursor:pointer;min-height:0}
  .dv-tab.on{background:var(--hero);color:var(--hero-fg);border-color:var(--hero)}
  .dv-tab .d{width:8px;height:8px;border-radius:50%;background:var(--muted)}.dv-tab .d.run{background:#3fcf9b;animation:dvp 1s infinite}.dv-tab .d.ok{background:#3fcf9b}.dv-tab .d.ko{background:#e8782f}
  .dv-chef{font-size:.84rem;color:var(--muted);margin:0 2px 8px;min-height:1.2em}
  .dv-chef b{color:var(--fg)}
  .dv-grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  @media (max-width:820px){.dv-grid{grid-template-columns:1fr;overflow:auto}.dv-lane{min-height:300px}}
  .dv-lane{display:flex;flex-direction:column;min-height:0;border-radius:18px;background:var(--surface);border:1px solid var(--line);overflow:hidden}
  .dv-lh{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
  .dv-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:1.05rem;position:relative}
  .dv-lane.run .dv-av::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--accent);opacity:.6;animation:dvr 1.4s ease-out infinite}
  .dv-lh .tx{flex:1;min-width:0;display:flex;flex-direction:column}.dv-lh b{font-size:.95rem}
  .dv-lh small{font-size:.8rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dv-st{flex:none;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--surface-2);color:var(--muted)}
  .dv-lane.run .dv-st{background:var(--accent-soft);color:var(--accent)}.dv-lane.ok .dv-st{background:var(--accent);color:var(--accent-ink)}.dv-lane.ko .dv-st{background:var(--warn-bg);color:var(--warn-fg)}
  .dv-paper{flex:1;min-height:0;overflow:auto;margin:10px;padding:16px 16px 22px;border-radius:6px;background:#fff;color:#1b1f24;box-shadow:0 2px 10px rgba(0,0,0,.12);font:13px/1.5 Georgia,"Times New Roman",serif;scroll-behavior:smooth}
  .dv-paper p{margin:0 0 8px}.dv-paper .gap{height:6px}
  .dv-paper.cv{font:12px/1.45 system-ui,sans-serif}
  .dv-paper .nm{font-size:1.35em;font-weight:800}.dv-paper .ti{color:#1d4f91;font-weight:700;margin-bottom:2px}.dv-paper .ct{color:#5b6470;font-size:.92em}
  .dv-paper .h{color:#1d4f91;font-weight:800;border-bottom:1px solid #bed0e6;margin:10px 0 4px;letter-spacing:.03em}
  .dv-paper .ro{font-weight:700;margin-top:6px}.dv-paper .or{font-style:italic;color:#5b6470}.dv-paper .li{padding-left:12px;position:relative}.dv-paper .li::before{content:"•";position:absolute;left:2px}
  .dv-paper .kv b{font-weight:700}
  .dv-caret{display:inline-block;width:2px;height:1.05em;background:#1d4f91;vertical-align:-2px;margin-left:1px;animation:dvc .8s steps(1) infinite}
  .dv-empty{flex:1;display:grid;place-items:center;text-align:center;padding:16px;color:var(--muted);font-size:.9rem}
  .dv-dots::after{content:"";animation:dvd 1.2s steps(4) infinite}
  .dv-steps{flex:1;min-height:0;overflow:auto;list-style:none;margin:0;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
  .dv-steps li{display:flex;gap:10px;align-items:flex-start;padding:6px 4px;font-size:.88rem;line-height:1.35;animation:dvin .35s ease-out}
  .dv-steps .m{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;font-weight:800;background:var(--surface-2);color:var(--muted)}
  .dv-steps li.ok .m{background:var(--accent);color:var(--accent-ink)}
  .dv-steps li.run .m{background:var(--accent-soft);color:var(--accent);animation:dvp 1s infinite}
  .dv-steps li.ko .m{background:#e8782f;color:#fff}
  .dv-steps li.nx{color:var(--muted);opacity:.6;animation:none}
  .dv-steps li .h{font-size:.74rem;color:var(--muted);margin-left:auto;flex:none}
  .dv-steps .pj{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
  .dv-steps .pj span{font-size:.76rem;padding:2px 8px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line)}
  .dv-end{margin:6px 12px 12px;padding:12px;border-radius:14px;text-align:center;font-weight:700}
  .dv-end.ok{background:var(--accent);color:var(--accent-ink);font-size:1.05rem;animation:dvin .5s ease-out}
  .dv-end.ko{background:var(--warn-bg);color:var(--warn-fg);font-weight:600;font-size:.88rem}
  .dv-foot{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding-top:10px}
  .dv-none{margin:auto;text-align:center;max-width:420px;display:flex;flex-direction:column;gap:10px;align-items:center;color:var(--muted)}
  .dv-none .big{font-size:2.4rem}
  .ag-direct{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 10px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font:inherit;cursor:pointer;text-align:left}
  .ag-direct .tx{flex:1;display:flex;flex-direction:column}.ag-direct small{color:var(--muted);font-size:.8rem}
  @keyframes dvp{50%{opacity:.35}}@keyframes dvc{50%{opacity:0}}@keyframes dvr{from{transform:scale(.85);opacity:.7}to{transform:scale(1.25);opacity:0}}
  @keyframes dvd{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
  @keyframes dvin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  `;
  const stEl = document.createElement("style"); stEl.textContent = css; document.head.appendChild(stEl);

  const ready = () => !!(typeof state !== "undefined" && state && state.loaded && state.db);
  const E = (s) => (typeof esc === "function" ? esc(s) : String(s ?? ""));
  const hm = (iso) => { try { return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const ago = (iso) => (iso ? Date.now() - new Date(iso).getTime() : Infinity);
  let directs = {}; // id de candidature -> doc direct/<id>
  let passage = null; // demandes/envois.passage
  let open = false, sel = null;

  /* Étapes de l'agent Candidature (n = numéro écrit par l'agent) */
  const ETAPES = ["Ouvre l'annonce", "Clique sur « Postuler »", "Remplit tes informations", "Télécharge ton CV et ta lettre", "Importe les documents dans le formulaire", "Répond aux questions", "Envoie la candidature"];

  /* ---------- Ce qu'on montre ---------- */
  function items() {
    if (!ready()) return [];
    const L = [];
    state.cands.forEach((c) => {
      const e = c.envoi || {}, d = directs[c.id];
      const vivant = (e.auto !== false && ["en_cours", "valide", "a_valider"].includes(e.statut) && c.statut === "a_envoyer") || ago(e.fin) < 3 * 3600e3 || (d && ago(d.majLe || d.fin) < 3 * 3600e3);
      if (!d && !(e.auto && vivant)) return;
      if (!vivant) return;
      L.push({ id: c.id, c, e, d: d || {} });
    });
    (state.demandes?.liste || []).filter((x) => x.auto && x.statut === "en_attente" && !x.candidature).forEach((x) => L.push({ id: "q:" + x.url, file: x, c: { entreprise: x.offre?.entreprise, poste: x.offre?.titre }, e: {}, d: {} }));
    const rang = (x) => (x.file ? 3 : x.e.statut === "en_cours" ? 0 : ["valide", "a_valider"].includes(x.e.statut) ? 1 : 2);
    return L.sort((a, b) => rang(a) - rang(b) || ago(a.d.majLe || a.e.debut || a.e.fin) - ago(b.d.majLe || b.e.debut || b.e.fin));
  }
  const etatOf = (x) => x.file ? "wait" : x.e.statut === "envoyee" || x.c.statut === "envoyee" ? "ok" : x.e.statut === "bloquee" ? "ko" : x.e.statut === "en_cours" ? "run" : "wait";
  const docOf = (id) => id && state.docs.find((d) => d.id === id);
  const jr = (x, qui) => (x.d.journal || []).filter((j) => j.qui === qui);

  function laneTexte(x, kind) {
    const fin = kind === "lettre" ? docOf(x.c.lettre) : docOf(x.c.cvAdapte);
    const live = x.d[kind] || {};
    if (fin && (fin.contenu || "").trim()) return { texte: fin.contenu, fini: true, le: fin.updatedAt || fin.createdAt };
    if (live.texte) return { texte: live.texte, fini: !!live.fini, le: x.d.majLe };
    return { texte: "", fini: false };
  }

  /* ---------- Machine à écrire ---------- */
  const shown = {}; // clé -> nombre de caractères affichés
  const cible = {}; // clé -> { texte, type, fini }
  function paperHTML(texte, type, n, fini) {
    const t = texte.slice(0, n), caret = n < texte.length || !fini ? '<span class="dv-caret"></span>' : "";
    if (type !== "cv") return t.split("\n").map((l) => l.trim() ? `<p>${E(l)}</p>` : '<div class="gap"></div>').join("").replace(/(<\/p>|<div class="gap"><\/div>)$/, (m) => (m === "</p>" ? caret + "</p>" : m + caret)) || caret;
    const blocks = typeof docBlocks === "function" ? docBlocks(t, "cv") : t.split("\n").map((l) => ({ k: "p", t: l }));
    const cls = { name: "nm", title: "ti", contact: "ct", h: "h", role: "ro", org: "or", li: "li", desc: "or", p: "", line: "", kv: "kv" };
    const nomk = (s) => String(s || "").replace(/\*\*|__|(^|\s)_|_(\s|$)/g, "$1$2");
    return blocks.filter((b) => b.k !== "gap").map((b) => `<div class="${cls[b.k] || ""}">${b.k === "kv" ? `<b>${E(nomk(b.a))}</b> · ` : ""}${E(nomk(b.t))}</div>`).join("") + caret;
  }
  function tick() {
    if (!open) return;
    document.querySelectorAll("#dv-ov .dv-paper[data-k]").forEach((el) => {
      const k = el.dataset.k, c = cible[k]; if (!c) return;
      const tot = c.texte.length; let n = Math.min(shown[k] ?? 0, tot);
      if (n >= tot && el.dataset.done === String(tot) + c.fini) return;
      n = Math.min(tot, n + Math.max(3, Math.ceil((tot - n) / 90)));
      shown[k] = n; el.dataset.done = n >= tot ? String(tot) + c.fini : "";
      el.innerHTML = paperHTML(c.texte, c.type, n, c.fini);
      if (n < tot) el.scrollTop = el.scrollHeight;
    });
  }
  setInterval(tick, 45);

  /* ---------- Dessin ---------- */
  function laneDoc(x, kind) {
    const k = x.id + ":" + kind, t = laneTexte(x, kind), J = jr(x, kind), last = J[J.length - 1];
    const nom = kind === "lettre" ? "Agent Lettre" : "Agent CV", ic = kind === "lettre" ? "✍️" : "📄";
    const etat = t.fini ? "ok" : t.texte || (last && x.e.statut === "en_cours") ? "run" : etatOf(x) === "ko" && !t.texte ? "ko" : "wait";
    const sous = t.fini ? (kind === "lettre" ? "Lettre de motivation terminée" : "CV adapté à l'offre terminé") : last ? last.t : x.file ? "Attend le départ des agents" : x.e.statut === "en_cours" ? (kind === "lettre" ? "Lit l'annonce et relève les mots-clés" : "Choisit le CV de base") : "En attente";
    const st = { ok: "Terminé ✓", run: "Rédige…", ko: "Arrêté", wait: "En attente" }[etat];
    if (t.texte) {
      const old = cible[k];
      // Ouvert après coup sur un document fini depuis longtemps : on l'affiche d'un coup
      if (!old && t.fini && ago(t.le) > 15 * 60e3) shown[k] = t.texte.length;
      // Texte réécrit (version finale différente du brouillon) : on repart de la partie commune
      if (old && !t.texte.startsWith(old.texte.slice(0, shown[k] || 0))) { let i = 0; while (i < old.texte.length && old.texte[i] === t.texte[i]) i++; shown[k] = i; }
      cible[k] = { texte: t.texte, type: kind === "cv" ? "cv" : "lettre", fini: t.fini };
    }
    const body = t.texte ? `<div class="dv-paper${kind === "cv" ? " cv" : ""}" data-k="${E(k)}"></div>` : `<div class="dv-empty"><span>${etat === "run" ? `<span class="dv-dots">${kind === "lettre" ? "La lettre va s'écrire ici" : "Le CV va se construire ici"}</span>` : x.file ? "Elle s'écrira ici dès que les agents partent." : "Rien à écrire pour l'instant."}</span></div>`;
    return `<section class="dv-lane ${etat}"><div class="dv-lh"><span class="dv-av">${ic}</span><span class="tx"><b>${nom}</b><small>${E(sous)}</small></span><span class="dv-st">${st}</span></div>${body}</section>`;
  }
  function lanePost(x) {
    const J = jr(x, "postuleur"), e = x.e, etat = etatOf(x);
    const maxN = J.reduce((m, j) => Math.max(m, +j.n || 0), 0);
    const lis = J.map((j, i) => { const cur = i === J.length - 1 && etat === "run"; return `<li class="${cur ? "run" : "ok"}"><span class="m">${cur ? "…" : "✓"}</span><span>${E(j.t)}${j.pj ? `<div class="pj">${[].concat(j.pj).map((f) => `<span>📎 ${E(f)}</span>`).join("")}</div>` : ""}</span><span class="h">${hm(j.le)}</span></li>`; });
    if (!J.length && (e.fichiers || []).length) lis.push(`<li class="ok"><span class="m">✓</span><span>PDF prêts à joindre<div class="pj">${e.fichiers.map((f) => `<span>📎 ${E(f.nom || f.type)}</span>`).join("")}</div></span></li>`);
    if (!J.length && e.etape && etat === "run") lis.push(`<li class="run"><span class="m">…</span><span>${E(e.etape)}</span></li>`);
    if (etat === "run" || etat === "wait") ETAPES.forEach((t, i) => { if (i + 1 > maxN && (J.length || !e.etape || i > 0)) lis.push(`<li class="nx"><span class="m">${i + 1}</span><span>${E(t)}</span></li>`); });
    const last = J[J.length - 1];
    const sous = etat === "ok" ? "Candidature envoyée" + (e.via ? " via " + e.via : "") : etat === "ko" ? "S'est arrêté : il a besoin de toi" : etat === "run" ? (last ? last.t : e.etape || "Ouvre l'offre dans Chrome") : x.file ? "Attend le départ des agents" : e.statut === "a_valider" ? "Attend ton OK" : "Prête, attend le prochain passage";
    const st = { ok: "Envoyée ✓", run: "Postule…", ko: "À toi", wait: "En attente" }[etat];
    const fin = etat === "ok" ? `<div class="dv-end ok">🎉 Candidature envoyée${e.fin ? " à " + hm(e.fin) : ""}</div>` : etat === "ko" ? `<div class="dv-end ko">${E((e.raison || "L'agent n'a pas pu terminer").replace(/[.\s]+$/, ""))}. Ouvre la fiche pour finir.</div>` : "";
    return `<section class="dv-lane ${etat}"><div class="dv-lh"><span class="dv-av">🤖</span><span class="tx"><b>Agent Candidature</b><small>${E(sous)}</small></span><span class="dv-st">${st}</span></div><ul class="dv-steps">${lis.join("")}</ul>${fin}</section>`;
  }
  function chefLine(x) {
    const J = jr(x, "chef"), last = J[J.length - 1];
    if (last) return `<b>Chef d'orchestre</b> · ${E(last.t)} <span class="muted">(${hm(last.le)})</span>`;
    if (x.file) return "En file : les agents la prendront à leur prochain départ.";
    return E([x.c.poste, x.c.ville].filter(Boolean).join(" · "));
  }
  function draw() {
    if (!open) return;
    const ov = document.getElementById("dv-ov"); if (!ov) return;
    const L = items(), x = L.find((i) => i.id === sel) || L[0];
    if (x) sel = x.id;
    const enCours = L.some((i) => etatOf(i) === "run");
    const sub = enCours ? `${L.filter((i) => etatOf(i) === "run").length} candidature(s) en cours sur ton ordinateur` : passage && ago(passage.le) < 2 * 3600e3 ? (passage.chrome === false ? "Ton ordinateur n'était pas joignable : allume-le et ouvre Chrome" : `Dernier passage à ${hm(passage.le)} · ${passage.texte || ""}`) : L.length ? "Les agents n'ont pas encore démarré" : "";
    const A = window.jobelloAgents || {};
    const lancer = !enCours && L.some((i) => i.file || ["valide"].includes(i.e.statut)) && A.lancerMode && A.lancerMode() && !A.occupe() ? `<a class="btn primary" href="${E(A.tacheURL())}" target="_blank" rel="noopener" data-lancer>⚡ Lancer mes agents maintenant</a>` : "";
    const head = `<div class="dv-top"><h2><span class="dv-live${enCours ? "" : " off"}"><i></i>${enCours ? "EN DIRECT" : "PAUSE"}</span>Mes agents</h2><span class="dv-sub">${E(sub)}</span><button type="button" class="ghost" data-dv="close">Fermer</button></div>`;
    if (!x) { ov.innerHTML = head + `<div class="dv-none"><span class="big">🤖</span><b>Aucun agent au travail</b><span>Swipe des offres à droite : tu verras ici les agents écrire ta lettre, adapter ton CV et postuler.</span><button type="button" class="primary" data-dv="swipe">Swiper des offres</button></div>`; return; }
    const tabs = L.length > 1 ? `<div class="dv-tabs">${L.map((i) => `<button type="button" class="dv-tab${i.id === sel ? " on" : ""}" data-dv="sel" data-id="${E(i.id)}"><span class="d ${etatOf(i)}"></span>${E(i.c.entreprise || "Offre")}</button>`).join("")}</div>` : "";
    const scroll = {}; ov.querySelectorAll(".dv-paper[data-k],.dv-steps").forEach((el, i) => (scroll[i] = el.scrollTop));
    ov.innerHTML = head + tabs + `<p class="dv-chef"><b>${E(x.c.entreprise || "Offre")}</b> · ${E(x.c.poste || "")}<br>${chefLine(x)}</p>
      <div class="dv-grid">${laneDoc(x, "lettre")}${laneDoc(x, "cv")}${lanePost(x)}</div>
      <div class="dv-foot">${lancer}${x.file ? "" : `<button type="button" class="ghost small" data-dv="fiche" data-id="${E(x.id)}">Ouvrir la fiche</button>`}</div>`;
    ov.querySelectorAll(".dv-paper[data-k]").forEach((el) => { const k = el.dataset.k, c = cible[k]; if (c) { const n = Math.min(shown[k] ?? 0, c.texte.length); el.innerHTML = paperHTML(c.texte, c.type, n, c.fini); el.dataset.done = n >= c.texte.length ? String(c.texte.length) + c.fini : ""; } });
    ov.querySelectorAll(".dv-steps").forEach((el) => (el.scrollTop = el.scrollHeight));
  }
  function openDirect() {
    let ov = document.getElementById("dv-ov");
    if (!ov) { ov = document.createElement("div"); ov.id = "dv-ov"; ov.className = "dv-ov"; document.body.appendChild(ov); }
    ov.hidden = false; open = true; try { lockScroll(); } catch {}
    draw();
  }
  function closeDirect() {
    const ov = document.getElementById("dv-ov"); if (ov) { ov.hidden = true; ov.innerHTML = ""; }
    open = false; try { unlockScroll(); } catch {}
    try { if (new URLSearchParams(location.search).has("direct")) history.replaceState(null, "", location.pathname + location.hash); } catch {}
  }
  window.jobelloDirect = openDirect;

  /* Bouton « Regarder en direct » au-dessus de « Mes agents » sur l'accueil */
  function drawBouton() {
    const p = document.getElementById("ag-panel"); if (!p || !ready()) return;
    const L = items(), run = L.filter((i) => etatOf(i) === "run").length;
    let b = document.getElementById("ag-direct");
    if (!L.length) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "ag-direct"; b.className = "ag-direct"; b.dataset.dv = "open"; }
    const html = `<span class="dv-live${run ? "" : " off"}"><i></i>${run ? "EN DIRECT" : "VOIR"}</span><span class="tx"><b>Regarder mes agents en direct</b><small>${run ? "Lettre, CV et candidature s'écrivent en ce moment" : "La lettre, le CV et chaque étape de la candidature"}</small></span><span class="ch">›</span>`;
    if (b.innerHTML !== html) b.innerHTML = html;
    const ref = p.querySelector(".ag-list") ? p.querySelector(".row.between") : null;
    if (ref && b.nextSibling !== ref) ref.before(b); else if (!ref && b.parentNode !== p) p.appendChild(b);
  }

  document.addEventListener("click", (e) => {
    const s = e.target.closest && e.target.closest("[data-dv]"); if (!s) return;
    e.preventDefault(); e.stopPropagation();
    const a = s.dataset.dv;
    if (a === "open") return openDirect();
    if (a === "close") return closeDirect();
    if (a === "sel") { sel = s.dataset.id; return draw(); }
    if (a === "fiche") { closeDirect(); try { openCand(s.dataset.id); } catch {} return; }
    if (a === "swipe") { closeDirect(); document.querySelector('[data-sw="open"]')?.click(); }
  }, true);
  document.addEventListener("keydown", (e) => { if (open && e.key === "Escape") closeDirect(); });

  const _render = render;
  render = function () { const r = _render.apply(this, arguments); try { clearTimeout(render.dvT); render.dvT = setTimeout(() => { drawBouton(); draw(); }, 60); } catch {} return r; };

  let hooked = false;
  (function hook() {
    if (!(typeof state !== "undefined" && state && state.db)) return setTimeout(hook, 800);
    if (hooked) return; hooked = true;
    state.db.collection("direct").onSnapshot((snap) => { const m = {}; snap.docs.forEach((d) => (m[d.id] = d.data())); directs = m; try { drawBouton(); draw(); } catch {} }, () => {});
    state.db.doc("demandes/envois").onSnapshot((snap) => { passage = snap.exists ? snap.data().passage || null : null; try { draw(); } catch {} }, () => {});
    if (new URLSearchParams(location.search).has("direct")) (function go(k) { if (ready()) openDirect(); else if (k < 40) setTimeout(() => go(k + 1), 500); })(0);
  })();
})();
