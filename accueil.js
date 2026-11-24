/* Jobello : la fiche d'accueil d'un nouvel utilisateur.
   - À la première ouverture (profil vide), une fiche guidée en 5 étapes : toi, ton métier, tes compétences, ce que tu cherches, c'est prêt.
   - « Ajouter mon CV actuel » (PDF) : le texte est lu dans le navigateur (pdf.js, déjà utilisé par l'appli) et pré-remplit la fiche.
     Sans clé : une lecture simple (coordonnées, logiciels, compétences, langues, secteurs, diplôme, années d'expérience).
     Avec une clé Anthropic dans ⚙︎ : Claude lit le CV en plus, et peut refaire le CV au propre.
   - Tout est rangé dans profil/main (nom, titre, postes, conditions, competencesDetail… comme le profil existant) et profil/main.fiche
     (secteurs, logiciels, contrats, type d'entreprise, télétravail, à éviter…), prêt pour une recherche d'offres automatique.
   - Le CV ajouté devient « Mon CV actuel » dans Mes CV ; « Refaire mon CV » en tire un CV propre, à relire avant d'enregistrer.
   - Un profil déjà rempli (celui de Tullio) n'ouvre jamais la fiche tout seul ; « Ma fiche » la rouvre, pré-remplie, et n'efface rien.
   - Depuis la v2 (sw v70) : photo et adresse postale, comptes déjà créés sur les sites d'emploi et sites carrière (jamais de mot de passe),
     « Ton Claude » (payant + Chrome / gratuit / pas encore), puis une visite guidée « Comment marche Jobello » adaptée à son Claude.
     Sans Claude, Jobello ne serait qu'un carnet : CLAUDE_OBLIGATOIRE fait créer un compte Claude (gratuit) avant de finir la fiche.
   Ce fichier se charge après ciblage.js et utilise les outils de l'appli (state, esc, toast, lib, PDFJS, normTxt, editDoc…). */
