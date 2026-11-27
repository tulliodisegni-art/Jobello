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
  /* ---- Bureau : toutes les candidatures à la fois, un curseur par agent ---- */
  .bu-stats{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}
  .bu-stats span{font-size:.8rem;padding:4px 10px;border-radius:99px;background:var(--surface);border:1px solid var(--line)}
  .bu-stats b{font-size:.95rem}
  .bu-wall{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding-bottom:6px}
  .bu-row{border-radius:18px;background:var(--surface);border:1px solid var(--line);padding:10px;cursor:pointer;position:relative}
  .bu-row.ok{border-color:var(--accent)}.bu-row.ko{border-color:#e8782f}
  .bu-rh{display:flex;align-items:center;gap:8px;margin:0 2px 8px;min-width:0}
  .bu-rh b{font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bu-rh small{color:var(--muted);font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
  .bu-rh .tm{flex:none;font-variant-numeric:tabular-nums;font-size:.78rem;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--surface-2)}
  .bu-win{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:8px}
  @media (max-width:700px){.bu-win{grid-template-columns:1fr 1fr}.bu-win .bu-br{grid-column:1/-1}}
  .bu-w{position:relative;height:170px;border-radius:10px;overflow:hidden;background:#fff;color:#1b1f24;box-shadow:0 1px 6px rgba(0,0,0,.18)}
  .bu-w .bar{height:20px;display:flex;align-items:center;gap:4px;padding:0 7px;background:#e9edf2;font:600 9.5px system-ui;color:#5b6470;white-space:nowrap;overflow:hidden}
  .bu-w .bar i{width:6px;height:6px;border-radius:50%;background:#c9cfd6;flex:none}
  .bu-w .bar span{overflow:hidden;text-overflow:ellipsis;margin-left:3px}
  .bu-w .pg{position:absolute;inset:20px 0 0;overflow:hidden;padding:7px 8px;font:7.5px/1.4 Georgia,serif}
  .bu-w .pg.cv{font:7px/1.35 system-ui,sans-serif}
  .bu-w .pg p{margin:0 0 4px}.bu-w .pg .gap{height:3px}
  .bu-w .pg .nm{font-size:1.3em;font-weight:800}.bu-w .pg .ti{color:#1d4f91;font-weight:700}.bu-w .pg .h{color:#1d4f91;font-weight:800;border-bottom:1px solid #bed0e6;margin:4px 0 2px}.bu-w .pg .ro{font-weight:700}.bu-w .pg .or{font-style:italic;color:#5b6470}
  .bu-w .vide{position:absolute;inset:20px 0 0;display:grid;place-items:center;font:600 10px system-ui;color:#8a939d;text-align:center;padding:8px}
  .bu-f{font:9px system-ui;display:flex;flex-direction:column;gap:5px;padding:8px 10px}
  .bu-gm .pg{padding:0;font:8px/1.4 system-ui,sans-serif}
  .gm{position:absolute;inset:0;display:flex;flex-direction:column}
  .gm-h{background:#404a57;color:#fff;font:700 9px system-ui;padding:4px 8px}
  .gm-l{display:flex;gap:6px;padding:3px 8px;border-bottom:1px solid #e3e7ec;font-size:8.5px;white-space:nowrap;overflow:hidden}.gm-l span{color:#8a939d;flex:none;width:30px}.gm-l b{font-weight:600;overflow:hidden;text-overflow:ellipsis}
  .gm-b{flex:1;overflow:hidden;padding:5px 8px;font:7.5px/1.4 system-ui,sans-serif}.gm-b p{margin:0 0 3px}
  .gm-f{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:4px 8px;border-top:1px solid #e3e7ec}
  .gm-pj{font-size:7.5px;padding:1px 6px;border-radius:99px;background:#eef2f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
  .gm-send{margin-left:auto;padding:3px 12px;border-radius:99px;background:#0b57d0;color:#fff;font-weight:700;font-size:8.5px}
  .gm-ok{position:absolute;inset:auto 0 30px;text-align:center;color:#12a37a;font:800 13px system-ui;text-shadow:0 0 6px #fff}
  .bu-f .t{font-weight:800;font-size:10.5px;color:#1d4f91;margin-bottom:2px}
  .bu-f label{display:flex;flex-direction:column;gap:1px;color:#5b6470;font-size:8px}
  .bu-f .in{height:15px;border:1px solid #cfd6de;border-radius:4px;padding:0 5px;display:flex;align-items:center;color:#1b1f24;font-size:9px;white-space:nowrap;overflow:hidden;background:#fff}
  .bu-f .in.on{border-color:var(--cc,#2f6fde);box-shadow:0 0 0 2px color-mix(in srgb,var(--cc,#2f6fde) 25%,transparent)}
  .bu-f .btn{align-self:flex-start;margin-top:2px;padding:3px 10px;border-radius:5px;background:#1d4f91;color:#fff;font-weight:700;font-size:9px}
  .bu-f .ok{margin:auto;text-align:center;color:#12a37a;font-weight:800;font-size:13px;padding-top:30px}
  .bu-f .lock{margin:16px auto 0;text-align:center;color:#1b1f24;font-weight:700;font-size:10px;display:flex;flex-direction:column;gap:6px;align-items:center}
  .bu-f .lock em{font-style:normal;font-weight:600;color:#e0781f;animation:dvp 1.2s infinite}
  .bu-cur{position:absolute;left:10px;top:30px;z-index:3;pointer-events:none;transition:left .45s ease,top .45s ease;display:flex;align-items:flex-start}
  .bu-cur svg{width:15px;height:15px;flex:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
  .bu-cur span{margin:9px 0 0 -2px;padding:1px 6px;border-radius:99px;color:#fff;font:700 8.5px system-ui;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)}
  .bu-cur.idle{opacity:.55}
  .bu-cur.wait span::after{content:" · attend";font-weight:600}
  .bu-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:18px}
  .bu-confetti i{position:absolute;top:-8px;width:6px;height:9px;border-radius:2px;animation:bucf 1.6s ease-in forwards}
  @keyframes bucf{to{transform:translateY(240px) rotate(540deg);opacity:0}}
  .dv-back{flex:none}
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
  let open = false, sel = null, vue = "bureau";

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
      // Annulée (offre expirée…) : on la montre 30 min avec sa raison, puis elle sort de l'écran
      if ((e.statut === "annulee" || c.statut === "abandon") && ago(e.fin || (d && d.majLe)) > 30 * 60e3) return;
      L.push({ id: c.id, c, e, d: d || {} });
    });
    (state.demandes?.liste || []).filter((x) => x.auto && x.statut === "en_attente" && !x.candidature).forEach((x) => L.push({ id: "q:" + x.url, file: x, c: { entreprise: x.offre?.entreprise, poste: x.offre?.titre }, e: {}, d: {} }));
    const rang = (x) => (x.file ? 3 : x.e.statut === "en_cours" ? 0 : ["valide", "a_valider"].includes(x.e.statut) ? 1 : 2);
    return L.sort((a, b) => rang(a) - rang(b) || ago(a.d.majLe || a.e.debut || a.e.fin) - ago(b.d.majLe || b.e.debut || b.e.fin));
  }
  const etatOf = (x) => x.file ? "wait" : x.e.statut === "annulee" || x.c.statut === "abandon" ? "stop" : x.e.statut === "envoyee" || x.c.statut === "envoyee" ? "ok" : x.e.statut === "bloquee" ? "ko" : x.e.statut === "en_cours" ? "run" : "wait";
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
    const avance = {};
    document.querySelectorAll("#dv-ov .dv-paper[data-k], #dv-ov .dv-paper-mini[data-k]").forEach((el) => {
      const k = el.dataset.k, c = cible[k]; if (!c) return;
      const tot = c.texte.length;
      if (!(k in avance)) { const n0 = Math.min(shown[k] ?? 0, tot); avance[k] = n0 >= tot ? n0 : Math.min(tot, n0 + Math.max(3, Math.ceil((tot - n0) / 90))); shown[k] = avance[k]; }
      const n = avance[k];
      if (n >= tot && el.dataset.done === String(tot) + c.fini) return;
      el.dataset.done = n >= tot ? String(tot) + c.fini : "";
      el.innerHTML = paperHTML(c.texte, c.type, n, c.fini);
      if (n < tot) el.scrollTop = el.scrollHeight;
    });
  }
  setInterval(tick, 45);

  /* ---------- Dessin ---------- */
  function laneDoc(x, kind) {
    const k = x.id + ":" + kind, t = laneTexte(x, kind), J = jr(x, kind), last = J[J.length - 1];
    const nom = kind === "lettre" ? "Agent Lettre" : "Agent CV", ic = kind === "lettre" ? "✍️" : "📄";
    const etat = t.fini ? "ok" : t.texte || (last && x.e.statut === "en_cours") ? "run" : etatOf(x) === "ko" && !t.texte ? "ko" : etatOf(x) === "stop" ? "stop" : "wait";
    const sous = etat === "stop" ? "Rien à écrire : candidature annulée" : t.fini ? (kind === "lettre" ? "Lettre de motivation terminée" : "CV adapté à l'offre terminé") : last ? last.t : x.file ? "Attend le départ des agents" : x.e.statut === "en_cours" ? (kind === "lettre" ? "Lit l'annonce et relève les mots-clés" : "Choisit le CV de base") : "En attente";
    const st = { ok: "Terminé ✓", run: "Rédige…", ko: "Arrêté", wait: "En attente", stop: "Annulée" }[etat];
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
    const sous = etat === "stop" ? "Annulée : " + (e.raison || "les agents ne l'envoient pas").replace(/[.\s]+$/, "") : etat === "ok" ? "Candidature envoyée" + (e.via ? " via " + e.via : "") : etat === "ko" ? "S'est arrêté : il a besoin de toi" : etat === "run" ? (last ? last.t : e.etape || "Ouvre l'offre dans Chrome") : x.file ? "Attend le départ des agents" : e.statut === "a_valider" ? "Attend ton OK" : "Prête, attend le prochain passage";
    const st = { ok: "Envoyée ✓", run: "Postule…", ko: "À toi", wait: "En attente", stop: "Annulée" }[etat];
    const fin = etat === "ok" ? `<div class="dv-end ok">🎉 Candidature envoyée${e.fin ? " à " + hm(e.fin) : ""}</div>` : etat === "ko" ? `<div class="dv-end ko">${E((e.raison || "L'agent n'a pas pu terminer").replace(/[.\s]+$/, ""))}. Ouvre la fiche pour finir.</div>` : "";
    return `<section class="dv-lane ${etat}"><div class="dv-lh"><span class="dv-av">🤖</span><span class="tx"><b>Agent Candidature</b><small>${E(sous)}</small></span><span class="dv-st">${st}</span></div><ul class="dv-steps">${lis.join("")}</ul>${fin}</section>`;
  }
  /* ---------- Bureau : chaque agent a son curseur, sa couleur et sa vraie tâche ---------- */
  const COUL = ["#2f6fde", "#12a37a", "#e0781f", "#b04fd6", "#d6455d", "#0f8fa6", "#c2410c", "#4f46e5"];
  const ROLES = [["cv", "CV"], ["lettre", "Lettre"], ["connexion", "Connexion"], ["postuleur", "Remplissage"]];
  function agentsOf(x, i) {
    const A = x.d.agents || {}, out = {};
    ROLES.forEach(([r], j) => { const a = A[r] || {}, n = +a.n || i * 4 + j + 1; out[r] = { n, c: a.couleur || COUL[(n - 1) % COUL.length] }; });
    return out;
  }
  const ARROW = (c) => `<svg viewBox="0 0 24 24"><path d="M4 2l6.5 19 2.6-7.6L21 11z" fill="${c}" stroke="#fff" stroke-width="1.8"/></svg>`;
  const curHTML = (a, lab, cls) => `<div class="bu-cur ${cls || ""}" data-cur><div style="display:flex">${ARROW(a.c)}<span style="background:${a.c}">Agent ${a.n} · ${lab}</span></div></div>`;
  const dureeTxt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min ${String(s % 60).padStart(2, "0")} s`; };
  const profilChamps = () => { const p = (typeof state !== "undefined" && state.profil) || {}, [pr, ...no] = String(p.nom || "Tullio DISEGNI").split(" "); return [["Prénom", pr], ["Nom", no.join(" ")], ["E-mail", p.email || ""], ["Téléphone", p.telephone || ""], ["Ville", p.ville || "Vincennes"]]; };
  /* Ce que montre la fenêtre du navigateur : l'étape réelle de l'agent (journal), les champs vraiment remplis */
  function brState(x) {
    const J = (x.d.journal || []).filter((j) => j.qui === "postuleur" || j.qui === "connexion"), e = x.e, last = J[J.length - 1] || {};
    const n = J.reduce((m, j) => Math.max(m, +j.n || 0), 0), avecChamps = [...J].reverse().find((j) => Array.isArray(j.champs) && j.champs.length);
    const pj = [...J].reverse().find((j) => j.pj);
    let champs = avecChamps ? avecChamps.champs.map((c) => [c.l, c.v]) : n >= 3 ? profilChamps() : [];
    if (pj && n >= 4) champs = champs.concat([].concat(pj.pj).slice(0, 2).map((f, i) => [i ? "Lettre de motivation" : "CV", "📎 " + f]));
    const site = last.site || [...J].reverse().find((j) => j.site)?.site || (() => { try { return new URL(e.page || x.c.lien || "").hostname.replace(/^www\./, ""); } catch { return "site carrière"; } })();
    const qui = e.attente || (n <= 2 && last.qui === "connexion") ? "connexion" : "postuleur";
    return { n, champs, site, qui, attente: e.attente, last };
  }
  const bro = {}; // id -> { i: champ en cours, c: caractères tapés }
  /* Candidature par e-mail : l'agent écrit le mail dans Gmail (fenêtre « Gmail » au lieu du site carrière) */
  const isMail = (x, b) => /mail\.google/.test(b.site || "") || x.c.canal === "email" || /^e-mail/i.test(x.e.via || "");
  function gmailHTML(x, ag, etat, b) {
    const a = ag.postuleur, J = (x.d.journal || []).filter((j) => j.qui === "postuleur"), m = [...J].reverse().find((j) => j.mail)?.mail || {};
    const a_ = m.a || x.c.contact || "adresse de l'annonce", objet = m.objet || `Candidature au poste de ${x.c.poste || ""}`;
    const k = x.id + ":mail", texte = String(x.c.messageCandidature || ""), ok = etat === "ok", ecrit = ok || b.n >= 3;
    if (ecrit && texte) { cible[k] = { texte, type: "lettre", fini: ok || b.n >= 5 }; if (ok && !(k in shown) && ago(x.e.fin) > 10 * 60e3) shown[k] = texte.length; }
    const pj = ok || b.n >= 4 ? (x.e.fichiers || []).map((f) => `<span class="gm-pj">📎 ${E(f.nom || f.type)}</span>`).join("") : "";
    let body;
    if (etat === "ko") body = `<div class="bu-f"><div class="lock">L'agent s'est arrêté<em>Il a besoin de toi : ouvre la fiche</em></div></div>`;
    else if (!ecrit && etat !== "run") body = `<div class="vide">${x.file ? "En file : part au prochain « Exécuter »" : "Le mail s'écrira ici"}</div>`;
    else body = `<div class="gm"><div class="gm-h">Nouveau message</div><div class="gm-l"><span>À</span><b ${!ecrit ? "data-tg" : ""}>${E(a_)}</b></div><div class="gm-l"><span>Objet</span><b>${E(objet)}</b></div>${ecrit && texte ? `<div class="gm-b dv-paper-mini" data-k="${E(k)}"></div>` : `<div class="gm-b"><span class="dv-dots">${E(b.last.t || "Ouvre Gmail")}</span></div>`}<div class="gm-f">${pj}<span class="gm-send"${b.n >= 6 && !ok ? " data-tg" : ""}>${ok ? "Envoyé ✓" : "Envoyer"}</span></div>${ok ? `<div class="gm-ok">✓ Mail envoyé</div>` : ""}</div>`;
    const cur = etat === "run" ? curHTML(a, "E-mail") : "";
    return `<div class="bu-w bu-br bu-gm" data-br="${E(x.id)}" data-mail="1"><div class="bar"><i></i><i></i><i></i><span>✉️ Gmail · ${E(a_)}</span></div><div class="pg">${body}</div>${cur}</div>`;
  }
  function browserHTML(x, ag, etat) {
    const b = brState(x), anim = bro[x.id] || (bro[x.id] = { i: 0, c: 0 });
    if (isMail(x, b)) return gmailHTML(x, ag, etat, b);
    let body = "", cur = "";
    const a = ag[b.qui], lab = b.qui === "connexion" ? "Connexion" : "Remplissage";
    if (etat === "ok") body = `<div class="bu-f"><div class="ok">✓ Candidature envoyée</div></div>`;
    else if (etat === "stop") body = `<div class="bu-f"><div class="lock">Candidature annulée<em style="animation:none;color:#5b6470">${E((x.e.raison || "").replace(/[.\s]+$/, ""))}</em></div></div>`;
    else if (etat === "ko") body = `<div class="bu-f"><div class="lock">L'agent s'est arrêté<em>Il a besoin de toi : ouvre la fiche</em></div></div>`;
    else if (b.attente) { body = `<div class="bu-f"><div class="t">${E(b.attente.site || b.site)}</div><label>E-mail<span class="in">tulliodisegni@…</span></label><label>Mot de passe<span class="in">••••••</span></label><span class="btn" data-tg>Se connecter</span><div class="lock"><em>À toi : connecte-toi sur ton ordi</em></div></div>`; cur = curHTML(a, lab, "wait"); }
    else if (etat !== "run") body = `<div class="vide">${x.file ? "En file : part au prochain « Exécuter »" : "En attente"}</div>`;
    else if (b.n <= 2 || !b.champs.length) { body = `<div class="bu-f"><div class="t">${E(x.c.poste || "Offre")}</div><span class="in" style="height:auto;white-space:normal;border:0;color:#5b6470">${E(x.c.entreprise || "")} · ${E(b.last.t || "Ouvre l'annonce")}</span><span class="btn" data-tg>Postuler</span></div>`; cur = curHTML(a, lab); }
    else {
      const ch = b.champs.slice(0, 7), i = Math.min(anim.i, ch.length - 1);
      body = `<div class="bu-f"><div class="t">${E(b.last.t || "Formulaire")}</div>${ch.map(([l, v], j) => `<label>${E(l)}<span class="in${j === i ? " on" : ""}" ${j === i ? "data-tg" : ""} style="--cc:${a.c}">${E(j < i ? v : j === i ? String(v || "").slice(0, anim.c) : "")}</span></label>`).join("")}</div>`;
      cur = curHTML(a, lab);
    }
    return `<div class="bu-w bu-br" data-br="${E(x.id)}"><div class="bar"><i></i><i></i><i></i><span>${E(b.site)}</span></div><div class="pg">${body}</div>${cur}</div>`;
  }
  function miniPaper(x, kind, ag, etat) {
    const k = x.id + ":" + kind, t = laneTexte(x, kind), J = jr(x, kind), a = ag[kind];
    if (t.texte) cible[k] = { texte: t.texte, type: kind === "cv" ? "cv" : "lettre", fini: t.fini };
    if (t.texte && !(k in shown) && t.fini && ago(t.le) > 15 * 60e3) shown[k] = t.texte.length;
    const writing = t.texte && !(t.fini && (shown[k] ?? 0) >= t.texte.length);
    const run = writing || (!t.texte && etat === "run" && !x.file);
    const titre = kind === "lettre" ? "Lettre de motivation" : "CV adapté";
    const inner = t.texte ? `<div class="pg${kind === "cv" ? " cv" : ""} dv-paper-mini" data-k="${E(k)}"></div>` : `<div class="vide">${run ? (J.length ? E(J[J.length - 1].t) : "Lit l'annonce…") : x.file ? "S'écrira ici" : "—"}</div>`;
    return `<div class="bu-w" data-mk="${E(k)}"><div class="bar"><i></i><i></i><i></i><span>${titre}${t.fini && !writing ? " ✓" : ""}</span></div>${inner}${run || writing ? curHTML(a, kind === "cv" ? "CV" : "Lettre") : ""}</div>`;
  }
  const fetes = new Set(JSON.parse(sessionStorage.getItem("bu-fetes") || "[]"));
  function bureauHTML(L) {
    const run = L.filter((i) => etatOf(i) === "run"), ok = L.filter((i) => etatOf(i) === "ok");
    const nAg = run.reduce((m, x) => { const b = brState(x); return m + (x.c.lettre && !docOf(x.c.lettre) ? 1 : 0) + (x.c.cvAdapte && !docOf(x.c.cvAdapte) ? 1 : 0) + 1 + (b.attente ? 0 : 0); }, 0);
    const durees = ok.map((x) => x.e.debut && x.e.fin ? new Date(x.e.fin) - new Date(x.e.debut) : 0).filter((d) => d > 0 && d < 3 * 3600e3);
    const moy = durees.length ? dureeTxt(durees.reduce((a, b) => a + b, 0) / durees.length) : "";
    const stats = `<div class="bu-stats"><span><b>${nAg}</b> agent${nAg > 1 ? "s" : ""} au travail</span><span><b>${ok.length}</b> envoyée${ok.length > 1 ? "s" : ""}</span>${moy ? `<span>≈ <b>${moy}</b> par candidature</span>` : ""}${L.some((x) => x.e.attente) ? `<span style="border-color:#e0781f;color:#e0781f"><b>À toi :</b> connecte-toi sur ton ordi</span>` : ""}</div>`;
    const rows = L.map((x, i) => {
      const etat = etatOf(x), ag = agentsOf(x, i), t0 = x.e.debut, t1 = etat === "ok" || etat === "ko" ? x.e.fin : null;
      const tm = t0 ? `<span class="tm" data-t0="${E(t0)}" ${t1 ? `data-t1="${E(t1)}"` : ""}>${dureeTxt((t1 ? new Date(t1) : Date.now()) - new Date(t0))}</span>` : "";
      const st = { ok: "Envoyée ✓", run: "En cours", ko: "À toi", wait: x.file ? "En file" : "En attente", stop: "Annulée" }[etat];
      const conf = etat === "ok" && ago(x.e.fin) < 10 * 60e3 && !fetes.has(x.id) ? (fetes.add(x.id), sessionStorage.setItem("bu-fetes", JSON.stringify([...fetes])), `<div class="bu-confetti">${Array.from({ length: 28 }, (_, k) => `<i style="left:${(k * 37) % 100}%;background:${COUL[k % COUL.length]};animation-delay:${(k % 7) * 0.08}s"></i>`).join("")}</div>`) : "";
      return `<div class="bu-row ${etat}" data-dv="sel" data-id="${E(x.id)}"><div class="bu-rh"><b>${E(x.c.entreprise || "Offre")}</b><small>${E(x.c.poste || "")} · ${st}</small>${tm}</div>
        <div class="bu-win">${miniPaper(x, "lettre", ag, etat)}${miniPaper(x, "cv", ag, etat)}${browserHTML(x, ag, etat)}</div>${conf}</div>`;
    }).join("");
    return stats + `<div class="bu-wall">${rows}</div>`;
  }
  /* Animation : les curseurs suivent le texte qui s'écrit et les champs qui se remplissent */
  function placeCursors() {
    document.querySelectorAll("#dv-ov .bu-w").forEach((w) => {
      const cur = w.querySelector("[data-cur]"); if (!cur) return;
      const tg = w.querySelector(".dv-caret") || w.querySelector("[data-tg]"); if (!tg) return;
      const r = w.getBoundingClientRect(), q = tg.getBoundingClientRect();
      const x = Math.min(r.width - (cur.offsetWidth || 60) - 2, Math.max(4, q.left - r.left + Math.min(q.width, 30) - 2)), y = Math.min(r.height - 22, Math.max(22, q.top - r.top + q.height / 2));
      cur.style.left = x + "px"; cur.style.top = y + "px";
    });
    document.querySelectorAll("#dv-ov .tm[data-t0]").forEach((el) => { if (!el.dataset.t1) el.textContent = dureeTxt(Date.now() - new Date(el.dataset.t0)); });
  }
  let brT = 0;
  function tickBrowser() {
    if (!open || vue !== "bureau") return;
    if (++brT % 3) return;
    let redraw = false;
    items().forEach((x, idx) => {
      if (etatOf(x) !== "run" || x.e.attente) return; const b = brState(x); if (b.n < 3 || !b.champs.length || isMail(x, b)) return;
      const a = bro[x.id] || (bro[x.id] = { i: 0, c: 0 }), ch = b.champs.slice(0, 7), v = String((ch[a.i] || [])[1] || "");
      if (a.i >= ch.length - 1 && a.c >= v.length) return;
      if (a.c < v.length) a.c += Math.max(1, Math.ceil(v.length / 14)); else { a.i++; a.c = 0; }
      const el = document.querySelector(`#dv-ov [data-br="${CSS.escape(x.id)}"] .pg`);
      if (el) { const ag = agentsOf(x, idx); const tmp = document.createElement("div"); tmp.innerHTML = browserHTML(x, ag, "run"); const n = tmp.querySelector(".pg"); if (n) el.innerHTML = n.innerHTML; } else redraw = true;
    });
    if (redraw) draw();
  }
  setInterval(() => { try { tickBrowser(); placeCursors(); } catch {} }, 60);

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
    if (x && vue === "bureau") {
      const yW = ov.querySelector(".bu-wall")?.scrollTop || 0, yO = ov.scrollTop; // garder la position quand l'écran se met à jour
      ov.innerHTML = head + bureauHTML(L) + `<div class="dv-foot">${lancer}</div>`;
      const w = ov.querySelector(".bu-wall"); if (w) w.scrollTop = yW; ov.scrollTop = yO;
      ov.querySelectorAll(".dv-paper-mini[data-k]").forEach((el) => { const k = el.dataset.k, c = cible[k]; if (c) { const n = Math.min(shown[k] ?? 0, c.texte.length); el.innerHTML = paperHTML(c.texte, c.type, n, c.fini); el.dataset.done = n >= c.texte.length ? String(c.texte.length) + c.fini : ""; el.scrollTop = el.scrollHeight; } });
      placeCursors(); return;
    }
    if (!x) { ov.innerHTML = head + `<div class="dv-none"><span class="big">🤖</span><b>Aucun agent au travail</b><span>Swipe des offres à droite : tu verras ici les agents écrire ta lettre, adapter ton CV et postuler.</span><button type="button" class="primary" data-dv="swipe">Swiper des offres</button></div>`; return; }
    const tabs = `<div class="dv-tabs"><button type="button" class="dv-tab" data-dv="bureau">← Tous mes agents</button>` + (L.length > 1 ? `${L.map((i) => `<button type="button" class="dv-tab${i.id === sel ? " on" : ""}" data-dv="sel" data-id="${E(i.id)}"><span class="d ${etatOf(i)}"></span>${E(i.c.entreprise || "Offre")}</button>`).join("")}` : "") + `</div>`;
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
    ov.hidden = false; open = true; vue = "bureau"; try { lockScroll(); } catch {}
    draw();
  }
  function closeDirect() {
    const ov = document.getElementById("dv-ov"); if (ov) { ov.hidden = true; ov.innerHTML = ""; }
    open = false; try { unlockScroll(); } catch {}
    try { if (new URLSearchParams(location.search).has("direct")) history.replaceState(null, "", location.pathname + location.hash); } catch {}
  }
  window.jobelloDirect = openDirect;
  window.jobelloDirectData = (m) => { directs = m || {}; draw(); }; // pour les essais de l'écran

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
    if (a === "sel") { sel = s.dataset.id; vue = "detail"; return draw(); }
    if (a === "bureau") { vue = "bureau"; return draw(); }
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
