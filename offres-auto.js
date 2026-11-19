/* Jobello : recherche automatique des offres pour les utilisateurs autres que le propriétaire.
   Chaque matin, la fonction Supabase « offres » cherche des offres d'après la fiche (Adzuna, gratuit)
   et les range dans alertes/jour : elles apparaissent dans Offres et dans « Swipe et ça part ».
   - Utilisateur : panneau « Mes offres automatiques » + « Chercher maintenant » (une fois par heure).
   - Propriétaire : panneau pour coller la clé Adzuna (jamais affichée ensuite).
   Chargé après accueil.js ; utilise state, esc, toast, $ d'index.html. */
(() => {
  const FN = "https://vvxkkqcmjrwytagbxdfg.supabase.co/functions/v1/offres";
  const owner = () => { try { return !!(window.jobelloIsOwner && window.jobelloIsOwner()); } catch { return false; } };
  const supa = () => (window.jobelloSupa ? window.jobelloSupa() : null);
  const heure = (iso) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  let busy = false, etat = null;

  async function chercher(stEl) {
    const s = supa(); if (!s) { toast("Connecte-toi d'abord"); return; }
    const p = state.profil || {};
    if (!p.fiche || !(p.postes || []).length) { toast("Remplis d'abord ta fiche (postes visés) dans CV & lettres"); return; }
    if (busy) return; busy = true; draw();
    const msg = (t) => { if (stEl) stEl.textContent = t; };
    try {
      const { data } = await s.sb.auth.getSession();
      const r = await fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (data?.session?.access_token || "") }, body: "{}" });
      const j = await r.json().catch(() => ({}));
      if (j.attendre) { msg("Déjà cherché il y a moins d'une heure."); toast("Recherche déjà faite il y a moins d'une heure : réessaie plus tard"); }
      else if (j.erreur && /cle_adzuna/.test(j.erreur)) { msg("La recherche automatique n'est pas encore branchée."); toast("La recherche automatique n'est pas encore active : réessaie demain"); }
      else if (!r.ok || j.erreur) { msg("La recherche n'a pas abouti."); toast("La recherche n'a pas abouti, réessaie plus tard"); }
      else {
        const n = (j.resultats || [])[0]?.trouvees || 0;
        try { const sn = await state.db.doc("alertes/jour").get(); if (sn.exists) state.alertes = sn.data(); } catch {}
        try { renderAlerts(); } catch {}
        msg(n ? `${n} nouvelle${n > 1 ? "s" : ""} offre${n > 1 ? "s" : ""}` : "Rien de nouveau pour l'instant");
        toast(n ? `${n} nouvelle${n > 1 ? "s" : ""} offre${n > 1 ? "s" : ""} pour toi` : "Pas de nouvelle offre pour l'instant");
      }
    } catch { msg("Pas de connexion ?"); toast("Pas de connexion : réessaie"); }
    busy = false; draw();
  }
  window.jobelloOffresAuto = chercher;

  async function sauverCle(btn) {
    const s = supa(); if (!s) return toast("Connecte-toi d'abord");
    const id = document.getElementById("oa-id")?.value.trim(), key = document.getElementById("oa-key")?.value.trim();
    if (!id || !key) return toast("Colle l'App ID et l'App Key");
    btn.disabled = true;
    const { error } = await s.sb.rpc("offres_set_cle", { p_id: id, p_key: key });
    btn.disabled = false;
    if (error) return toast("Pas enregistré : " + (error.message || "réessaie"));
    toast("Clé Adzuna enregistrée : la recherche automatique est active"); etat = null; lireEtat();
  }
  async function lireEtat() {
    const s = supa(); if (!s || !owner()) return;
    try { const { data } = await s.sb.rpc("offres_etat"); etat = data || {}; } catch { etat = {}; }
    draw();
  }

  function html() {
    if (owner()) {
      const ok = etat && etat.cle;
      return `<summary><span class="fold-t">Recherche auto pour tes utilisateurs</span><span class="fold-s">${etat ? (ok ? "active" : "à brancher") : ""}</span></summary><div class="fold-b">
        <p class="muted" style="margin:0;font-size:.86rem">${ok ? `C'est branché${etat.maj ? " depuis le " + esc(new Date(etat.maj).toLocaleDateString("fr-FR")) : ""} : chaque matin vers 7 h, Jobello cherche des offres pour chaque personne qui a rempli sa fiche, gratuitement (Adzuna). Ta propre veille ne change pas. Pour changer de clé, colle la nouvelle ci-dessous.` : "Colle ici l'App ID et l'App Key de ton compte gratuit Adzuna (developer.adzuna.com, rubrique « Dashboard » ou « API Access Details »). Elles restent sur le serveur et ne s'affichent plus ensuite."}</p>
        <div class="grid2" style="margin-top:8px"><div class="field"><label for="oa-id">App ID</label><input id="oa-id" autocomplete="off" spellcheck="false"></div>
        <div class="field"><label for="oa-key">App Key</label><input id="oa-key" type="password" autocomplete="off" spellcheck="false"></div></div>
        <div class="row"><button type="button" class="small primary" data-oa="cle">Enregistrer la clé</button></div></div>`;
    }
    const p = state.profil || {}, f = p.fiche, a = state.alertes || {}, auto = a.auto;
    const sous = auto ? `${auto.trouvees || 0} trouvée${(auto.trouvees || 0) > 1 ? "s" : ""} ${heure(auto.le)}` : "chaque matin";
    return `<summary><span class="fold-t">Mes offres automatiques</span><span class="fold-s">${esc(sous)}</span></summary><div class="fold-b">
      <p class="muted" style="margin:0;font-size:.86rem">${f && (p.postes || []).length ? `Chaque matin vers 7 h, Jobello cherche pour toi les offres des 7 derniers jours qui collent à ta fiche (${esc((p.postes || []).slice(0, 3).join(", "))}, autour de ${esc(f.ville || p.mobilite || "chez toi")}). Elles arrivent ci-dessous et dans « Swipe et ça part », avec une notification si tu les as activées. Pour préparer CV et lettre, Claude utilise ton propre compte Claude (gratuit).` : "Remplis ta fiche (CV & lettres, « Remplir ma fiche ») : ensuite, Jobello te trouve des offres chaque matin, sans rien faire."}</p>
      <div class="row"><button type="button" class="small" data-oa="go" ${busy || !f ? "disabled" : ""}>${busy ? "Recherche en cours…" : "Chercher maintenant"}</button><span class="muted" id="oa-st" style="font-size:.84rem"></span></div>
      <p class="muted" style="margin:6px 0 0;font-size:.76rem">Offres trouvées grâce à <a href="https://www.adzuna.fr" target="_blank" rel="noopener">Jobs by Adzuna</a>.</p></div>`;
  }
  function draw() {
    const off = document.getElementById("v-plateformes"); if (!off || typeof state === "undefined" || !state.db) return;
    let el = document.getElementById("oa-panel");
    if (!el) { el = document.createElement("details"); el.className = "fold"; el.id = "oa-panel"; off.insertAdjacentElement("afterbegin", el); if (!owner()) el.open = true; }
    const ouvert = el.open, st = document.getElementById("oa-st")?.textContent || "";
    el.innerHTML = html(); el.open = ouvert;
    const s2 = document.getElementById("oa-st"); if (s2 && st) s2.textContent = st;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-oa]"); if (!b) return;
    e.preventDefault();
    if (b.dataset.oa === "go") return chercher(document.getElementById("oa-st"));
    if (b.dataset.oa === "cle") return sauverCle(b);
  });
  // se dessine quand les données sont là, puis à chaque passage sur l'onglet Offres
  const essai = setInterval(() => { if (typeof state !== "undefined" && state.loaded && state.db) { clearInterval(essai); draw(); lireEtat(); } }, 800);
  window.addEventListener("hashchange", () => { if (/plateformes/.test(location.hash)) draw(); });
})();
