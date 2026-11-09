/* Jobello : notifications et « Ajouter au calendrier ».
   - Chaque appareil choisit les notifications qu'il veut recevoir (un interrupteur par type).
   - L'appli prépare la liste des rappels à venir et la range dans Supabase ; le serveur (fonction « notifications »)
     les envoie à l'heure dite, même quand l'appli est fermée.
   - Les nouvelles offres sont signalées par le serveur dès qu'elles arrivent (voir supabase/notifications.sql).
   Ce fichier se charge après la page de l'appli : il utilise ses données (state) et ses outils (todayISO, openCand…). */
(function () {
  const APP = "jobello", FN = "https://vvxkkqcmjrwytagbxdfg.supabase.co/functions/v1/notifications";
  const ls = window.jobelloStore;
  const supa = () => (window.jobelloSupa ? window.jobelloSupa() : null);

  /* ---------- Les types de notifications ---------- */
  const KINDS = [
    { k: "envoi", g: "Candidatures", ic: "✉️", c: "var(--s-sent)", t: "Candidatures à envoyer", d: "Le matin, quand un dossier est prêt mais pas encore envoyé, ou qu'une réponse à un mail attend." },
    { k: "dossier", g: "Candidatures", ic: "🗂️", c: "#d9a21b", t: "Dossiers à finir", d: "Le matin, quand une candidature n'a pas encore son CV ni sa lettre." },
    { k: "relance", g: "Candidatures", ic: "🔔", c: "var(--s-follow)", t: "Relances", d: "Le matin du jour où il faut relancer une société ou passer par un contact." },
    { k: "entretien", g: "Entretiens", ic: "📅", c: "var(--s-interview)", t: "Rappels d'entretien", d: "La veille à 19 h, puis 1 h avant, avec le lien visio ou l'adresse." },
    { k: "apres", g: "Entretiens", ic: "💬", c: "#e0559b", t: "Après l'entretien", d: "Une heure après un entretien au téléphone, en visio ou sur place : comment ça s'est passé ?" },
    { k: "merci", g: "Entretiens", ic: "🙏", c: "var(--s-offer)", t: "Remerciement", d: "Le lendemain matin, si le mail de remerciement n'est pas encore parti." },
    { k: "offres", g: "Offres", ic: "✨", c: "var(--accent)", t: "Nouveaux postes", d: "Dès que de nouvelles offres qui te correspondent sont repérées (jamais la nuit)." },
    { k: "bilan", g: "Candidatures", ic: "📊", c: "var(--accent)", t: "Bilan du lundi", d: "Le lundi matin : ce que tu as fait la semaine passée et ce qui t'attend cette semaine." },
    { k: "reseau", g: "Réseau", ic: "🤝", c: "#0a66c2", t: "Messages LinkedIn", d: "Le matin, quand des messages à ton réseau sont prévus.", off: true },
  ];
  const CLIENT_KINDS = ["envoi", "dossier", "relance", "entretien", "apres", "merci", "bilan", "reseau"]; // "offres" vient du serveur
  const prefs = () => { const p = ls.get("notifPrefs", {}), o = {}; KINDS.forEach((x) => (o[x.k] = p[x.k] ?? !x.off)); return o; };
  const heure = () => ls.get("notifHeure", "09:00");

  /* ---------- Calcul des rappels à venir ---------- */
  const at = (iso, hhmm, plusMin = 0) => { const [h, m] = String(hhmm || "09:00").split(":").map(Number); const d = new Date(iso + "T00:00:00"); d.setHours(h || 0, (m || 0) + plusMin, 0, 0); return d; };
  const typeOf = (c) => { const t = String(c.typeEntretien || "").toLowerCase(); return /t[ée]l[ée]phone/.test(t) ? { adj: "téléphonique", nom: "cet entretien téléphonique" } : /visio|teams|zoom|meet/.test(t) || c.lienVisio ? { adj: "en visio", nom: "cet entretien en visio" } : /place|physique|locaux/.test(t) || c.lieuEntretien ? { adj: "sur place", nom: "cet entretien sur place" } : { adj: "", nom: "cet entretien" }; };
  const hh = (h) => String(h).replace(/^0(\d)/, "$1").replace(":", " h ").replace(/ h 00$/, " h");
  const names = (l, f = (c) => c.entreprise || "?") => { const n = [...new Set(l.map(f))]; return n.slice(0, 3).join(", ") + (n.length > 3 ? ` et ${n.length - 3} autre${n.length > 4 ? "s" : ""}` : ""); };
  const link = (c, t) => `./?ouvrir=${encodeURIComponent(c.id)}${t ? "&tache=" + t : ""}`;

  function planifier() {
    const now = Date.now(), today = todayISO(), H = heure(), items = [];
    const add = (kind, key, date, title, body, url) => { if (date.getTime() > now + 30000) items.push({ kind, key, send_at: date.toISOString(), title, body: body || "", url: url || "./" }); };
    const first = at(today, H).getTime() > now ? today : addDays(today, 1);
    const mornings = (n) => Array.from({ length: n }, (_, i) => addDays(first, i));
    const cands = (state.cands || []).filter((c) => !archivedCand(c));
    const actif = (c) => c.decision !== "stop" && c.decision !== "pause";

    // Candidatures prêtes à envoyer, réponses à envoyer
    const pretes = cands.filter((c) => c.statut === "a_envoyer" && actif(c) && (c.cv || c.lettre));
    const reps = cands.filter((c) => c.reponseMail && !c.reponseMail.envoye);
    if (pretes.length || reps.length) mornings(3).forEach((d, i) => {
      const seul = pretes.length + reps.length === 1 ? (pretes[0] || reps[0]) : null;
      add("envoi", "envoi:" + d, at(d, H), seul ? (reps.length ? `Réponds à ${seul.entreprise || "la société"}` : `Ta candidature chez ${seul.entreprise || "?"} est prête`) : `${pretes.length + reps.length} envois t'attendent`,
        [reps.length && `Réponse prête pour ${names(reps)}.`, pretes.length && `Dossier prêt : ${names(pretes)}.`, i ? "Toujours en attente : un petit envoi aujourd'hui ?" : "Il ne reste qu'à l'envoyer."].filter(Boolean).join("\n"),
        seul ? link(seul) : "./#candidatures");
    });
    // Dossiers à finir
    const afaire = cands.filter((c) => c.statut === "a_envoyer" && actif(c) && !c.cv && !c.lettre);
    if (afaire.length) mornings(2).forEach((d) => add("dossier", "dossier:" + d, at(d, H, 1), afaire.length === 1 ? `Le dossier ${afaire[0].entreprise || ""} est à finir` : `${afaire.length} dossiers à finir`,
      `${names(afaire)} : choisis le CV et la lettre, Claude t'aide à les adapter.`, afaire.length === 1 ? link(afaire[0]) : "./#candidatures"));
    // Relances (par toi ou via un contact), jour par jour sur deux semaines
    for (let i = 0; i < 14; i++) {
      const d = addDays(first, i), l = [];
      cands.forEach((c) => {
        const pc = viaContact(c);
        const due = pc ? actif(c) && pc.prochaineAction : ownRelance(c) ? c.prochaineRelance : "";
        if (due && (i === 0 ? due <= d : due === d)) l.push({ c, pc });
      });
      if (l.length) add("relance", "relance:" + d, at(d, H, 2), l.length === 1 ? `Relance ${l[0].c.entreprise || "la société"} aujourd'hui` : `${l.length} relances aujourd'hui`,
        l.length === 1 ? (l[0].pc ? `Via ${l[0].pc.nom || "ton contact"}. ` : "") + "Le message de relance est prêt dans Jobello." : `${names(l.map((x) => x.c))}. Les messages sont prêts dans Jobello.`, l.length === 1 ? link(l[0].c) : "./#accueil");
    }
    // Entretiens : la veille, 1 h avant, après, puis le remerciement
    cands.forEach((c) => {
      if (!c.dateEntretien || c.dateEntretien < addDays(today, -1)) return;
      const d = c.dateEntretien, h = /^\d{1,2}:\d{2}$/.test(c.heureEntretien || "") ? c.heureEntretien : "", ty = typeOf(c), e = c.entreprise || "la société", id = `${c.id}:${d}${h}`;
      const deja = (c.entretiens || []).some((x) => x.date === d);
      const ou = c.lieuEntretien ? `📍 ${c.lieuEntretien}` : c.lienVisio ? "Le lien de la visio est dans Jobello." : "";
      add("entretien", "ent-veille:" + id, at(addDays(d, -1), "19:00"), `Demain : entretien ${ty.adj ? ty.adj + " " : ""}chez ${e}`,
        [`${h ? "À " + hh(h) : "Heure à confirmer"}${c.avecQui ? " avec " + c.avecQui : ""}.`, ou, "Ton antisèche t'attend dans Jobello."].filter(Boolean).join("\n"), link(c, "antiseche"));
      add("entretien", "ent-avant:" + id, h ? at(d, h, -60) : at(d, "08:00"), `Entretien ${ty.adj ? ty.adj + " " : ""}chez ${e} ${h ? "à " + hh(h) : "aujourd'hui"}`,
        [c.poste, ou || "Bonne chance !"].filter(Boolean).join("\n"), link(c, "antiseche"));
      // le matin même, l'antisèche, si l'entretien est assez tard dans la journée
      if (h && at(d, h).getTime() - at(d, H).getTime() >= 3 * 3600000) add("entretien", "ent-matin:" + id, at(d, H), `Ton antisèche pour ${e}`,
        `Entretien ${ty.adj ? ty.adj + " " : ""}à ${hh(h)}. L'essentiel à relire en 2 minutes.`, link(c, "antiseche"));
      if (!deja) add("apres", "apres:" + id, h ? at(d, h, 120) : at(d, "18:30"), `Alors, ${ty.nom} chez ${e} ?`,
        "Note comment ça s'est passé et ce qui suit, tant que c'est frais.", link(c, "suite"));
      if (!c.remerciement) add("merci", "merci:" + id, at(addDays(d, 1), H, 3), `Remercie ${e} pour l'entretien`,
        "Un mail de remerciement court fait la différence. Il est prêt dans Jobello.", link(c));
    });
    // Bilan du lundi : la semaine passée et celle qui commence
    const lundi = mornings(8).find((d) => new Date(d + "T12:00:00").getDay() === 1);
    if (lundi) {
      const avant = addDays(lundi, -7), dans = (x) => x && x >= avant && x < lundi, sem = (x) => x && x >= lundi && x <= addDays(lundi, 6);
      const tous = state.cands || [], pl = (n, a, b) => `${n} ${n > 1 ? b || a + "s" : a}`;
      const env = tous.filter((c) => dans(c.dateEnvoi)).length, rep = tous.filter((c) => dans(c.dateReponse)).length;
      const entP = tous.filter((c) => (c.entretiens || []).some((x) => dans(x.date)) || dans(c.dateEntretien)).length;
      const rel = cands.filter((c) => { const pc = viaContact(c), due = pc ? actif(c) && pc.prochaineAction : ownRelance(c) ? c.prochaineRelance : ""; return due && due <= addDays(lundi, 6); }).length;
      const entS = cands.filter((c) => sem(c.dateEntretien)).length, aEnv = cands.filter((c) => c.statut === "a_envoyer" && actif(c)).length;
      const passe = env || rep || entP ? `La semaine dernière : ${[env && pl(env, "envoyée"), rep && pl(rep, "réponse"), entP && pl(entP, "entretien")].filter(Boolean).join(", ")}.` : "La semaine dernière a été calme côté candidatures.";
      const futur = rel || entS || aEnv ? `Cette semaine : ${[entS && pl(entS, "entretien"), rel && pl(rel, "relance"), aEnv && pl(aEnv, "dossier") + " à envoyer"].filter(Boolean).join(", ")}.` : "Cette semaine : rien d'urgent, c'est le moment de repérer de nouvelles offres.";
      add("bilan", "bilan:" + lundi, at(lundi, H, 5), env >= 3 ? "Belle semaine, on continue ?" : "Ta semaine en bref", passe + "\n" + futur, "./#accueil");
    }
    // Réseau LinkedIn
    for (let i = 0; i < 7; i++) {
      const d = addDays(first, i), l = (state.contacts || []).filter((p) => p.prochaineAction && (i === 0 ? p.prochaineAction <= d : p.prochaineAction === d) && contactDue({ ...p, prochaineAction: "0000-00-00" }));
      if (l.length) add("reseau", "reseau:" + d, at(d, H, 4), l.length === 1 ? `Un message LinkedIn à envoyer` : `${l.length} messages LinkedIn à envoyer`, names(l, (p) => p.nom || p.entreprise || "Contact"), "./#contacts");
    }
    return items.sort((a, b) => a.send_at.localeCompare(b.send_at)).slice(0, 150);
  }
  window.jobelloPlanifier = planifier;

  /* ---------- Envoi de la liste au serveur ---------- */
  let timer = 0, hasSubs = null, lastHash = "";
  async function syncNow() {
    const s = supa(); if (!s || !state.loaded) return;
    if (hasSubs === null) { const r = await s.sb.from("push_subs").select("endpoint", { count: "exact", head: true }).eq("app", APP); hasSubs = !r.error && r.count > 0; }
    if (!hasSubs && !ls.get("notifOn", false)) return;
    const items = planifier(), h = JSON.stringify(items);
    if (h === lastHash) return;
    const { error } = await s.sb.rpc("push_sync", { p_app: APP, p_kinds: CLIENT_KINDS, p_items: items });
    if (!error) lastHash = h;
  }
  const programmer = () => { clearTimeout(timer); timer = setTimeout(() => syncNow().catch(() => {}), 2500); };
  const _render = render;
  render = function () { const r = _render.apply(this, arguments); programmer(); return r; };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) programmer(); });

  /* ---------- Abonnement de cet appareil ---------- */
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const pushOK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const appareil = () => isIOS ? (/ipad/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && !/iphone/i.test(navigator.userAgent) ? "iPad" : "iPhone") : /android/i.test(navigator.userAgent) ? "Android" : /mac/i.test(navigator.platform) ? "Mac" : "Ordinateur";
  const currentSub = async () => { if (!pushOK) return null; const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null; };

  async function etat() {
    if (!supa()) return { k: "compte", m: "Connecte-toi à ton compte Jobello pour recevoir des notifications." };
    if (isIOS && !standalone) return { k: "installer", m: "Sur iPhone, les notifications marchent quand Jobello est installée : dans Safari, touche Partager puis « Sur l'écran d'accueil », et ouvre Jobello depuis son icône." };
    if (!pushOK) return { k: "non", m: "Ce navigateur ne sait pas recevoir de notifications. Sur iPhone, installe Jobello sur l'écran d'accueil (iOS 16.4 ou plus récent)." };
    if (Notification.permission === "denied") return { k: "refuse", m: isIOS ? "Les notifications sont bloquées : Réglages de l'iPhone › Notifications › Jobello › Autoriser." : "Les notifications sont bloquées pour ce site dans les réglages du navigateur." };
    const sub = await currentSub();
    if (sub && ls.get("notifOn", false) && Notification.permission === "granted") return { k: "on", m: "Activées sur cet appareil." };
    return { k: "off", m: "Touche le bouton pour que Jobello te prévienne, même appli fermée." };
  }
  async function activer() {
    const s = supa(); if (!s) throw new Error("Connecte-toi d'abord.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error(isIOS ? "Autorise les notifications quand l'iPhone le demande (ou dans Réglages › Notifications › Jobello)." : "Autorise les notifications pour continuer.");
    const { data: key, error } = await s.sb.rpc("push_public_key");
    if (error || !key) throw new Error("Le serveur des notifications n'est pas encore branché. Il reste une étape à faire dans Supabase (voir NOTIFICATIONS.md).");
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) { const k = sub.options && sub.options.applicationServerKey; if (k && btoa(String.fromCharCode(...new Uint8Array(k))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== key) { await sub.unsubscribe(); sub = null; } }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64(key) });
    await enregistrer(sub);
    ls.set("notifOn", true); hasSubs = true; lastHash = ""; await syncNow();
  }
  async function enregistrer(sub) {
    const s = supa(); if (!s || !sub) return;
    const { error } = await s.sb.rpc("push_register", { p_app: APP, p_endpoint: sub.endpoint, p_sub: sub.toJSON(), p_prefs: prefs(), p_appareil: appareil() });
    if (error) throw new Error("Enregistrement impossible : " + error.message);
  }
  async function couper() {
    const s = supa(), sub = await currentSub();
    if (sub) { if (s) await s.sb.from("push_subs").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe().catch(() => {}); }
    ls.set("notifOn", false); hasSubs = null;
  }
  // l'abonnement d'un appareil peut changer tout seul : on le remet à jour à chaque ouverture
  addEventListener("load", () => setTimeout(async () => { try { if (ls.get("notifOn", false) && Notification.permission === "granted") { await window.jobelloReady; const sub = await currentSub(); if (sub) await enregistrer(sub); } } catch (e) {} majCloche(); }, 3000));

  /* ---------- Écran « Notifications » ---------- */
  const css = `
  .nt-ov{position:fixed;inset:0;z-index:9998;background:rgba(14,31,43,.38);display:flex;align-items:flex-end;justify-content:center;animation:nt-f .2s ease}
  @media (min-width:700px){.nt-ov{align-items:center}}
  @keyframes nt-f{from{opacity:0}}@keyframes nt-u{from{transform:translateY(30px);opacity:.5}}
  .nt{background:var(--bg);color:var(--fg);width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:26px 26px 0 0;padding:0 0 calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(14,31,43,.25);animation:nt-u .25s ease;font-family:var(--body)}
  @media (min-width:700px){.nt{border-radius:26px}}
  .nt-hd{background:var(--hero);color:var(--hero-fg,#fff);padding:22px 20px 18px;border-radius:26px 26px 0 0;position:relative}
  .nt-hd h2{margin:0;font-family:var(--display);font-size:1.5rem}.nt-hd p{margin:4px 0 0;opacity:.92;font-size:.92rem}
  .nt-x{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.25);color:#fff;font-size:1.1rem;padding:0}
  .nt-bd{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
  .nt-st{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:10px}
  .nt-st p{margin:0;font-size:.92rem}.nt-st.on{border-color:color-mix(in srgb,var(--s-offer) 45%,var(--line));background:color-mix(in srgb,var(--s-offer) 9%,var(--surface))}
  .nt-st.warn{background:var(--warn-bg);color:var(--warn-fg);border-color:transparent}
  .nt-big{font-weight:700;padding:13px;border-radius:999px;border:0;background:var(--accent);color:var(--accent-ink);width:100%;font-size:1rem}
  .nt-row2{display:flex;gap:8px;flex-wrap:wrap}.nt-row2 button{flex:1}
  .nt-g{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:6px 4px -4px}
  .nt-list{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
  .nt-it{display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer}.nt-it+.nt-it{border-top:1px solid var(--line)}
  .nt-ic{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:1.15rem;background:color-mix(in srgb,var(--c) 16%,var(--surface))}
  .nt-tx{flex:1;min-width:0}.nt-tx b{display:block;font-size:.97rem}.nt-tx span{display:block;color:var(--muted);font-size:.82rem;line-height:1.35}
  .nt-sw{flex:none;position:relative;width:50px;height:30px}.nt-sw input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
  .nt-sw i{position:absolute;inset:0;border-radius:99px;background:var(--line);transition:.2s}.nt-sw i:after{content:"";position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:.2s}
  .nt-sw input:checked+i{background:var(--c)}.nt-sw input:checked+i:after{transform:translateX(20px)}
  .nt-hr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px}.nt-hr select{width:auto;flex:none;font:inherit;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--fg)}
  .nt-nx{display:flex;flex-direction:column;gap:2px;padding:10px 14px}.nt-nx+.nt-nx{border-top:1px solid var(--line)}.nt-nx small{color:var(--muted)}
  .nt-msg{font-size:.86rem;min-height:1.1em;text-align:center;color:var(--muted)}
  .nt-bell{position:relative}.nt-bell .nt-dot{position:absolute;top:8px;right:9px;width:9px;height:9px;border-radius:50%;background:var(--sun,#b8f28a);box-shadow:0 0 0 2px rgba(255,255,255,.6)}
  .visio-box .nt-cal{align-self:flex-start}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const quand = (iso) => { const d = new Date(iso), j = d.toISOString ? todayISO() : ""; const day = (() => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); })(); const lab = day === j ? "Aujourd'hui" : day === addDays(j, 1) ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" }); return `${lab.charAt(0).toUpperCase() + lab.slice(1)} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ")}`; };

  window.jobelloNotifs = async function () {
    document.querySelectorAll(".jb-ov").forEach((x) => x.remove());
    if (document.querySelector(".nt-ov")) return;
    const ov = document.createElement("div"); ov.className = "nt-ov"; document.body.appendChild(ov);
    const close = () => { ov.remove(); majCloche(); };
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    const draw = async (msg) => {
      const e = await etat(), p = prefs(), H = heure(), on = e.k === "on";
      const futurs = planifier().filter((x) => p[x.kind]).slice(0, 4);
      let groupe = "";
      ov.innerHTML = `<div class="nt" role="dialog" aria-label="Notifications"><div class="nt-hd"><button type="button" class="nt-x" aria-label="Fermer">✕</button><h2>Notifications</h2><p>Jobello te prévient au bon moment. Tu choisis quoi.</p></div><div class="nt-bd">
        <div class="nt-st ${on ? "on" : e.k === "off" ? "" : "warn"}"><p>${on ? "✅ " : ""}${esc(e.m)}</p>
          ${e.k === "off" ? `<button type="button" class="nt-big" data-nt="on">Activer les notifications</button>` : ""}
          ${on ? `<div class="nt-row2"><button type="button" class="small" data-nt="test">M'envoyer un essai</button><button type="button" class="small ghost" data-nt="off">Couper sur cet appareil</button></div>` : ""}</div>
        <div class="nt-msg" id="nt-msg">${esc(msg || "")}</div>
        ${KINDS.map((x) => `${x.g !== groupe ? `${groupe ? "</div>" : ""}<div class="nt-g">${(groupe = x.g)}</div><div class="nt-list">` : ""}<label class="nt-it" style="--c:${x.c}"><span class="nt-ic">${x.ic}</span><span class="nt-tx"><b>${esc(x.t)}</b><span>${esc(x.d)}</span></span><span class="nt-sw"><input type="checkbox" data-k="${x.k}" ${p[x.k] ? "checked" : ""} aria-label="${esc(x.t)}"><i></i></span></label>`).join("")}</div>
        <div class="nt-g">Réglages</div><div class="nt-list"><div class="nt-hr"><span class="nt-tx"><b>Heure des rappels du matin</b><span>Envois, dossiers, relances, remerciements</span></span><select id="nt-h">${["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "11:00", "12:00", "13:30", "18:00"].map((v) => `<option ${v === H ? "selected" : ""} value="${v}">${hh(v)}</option>`).join("")}</select></div></div>
        ${futurs.length ? `<div class="nt-g">Prochains rappels</div><div class="nt-list">${futurs.map((x) => `<div class="nt-nx"><small>${esc(quand(x.send_at))}</small><b>${esc(x.title)}</b></div>`).join("")}</div>` : ""}
      </div></div>`;
      ov.querySelector(".nt-x").onclick = close;
      ov.querySelectorAll("[data-k]").forEach((i) => (i.onchange = async () => {
        const q = ls.get("notifPrefs", {}); q[i.dataset.k] = i.checked; ls.set("notifPrefs", q);
        try { if (ls.get("notifOn", false)) await enregistrer(await currentSub()); } catch (x) {}
        await draw(i.checked ? "C'est noté, tu recevras celle-ci." : "C'est noté, plus de notification de ce type.");
      }));
      ov.querySelector("#nt-h").onchange = async (ev) => { ls.set("notifHeure", ev.target.value); lastHash = ""; await syncNow().catch(() => {}); await draw("Rappels du matin à " + hh(ev.target.value) + "."); };
      ov.querySelectorAll("[data-nt]").forEach((b) => (b.onclick = async () => {
        const m = ov.querySelector("#nt-msg"); b.disabled = true;
        try {
          if (b.dataset.nt === "on") { m.textContent = "Activation…"; await activer(); await draw("C'est activé ! Touche « M'envoyer un essai » pour vérifier."); }
          if (b.dataset.nt === "off") { await couper(); await draw("Notifications coupées sur cet appareil."); }
          if (b.dataset.nt === "test") { const s = supa(); const { error } = await s.sb.rpc("push_test", { p_app: APP, p_title: "Jobello est prêt à te prévenir 🎉", p_body: "Les notifications marchent sur cet appareil." }); if (error) throw new Error(error.message); m.textContent = "Essai envoyé : il arrive dans la minute."; b.disabled = false; }
        } catch (x) { m.style.color = "var(--s-refused)"; m.textContent = x.message || String(x); b.disabled = false; }
      }));
    };
    await draw();
  };

  // cloche dans l'en-tête de l'accueil (un point rose tant que rien n'est activé)
  async function majCloche() { const d = document.querySelector(".nt-bell .nt-dot"); if (d) d.hidden = (await etat()).k === "on" || ls.get("notifVu", false); }
  addEventListener("DOMContentLoaded", ajouterCloche); if (document.readyState !== "loading") ajouterCloche();
  function ajouterCloche() {
    const a = document.querySelector(".home-head .home-acts"); if (!a || a.querySelector(".nt-bell")) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn nt-bell"; b.setAttribute("aria-label", "Notifications"); b.title = "Notifications";
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="nt-dot" hidden></span>';
    b.onclick = () => { ls.set("notifVu", true); window.jobelloNotifs(); };
    a.prepend(b); majCloche();
  }

  /* ---------- Ajouter un entretien au calendrier ---------- */
  let fnOK = false;
  fetch(FN, { cache: "no-store" }).then((r) => { fnOK = r.ok; }).catch(() => {});
  const calInfo = (c) => {
    const ty = typeOf(c), e = c.entreprise || "";
    return { date: c.dateEntretien, heure: /^\d{1,2}:\d{2}$/.test(c.heureEntretien || "") ? c.heureEntretien.padStart(5, "0") : "", titre: `Entretien ${ty.adj ? ty.adj + " " : ""}chez ${e}`.trim(), lieu: c.lieuEntretien || (c.lienVisio ? c.lienVisio : ""),
      notes: [c.poste && "Poste : " + c.poste, c.avecQui && "Avec : " + c.avecQui, c.typeEntretien && "Type : " + c.typeEntretien, c.lienVisio && "Lien : " + c.lienVisio, "Ta préparation est dans Jobello."].filter(Boolean).join("\n"), lien: c.lienVisio || "", id: c.id };
  };
  function icsLocal(i) {
    const e = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"), d = i.date.replace(/-/g, "");
    const p = (n) => String(n).padStart(2, "0");
    let deb, fin;
    if (i.heure) { const x = new Date(i.date + "T" + i.heure + ":00"), y = new Date(x.getTime() + 3600000), f = (z) => `${z.getFullYear()}${p(z.getMonth() + 1)}${p(z.getDate())}T${p(z.getHours())}${p(z.getMinutes())}00`; deb = "DTSTART:" + f(x); fin = "DTEND:" + f(y); }
    else { const y = new Date(i.date + "T12:00:00"); y.setDate(y.getDate() + 1); deb = "DTSTART;VALUE=DATE:" + d; fin = `DTEND;VALUE=DATE:${y.getFullYear()}${p(y.getMonth() + 1)}${p(y.getDate())}`; }
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jobello//FR", "BEGIN:VEVENT", `UID:${i.id}-${d}@jobello`, "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), deb, fin, "SUMMARY:" + e(i.titre), i.lieu && "LOCATION:" + e(i.lieu), "DESCRIPTION:" + e(i.notes), i.heure && "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Entretien dans 1 heure\r\nTRIGGER:-PT1H\r\nEND:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  }
  function ajouterAuCalendrier(c) {
    const i = calInfo(c);
    if (fnOK) { const u = FN + "?ics=1&" + new URLSearchParams(Object.entries(i).filter(([, v]) => v)).toString(); const w = window.open(u, "_blank"); if (!w) location.href = u; return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([icsLocal(i)], { type: "text/calendar" })); a.download = `entretien-${(c.entreprise || "jobello").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`; document.body.appendChild(a); a.click(); a.remove();
  }
  const _visioBox = visioBox;
  visioBox = function (c) {
    const h = _visioBox(c); if (!h || !c || !c.dateEntretien) return h;
    return h.replace(/<\/div>\s*$/, `<button type="button" class="small nt-cal" data-cal="${esc(c.id)}">📅 Ajouter au calendrier</button></div>`);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-cal]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const c = (editing && editing.id === b.dataset.cal ? editing : null) || state.cands.find((x) => x.id === b.dataset.cal); if (c) ajouterAuCalendrier(c);
  }, true);

  /* ---------- Ouvrir la bonne candidature quand on touche une notification ---------- */
  function ouvrir(url) {
    let u; try { u = new URL(url, location.href); } catch (e) { return; }
    const id = u.searchParams.get("ouvrir");
    if (!id) { if (u.hash) location.hash = u.hash; return; }
    let n = 0; const go = () => { const c = state.loaded && state.cands.find((x) => x.id === id); if (c) { location.hash = "#accueil"; openCand(id, u.searchParams.get("tache") || undefined); } else if (n++ < 40) setTimeout(go, 250); };
    go();
  }
  if (new URLSearchParams(location.search).has("ouvrir")) { const u = location.href; try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {} ouvrir(u); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "jobello-ouvrir") ouvrir(e.data.url); });
})();
