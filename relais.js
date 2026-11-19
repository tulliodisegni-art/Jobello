/* Jobello : l'IA avec le compte Claude de chacun, sans clé payante.
   Pour les utilisateurs autres que le propriétaire et sans clé Anthropic dans ⚙︎, chaque demande à Claude
   (lettre, CV adapté, préparation d'entretien, fiche société…) passe par la page « Claude pour Jobello »
   publiée sur claude.ai : elle utilise le compte Claude de la personne qui l'ouvre (un compte gratuit suffit).
   Aller : la demande est envoyée à la page (postMessage quand le navigateur le permet) et copiée (copier-coller sinon).
   Retour : la réponse revient seule, ou par « Coller la réponse de Claude ». */
(() => {
  const PAGE = "https://claude.ai/artifact/Kt1AzDCaExpmKeubrgANkm";
  const PRE_D = "JOBELLO-DEMANDE ", PRE_R = "JOBELLO-REPONSE ";
  const okOrigine = (o) => { try { const h = new URL(o).hostname; return /(^|\.)claude\.ai$/.test(h) || /(^|\.)claudeusercontent\.com$/.test(h) || /(^|\.)anthropic\.com$/.test(h); } catch (e) { return false; } };
  const enDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(""); r.readAsDataURL(b); });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let enCours = null; // une seule demande à la fois

  function style() {
    if (document.getElementById("jr-style")) return;
    const s = document.createElement("style"); s.id = "jr-style";
    s.textContent = `#jr{position:fixed;inset:0;z-index:10000;background:rgba(5,20,25,.55);display:flex;align-items:flex-end;justify-content:center}
#jr .jr-box{background:var(--surface,#fff);color:var(--fg,#0e1f2b);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.2);max-height:92vh;overflow:auto}
@media(min-width:640px){#jr{align-items:center}#jr .jr-box{border-radius:20px}}
#jr h3{margin:0 0 4px;font-size:1.12rem}#jr p{margin:6px 0}#jr .jr-m{color:var(--muted,#56697a);font-size:.9rem}
#jr ol{margin:10px 0;padding-left:20px}#jr li{margin:6px 0}
#jr button{font:inherit;font-weight:600;width:100%;min-height:48px;border-radius:12px;border:1px solid var(--line,#d5e5df);background:var(--surface,#fff);color:var(--fg,#0e1f2b);margin-top:10px;cursor:pointer}
#jr button.jr-p{background:var(--accent,#0e7a5a);color:var(--accent-ink,#fff);border-color:var(--accent,#0e7a5a)}
#jr button.jr-l{border:0;background:none;color:var(--muted,#56697a);min-height:40px}
#jr textarea{width:100%;min-height:90px;margin-top:10px;border:1px dashed var(--accent,#0e7a5a);border-radius:12px;padding:10px;font:13px/1.4 ui-monospace,Menlo,monospace;background:var(--accent-soft,#dff3ea);color:inherit}
#jr .jr-w{display:flex;gap:10px;align-items:center;background:var(--accent-soft,#dff3ea);border-radius:12px;padding:10px 12px;margin-top:10px;font-size:.92rem}
#jr .jr-s{width:18px;height:18px;border-radius:50%;border:3px solid transparent;border-top-color:var(--accent,#0e7a5a);animation:jrs 1s linear infinite;flex:none}
@keyframes jrs{to{transform:rotate(360deg)}}#jr .jr-e{color:#b3261e;font-size:.9rem}`;
    document.head.appendChild(s);
  }

  async function relais(input, opts = {}) {
    if (enCours) { try { enCours.annuler("remplace"); } catch (e) {} }
    const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    const images = opts.images && opts.images.length ? (await Promise.all(opts.images.map(enDataURL))).filter(Boolean) : [];
    const demande = { v: 1, id, origin: location.origin, titre: opts.titre || "Demande de Jobello", input: typeof input === "string" ? input : input.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : String(m.content || "") })), images, tier: opts.modelTier || "" };
    const texte = PRE_D + JSON.stringify(demande);

    return new Promise((resolve, reject) => {
      style();
      const el = document.createElement("div"); el.id = "jr";
      el.innerHTML = `<div class="jr-box" role="dialog" aria-modal="true" aria-label="Claude avec ton compte">
<h3>Claude va le faire avec ton compte</h3>
<p class="jr-m">Ça passe par ton propre compte Claude (gratuit), sur claude.ai. Rien à payer.</p>
<ol><li>Touche « Ouvrir Claude ». Si on te le demande, connecte-toi à Claude et autorise la page.</li>
<li>Claude prépare ta réponse. Elle revient ici toute seule, sinon touche « Copier la réponse » sur sa page.</li>
<li>Reviens ici et touche « Coller la réponse de Claude ».</li></ol>
<button class="jr-p" data-a="ouvrir">Ouvrir Claude</button>
<div class="jr-w" data-z="attente" hidden><div class="jr-s"></div><div>Claude s'en occupe dans l'autre onglet…</div></div>
<p class="jr-e" data-z="err" hidden></p>
<button data-a="coller">Coller la réponse de Claude</button>
<textarea data-z="zone" hidden placeholder="Appuie ici puis « Coller »"></textarea>
<button class="jr-l" data-a="annuler">Annuler</button></div>`;
      document.body.appendChild(el);
      const q = (s) => el.querySelector(s);
      let fen = null, fini = false;
      const err = (m) => { const e = q('[data-z="err"]'); e.textContent = m; e.hidden = !m; };
      const fin = () => { fini = true; window.removeEventListener("message", surMessage); el.remove(); if (opts.signal) opts.signal.removeEventListener("abort", surAbort); enCours = null; };
      const reussi = (text, truncated) => {
        if (fini) return; fin();
        try { if (fen && !fen.closed) fen.close(); } catch (e) {}
        if (opts.onText) { try { opts.onText({ text, delta: text }); } catch (e) {} }
        resolve({ text: String(text || ""), truncated: !!truncated });
      };
      const echec = (code, message) => { if (fini) return; fin(); reject({ code, message }); };
      enCours = { annuler: (c) => echec(c || "cancelled", "Annulé") };
      function surMessage(e) {
        const m = e.data; if (!m || typeof m !== "object" || !m.jobello || !okOrigine(e.origin)) return;
        if (m.jobello === "pret" && e.source) { try { e.source.postMessage({ jobello: "demande", demande }, e.origin); } catch (x) {} q('[data-z="attente"]').hidden = false; return; }
        if (m.id !== id) return;
        if (m.jobello === "reponse") reussi(m.text, m.truncated);
        else if (m.jobello === "erreur") { q('[data-z="attente"]').hidden = true; err((m.message || "Claude n'a pas pu le faire.") + " Tu peux réessayer depuis la page Claude."); }
      }
      function surAbort() { echec("cancelled", "Annulé"); }
      window.addEventListener("message", surMessage);
      if (opts.signal) { if (opts.signal.aborted) return surAbort(); opts.signal.addEventListener("abort", surAbort); }

      const lireReponse = (t) => {
        t = String(t || "").trim(); const i = t.indexOf(PRE_R);
        if (i < 0) { if (t) err("Ce n'est pas la réponse de Claude. Sur la page Claude, touche « Copier la réponse », puis réessaie."); return false; }
        try { const r = JSON.parse(t.slice(i + PRE_R.length)); if (r.id && r.id !== id) { err("C'est la réponse d'une autre demande. Touche à nouveau « Ouvrir Claude »."); return false; } reussi(r.text, r.truncated); return true; }
        catch (x) { err("La réponse est incomplète : copie-la à nouveau sur la page Claude."); return false; }
      };
      q('[data-a="ouvrir"]').onclick = () => {
        err("");
        try { navigator.clipboard.writeText(texte).catch(() => {}); } catch (x) {}
        try { fen = window.open(PAGE, "jobello-claude"); } catch (x) { fen = null; }
        if (!fen) location.assign(PAGE);
        q('[data-a="ouvrir"]').textContent = "Rouvrir Claude";
      };
      q('[data-a="coller"]').onclick = async () => {
        err("");
        try { const t = await navigator.clipboard.readText(); if (lireReponse(t)) return; } catch (x) {}
        const z = q('[data-z="zone"]'); z.hidden = false; z.focus();
      };
      const z = q('[data-z="zone"]');
      z.addEventListener("paste", (e) => { const t = e.clipboardData && e.clipboardData.getData("text"); if (t) { e.preventDefault(); lireReponse(t); } });
      z.addEventListener("input", () => lireReponse(z.value));
      q('[data-a="annuler"]').onclick = () => echec("cancelled", "Annulé");
    });
  }

  const estProprio = () => { try { return !!(window.jobelloIsOwner && window.jobelloIsOwner()); } catch (e) { return false; } };
  const aCle = () => { try { return !!(window.jobelloStore && window.jobelloStore.get("aiKey", "")); } catch (e) { return false; } };
  window.jobelloRelais = relais;
  // Vrai quand l'IA de cet utilisateur passe par son propre compte Claude
  window.jobelloParRelais = () => !aCle() && !estProprio();
  window.JOBELLO_CLAUDE_PAGE = PAGE;
})();
