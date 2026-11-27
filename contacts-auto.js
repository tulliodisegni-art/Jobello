/* Jobello : les recruteurs, RH et managers rencontrés par mail, par téléphone ou en entretien
   entrent tout seuls dans « Réseau » (27/11).
   Sources lues sur chaque candidature :
     - c.recruteur { nom, role, email, tel }      (mail lu par Claude, « Répondre au recruteur »)
     - c.mails[].de « Prénom NOM, fonction »       (+ adresse directe, + téléphone de la signature)
     - c.avecQui, c.entretiens[].notes « Avec … », historique « Appel le … avec … » (bouton « J'ai eu un appel »)
     - c.contact « Prénom NOM, fonction »
   Un téléphone écrit juste après le nom dans un mail (« appelez Cédric MIALLIER au 06 … », signature) est repris.
   Sans doublon : même nom (accents, majuscules et ordre des mots ignorés) ou même adresse = même personne ;
   on complète alors seulement ce qui manque (mail, téléphone, fonction, candidature liée).
   Une personne ajoutée ici puis supprimée à la main ne revient pas (clés gardées dans docs reseau/auto). */
(function (root) {
  const RELAY_DOM = /indeed|workday|beetween|teamtailor|welcomekit|welcometothejungle|taleez|recruitee|icims|gestmax|profils\.org|smartrecruiters|successfactors|lever\.co|greenhouse|jobvite|talentsoft|taleo|cornerstone|flatchr|digitalrecruiters|jobaffinity|cadremploi|apec\.fr|hellowork|linkedin|softy|werecruit|clevy|join\.com|breezy|personio|bamboohr/i;
  const RELAY_LOC = /(^|[._+-])(no-?reply|noreply|ne-?pas-?repondre|donotreply|do-not-reply|notifications?|mailer-daemon|auto-?reply|bounce)([._+-]|@)|^(myhr|reply-[\w]+|message|applications?|candidates?|jobs?-?alert|contact|info|recrutement|recruitment|rh|hr|jobs?|careers?|emploi|talents?)@/i;
  const relay = (e) => !e || RELAY_LOC.test(e) || RELAY_DOM.test(String(e).split("@")[1] || "");
  const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const PHONE = /(?:\+33\s?\(?0?\)?\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/;
  const NOT_PERSON = /\b(equipe|équipe|service|services|recrutement|recruitment|talent|talents|team|rh|hr|indeed|apply|candidature|ressources|humaines|no-?reply|contact|info|groupe|group|société|societe|cabinet|agence|myhr|workday|plateforme|safran|thales|airbus)\b/i;
  const CIV = /^(madame|monsieur|mme|mlle|mr|m\.)\s+/i;
  const strip = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const keyOf = (nom) => strip(String(nom || "").replace(CIV, "")).replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length > 1).sort().join(" ");
  const titre = (w) => w.split(/([-'])/).map((p) => p.length > 1 && p === p.toUpperCase() ? p[0] + p.slice(1).toLowerCase() : p).join("");
  const joli = (nom) => String(nom || "").replace(/\s+/g, " ").trim().split(" ").map(titre).join(" ");
  const digits = (t) => String(t || "").replace(/[^\d+]/g, "").replace(/^\+33/, "0");

  // « Lisa CASTELLANI, chargée de recrutement (SES) » → { nom, role }
  function personne(txt, opts) {
    let s = String(txt || "").replace(EMAIL, "").replace(PHONE, "").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim();
    if (!s) return null;
    const cut = s.split(/\s*[,|·–—]\s*|\s+-\s+|\s*\(/);
    let nom = (cut[0] || "").trim(); const reste = s.slice(cut[0].length).replace(/^\s*[,|·–—-]\s*/, "").replace(/\)\s*$/, "").trim();
    const civ = CIV.test(nom);
    if (!/^[\p{L}' .-]{3,40}$/u.test(nom) || NOT_PERSON.test(nom)) return null;
    const mots = nom.replace(CIV, "").split(/\s+/).filter(Boolean);
    if (mots.length < (civ ? 1 : 2) || mots.length > 4) return null;
    if (!civ && mots.some((w) => /^(le|la|les|de|du|des|et|avec|pour|sur|un|une|appel|entretien|visio|telephone|téléphone|mail)$/i.test(w))) return null;
    const ent = strip(opts && opts.entreprise || ""), ws = keyOf(nom).split(" ").filter(Boolean);
    if (ent && ws.length && ws.every((w) => ent.includes(w))) return null; // « Air Liquide (myHR) » : la société, pas une personne
    return { nom: joli(nom), role: reste.replace(/\(([^)]*)\)/g, "$1").replace(/\s+/g, " ").replace(/[\s,;:|·-]+$/, "").slice(0, 120) };
  }
  // « Cédric MIALLIER et Mme Martin (RH) » → plusieurs personnes
  const plusieurs = (txt, ent) => String(txt || "").split(/\s*(?:;|\/|\bet\b|&|\n)\s*/i).map((x) => ({ p: personne(x, { entreprise: ent }), tel: (x.match(PHONE) || [])[0] || "", email: (x.match(EMAIL) || [])[0] || "" })).filter((x) => x.p);

  // Téléphone écrit juste après le nom dans les mails de la candidature (signature, « appelez X au 06… »)
  function telDans(c, nom, exclus) {
    const k = strip(nom).replace(CIV, ""), last = k.split(" ").pop();
    if (!last || last.length < 3) return "";
    for (const m of [...(c.mails || [])].reverse()) {
      const t = String(m.texte || ""), low = strip(t);
      let i = low.indexOf(last);
      while (i >= 0) {
        const fen = t.slice(i, i + 170).split(/\n\s*\n/)[0];
        const ph = (fen.match(PHONE) || [])[0];
        if (ph && !exclus.has(digits(ph))) return ph.trim();
        i = low.indexOf(last, i + last.length);
      }
    }
    return "";
  }
  const typeDe = (role, src) => /recrut|talent|\brh\b|\bhr\b|ressources humaines|people|acquisition/i.test(role) ? "Recruteur / RH"
    : /cabinet|business manager|consultant/i.test(role) ? "Cabinet de recrutement"
    : /head|responsable|manager|chef|directeur|director|lead|ceo|cto|président/i.test(role) ? "Manager / responsable d'équipe"
    : src === "entretien" ? "Manager / responsable d'équipe" : "";

  /* Calcule ce qu'il faut créer ou compléter. Pur : ne touche à rien. */
  function plan(cands, contacts, opts) {
    opts = opts || {};
    const today = opts.today || new Date().toISOString().slice(0, 10);
    const me = String(opts.myEmail || "").toLowerCase();
    const exclus = new Set((opts.myPhones || []).map(digits).filter(Boolean));
    const vus = new Set(opts.dejaAjoutes || []);
    const parCle = new Map(), parMail = new Map();
    contacts.forEach((p) => { const k = keyOf(p.nom); if (k) parCle.set(k, p); if (p.email) parMail.set(String(p.email).toLowerCase(), p); });
    const trouves = new Map(); // cle → fiche à créer/compléter
    const ajoute = (c, x, src, quand, quoi) => {
      if (!x || !x.nom) return;
      const k = keyOf(x.nom); if (!k || k.split(" ").length < 1) return;
      const email = x.email && !relay(x.email) && x.email.toLowerCase() !== me && !/tulliodisegni/i.test(x.email) ? x.email.trim() : "";
      let tel = x.tel && !exclus.has(digits(x.tel)) ? x.tel.trim() : "";
      if (!tel) tel = telDans(c, x.nom, exclus);
      const cur = trouves.get(k) || { cle: k, nom: x.nom, entreprise: c.entreprise || "", candidature: c.id, role: "", email: "", telephone: "", src, quand: quand || "", quoi: quoi || "", civ: x.civ || "" };
      if (!/[a-zà-ÿ]/.test(cur.nom.replace(/^./, "")) && /[a-zà-ÿ]/.test(x.nom.slice(1))) cur.nom = x.nom; // garde la forme la plus lisible
      cur.role = cur.role || (x.role || "").trim(); cur.email = cur.email || email; cur.telephone = cur.telephone || tel; cur.civ = cur.civ || x.civ || "";
      if (quand && (!cur.quand || quand > cur.quand)) { cur.quand = quand; cur.quoi = quoi || cur.quoi; }
      if (src === "entretien" || (src === "mail" && cur.src === "fiche")) cur.src = src;
      if (src === "entretien" && quand && quand >= (opts.today || "")) cur.avenir = true;
      trouves.set(k, cur);
    };
    for (const c of cands) {
      const r = c.recruteur || {};
      if (r.nom) { const p = personne(r.nom, { entreprise: c.entreprise }); if (p) ajoute(c, { ...p, role: r.role || p.role, email: r.email, tel: r.tel, civ: r.civ }, "mail", (c.mails || []).slice(-1)[0]?.date || "", "mail"); }
      for (const m of c.mails || []) { const p = personne(m.de, { entreprise: c.entreprise }); if (p) ajoute(c, { ...p, email: m.email }, "mail", m.date || "", "mail"); }
      const ents = [c.avecQui ? { date: c.dateEntretien, t: c.avecQui, type: c.typeEntretien } : null,
        ...(c.entretiens || []).map((e) => { const a = String(e.notes || "").match(/^Avec (.+)$/m); return a ? { date: e.date, t: a[1], type: e.type } : null; })].filter(Boolean);
      for (const h of c.historique || []) { const a = String(h.texte || "").match(/^(Appel|Entretien[^,]*?) le .+? avec (.+)$/); if (a) ents.push({ date: h.date, t: a[2], type: a[1] }); }
      for (const e of ents) for (const x of plusieurs(e.t, c.entreprise)) ajoute(c, { ...x.p, tel: x.tel, email: x.email }, "entretien", e.date || "", /t[ée]l[ée]phone|^appel/i.test(e.type || "") ? "appel" : "entretien");
      if (c.contact) for (const x of plusieurs(c.contact, c.entreprise)) ajoute(c, { ...x.p, tel: x.tel, email: x.email }, "fiche", "", "");
    }
    const creer = [], completer = [], cles = [];
    for (const f of trouves.values()) {
      const ex = parCle.get(f.cle) || (f.email && parMail.get(f.email.toLowerCase())) || [...parCle.entries()].find(([k]) => k.length > 3 && (k.startsWith(f.cle + " ") || f.cle.startsWith(k + " ")) && k.split(" ")[0] === f.cle.split(" ")[0])?.[1];
      if (ex) {
        const patch = {};
        if (!ex.email && f.email) patch.email = f.email;
        if (!ex.telephone && f.telephone) patch.telephone = f.telephone;
        if (!ex.role && f.role) patch.role = f.role;
        if (!ex.candidature && f.candidature) patch.candidature = f.candidature;
        if (Object.keys(patch).length) completer.push({ id: ex.id, patch, nom: ex.nom });
        continue;
      }
      if (vus.has(f.cle)) continue; // ajouté puis supprimé à la main : on ne le remet pas
      const depuis = f.quoi === "appel" ? "Ajouté automatiquement : appel" : f.quoi === "entretien" ? "Ajouté automatiquement : entretien" : f.quoi === "mail" ? "Ajouté automatiquement : mail reçu" : "Ajouté automatiquement depuis la candidature";
      creer.push({ cle: f.cle, data: {
        nom: f.nom, entreprise: f.entreprise, role: f.role, type: typeDe(f.role, f.src), priorite: "normale",
        etape: f.avenir ? "rdv" : "repondu", telephone: f.telephone, email: f.email, linkedin: "",
        canal: f.quoi === "appel" ? "Téléphone" : f.quoi === "entretien" ? "Entretien" : f.quoi === "mail" || f.email ? "E-mail" : "Candidature",
        prochaineAction: "", dernierEchange: f.quand && f.quand <= today ? f.quand : today, notes: f.src === "entretien" && f.quand ? (f.quoi === "appel" ? "Appel" : "Entretien") + (f.avenir ? " prévu" : "") + " le " + f.quand.split("-").reverse().join("/") : "", candidature: f.candidature, auto: true,
        historique: [{ date: f.quand && f.quand <= today ? f.quand : today, texte: depuis + (f.entreprise ? " (" + f.entreprise + ")" : "") }]
      } });
      cles.push(f.cle);
    }
    return { creer, completer, cles };
  }
  root.JBContactsAuto = { plan, personne, keyOf };

  /* ---------- Dans l'appli ---------- */
  if (typeof window === "undefined" || !window.document) return;
  let tourne = false, minuteur = 0;
  async function passe() {
    const st = typeof state !== "undefined" ? state : null; // const globale du script principal (pas sur window)
    if (tourne || !st || !st.db || !st.loaded || !st.contactsVu || !st.cands.length) return;
    tourne = true;
    try {
      let vus = [];
      try { const sn = await st.db.doc("reseau/auto").get(); if (sn.exists) vus = sn.data().cles || []; } catch { return; }
      const prof = st.profil || {};
      const { creer, completer, cles } = plan(st.cands, st.contacts, { dejaAjoutes: vus, myEmail: prof.email, myPhones: [prof.telephone, prof.tel, prof.fiche?.telephone, "06 51 75 37 77"] });
      if (!creer.length && !completer.length) return;
      const now = new Date().toISOString();
      for (const x of completer) await st.db.collection("contacts").doc(x.id).set({ ...x.patch, updatedAt: now }, { merge: true });
      for (const x of creer) await st.db.collection("contacts").doc().set({ ...x.data, createdAt: now, updatedAt: now });
      if (cles.length) await st.db.doc("reseau/auto").set({ cles: [...new Set([...vus, ...cles])], updatedAt: now });
      if (creer.length && typeof window.toast === "function") window.toast(creer.length === 1 ? `${creer[0].data.nom} ajouté à ton réseau` : `${creer.length} nouveaux contacts ajoutés à ton réseau`);
    } catch {} finally { tourne = false; }
  }
  window.jbContactsAuto = () => { clearTimeout(minuteur); minuteur = setTimeout(passe, 3000); };
})(typeof window !== "undefined" ? window : globalThis);
