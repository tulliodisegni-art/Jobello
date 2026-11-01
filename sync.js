/* Jobello : compte, base en ligne (Supabase), réglages et import.
   La configuration du projet Supabase est dans config.js (adresse + clé publique). */
(function () {
  const ls = window.jobelloStore, C = window.JOBELLO_CONFIG || {};
  const css = `
  .jb-ov{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#0B2E6B,#11557A 55%,#0E7A5A);display:flex;align-items:center;justify-content:center;padding:24px;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#0e1f2b}
  .jb-card{background:#fff;border-radius:24px;padding:26px 22px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(60,10,40,.35);display:flex;flex-direction:column;gap:12px}
  .jb-card img{width:72px;height:72px;border-radius:18px;align-self:center}
  .jb-card h1{margin:0;text-align:center;font-size:1.6rem}
  .jb-card p{margin:0;color:#56697a;font-size:.92rem;text-align:center}
  .jb-card label{font-size:.82rem;font-weight:600;color:#56697a}
  .jb-card input{font:inherit;padding:12px 14px;border-radius:12px;border:1px solid #d5e5df;background:#f7fbfa;color:#0e1f2b;width:100%;box-sizing:border-box}
  .jb-card button{font:inherit;font-weight:700;padding:13px;border-radius:999px;border:0;background:#0E7A5A;color:#fff;cursor:pointer}
  .jb-card button.ghost{background:transparent;color:#0E7A5A;border:1px solid #bfe3d4}
  .jb-card .err{color:#c0392b;font-size:.86rem;text-align:center;min-height:1.2em}
  .jb-card .row{display:flex;gap:8px}.jb-card .row>*{flex:1}
  .jb-card h2{margin:6px 0 0;font-size:1rem}
  @media (prefers-color-scheme:dark){:root:not([data-theme=light]) .jb-card{background:#15232a;color:#e6f1ef}:root:not([data-theme=light]) .jb-card input{background:#1b2d35;border-color:#29414a;color:#e6f1ef}:root:not([data-theme=light]) .jb-card p,:root:not([data-theme=light]) .jb-card label{color:#9db4b1}}:root[data-theme=dark] .jb-card{background:#15232a;color:#e6f1ef}:root[data-theme=dark] .jb-card input{background:#1b2d35;border-color:#29414a;color:#e6f1ef}:root[data-theme=dark] .jb-card p,:root[data-theme=dark] .jb-card label{color:#9db4b1}
  .jb-gear{position:absolute;right:12px;bottom:10px;z-index:2;width:30px;height:30px;padding:0;border-radius:50%;border:0;background:transparent;color:rgba(255,255,255,.6);display:grid;place-items:center;cursor:pointer}.jb-gear:hover{color:#fff;background:rgba(255,255,255,.15)}
`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const ov = (html) => { const d = document.createElement("div"); d.className = "jb-ov"; d.innerHTML = `<div class="jb-card">${html}</div>`; document.body.appendChild(d); return d; };
  const $ = (r, s) => r.querySelector(s);

  let sb = null, user = null;
  if (C.url && C.key && window.supabase) sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: true, storageKey: "jobello.auth" } });

  /* ---------- Base en ligne ---------- */
  const remote = {
    async list(col) { const { data, error } = await sb.from("docs").select("path,data").eq("col", col); if (error) throw error; return data.map((r) => ({ id: r.path.slice(col.length + 1), data: r.data })); },
    async get(path) { const { data, error } = await sb.from("docs").select("data").eq("path", path).maybeSingle(); if (error) throw error; return data ? data.data : undefined; },
    async put(path, v) { const col = path.split("/").slice(0, -1).join("/"); const { error } = await sb.from("docs").upsert({ owner: user.id, path, col, data: v, updated_at: new Date().toISOString() }); if (error) throw error; },
    async del(path) { const { error } = await sb.from("docs").delete().eq("path", path); if (error) throw error; },
    async putBlob(id, blob) { const { error } = await sb.storage.from("fichiers").upload(user.id + "/" + id, blob, { upsert: true, contentType: blob.type || "application/octet-stream" }); if (error) throw error; },
    async getBlob(id) { const { data, error } = await sb.storage.from("fichiers").download(user.id + "/" + id); return error ? null : data; },
  };

  async function start() {
    if (!sb) { ready(); return; } // pas de base en ligne configurée : tout reste sur ce téléphone
    const { data } = await sb.auth.getSession();
    user = data.session?.user || null;
    if (!user) user = await login();
    window.jobelloSetBackend(remote);
    sb.channel("docs").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, () => { clearTimeout(start.t); start.t = setTimeout(window.jobelloRefresh, 300); }).subscribe();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) window.jobelloRefresh(); });
    ready();
  }
  function login() {
    return new Promise((res) => {
      const d = ov(`<img src="icons/icon-192.png" alt=""><h1>Jobello</h1><p>Tes candidatures, tes relances et ton planning, au même endroit.</p>
        <label>E-mail<input id="jb-mail" type="email" autocomplete="username" inputmode="email"></label>
        <label>Mot de passe<input id="jb-pass" type="password" autocomplete="current-password"></label>
        <div class="err" id="jb-err"></div>
        <button id="jb-in">Se connecter</button><button class="ghost" id="jb-up">Créer mon compte</button>`);
      const go = async (up) => {
        const email = $(d, "#jb-mail").value.trim(), password = $(d, "#jb-pass").value; $(d, "#jb-err").textContent = "";
        if (!email || password.length < 6) { $(d, "#jb-err").textContent = "E-mail et mot de passe (6 caractères minimum)"; return; }
        const r = up ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }) : await sb.auth.signInWithPassword({ email, password });
        if (r.error) { $(d, "#jb-err").textContent = /Invalid login/i.test(r.error.message) ? "E-mail ou mot de passe incorrect" : /confirm/i.test(r.error.message) ? "Confirme d'abord ton adresse avec le mail reçu" : r.error.message; return; }
        if (!r.data.session) { $(d, "#jb-err").textContent = "Compte créé : clique sur le lien reçu par mail, puis connecte-toi."; return; }
        d.remove(); res(r.data.user);
      };
      $(d, "#jb-in").onclick = () => go(false); $(d, "#jb-up").onclick = () => go(true);
    });
  }
  let ready; window.jobelloReady = new Promise((r) => (ready = r));

  /* ---------- Réglages ---------- */
  window.jobelloSettings = function (focus) {
    if (document.querySelector(".jb-ov")) return;
    const k = ls.get("aiKey", "");
    const d = ov(`<h1 style="font-size:1.3rem">Réglages</h1>
      <h2>Apparence</h2><div class="row jb-theme">${[["auto","Auto"],["light","Clair"],["dark","Sombre"]].map(([v,l])=>`<button class="${ls.get("theme","auto")===v?"":"ghost"}" data-theme-set="${v}">${l}</button>`).join("")}</div>
      <h2>Partager Jobello</h2><p style="text-align:left">Envoie le lien à un proche : il crée son compte et a son propre carnet, séparé du tien.</p><div class="row"><button class="ghost" id="jb-shr">Envoyer le lien</button></div>
      <h2>Claude</h2><p style="text-align:left">Facultatif. Sans clé, Claude fait ce travail depuis ton projet et le range ici. Avec une clé Anthropic (payante), les boutons Claude marchent aussi dans l'appli.</p>
      <input id="jb-key" type="password" placeholder="${k ? "Clé enregistrée" : "sk-ant-…"}" autocomplete="off">
      <h2>Mes données</h2><p style="text-align:left">${user ? "Connecté : " + user.email + ". Tes données sont synchronisées entre tes appareils." : "Tes données sont rangées sur cet appareil."}</p>
      <div class="row"><button class="ghost" id="jb-imp">Importer</button><button class="ghost" id="jb-exp">Exporter</button></div>
      <input id="jb-file" type="file" accept="application/json,.json" hidden>
      <div class="err" id="jb-err"></div>
      <button id="jb-ok">Enregistrer</button>${user ? `<button class="ghost" id="jb-out">Se déconnecter</button>` : ""}<button class="ghost" id="jb-close">Fermer</button>`);
    d.querySelectorAll("[data-theme-set]").forEach((b) => (b.onclick = () => { window.jobelloTheme(b.dataset.themeSet); d.querySelectorAll("[data-theme-set]").forEach((x) => (x.className = x === b ? "" : "ghost")); }));
    if (focus === "cle") $(d, "#jb-key").focus();
    $(d, "#jb-close").onclick = () => d.remove();
    $(d, "#jb-ok").onclick = () => { const v = $(d, "#jb-key").value.trim(); if (v) ls.set("aiKey", v); d.remove(); };
    if (user) $(d, "#jb-out").onclick = async () => { await sb.auth.signOut(); location.reload(); };
    $(d, "#jb-shr").onclick = () => window.jobelloShare();
    $(d, "#jb-imp").onclick = () => $(d, "#jb-file").click();
    $(d, "#jb-file").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const err = $(d, "#jb-err"); err.style.color = "#56697a"; err.textContent = "Import en cours…";
      try { const n = await importData(JSON.parse(await f.text()), (m) => (err.textContent = m)); err.textContent = `C'est fait : ${n} éléments importés.`; window.jobelloRefresh(); }
      catch (x) { err.style.color = "#c0392b"; err.textContent = "Import impossible : " + (x.message || x); }
    };
    $(d, "#jb-exp").onclick = async () => { const data = await exportData(); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })); a.download = "jobello-sauvegarde.json"; a.click(); };
  };
  // format : { docs: { "candidatures/abc": {...}, "profil/main": {...} }, blobs: { id: { type, b64 } } }
  async function importData(j, say) {
    const db = await window.claude.use("db"), docs = Object.entries(j.docs || {}), blobs = Object.entries(j.blobs || {});
    let n = 0;
    for (const [path, v] of docs) { await db.doc(path).set(v); if (++n % 10 === 0) say(`Import : ${n} / ${docs.length + blobs.length}`); }
    for (const [id, b] of blobs) { const bin = Uint8Array.from(atob(b.b64), (c) => c.charCodeAt(0)); await window.jobelloPutBlob(id, new Blob([bin], { type: b.type || "application/pdf" })); n++; say(`Import : ${n} / ${docs.length + blobs.length}`); }
    return n;
  }
  async function exportData() {
    const cols = ["candidatures", "contacts", "documents", "societes", "cibles", "alertes", "profil", "mails"], db = await window.claude.use("db"), out = { docs: {} };
    for (const c of cols) { const s = await db.collection(c).get(); s.docs.forEach((d) => (out.docs[c + "/" + d.id] = d.data())); }
    return out;
  }
  window.jobelloRemote = () => (user ? remote : null);
  window.jobelloShare = async () => {
    const url = "https://tulliodisegni-art.github.io/Jobello/", data = { title: "Jobello", text: "Jobello, l'appli pour suivre ses candidatures. Ouvre le lien, puis Partager > Sur l'écran d'accueil pour l'installer.", url };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); } catch (e) { const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    const el = document.getElementById("toast"); if (el) { el.textContent = "Lien de Jobello copié"; el.hidden = false; setTimeout(() => el.hidden = true, 2400); } else alert("Lien copié : " + url);
  };
  addEventListener("DOMContentLoaded", () => { const a = document.querySelector(".home-head .home-acts"); if (!a) return; const b = document.createElement("button"); b.type = "button"; b.className = "icon-btn"; b.setAttribute("aria-label", "Partager l'appli"); b.title = "Partager l'appli"; b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>'; b.onclick = () => window.jobelloShare(); a.prepend(b); });
  addEventListener("DOMContentLoaded", () => { const h = document.querySelector(".home-head"); const g = document.createElement("button"); g.type = "button"; g.className = "jb-gear"; g.setAttribute("aria-label", "Réglages"); g.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'; g.onclick = () => window.jobelloSettings(); (h || document.body).appendChild(g); });
  start();
})();