(function () {
  const css = `
  .fi-ov{z-index:60}
  .fi .fi-steps{display:flex;gap:4px;margin:2px 0 4px}.fi .fi-steps i{flex:1;height:4px;border-radius:4px;background:var(--line)}.fi .fi-steps i.on{background:var(--accent)}
  .fi .fi-lead{margin:0;color:var(--muted);font-size:.92rem}
  .fi .fi-cv{display:flex;flex-direction:column;gap:8px;padding:14px;border:1px dashed color-mix(in srgb,var(--accent) 55%,var(--line));border-radius:14px;background:var(--accent-soft)}
  .fi .fi-cv b{font-size:1rem}.fi .fi-cv p{margin:0;font-size:.86rem;color:var(--muted)}
  .fi .fi-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .fi .fi-chips button{font-size:.84rem;font-weight:500;padding:5px 10px;border-radius:999px}
  .fi .fi-chips button[aria-pressed=true]{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}
  .fi .fi-chips button.fi-on::after{content:" ✕";opacity:.6}
  .fi .fi-add{display:flex;gap:6px;margin-top:6px}.fi .fi-add input{flex:1}.fi .fi-add button{flex:none}
  .fi .fi-sug{margin-top:6px}.fi .fi-sug small{color:var(--muted);font-size:.78rem}
  .fi .fi-sug button{border-style:dashed;color:var(--muted)}
  .fi .fi-note{font-size:.84rem;color:var(--muted);margin:0}
  .fi .fi-found{font-size:.88rem;padding:10px 12px;border-radius:12px;background:var(--surface-2);margin:0}
  .fi .fi-recap{display:grid;gap:6px;font-size:.9rem}.fi .fi-recap div{display:flex;gap:8px}.fi .fi-recap b{flex:none;min-width:130px;color:var(--muted);font-weight:600}
  .fi-search{display:grid;gap:8px;margin-top:8px}
  .fi-search .fi-q{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-top:8px;border-top:1px solid var(--line)}
  .fi-search .fi-q:first-child{border-top:0;padding-top:0}
  .fi-search .fi-q b{flex:1 1 100%;font-size:.9rem}
  .fi-search a{font-size:.8rem}
  .fi .fi-photo{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px;margin-bottom:10px}
  .fi .fi-photo img,.fi .fi-photo .fi-ph0{width:54px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line);flex:none}
  .fi .fi-photo .fi-ph0{display:grid;place-items:center;font-size:1.4rem;color:var(--muted);background:var(--surface-2)}
  .fi .fi-photo div{flex:1;min-width:0}.fi .fi-photo p{margin:2px 0 0;font-size:.84rem;color:var(--muted)}
  .fi .fi-cl{display:grid;gap:8px}
  .fi .fi-cl button{display:block;width:100%;text-align:left;padding:12px 14px;border-radius:14px;font-weight:400;line-height:1.35}
  .fi .fi-cl button b{display:block;font-size:.98rem;margin-bottom:2px}.fi .fi-cl button span{font-size:.85rem;color:var(--muted)}
  .fi .fi-cl button[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
  .fi .fi-cl .fi-tag{display:inline-block;font-size:.72rem;font-weight:700;color:var(--accent);margin-left:6px}
  .fi .fi-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .vi .vi-ic{font-size:2.4rem;line-height:1;margin:4px 0 6px}
  .vi .vi-t{margin:0;font-size:1rem;line-height:1.5}
  .vi ol{margin:6px 0 0;padding-left:20px;line-height:1.5}.vi li{margin:4px 0}
  .vi .vi-dots{display:flex;gap:6px;justify-content:center;margin:12px 0 0}.vi .vi-dots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.vi .vi-dots i.on{background:var(--accent)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- Listes proposées ---------- */
  const SECTEURS = ["Automobile", "Aéronautique", "Spatial", "Défense", "Ferroviaire", "Naval", "Énergie", "Nucléaire", "Dispositifs médicaux", "Santé", "Pharmacie", "Cosmétique", "Agroalimentaire", "Luxe", "Industrie", "BTP et construction", "Électronique", "Informatique et numérique", "Banque et assurance", "Commerce et distribution", "Transport et logistique", "Conseil", "Secteur public", "Éducation", "Hôtellerie et restauration"];
  const SECTEUR_MOTS = { "Automobile": /automobile|automotive|equipementier auto|constructeur auto|stellantis|renault|valeo|forvia|faurecia|plastic omnium|opmobility/, "Aéronautique": /aeronautique|aerospace|airbus|safran|dassault aviation|aeronef/, "Spatial": /spatial|satellite|lanceur|ariane|thales alenia/, "Défense": /defense|armement|mbda|naval group|nexter|knds/, "Ferroviaire": /ferroviaire|alstom|sncf|ratp|materiel roulant/, "Naval": /naval|navire|chantier(s)? de l atlantique/, "Énergie": /energie|eolien|photovoltaique|hydrogene|engie|totalenergies|edf/, "Nucléaire": /nucleaire|framatome|orano|cea/, "Dispositifs médicaux": /dispositifs? medicaux|medical device|iso 13485|biomedical/, "Santé": /sante|hopital|clinique|soins/, "Pharmacie": /pharma|laboratoire pharmaceutique|bpf|gmp/, "Cosmétique": /cosmetique|l oreal|parfum/, "Agroalimentaire": /agroalimentaire|agro alimentaire|food/, "Luxe": /luxe|lvmh|hermes|kering|chanel|joaillerie|horlogerie/, "BTP et construction": /btp|batiment|genie civil|construction|chantier/, "Électronique": /electronique|semi conducteur|pcb/, "Informatique et numérique": /informatique|logiciel|developpeur|saas|numerique|digital/, "Banque et assurance": /banque|assurance|bancaire|finance/, "Commerce et distribution": /commerce|distribution|retail|magasin|grande distribution/, "Transport et logistique": /logistique|transport|entrepot|supply chain/, "Conseil": /conseil|consulting|cabinet/, "Secteur public": /fonction publique|collectivite|mairie|ministere/, "Éducation": /enseignant|formateur|education|ecole primaire|college|lycee/, "Hôtellerie et restauration": /hotellerie|restauration|restaurant|hotel/ };
  const CONTRATS = ["CDI", "CDD", "Intérim", "Freelance", "Alternance", "Stage"];
  const TYPES = [["direct", "En direct dans l'entreprise, en priorité"], ["egal", "Peu importe"], ["presta", "Société de prestation, ça me va aussi"]];
  const TELE = ["", "Pas important", "1 à 2 jours par semaine", "3 jours ou plus", "Uniquement en télétravail"];
  const EXP = ["", "Débutant (moins d'1 an)", "1 à 2 ans", "3 à 5 ans", "6 à 10 ans", "Plus de 10 ans"];
  const ETUDES = ["", "Sans diplôme", "CAP / BEP", "Bac", "Bac+2 (BTS, DUT)", "Bac+3 (Licence, BUT, Bachelor)", "Bac+5 (Master, Ingénieur)", "Doctorat"];
  const DEPL = ["", "Jamais", "Occasionnels", "Fréquents"];
  const TRAJET = ["", "30 min", "45 min", "40 min à 1 h", "1 h", "1 h 15", "1 h 30"];
  const DISPO = ["", "Tout de suite", "Sous 1 mois", "Sous 2 mois", "Sous 3 mois (préavis)"];
  const CLAUDE_OBLIGATOIRE = true; // sans Claude, Jobello n'est qu'un carnet de suivi : la fiche fait créer un compte Claude gratuit
  const URL_CLAUDE = "https://claude.ai/", URL_CHROME = "https://claude.com/claude-in-chrome";
  const CLAUDES = [["chrome", "J'ai Claude payant (Pro ou plus) et un ordinateur avec Chrome", "Le plus complet. Claude écrit ta lettre, adapte ton CV, puis remplit la candidature à ta place dans Chrome. Tu t'occupes seulement des codes reçus par e-mail.", "Recommandé"],
    ["gratuit", "J'ai un compte Claude gratuit", "Claude écrit tes lettres, adapte ton CV à chaque offre et prépare tes entretiens. Tu envoies toi-même, avec le favori « Remplir avec Jobello » qui remplit les formulaires.", ""],
    ["non", "Je n'ai pas encore Claude", "Crée ton compte gratuit en 2 minutes, une adresse e-mail suffit. Ensuite, choisis « J'ai un compte Claude gratuit ».", ""]];
  const plats = () => (typeof PLATS !== "undefined" ? PLATS : []).filter((x) => !x.nocompte);
  const LANGUES = ["Anglais", "Allemand", "Espagnol", "Italien", "Portugais", "Néerlandais", "Arabe", "Chinois", "Japonais", "Russe", "Polonais", "Turc", "Roumain", "Coréen", "Hindi"];
  // Logiciels et compétences reconnus dans un CV (nom affiché, motif cherché dans le texte normalisé)
  const LOGICIELS = [["SolidWorks", "solidworks|solid works"], ["CATIA", "catia"], ["Creo", "creo|pro engineer|pro e"], ["Siemens NX", "siemens nx|unigraphics|\\bnx\\b"], ["Inventor", "inventor"], ["AutoCAD", "autocad"], ["Fusion 360", "fusion 360"], ["SolidEdge", "solid edge|solidedge"], ["TopSolid", "topsolid"], ["Revit", "revit"], ["SketchUp", "sketchup"], ["ArchiCAD", "archicad"], ["ANSYS", "ansys"], ["Abaqus", "abaqus"], ["COMSOL", "comsol"], ["Nastran", "nastran|patran"], ["HyperMesh", "hypermesh|hyperworks"], ["MATLAB", "matlab"], ["Simulink", "simulink"], ["LabVIEW", "labview"], ["Python", "python"], ["C++", "c\\+\\+|\\bcpp\\b"], ["C#", "c#|c sharp"], ["Java", "\\bjava\\b"], ["JavaScript", "javascript|\\bjs\\b|typescript"], ["SQL", "\\bsql\\b|mysql|postgresql"], ["R", "\\blangage r\\b|\\brstudio\\b"], ["VBA", "\\bvba\\b"], ["Excel", "excel"], ["Word", "\\bword\\b"], ["PowerPoint", "powerpoint"], ["Pack Office", "pack office|microsoft office|suite office|ms office"], ["Power BI", "power bi|powerbi"], ["Tableau", "\\btableau software\\b|\\btableau desktop\\b"], ["SAP", "\\bsap\\b"], ["Salesforce", "salesforce"], ["HubSpot", "hubspot"], ["Jira", "\\bjira\\b"], ["Confluence", "confluence"], ["Git", "\\bgit\\b|github|gitlab"], ["Docker", "docker"], ["AWS", "\\baws\\b|amazon web services"], ["Azure", "azure"], ["Photoshop", "photoshop"], ["Illustrator", "illustrator"], ["InDesign", "indesign"], ["Figma", "figma"], ["Canva", "canva"], ["WordPress", "wordpress"], ["Sage", "\\bsage\\b"], ["Cegid", "cegid"], ["MS Project", "ms project|microsoft project"], ["Primavera", "primavera"], ["Minitab", "minitab"], ["Windchill", "windchill"], ["Teamcenter", "teamcenter"], ["Enovia", "enovia|3dexperience"], ["Altium", "altium"], ["KiCad", "kicad"], ["Arduino", "arduino"], ["TIA Portal", "tia portal|step 7|step7"], ["Odoo", "odoo"]];
  const SAVOIRS = [["Gestion de projet", "gestion de projets?|chef de projet|pilotage de projets?|project management"], ["Conception mécanique", "conception mecanique|conception de pieces|conception d ensembles"], ["Reconception", "reconception"], ["Rétroconception", "retroconception|reverse engineering"], ["Mise en plan", "mise en plan|plans? de definition"], ["Cotation fonctionnelle", "cotation|iso gps|gd t|tolerancement"], ["Dimensionnement", "dimensionnement|calculs? de structure|rdm|resistance des materiaux"], ["Calcul par éléments finis", "elements finis|\\bfea\\b|\\bmef\\b"], ["Analyse fonctionnelle", "analyse fonctionnelle"], ["Cahier des charges", "cahier des charges|specifications?"], ["AMDEC", "amdec|fmea"], ["Essais et validation", "essais|validation|plan de validation|banc d essai"], ["Qualification", "qualification"], ["Prototypage", "prototyp"], ["Impression 3D", "impression 3d|fabrication additive"], ["Plasturgie et injection", "plasturgie|injection plastique|moules? d injection"], ["Usinage", "usinage|fraisage|tournage"], ["Tôlerie", "tolerie"], ["Industrialisation", "industrialisation"], ["Métrologie", "metrologie"], ["Qualité", "qualite|\\biso 9001\\b|\\b8d\\b|ishikawa"], ["ISO 13485", "iso 13485"], ["Lean / amélioration continue", "lean|amelioration continue|kaizen|5s|six sigma"], ["Maintenance", "maintenance"], ["Automatisme", "automatisme|automates?|plc"], ["Électricité", "electricite|electrotechnique"], ["Achats", "achats?|acheteur|sourcing"], ["Supply chain", "supply chain|approvisionnement"], ["Logistique", "logistique"], ["Management d'équipe", "management|encadrement|manager une equipe"], ["Relation client", "relation client|service client"], ["Vente", "vente|commercial|business developer"], ["Négociation", "negociation"], ["Marketing digital", "marketing digital|webmarketing|seo|sea|reseaux sociaux"], ["Communication", "communication"], ["Comptabilité", "comptabilite|comptable"], ["Contrôle de gestion", "controle de gestion"], ["Paie", "\\bpaie\\b"], ["Recrutement", "recrutement|talent acquisition"], ["Ressources humaines", "ressources humaines|\\brh\\b"], ["Juridique", "juridique|droit des"], ["Développement web", "developpement web|front end|back end|full stack"], ["Analyse de données", "analyse de donnees|data analys|business intelligence"], ["Formation", "formateur|animation de formations?"], ["Rédaction technique", "redaction technique|documentation technique|notices?"], ["Veille technologique", "veille technologique|veille technique"], ["Réglementation", "reglementation|marquage ce|normes?"]];

  /* ---------- Outils ---------- */
  const ls = window.jobelloStore || { get: (k, d) => d, set() {} };
  const aiKey = () => !!ls.get("aiKey", "");
  const nt = (s) => " " + normTxt(s) + " ";
  const uniq = (xs) => { const seen = new Set(); return xs.map((x) => String(x || "").trim()).filter((x) => x && !seen.has(normTxt(x)) && seen.add(normTxt(x))); };
  const opts = (xs, v) => xs.map((o) => `<option value="${esc(o)}"${(v || "") === o ? " selected" : ""}>${esc(o || "À préciser")}</option>`).join("");
  const owner = () => { try { return !!(window.jobelloIsOwner && window.jobelloIsOwner()); } catch { return false; } };
  const fiche = () => state.profil?.fiche || null;
  const vide = (p) => !p || (!(p.postes || []).length && !(p.competencesDetail || []).length && !p.titre);

  /* Brouillon de la fiche, pré-rempli avec ce qui existe déjà */
  let F = null, step = 0, cvFile = null, cvText = "", busy = false, found = "";
  function depart() {
    const p = state.profil || {}, f = p.fiche || {}, c = p.conditions || {};
    const comp = (p.competencesDetail || []).filter((x) => x && x.nom && x.niveau !== 0); // jamais une compétence notée « jamais fait »
    const brouillon = ls.get("fiche.brouillon", null);
    const base = {
      nom: p.nom || "", email: p.email || "", telephone: p.telephone || "", linkedin: p.linkedin || "", ville: f.ville || p.mobilite || "",
      titre: p.titre || "", postes: [...(p.postes || [])], experience: f.experience || "", etudes: f.etudes || "", secteurs: [...(f.secteurs || [])],
      competences: f.competences ? [...f.competences] : comp.filter((x) => !/logiciel|cao|outil|langue/i.test(x.categorie || "")).map((x) => x.nom).slice(0, 40),
      logiciels: f.logiciels ? [...f.logiciels] : comp.filter((x) => /logiciel|cao|outil/i.test(x.categorie || "")).map((x) => x.nom).slice(0, 30),
      langues: [...(f.langues || [])], contrats: [...(f.contrats || ["CDI"])], typeEntreprise: f.typeEntreprise || "direct", teletravail: f.teletravail || "",
      adresse: p.adresse || "", codePostal: p.codePostal || "", comptes: Object.keys(p.comptes || {}), sites: [...(f.sitesCarriere || [])], claude: f.claude || "",
      trajetMax: c.trajetMax || "", deplacements: c.deplacements || "", salaire: p.salaire || "", disponibilite: f.disponibilite || "", eviter: f.eviter || "",
    };
    // un brouillon en cours (fiche fermée avant la fin) l'emporte, sauf si la fiche a été enregistrée depuis
    return brouillon && !(f.faite && (f.version || 1) >= 2) ? { ...base, ...brouillon } : base;
  }
  const garder = () => { try { ls.set("fiche.brouillon", F); } catch {} };

  /* ---------- Lecture du CV ---------- */
  async function textePdf(file) {
    await lib(PDFJS + "pdf.min.js"); await lib(PDFJS + "pdf.worker.min.js");
    const P = window.pdfjsLib; P.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
    const pdf = await P.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const out = [];
    for (let n = 1; n <= Math.min(pdf.numPages, 4); n++) {
      const items = (await (await pdf.getPage(n)).getTextContent()).items.filter((it) => it.str && it.str.trim());
      items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
      let line = [], y = null;
      // les morceaux d'un même mot (lettres espacées, crénage) sont recollés ; un vrai blanc entre deux morceaux donne une espace
      const flush = () => {
        if (!line.length) return;
        line.sort((a, b) => a.transform[4] - b.transform[4]);
        let s = "", fin = null;
        for (const it of line) {
          const fs = Math.hypot(it.transform[0], it.transform[1]) || it.height || 10, x = it.transform[4];
          if (fin !== null && x - fin > fs * 0.22 && !/\s$/.test(s) && !/^\s/.test(it.str)) s += " ";
          s += it.str.replace(/[\uE000-\uF8FF]/g, " "); fin = x + (it.width || 0); // signes dessinés par la police (puces, tirets) : un blanc
        }
        out.push(s.replace(/\s+/g, " ").trim()); line = [];
      };
      for (const it of items) { const yy = it.transform[5]; if (y !== null && Math.abs(yy - y) > 3) flush(); if (!line.length) y = yy; line.push(it); }
      flush(); out.push("");
    }
    // titres aux lettres espacées (« F O R M A T I O N ») recollés
    return out.map((l) => (/^([A-ZÀ-Ý&'’]\s){3,}[A-ZÀ-Ý&'’]$/.test(l) ? l.replace(/\s/g, "") : l)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  const TITRES = /^(profil|a propos|resume|objectif|experiences?( professionnelles?)?|parcours( professionnel)?|formations?|etudes|diplomes?|competences?( techniques| cles)?|savoir faire|logiciels?|informatique|outils|langues?|centres? d interets?|loisirs|interets|certifications?|projets?|references?|contact|coordonnees|qualites|soft skills|atouts)$/;
  function sections(text) {
    const res = { _haut: [] }; let cur = "_haut";
    text.split("\n").forEach((l) => {
      const k = normTxt(l), maj = l.length <= 50 && l === l.toUpperCase() && /[A-ZÀ-Ý]{2}/.test(l) && !/@|\d/.test(l), kc = k.replace(/ /g, "");
      if (k && l.length <= 50 && (TITRES.test(k) || (maj && /^(profil|apropos|resume|objectif|experience|parcours|formation|etude|diplome|competence|savoirfaire|logiciel|informatique|outil|langue|centre|loisir|interet|certification|projet|reference|qualite|atout)/.test(kc)))) {
        cur = /exper|parcours/.test(kc) ? "experience" : /format|etude|diplome/.test(kc) ? "formation" : /^langue/.test(kc) ? "langues" : /competen|savoir|logiciel|informatique|outil/.test(kc) ? "competences" : /profil|propos|resume|objectif/.test(kc) ? "profil" : "autre:" + kc;
        res[cur] = res[cur] || []; return;
      }
      (res[cur] = res[cur] || []).push(l);
    });
    return res;
  }
  function lireTexte(text) {
    const r = {}, n = nt(text), lignes = text.split("\n").map((l) => l.trim()).filter(Boolean), sec = sections(text);
    const mail = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/); if (mail) r.email = mail[0];
    const tel = text.match(/(?:\+33\s?\(?0?\)?\s?|\b0)[1-9](?:[\s.\-]?\d{2}){4}\b/); if (tel) r.telephone = tel[0].trim();
    const li = text.match(/linkedin\.com\/in\/[\w\-%éèà]+/i); if (li) r.linkedin = "https://www." + li[0];
    const haut = lignes.slice(0, 12);
    const motNom = (l) => /^[A-Za-zÀ-ÿ'’\- ]{4,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 4 && !TITRES.test(normTxt(l)) && !/curriculum|vitae|\bcv\b/i.test(l);
    const nom = haut.find((l) => motNom(l) && l.split(/\s+/).some((w) => w.length > 1 && w === w.toUpperCase())) || haut.find(motNom);
    if (nom) r.nom = nom.split(/\s+/).map((w) => w === w.toUpperCase() && w.length > 1 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const iNom = nom ? haut.indexOf(nom) : -1;
    const titre = haut.find((l, i) => i !== iNom && l.length >= 6 && l.length <= 90 && !/@|\d{2}[\s.]\d{2}|linkedin|http|^(tel|tél|e-?mail|adresse|lieu)/i.test(l) && !TITRES.test(normTxt(l)) && /[a-zà-ÿ]{3}/i.test(l) && (iNom < 0 || i > iNom));
    if (titre) { r.titre = titre.replace(/\s*[|·•]\s*|\s{2,}/g, " · "); r.postes = [titre.split(/\s[|·•–-]\s|\s{2,}/)[0].trim()]; }
    const cp = text.match(/\b(\d{5})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’\-]+(?:[ \-][A-Za-zÀ-ÿ'’]+){0,3})/);
    const lieu = text.match(/(?:lieu|adresse|ville|domicile)\s*:?\s*([^\n·|]{3,50})/i);
    if (lieu) r.ville = lieu[1].split(/\s+(?:nationalit|t[ée]l[ ée.:]|e-?mail|linkedin|permis|n[ée]e? le|[âa]ge)/i)[0].replace(/[\s,]+(\d{2})$/, " ($1)").replace(/[\s,·]+$/, "").trim();
    else if (cp) r.ville = `${cp[2].trim()} (${cp[1].slice(0, 2)})`;
    if (cp) r.codePostal = cp[1];
    const rue = text.match(/\b(\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|all[ée]e|place|chemin|impasse|route|quai|cours|square|villa|r[ée]sidence)\s[^\n,·|]{2,45})/i);
    if (rue) r.adresse = rue[1].replace(/\s+\d{5}.*$/, "").trim();
    r.logiciels = LOGICIELS.filter(([, m]) => new RegExp(m).test(n)).map(([x]) => x);
    if (r.logiciels.includes("Pack Office")) r.logiciels = r.logiciels.filter((x) => !["Word", "PowerPoint"].includes(x));
    r.competences = SAVOIRS.filter(([, m]) => new RegExp(m).test(n)).map(([x]) => x);
    const NIV = /\b(bilingue|courant|natif|maternelle|professionnel|intermediaire|notions|scolaire|[abc][12]|toeic \d{3}|toefl \d{2,3}|ielts \d)\b/;
    r.langues = LANGUES.filter((l) => n.includes(" " + normTxt(l) + " ")).map((l) => {
      const m = " " + normTxt(l) + " "; let lv = null;
      for (let i = n.indexOf(m); i >= 0 && !lv; i = n.indexOf(m, i + 1)) lv = n.slice(i + m.length - 1, i + m.length + 30).match(NIV);
      const niv = lv ? lv[1].replace(/^([abc])([12])$/, (x) => x.toUpperCase()).replace(/intermediaire/, "intermédiaire") : "";
      return niv ? `${l} (${niv})` : l;
    });
    r.secteurs = Object.entries(SECTEUR_MOTS).filter(([, m]) => m.test(n)).map(([s]) => s).slice(0, 6);
    r.etudes = /doctorat|\bphd\b|these de/.test(n) ? ETUDES[7] : /diplome d ingenieur|ecole d ingenieurs?|ingenieur diplome|\bmaster\b|mastere|bac 5|\bmba\b|\bm2\b/.test(n) ? ETUDES[6] : /licence|bachelor|\bbut\b|bac 3/.test(n) ? ETUDES[5] : /\bbts\b|\bdut\b|bac 2/.test(n) ? ETUDES[4] : /\bbac\b|baccalaureat/.test(n) ? ETUDES[3] : "";
    const exp = (sec.experience || []).join(" "), ans = (exp.match(/\b(19[7-9]\d|20[0-4]\d)\b/g) || []).map(Number).filter((y) => y <= new Date().getFullYear());
    if (ans.length) { const a = new Date().getFullYear() - Math.min(...ans); r.experience = a < 1 ? EXP[1] : a <= 2 ? EXP[2] : a <= 5 ? EXP[3] : a <= 10 ? EXP[4] : EXP[5]; }
    return r;
  }
  async function lireIA(text) {
    const r = await state.sample.json(`Voici le texte d'un CV. Remplis la fiche du candidat. Réponds uniquement en JSON :
{"nom":"","email":"","telephone":"","ville":"","adresse":"","codePostal":"","linkedin":"","titre":"son métier en quelques mots","postes":["3 à 6 intitulés de poste qu'il peut viser, d'après son parcours"],"experience":"${EXP.slice(1).join("|")}","etudes":"${ETUDES.slice(1).join("|")}","secteurs":["parmi : ${SECTEURS.join(", ")}"],"competences":["savoir-faire métier, 4 mots max chacun"],"logiciels":["logiciels et outils"],"langues":["Anglais (courant)"]}
Adresse = numéro et rue seulement. N'invente rien : laisse vide ce qui n'est pas dans le CV.

${text.slice(0, 12000)}`, { cache: false });
    return r && typeof r === "object" ? r : {};
  }
  function fusion(r, remplacer) {
    let n = 0;
    ["nom", "email", "telephone", "linkedin", "ville", "adresse", "codePostal", "titre", "experience", "etudes"].forEach((k) => { const v = String(r[k] || "").trim(); if (v && (remplacer || !F[k])) { if (F[k] !== v) n++; F[k] = v; } });
    if (F.experience && !EXP.includes(F.experience)) F.experience = "";
    if (F.etudes && !ETUDES.includes(F.etudes)) F.etudes = "";
    ["postes", "secteurs", "competences", "logiciels", "langues"].forEach((k) => { const a = F[k].length; F[k] = uniq([...F[k], ...(Array.isArray(r[k]) ? r[k] : [])]); n += F[k].length - a; });
    if (F.secteurs.length) F.secteurs = F.secteurs.map((s) => SECTEURS.find((x) => normTxt(x) === normTxt(s)) || s);
    return n;
  }
  async function ajouterCV(file) {
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return toast("Choisis ton CV en PDF");
    busy = true; found = "Je lis ton CV…"; draw();
    try {
      const text = await textePdf(file);
      if (text.replace(/\s/g, "").length < 80) { busy = false; found = "Je n'arrive pas à lire le texte de ce PDF (CV scanné ou en image ?). Remplis la fiche à la main, ou colle le texte de ton CV ci-dessous."; step = 0; draw(); return; }
      cvFile = file; cvText = text;
      const avant = JSON.stringify(F);
      fusion(lireTexte(text));
      let ia = false;
      if (aiKey()) { found = "Claude lit ton CV…"; draw(); try { fusion(await lireIA(text), true); ia = true; } catch {} }
      const c = F.competences.length + F.logiciels.length;
      found = `${ia ? "Claude a lu ton CV" : "J'ai lu ton CV"} : ${[F.nom && "tes coordonnées", F.titre && "ton métier", c && `${c} compétences et logiciels`, F.langues.length && `${F.langues.length} langue${F.langues.length > 1 ? "s" : ""}`, F.secteurs.length && "tes secteurs"].filter(Boolean).join(", ") || "peu d'informations"}. Vérifie et complète chaque étape.`;
      if (JSON.stringify(F) === avant && !ia) found = "J'ai lu ton CV mais je n'y ai rien trouvé de nouveau. Remplis la fiche à la main.";
      garder(); busy = false; step = 1; draw();
    } catch { busy = false; found = "Ton CV n'a pas pu être lu ici (connexion ?). Réessaie, ou remplis la fiche à la main."; draw(); }
  }
  function collerTexte(text) {
    if (String(text || "").trim().length < 80) return toast("Colle tout le texte de ton CV");
    cvText = text.trim(); cvFile = null; fusion(lireTexte(cvText)); found = "Texte lu : vérifie et complète chaque étape."; garder(); step = 1; draw();
  }

  /* ---------- La fiche ---------- */
  const ETAPES = ["Bienvenue", "Toi", "Ton métier", "Tes compétences", "Ce que tu cherches", "Tes comptes", "Ton Claude", "C'est prêt"];
  const I_COMPTES = 5, I_CLAUDE = 6;
  const claudeOk = () => !CLAUDE_OBLIGATOIRE || owner() || F.claude === "chrome" || F.claude === "gratuit";
  let ovEl = null;
  function chips(key, sug, placeholder) {
    const on = F[key] || [], reste = (sug || []).filter((s) => !on.some((x) => normTxt(x) === normTxt(s)));
    return `<div class="fi-chips">${on.map((x, i) => `<button type="button" class="fi-on" data-fi-del="${key}:${i}" aria-label="Retirer ${esc(x)}">${esc(x)}</button>`).join("") || `<span class="fi-note">Rien pour l'instant.</span>`}</div>
      ${placeholder ? `<div class="fi-add"><input data-fi-new="${key}" placeholder="${esc(placeholder)}"><button type="button" class="small" data-fi-add="${key}">Ajouter</button></div>` : ""}
      ${reste.length ? `<div class="fi-chips fi-sug"><small>Suggestions :</small>${reste.map((s) => `<button type="button" data-fi-sug="${key}" data-v="${esc(s)}">+ ${esc(s)}</button>`).join("")}</div>` : ""}`;
  }
  const toggles = (key, list) => `<div class="fi-chips" role="group">${list.map((x) => `<button type="button" data-fi-tog="${key}" data-v="${esc(x)}" aria-pressed="${F[key].includes(x)}">${esc(x)}</button>`).join("")}</div>`;
  const champ = (k, label, ph, type) => `<div class="field"><label for="fi-${k}">${label}</label><input id="fi-${k}" data-fi="${k}" value="${esc(F[k])}"${ph ? ` placeholder="${esc(ph)}"` : ""}${type ? ` type="${type}"` : ""}></div>`;
  const choix = (k, label, list) => `<div class="field"><label for="fi-${k}">${label}</label><select id="fi-${k}" data-fi="${k}">${opts(list, F[k])}</select></div>`;
  function corps() {
    if (step === 0) return `<p class="fi-lead">Quelques questions pour que Jobello te propose les bons postes, prépare tes candidatures avec Claude et les envoie pour toi. Ça prend 5 minutes, et tout reste modifiable.</p>
      <div class="fi-cv"><b>Ajouter mon CV actuel</b><p>Je le lis et je remplis la fiche pour toi : tu n'as plus qu'à vérifier. Ton CV est aussi rangé dans « Mes CV ».</p>
        <div class="row"><label class="btn primary" for="fi-file">${busy ? "Lecture…" : "Choisir mon CV (PDF)"}</label><input type="file" id="fi-file" accept="application/pdf,.pdf" hidden></div></div>
      ${found ? `<p class="fi-found" role="status">${esc(found)}</p>` : ""}
      <details><summary class="fi-note" style="cursor:pointer">Mon CV n'est pas en PDF : coller son texte</summary><textarea id="fi-paste" rows="6" placeholder="Colle ici tout le texte de ton CV"></textarea><div class="row" style="margin-top:6px"><button type="button" class="small" data-fi-paste>Lire ce texte</button></div></details>
      <p class="fi-note">Pas de CV sous la main ? Appuie sur « Remplir à la main ».</p>`;
    if (step === 1) { const ph = state.profil?.photoAssetId;
      return `${found ? `<p class="fi-found">${esc(found)}</p>` : ""}
      <div class="fi-photo">${ph ? `<img src="/_blob/${esc(ph)}" alt="Ta photo">` : `<span class="fi-ph0" aria-hidden="true">+</span>`}<div><b>Ta photo pour les CV</b><p>${ph ? "Elle sera sur tous les CV que Jobello prépare." : "Facultative, mais appréciée. Une photo nette, de face, sur fond clair."}</p></div>
        <label class="btn small${ph ? "" : " primary"}" for="fi-photo-in">${busy === "photo" ? "Envoi…" : ph ? "Changer" : "Ajouter"}</label><input type="file" id="fi-photo-in" accept="image/png,image/jpeg" hidden></div>
      <div class="grid2">${champ("nom", "Prénom et nom", "ex. Camille Martin")}${champ("ville", "Ta ville", "ex. Vincennes (94)")}${champ("email", "E-mail", "", "email")}${champ("telephone", "Téléphone", "", "tel")}${champ("adresse", "Adresse postale (n° et rue)", "ex. 12 rue de Fontenay")}${champ("codePostal", "Code postal", "ex. 94300")}</div>
      ${champ("linkedin", "Ton profil LinkedIn (si tu en as un)", "linkedin.com/in/…")}
      <p class="fi-note">Les formulaires de candidature demandent souvent l'adresse : Claude la recopie pour toi. Elle n'est jamais montrée ailleurs.</p>`; }
    if (step === 2) return `<div class="grid2">${champ("titre", "Ton métier", "ex. Ingénieur mécanique, comptable, aide-soignante…")}${choix("experience", "Ton expérience", EXP)}${choix("etudes", "Ton niveau d'études", ETUDES)}</div>
      <div class="field"><span class="lbl">Les postes que tu vises</span><p class="fi-note">Écris les intitulés tels qu'ils apparaissent dans les annonces : c'est avec eux que l'appli cherche les offres.</p>${chips("postes", F.titre && !F.postes.length ? [F.titre] : [], "ex. Ingénieur bureau d'études")}</div>
      <div class="field"><span class="lbl">Les secteurs qui t'intéressent</span>${chips("secteurs", SECTEURS, "Autre secteur")}</div>`;
    if (step === 3) return `<p class="fi-lead">Garde seulement ce que tu sais vraiment faire : l'appli ne t'attribuera jamais une compétence que tu n'as pas. Tu pourras préciser ton niveau dans « Mes compétences ».</p>
      <div class="field"><span class="lbl">Ce que tu sais faire</span>${chips("competences", [], "ex. Gestion de projet")}</div>
      <div class="field"><span class="lbl">Les logiciels et outils que tu utilises</span>${chips("logiciels", [], "ex. Excel, SolidWorks, SAP…")}</div>
      <div class="field"><span class="lbl">Tes langues</span>${chips("langues", ["Anglais (courant)", "Anglais (notions)", "Espagnol (notions)", "Allemand (notions)"], "ex. Italien (courant)")}</div>`;
    if (step === 4) return `<div class="field"><span class="lbl">Type de contrat</span>${toggles("contrats", CONTRATS)}</div>
      <div class="field"><label for="fi-typeEntreprise">Type d'employeur</label><select id="fi-typeEntreprise" data-fi="typeEntreprise">${TYPES.map(([v, l]) => `<option value="${v}"${F.typeEntreprise === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="grid2">${choix("trajetMax", "Trajet maximum depuis chez toi", TRAJET)}${choix("deplacements", "Déplacements", DEPL)}${choix("teletravail", "Télétravail", TELE)}${choix("disponibilite", "Disponible", DISPO)}${champ("salaire", "Salaire visé", "ex. 42 000 € brut / an")}</div>
      ${champ("eviter", "Ce que tu ne veux pas (métiers, secteurs, mots dans les annonces)", "ex. électronique, travail de nuit")}`;
    if (step === I_COMPTES) return `<p class="fi-lead">Coche les sites où tu as déjà un compte. Jobello ne te demande jamais tes mots de passe : quand Claude postule, il passe par les connexions déjà ouvertes dans ton navigateur.</p>
      <div class="field"><span class="lbl">Sites d'emploi</span><div class="fi-chips" role="group">${plats().map((x) => `<button type="button" data-fi-cpt="${esc(x.id)}" aria-pressed="${F.comptes.includes(x.id)}">${esc(x.nom)}</button>`).join("")}</div></div>
      <div class="field"><span class="lbl">Sites carrière d'entreprises</span><p class="fi-note">Les grandes entreprises ont leur propre espace candidat (Safran, Thales, L'Oréal…). Note celles où tu as un compte : Claude s'y connectera avant de postuler.</p>${chips("sites", [], "ex. Safran, Airbus")}</div>
      <p class="fi-found">Le bon réflexe : sur ton ordinateur, connecte-toi une fois à chacun de ces sites dans Chrome en cochant « Rester connecté ». C'est ce qui permet à Claude d'aller jusqu'au bout sans t'attendre.</p>`;
    if (step === I_CLAUDE) return `<p class="fi-lead">Jobello travaille avec Claude, l'assistant d'Anthropic, et avec ton propre compte : rien à payer à Jobello. C'est Claude qui écrit tes lettres, adapte ton CV à chaque offre et prépare tes entretiens.</p>
      <div class="fi-cl" role="group" aria-label="Ton Claude">${CLAUDES.map(([v, t, d, tag]) => `<button type="button" data-fi-claude="${v}" aria-pressed="${F.claude === v}"><b>${esc(t)}${tag ? `<span class="fi-tag">${esc(tag)}</span>` : ""}</b><span>${esc(d)}</span></button>`).join("")}</div>
      ${F.claude === "chrome" ? `<div class="fi-act"><a class="btn small primary" href="${URL_CHROME}" target="_blank" rel="noopener">Installer Claude dans Chrome</a></div><p class="fi-note">Sur ordinateur seulement. Ouvre Chrome, ajoute l'extension, épingle-la et connecte-toi avec ton compte Claude.</p>` : ""}
      ${F.claude === "non" ? `<div class="fi-act"><a class="btn small primary" href="${URL_CLAUDE}" target="_blank" rel="noopener">Créer mon compte Claude gratuit</a></div>${CLAUDE_OBLIGATOIRE ? `<p class="fi-found">Sans Claude, Jobello ne serait qu'un carnet de suivi. Crée ton compte (c'est gratuit), puis reviens ici et choisis « J'ai un compte Claude gratuit ».</p>` : ""}` : ""}
      ${F.claude === "gratuit" ? `<p class="fi-note">Plus tard, avec un abonnement Claude payant et Chrome sur ordinateur, Claude pourra aussi remplir et envoyer tes candidatures à ta place.</p>` : ""}`;
    const L = (l, v) => v ? `<div><b>${l}</b><span>${esc(v)}</span></div>` : "";
    return `<p class="fi-lead">Voici ta fiche. Enregistre-la : l'appli s'en sert pour te proposer les offres qui te correspondent et pour refaire ton CV.</p>
      <div class="fi-recap">${L("Toi", [F.nom, F.ville].filter(Boolean).join(" · "))}${L("Adresse", [F.adresse, F.codePostal].filter(Boolean).join(", "))}${L("Photo", state.profil?.photoAssetId ? "Ajoutée" : "")}${L("Métier", [F.titre, F.experience, F.etudes].filter(Boolean).join(" · "))}${L("Postes visés", F.postes.join(", "))}${L("Secteurs", F.secteurs.join(", "))}${L("Compétences", F.competences.join(", "))}${L("Logiciels", F.logiciels.join(", "))}${L("Langues", F.langues.join(", "))}${L("Contrat", F.contrats.join(", "))}${L("Employeur", (TYPES.find(([v]) => v === F.typeEntreprise) || [])[1])}${L("Trajet max", F.trajetMax)}${L("Salaire", F.salaire)}${L("À éviter", F.eviter)}${L("Mes comptes", [...plats().filter((x) => F.comptes.includes(x.id)).map((x) => x.nom), ...F.sites].join(", "))}${L("Mon Claude", (CLAUDES.find(([v]) => v === F.claude) || [])[1])}</div>
      ${!claudeOk() ? `<p class="fi-found">Il te manque Claude (étape « Ton Claude ») : c'est lui qui prépare et envoie tes candidatures.</p>` : ""}
      ${!F.postes.length ? `<p class="fi-found">Ajoute au moins un poste visé (étape « Ton métier ») : c'est ce qui sert à chercher les offres.</p>` : ""}
      ${cvFile || cvText ? `<p class="fi-note">Ton CV sera rangé dans « Mes CV » sous le nom « Mon CV actuel ».</p>` : ""}`;
  }
  function draw() {
    if (!ovEl) return;
    const sc = ovEl.querySelector(".sheet"), y = sc ? sc.scrollTop : 0;
    ovEl.innerHTML = `<div class="sheet fi" role="dialog" aria-modal="true" aria-label="Ma fiche">
      <div class="sheet-head"><div style="min-width:0;flex:1"><span class="label">Ma fiche · ${step + 1} / ${ETAPES.length}</span><h2>${ETAPES[step]}</h2><div class="fi-steps" aria-hidden="true">${ETAPES.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div></div><button type="button" class="ghost" data-fi-go="fermer">Plus tard</button></div>
      ${corps()}
      <div class="sheet-foot"><div class="row">${step === 0 ? `<button type="button" class="ghost" data-fi-go="+1"${busy ? " disabled" : ""}>${F.nom || F.postes.length ? "Continuer sans CV" : "Remplir à la main"}</button>` : `<button type="button" class="ghost" data-fi-go="-1">Retour</button>`}
        ${step > 0 && step < ETAPES.length - 1 ? `<button type="button" class="primary" data-fi-go="+1"${step === I_CLAUDE && !claudeOk() ? " disabled" : ""}>Continuer</button>` : ""}${step === ETAPES.length - 1 ? `<button type="button" class="primary" data-fi-go="enregistrer"${claudeOk() ? "" : " disabled"}>Enregistrer ma fiche</button>` : ""}</div></div></div>`;
    const ns = ovEl.querySelector(".sheet"); if (ns && y) ns.scrollTop = y;
  }
  function ouvrir(etape) {
    if (ovEl) return;
    F = depart(); step = etape || 0; found = ""; busy = false;
    ovEl = document.createElement("div"); ovEl.className = "overlay fi-ov"; document.body.appendChild(ovEl);
    lockScroll(); draw();
    ovEl.addEventListener("click", clic); ovEl.addEventListener("input", saisie); ovEl.addEventListener("change", saisie);
    ovEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.dataset?.fiNew) { e.preventDefault(); ajout(e.target.dataset.fiNew); } });
  }
  function fermer() { if (!ovEl) return; garder(); ovEl.remove(); ovEl = null; unlockScroll(); }
  function saisie(e) {
    const t = e.target;
    if (t.id === "fi-file" && e.type === "change") return ajouterCV(t.files[0]);
    if (t.id === "fi-photo-in" && e.type === "change") return photo(t.files[0]);
    if (t.dataset?.fi) { F[t.dataset.fi] = t.value; if (e.type === "change") garder(); }
  }
  async function photo(file) {
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) return toast("Choisis une photo en JPG ou PNG");
    if (!state.assets || !state.db) return toast("Connecte-toi à Jobello pour ajouter ta photo");
    busy = "photo"; draw();
    try { const up = await state.assets.upload(file); await saveProfil({ photoAssetId: up.id }, "Photo enregistrée : elle sera sur tes CV"); } catch { toast("La photo n'a pas pu être envoyée, réessaie."); }
    busy = false; draw();
  }
  function ajout(key) {
    const i = ovEl.querySelector(`[data-fi-new="${key}"]`); if (!i) return;
    const vs = i.value.split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean); if (!vs.length) return i.focus();
    F[key] = uniq([...F[key], ...vs]); garder(); draw(); const j = ovEl.querySelector(`[data-fi-new="${key}"]`); if (j) j.focus();
  }
  function clic(e) {
    const t = e.target.closest("button,[data-fi-go]"); if (!t) return;
    const d = t.dataset;
    if (d.fiGo) {
      if (d.fiGo === "fermer") { fermer(); ls.set("fiche.plusTard", todayISO()); return toast("Ta fiche t'attend dans « CV & lettres »"); }
      if (d.fiGo === "enregistrer") return enregistrer(t);
      ovEl.querySelectorAll("[data-fi-new]").forEach((i) => { if (i.value.trim()) ajout(i.dataset.fiNew); });
      step = Math.max(0, Math.min(ETAPES.length - 1, step + Number(d.fiGo))); garder(); draw(); const s = ovEl.querySelector(".sheet"); if (s) s.scrollTop = 0; return;
    }
    if (d.fiDel) { const [k, i] = d.fiDel.split(":"); F[k].splice(+i, 1); garder(); return draw(); }
    if (d.fiSug) { F[d.fiSug] = uniq([...F[d.fiSug], d.v]); garder(); return draw(); }
    if (d.fiCpt) { F.comptes = F.comptes.includes(d.fiCpt) ? F.comptes.filter((x) => x !== d.fiCpt) : [...F.comptes, d.fiCpt]; garder(); return draw(); }
    if (d.fiClaude) { F.claude = d.fiClaude; garder(); return draw(); }
    if (d.fiTog) { const k = d.fiTog; F[k] = F[k].includes(d.v) ? F[k].filter((x) => x !== d.v) : [...F[k], d.v]; garder(); return draw(); }
    if (d.fiAdd) return ajout(d.fiAdd);
    if ("fiPaste" in d) return collerTexte(ovEl.querySelector("#fi-paste")?.value);
  }

  /* ---------- Enregistrement : profil/main (+ Mon CV actuel dans Mes CV) ---------- */
  async function enregistrer(btn) {
    if (!state.db) return toast("Connecte-toi à Jobello pour enregistrer");
    btn.disabled = true; btn.textContent = "Enregistrement…";
    const now = new Date().toISOString(), p = state.profil || {}, f0 = p.fiche || {};
    try {
      let cvDocId = f0.cvDocId || "";
      if (cvFile || cvText) {
        const doc = { type: "cv", nom: "Mon CV actuel", domaine: "", contenu: cvText, source: "fiche", createdAt: now, updatedAt: now };
        if (cvFile && state.assets) { try { const up = await state.assets.upload(cvFile); Object.assign(doc, { assetId: up.id, fichier: cvFile.name, pdfAJour: true, pdfGenere: false }); } catch {} }
        const ref = state.db.collection("documents").doc(); await ref.set(doc); cvDocId = ref.id;
      }
      // compétences : on ajoute seulement celles qui manquent, sans toucher aux niveaux déjà donnés
      const comp = (p.competencesDetail || []).filter((x) => x && x.nom).map((x) => ({ ...x })), deja = new Set(comp.map((x) => normTxt(x.nom)));
      const src = cvFile || cvText ? "d'après ton CV" : "ta fiche";
      const add = (nom, categorie) => { if (deja.has(normTxt(nom))) return; deja.add(normTxt(nom)); comp.push({ nom, categorie, niveau: null, source: src, aConfirmer: false }); };
      F.logiciels.forEach((x) => add(x, "Logiciels et outils")); F.competences.forEach((x) => add(x, "Savoir-faire")); F.langues.forEach((x) => add(x, "Langues"));
      const fiche = { version: 2, faite: f0.faite || now, maj: now, source: cvFile ? "cv" : cvText ? "texte" : "main", cvDocId,
        ville: F.ville, experience: F.experience, etudes: F.etudes, secteurs: F.secteurs, competences: F.competences, logiciels: F.logiciels, langues: F.langues,
        contrats: F.contrats, typeEntreprise: F.typeEntreprise, teletravail: F.teletravail, disponibilite: F.disponibilite, eviter: F.eviter,
        sitesCarriere: F.sites, claude: F.claude };
      // comptes cochés : même format que « Plateformes » (id → date de création notée)
      const comptes = { ...(p.comptes || {}) };
      plats().forEach((x) => { if (F.comptes.includes(x.id)) comptes[x.id] = comptes[x.id] || todayISO(); else delete comptes[x.id]; });
      const patch = { fiche, comptes, competencesDetail: comp, postes: F.postes, conditions: { ...(p.conditions || {}), trajetMax: F.trajetMax, deplacements: F.deplacements } };
      [["nom", "nom"], ["email", "email"], ["telephone", "telephone"], ["linkedin", "linkedin"], ["titre", "titre"], ["salaire", "salaire"], ["adresse", "adresse"], ["codePostal", "codePostal"]].forEach(([k, pk]) => { if (String(F[k] || "").trim() || !p[pk]) patch[pk] = String(F[k] || "").trim(); });
      if (F.ville && !p.mobilite) patch.mobilite = F.ville;
      if (F.ville && !p.ville) patch.ville = F.ville.replace(/\s*\(.*\)\s*/g, "").trim();
      if (F.disponibilite && !p.disponibilite) patch.disponibilite = F.disponibilite === "Tout de suite" ? "Disponible immédiatement" : "Disponible " + F.disponibilite.toLowerCase();
      if (!(await saveProfil(patch, "Ta fiche est enregistrée"))) { btn.disabled = false; btn.textContent = "Enregistrer ma fiche"; return; }
      cvFile = null; cvText = "";
      const premiere = !f0.version || f0.version < 2, cl = F.claude;
      fermer(); ls.set("fiche.brouillon", null);
      if (premiere) visite(cl); else { location.hash = "#documents"; setTimeout(() => document.getElementById("fi-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400); }
    } catch { toast("Enregistrement refusé, réessaie."); btn.disabled = false; btn.textContent = "Enregistrer ma fiche"; }
  }

  /* ---------- Chercher des offres avec la fiche (liens directs, sans clé) ---------- */
  function liens(q, ville) {
    const e = encodeURIComponent, v = String(ville || "").replace(/\s*\(.*\)\s*/g, "").trim(), cdi = (fiche()?.contrats || []).length === 1 && fiche().contrats[0] === "CDI";
    return [["Indeed", `https://fr.indeed.com/jobs?q=${e(q)}&l=${e(v)}&fromage=7${cdi ? "&sc=0kf%3Ajt%28permanent%29%3B" : ""}`],
      ["LinkedIn", `https://www.linkedin.com/jobs/search/?keywords=${e(q)}&location=${e(v || "France")}&f_TPR=r604800`],
      ["France Travail", `https://candidat.francetravail.fr/offres/recherche?motsCles=${e(q)}&offresPartenaires=true&tri=1`],
      ["APEC", `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${e(q)}`],
      ["Welcome to the Jungle", `https://www.welcometothejungle.com/fr/jobs?query=${e(q)}`]];
  }
  const recherche = () => { const p = state.profil || {}; return `<div class="fi-search">${(p.postes || []).slice(0, 6).map((q) => `<div class="fi-q"><b>${esc(q)}</b>${liens(q, p.fiche?.ville || p.mobilite).map(([n, u]) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>`).join("")}</div>`; };

  /* ---------- Refaire le CV ---------- */
  function cvPropre() {
    const p = state.profil || {}, f = p.fiche || {}, base = state.docs.find((d) => d.id === f.cvDocId) || state.docs.find((d) => d.type === "cv" && !d.adapte && d.langue !== "en" && d.contenu);
    const sec = base ? sections(base.contenu.replace(/\*\*|^_|_$/gm, "")) : {};
    const bloc = (k) => (sec[k] || []).filter(Boolean).join("\n");
    const contact = [p.telephone && "Tél. : " + p.telephone, p.email && "E-mail : " + p.email, (f.ville || p.mobilite) && "Lieu : " + (f.ville || p.mobilite), p.linkedin && "LinkedIn : " + p.linkedin.replace(/^https?:\/\/(www\.)?/, "")].filter(Boolean).join(" · ");
    const comp = [f.competences?.length && "Savoir-faire : " + f.competences.join(", "), f.logiciels?.length && "Logiciels : " + f.logiciels.join(", ")].filter(Boolean).join("\n");
    return [p.nom || "Prénom Nom", (p.postes || [])[0] || p.titre || "", contact, "", "PROFIL", bloc("profil") || [p.titre, f.experience && f.experience.toLowerCase().replace(/^d/, "D") ? "expérience : " + f.experience.toLowerCase() : ""].filter(Boolean).join(", ") + ".", "",
      "EXPÉRIENCE PROFESSIONNELLE", bloc("experience") || "Poste · Entreprise · 2020 - 2024\n(ce que tu as fait)", "", "FORMATION", bloc("formation") || f.etudes || "", "", "COMPÉTENCES", comp || bloc("competences"), "", "LANGUES", (f.langues || []).join(" · ") || bloc("langues")].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  async function refaireCV(btn) {
    if (!state.db) return toast("Connecte-toi à Jobello pour enregistrer");
    let texte = cvPropre();
    if ((aiKey() || (window.jobelloParRelais && window.jobelloParRelais())) && state.sample) {
      const p = state.profil || {}, f = p.fiche || {}, base = state.docs.find((d) => d.id === f.cvDocId) || state.docs.find((d) => d.type === "cv" && !d.adapte && d.langue !== "en" && d.contenu);
      if (base) {
        btn.disabled = true; btn.textContent = "Claude refait ton CV…";
        try {
          const { text } = await state.sample(`Réécris ce CV au propre, en français, pour qu'il passe les logiciels de tri (ATS) et tienne sur une page.
Format exact, en texte brut : ligne 1 le prénom et le nom ; ligne 2 l'intitulé visé ; ligne 3 les coordonnées séparées par « · » (Tél. : …, E-mail : …, Lieu : …, LinkedIn : …) ; puis les rubriques en MAJUSCULES : PROFIL, EXPÉRIENCE PROFESSIONNELLE, FORMATION, COMPÉTENCES, LANGUES.
Chaque expérience : une ligne « Intitulé · Société · AAAA - AAAA », puis des lignes de réalisations commençant par un verbe. Pas de tableau, pas de symbole, pas de flèche.
Garde toutes les expériences et tous les faits. N'ajoute aucune compétence, aucun chiffre ni aucun fait absent du CV ou de la fiche. Réponds uniquement par le texte du CV.

FICHE : métier ${p.titre || ""} ; postes visés ${(p.postes || []).join(", ")} ; compétences ${(f.competences || []).join(", ")} ; logiciels ${(f.logiciels || []).join(", ")} ; langues ${(f.langues || []).join(", ")} ; lieu ${f.ville || p.mobilite || ""} ; e-mail ${p.email || ""} ; téléphone ${p.telephone || ""} ; LinkedIn ${p.linkedin || ""}

CV ACTUEL :
${base.contenu.slice(0, 12000)}`, { cache: false });
          if (String(text || "").trim().length > 200) texte = String(text).replace(/^```\w*\n?|```$/g, "").trim();
        } catch (e) { toast(aiError(e)); }
        btn.disabled = false; btn.textContent = "Refaire mon CV";
      }
    }
    editDoc(null, "cv");
    const nom = $("#d-nom"), ct = $("#d-contenu"); if (nom) nom.value = "CV refait"; if (ct) ct.value = texte;
    toast("Relis et corrige : en enregistrant, l'appli en fait un PDF propre");
  }

  /* ---------- Panneaux : « Ma fiche » (CV & lettres) et « Chercher avec ma fiche » (Offres) ---------- */
  function panneaux() {
    const anchor = document.getElementById("photo-panel"); if (!anchor) return;
    let el = document.getElementById("fi-panel");
    if (!el) { anchor.insertAdjacentHTML("beforebegin", `<div class="panel" id="fi-panel"></div>`); el = document.getElementById("fi-panel"); }
    const p = state.profil || {}, f = p.fiche;
    const nb = f ? [f.competences?.length && `${f.competences.length} compétences`, f.logiciels?.length && `${f.logiciels.length} logiciels`, (p.postes || []).length && `${p.postes.length} poste${p.postes.length > 1 ? "s" : ""} visé${p.postes.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ") : "";
    el.innerHTML = `<h2 style="margin:0">Ma fiche</h2><p class="muted" style="margin:2px 0 0;font-size:.86rem">${f ? `Remplie le ${esc(fmt(String(f.maj || f.faite).slice(0, 10)) || "")}${nb ? " · " + esc(nb) : ""}. Elle sert à trouver tes offres et à refaire ton CV.` : "Ton métier, les postes que tu vises, tes compétences, ton trajet maximum… Avec ton CV, elle se remplit presque toute seule."}</p>
      <div class="row" style="gap:6px;margin-top:10px">${f && (f.version || 1) < 2 && !owner() ? `<button type="button" class="small primary" data-fi-open="1">Compléter ma fiche (photo, comptes, Claude)</button>` : `<button type="button" class="small${f ? "" : " primary"}" data-fi-open>${f ? "Modifier ma fiche" : "Remplir ma fiche"}</button>`}${f ? `<button type="button" class="small" data-fi-cv>Refaire mon CV</button>` : ""}<button type="button" class="small ghost" data-vi-open>Comment marche Jobello ?</button></div>`;
    const off = document.getElementById("v-plateformes"); if (!off) return;
    let s = document.getElementById("fi-offres");
    if (!s) { off.insertAdjacentHTML("afterbegin", `<details class="fold" id="fi-offres"><summary><span class="fold-t">Chercher avec ma fiche</span><span class="fold-s" id="fi-offres-s"></span></summary><div class="fold-b" id="fi-offres-b"></div></details>`); s = document.getElementById("fi-offres"); }
    const montrer = !!f && !owner() && (p.postes || []).length;
    s.hidden = !montrer; if (!montrer) return;
    $("#fi-offres-s").textContent = "7 derniers jours";
    $("#fi-offres-b").innerHTML = `<p class="muted" style="margin:0;font-size:.86rem">Les recherches toutes prêtes pour chacun de tes postes visés, autour de ${esc(f.ville || p.mobilite || "chez toi")}. Quand une offre te plaît, ajoute-la dans « Candidatures ».</p>${recherche()}`;
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-fi-open]")) return ouvrir(fiche() ? 1 : 0);
    if (e.target.closest("[data-vi-open]")) return visite(fiche()?.claude || (owner() ? "chrome" : ""));
    const r = e.target.closest("[data-fi-cv]"); if (r) return refaireCV(r);
  });

  /* ---------- Visite guidée : comment marche Jobello (après la fiche, ou « Comment marche Jobello ? ») ---------- */
  let viEl = null, viStep = 0, viSlides = [], autoOk = null;
  async function lireAuto() {
    if (autoOk !== null || owner()) return;
    try { const s = window.jobelloSupa && window.jobelloSupa(); const { data } = s ? await s.sb.rpc("offres_etat") : {}; autoOk = !!(data && data.cle); } catch { autoOk = false; }
  }
  function slides(cl) {
    const chrome = cl === "chrome", auto = owner() || autoOk;
    return [
      ["👋", "Ta fiche est prête", `<p class="vi-t">Voici comment Jobello va travailler pour toi, en 5 étapes. Tu peux revoir cette visite quand tu veux depuis « CV & lettres », bouton « Comment marche Jobello ? ».</p>`],
      ["🔎", "1. Les offres viennent à toi", `<p class="vi-t">${auto ? "Chaque matin, Jobello cherche les offres publiées ces derniers jours pour tes postes visés, autour de chez toi, et les range dans « Offres pour toi » sur l'accueil." : "Dans « Offres », Jobello te prépare les recherches de la semaine pour chacun de tes postes visés (Indeed, LinkedIn, France Travail, Apec…). Une offre te plaît : ajoute-la, Jobello s'occupe du reste."} Chaque offre a sa note « Mes chances », honnête, pour savoir où mettre ton énergie.</p>`],
      ["👉", "2. Tu swipes", `<p class="vi-t">À droite, je la garde. À gauche, je passe. C'est le seul choix que tu as vraiment à faire.</p>`],
      ["✍️", "3. Claude prépare ton dossier", `<p class="vi-t">Pour chaque offre gardée, Claude écrit la lettre et adapte ton CV au poste, avec ton compte Claude. Jobello ouvre Claude, tu valides, et le dossier revient tout seul dans l'appli. Il n'invente jamais une compétence que tu n'as pas.</p>`],
      chrome ? ["🚀", "4. Claude postule à ta place", `<p class="vi-t">Sur ton ordinateur, dans la fiche de l'offre : « Copier la consigne pour Chrome », puis colle-la dans Claude (l'icône en haut à droite de Chrome). Il ouvre l'offre, se connecte avec ta session, remplit tout et joint ton CV. Toi, tu tapes seulement les codes reçus par e-mail.</p>`]
        : ["📨", "4. Tu envoies en 2 minutes", `<p class="vi-t">Dans la fiche de l'offre, tout est prêt : CV et lettre à télécharger, message à copier, et le favori « Remplir avec Jobello » qui remplit le formulaire du site d'un seul geste (Offres, « Kit d'inscription »). Avec Claude payant et Chrome, Claude pourra même postuler à ta place.</p>`],
      ["📅", "5. Jobello suit tout", `<p class="vi-t">Relance proposée au bon moment, réponses des recruteurs, entretiens dans l'agenda, préparation d'entretien avec Claude, et « Qui contacter » pour écrire au bon recruteur sur LinkedIn. Tu vois où tu en es d'un coup d'œil.</p>`],
      ["✅", "Pour bien démarrer", `<ol><li>Ouvre « Offres » et garde tes 5 premières offres.</li>${chrome ? `<li>Sur ton ordinateur, installe Claude dans Chrome et connecte-toi à tes sites d'emploi.</li>` : `<li>Sur ton ordinateur, installe le favori « Remplir avec Jobello » (Offres, « Kit d'inscription »).</li>`}<li>Ajoute les candidatures que tu as déjà envoyées : Jobello te dira quand relancer.</li></ol>`],
    ];
  }
  function viDraw() {
    if (!viEl) return;
    const [ic, t, body] = viSlides[viStep], last = viStep === viSlides.length - 1;
    viEl.innerHTML = `<div class="sheet fi vi" role="dialog" aria-modal="true" aria-label="Comment marche Jobello">
      <div class="sheet-head"><div style="min-width:0;flex:1"><span class="label">Comment marche Jobello</span></div><button type="button" class="ghost" data-vi="fin">Fermer</button></div>
      <div class="vi-ic" aria-hidden="true">${ic}</div><h2 style="margin:0 0 6px">${esc(t)}</h2>${body}
      <div class="vi-dots" aria-hidden="true">${viSlides.map((_, i) => `<i class="${i === viStep ? "on" : ""}"></i>`).join("")}</div>
      <div class="sheet-foot"><div class="row">${viStep ? `<button type="button" class="ghost" data-vi="-1">Retour</button>` : ""}<button type="button" class="primary" data-vi="${last ? "go" : "+1"}">${last ? "C'est parti" : "Suivant"}</button></div></div></div>`;
  }
  async function visite(cl) {
    if (viEl) return;
    await lireAuto();
    viSlides = slides(cl); viStep = 0;
    viEl = document.createElement("div"); viEl.className = "overlay fi-ov"; document.body.appendChild(viEl); lockScroll(); viDraw();
    viEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-vi]"); if (!b) return;
      const v = b.dataset.vi;
      if (v === "fin" || v === "go") { viEl.remove(); viEl = null; unlockScroll(); ls.set("visite.vue", todayISO()); if (v === "go") location.hash = "#plateformes"; return; }
      viStep = Math.max(0, Math.min(viSlides.length - 1, viStep + Number(v))); viDraw();
    });
  }
  window.jobelloVisite = visite;

  /* ---------- Première ouverture : la fiche s'ouvre seule si le profil est vide ---------- */
  const _render = render;
  render = function () { _render.apply(this, arguments); try { panneaux(); } catch {} auto(); };
  let vu = false;
  function auto() {
    if (vu || ovEl || !state.db || !state.profilVu || !state.loaded) return;
    vu = true;
    const p = state.profil;
    if (owner() || fiche() || !vide(p) || state.cands.length > 3) return;
    if (ls.get("fiche.plusTard", "") === todayISO()) return;
    // attendre que les écrans d'invitation et de connexion soient fermés
    const essai = (n) => setTimeout(() => { if (ovEl || fiche() || !vide(state.profil)) return; if (document.querySelector(".gt-ov,.jb-ov")) return n < 200 && essai(n + 1); ouvrir(0); }, 900);
    essai(0);
  }
  window.jobelloFiche = ouvrir;
  try { panneaux(); } catch {}
})();
