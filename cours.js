/* Jobello : « 📖 Revoir le cours » dans l'onglet Prépa. Une fiche courte par sujet, en petites phrases et en couleurs
   (cb bleu = définition / ce qu'on lit, co orange = valeurs, zones, « − », cg vert = règle à retenir, « + », cy jaune = piège).
   Ouvrir : un bouton avec data-cours="<id>" n'importe où dans l'appli, ou window.jbCours("<id>").
   Sujets : plan, gps, chaines, ajust, usinage, tolerie, plasturgie, procedes, materiaux, assemblages, rdm, conception, qualite. */
(function () {
  const C = {
    plan: { ic: "📐", titre: "Lire un plan", intro: "Un plan se lit toujours dans le même ordre : cartouche, vues, cotes, notes.", parts: [
      { t: "1. Le cartouche", l: [["cb", "Identité", "Titre, numéro, indice : toujours vérifier qu'on a le dernier indice."], ["co", "Règles par défaut", "Tolérances générales (ISO 2768-mK), rugosité générale (Ra 3,2), arêtes cassées."], ["cg", "Pour lire", "Échelle, unité (mm), symbole de projection, matière, masse."]] },
      { t: "2. Les vues", l: [["cg", "Européenne (ISO E)", "Vue de gauche placée à droite, vue de dessus placée en dessous."], ["co", "Américaine (ISO A)", "L'inverse : vue de gauche à gauche, vue de dessus au-dessus."], ["cb", "Coupe A-A", "On regarde dans le sens des flèches. Les hachures montrent la matière coupée."], ["cy", "En coupe", "On ne hachure pas en long les pièces pleines : vis, pions, goupilles, axes, clavettes."]] },
      { t: "3. Les traits", l: [["cg", "Continu fort", "Arêtes vues."], ["cb", "Continu fin", "Cotes, lignes d'attache, hachures."], ["cb", "Interrompu fin", "Arêtes cachées."], ["co", "Mixte fin (trait-point)", "Axes, plans de symétrie."], ["cg", "Mixte à deux tirets", "Pièce voisine (la pièce moteur sur un outillage), positions extrêmes."]] },
      { t: "4. Les indications courantes", l: [["cb", "M8-6H prof. 16", "Taraudage Ø8, pas 1,25, tolérance 6H, filet utile 16. Avant-trou Ø6,8."], ["cb", "Ø10 H7", "Alésage tolérancé (pion, roulement)."], ["cb", "Lamage / fraisure", "Logement de tête de vis : cylindrique (CHC) ou conique (FHC)."], ["cb", "Soudure", "Triangle = soudure d'angle, a5 = gorge 5 mm, cercle = tout autour."], ["co", "Rugosité", "Ra en µm : 3,2 usinage courant, 1,6 appui ou ajustement, 0,8 portée de joint ou roulement."]] },
    ], retenir: ["Cartouche d'abord.", "Une cote fonctionnelle part d'une référence, jamais d'un bord brut.", "Pas de cote en double."] },
    gps: { ic: "🎯", titre: "Cotation ISO (GPS)", intro: "On tolère ce qui compte pour la fonction, depuis des références qui représentent le montage.", parts: [
      { t: "1. Les principes", l: [["cb", "ISO 8015 : indépendance", "Taille, forme, orientation : chaque exigence est vérifiée seule. La taille ne limite pas la forme."], ["cg", "Ⓔ enveloppe", "La pièce doit en plus passer dans la forme parfaite au maximum de matière."], ["cb", "Cote encadrée", "Théoriquement exacte : pas de tolérance, la tolérance est dans le cadre."], ["co", "ISO 2768-m", "±0,2 de 6 à 30 mm ; ±0,3 de 30 à 120 ; ±0,5 de 120 à 400 ; ±0,8 de 400 à 1000."]] },
      { t: "2. Les 4 familles", l: [["cb", "Forme (sans référence)", "Rectitude, planéité, circularité, cylindricité."], ["cg", "Orientation (avec référence)", "Parallélisme, perpendicularité, inclinaison."], ["cg", "Position (avec référence)", "Localisation, coaxialité, symétrie."], ["cg", "Battement (axe de référence)", "Simple ou total : ce que voit un comparateur pendant un tour."], ["co", "Profil", "Ligne ou surface : forme seule sans référence, forme + position avec références."]] },
      { t: "3. Lire un cadre", l: [["cb", "Case 1", "Le symbole : quelle exigence."], ["co", "Case 2", "La zone : sa largeur. « Ø » devant = zone cylindrique autour d'un axe."], ["cg", "Cases suivantes", "Références A, B, C dans l'ordre : A bloque 3 degrés, B 2, C 1."], ["cy", "Flèche", "Sur la surface = on tolère la surface. Dans le prolongement de la cote = on tolère l'axe ou le plan médian."]] },
      { t: "4. Maximum de matière Ⓜ", l: [["cb", "Principe", "Plus le trou est grand (ou l'arbre petit), plus on donne de tolérance de position."], ["co", "Bonus", "Tolérance permise = tolérance du cadre + (taille réelle − taille au maximum de matière)."], ["cg", "Condition virtuelle d'un trou", "Taille mini − tolérance de position = diamètre de la pige du calibre."], ["cy", "Usage", "Pour le montage (vis, pions). Pas pour une position qui doit être précise."]] },
      { t: "5. La mise en position", l: [["cg", "Isostatique", "6 degrés bloqués une seule fois : 3 (plan) + 2 (pion rond) + 1 (pion losange)."], ["cy", "Hyperstatique", "Deux pions ronds : si l'entraxe varie, ça ne rentre pas."]] },
    ], retenir: ["Forme sans référence, le reste avec.", "Ø dans le cadre = zone cylindrique.", "Ⓜ = bonus quand on s'éloigne du maximum de matière."] },
    chaines: { ic: "🔗", titre: "Chaînes de cotes", intro: "Une chaîne relie une condition (un jeu J) aux cotes des pièces qui la créent.", parts: [
      { t: "1. Tracer la chaîne", l: [["cg", "Départ", "On part d'une extrémité de J et on revient à l'autre, par les surfaces de contact."], ["cg", "Une cote par pièce", "Le chemin le plus court, le moins de maillons possible."], ["co", "Signes", "Dans le sens de J : +. Sens inverse : −."]] },
      { t: "2. Pire des cas", l: [["cb", "J maxi", "Σ maxi des + − Σ mini des −."], ["cb", "J mini", "Σ mini des + − Σ maxi des −."], ["cg", "Vérification", "J maxi − J mini = somme des IT."], ["cy", "J mini négatif", "Au pire, ça ne monte pas : serrer une cote, décaler un nominal, ajouter une cale."]] },
      { t: "3. Statistique", l: [["cg", "IT de J", "√(somme des IT²) : bien plus petit que la somme."], ["co", "Quand", "En série, procédés maîtrisés. Outillage unique : pire cas."]] },
      { t: "4. Radial et transferts", l: [["co", "En radial", "Un jeu ou un Ø de tolérance donne un écart de la MOITIÉ sur le rayon."], ["cb", "Cale de réglage", "Cale = cote mesurée − jeu visé, arrondie à la cale disponible."], ["cy", "Transfert de cote", "La cote condition a la plus grande tolérance : IT(cote cherchée) = IT(condition) − IT(autres)."]] },
    ], retenir: ["Du jeu au jeu, une cote par pièce.", "Pour J maxi : les + au maxi, les − au mini.", "En radial : diviser par 2."] },
    ajust: { ic: "⚙️", titre: "Ajustements ISO", intro: "Un ajustement associe un alésage (lettre majuscule) et un arbre (minuscule).", parts: [
      { t: "1. Les lettres", l: [["cb", "H (alésage)", "Écart inférieur = 0 : le système « alésage normal », le plus utilisé."], ["cb", "h (arbre)", "Écart supérieur = 0."], ["co", "Le chiffre", "La qualité (IT) : 6 ou 7 en mécanique de précision, plus petit = plus serré et plus cher."]] },
      { t: "2. Les familles avec H7", l: [["cg", "Avec jeu", "f7 tournant, g6 glissant précis, h6 glissant juste."], ["co", "Incertain", "k6, m6 : jeu ou léger serrage, montage au maillet."], ["cr", "Serré", "p6, s6 : montage à la presse ou par dilatation."]] },
      { t: "3. Calcul", l: [["cb", "Jeu maxi", "Alésage maxi − arbre mini."], ["cb", "Jeu mini", "Alésage mini − arbre maxi. Négatif = serrage."], ["cg", "Ordre de grandeur Ø10", "H7 = 0 / +15 µm ; g6 = −5 / −14 µm."]] },
    ], retenir: ["H7/g6 glisse, H7/m6 se monte au maillet, H7/p6 à la presse."] },
    usinage: { ic: "⚙️", titre: "Usinage", intro: "Tournage pour les pièces de révolution, fraisage pour les formes prismatiques.", parts: [
      { t: "1. Les procédés", l: [["cb", "Tournage", "La pièce tourne, l'outil avance : arbres, bagues, filetages."], ["cb", "Fraisage", "L'outil tourne : plans, poches, rainures."], ["cb", "Rectification", "Finition fine : Ra 0,2 à 0,8, tolérances serrées."], ["cb", "Électroérosion", "Formes dures ou angles vifs intérieurs."]] },
      { t: "2. Les formules", l: [["co", "Vitesse de rotation", "N = 1000 × Vc / (π × D), N en tr/min, Vc en m/min, D en mm."], ["co", "Avance", "Tournage : Vf = f × N. Fraisage : Vf = fz × Z × N."]] },
      { t: "3. Concevoir pour l'usinage", l: [["cg", "Peu de prises", "Regrouper les faces usinées, limiter les reprises."], ["cg", "Rayons", "Rayon de poche ≥ rayon de fraise ; profondeur ≤ 3 à 4 × Ø fraise."], ["cg", "Tolérances", "Serrées seulement sur le fonctionnel, ISO 2768 ailleurs."], ["cy", "Parois minces", "Contraintes libérées, la pièce se déforme : ébauche, repos, finition symétrique."]] },
    ], retenir: ["N = 1000·Vc/(π·D).", "Le coût vient des prises, du temps machine et du contrôle."] },
    tolerie: { ic: "📐", titre: "Tôlerie", intro: "On découpe une tôle plane, puis on la plie : tout part du développé.", parts: [
      { t: "1. Les procédés", l: [["cb", "Découpe", "Laser, poinçonnage, jet d'eau."], ["cb", "Pliage", "Presse plieuse : poinçon et vé."], ["cb", "Assemblage", "Soudure, rivets, inserts sertis, clinchage."]] },
      { t: "2. Les règles", l: [["cg", "Rayon intérieur", "Environ égal à l'épaisseur (acier doux)."], ["cg", "Bord mini avant pli", "Environ 3 à 4 fois l'épaisseur, sinon le vé ne tient pas la tôle."], ["cg", "Trous près d'un pli", "À au moins 2 fois l'épaisseur + le rayon, sinon ils se déforment."], ["co", "Développé", "Calculé avec le facteur K (position de la fibre neutre, souvent 0,3 à 0,45)."]] },
      { t: "3. Les tolérances", l: [["co", "Réalistes", "Environ ±0,1 en découpe laser, ±0,2 à ±0,5 sur une cote pliée."], ["cy", "Piège", "Coter entre deux plis en chaîne : les erreurs s'additionnent."]] },
    ], retenir: ["Rayon ≈ épaisseur.", "Bords et trous loin des plis.", "On ne demande pas du ±0,05 en tôlerie pliée."] },
    plasturgie: { ic: "🧴", titre: "Plasturgie (injection)", intro: "La matière fondue est injectée dans un moule, refroidit, puis la pièce est éjectée.", parts: [
      { t: "1. Les règles de conception", l: [["cg", "Épaisseur constante", "Environ 1,5 à 3 mm, sinon retassures et déformations."], ["cg", "Dépouille", "1° à 2° pour démouler, plus si la surface est texturée."], ["cg", "Nervures", "Environ 50 à 60 % de l'épaisseur de paroi, rayons en pied."], ["cy", "Contre-dépouilles", "Elles demandent des tiroirs : moule plus cher."]] },
      { t: "2. Les défauts", l: [["co", "Retassure", "Creux sur une zone épaisse."], ["co", "Bavure", "Matière dans le plan de joint."], ["co", "Ligne de soudure", "Rencontre de deux fronts de matière, zone fragile."], ["co", "Retrait, voilage", "Refroidissement non homogène."]] },
    ], retenir: ["Épaisseur constante, dépouille, nervures plus fines que la paroi."] },
    procedes: { ic: "🔥", titre: "Fonderie, soudage, fabrication additive", intro: "Choisir le procédé selon la forme, la série et la matière.", parts: [
      { t: "1. Fonderie", l: [["cb", "Sable, coquille, sous pression, cire perdue", "Du gros brut peu cher à la pièce précise (cire perdue : aubes)."], ["cg", "Règles", "Dépouilles, épaisseurs régulières, rayons, surépaisseurs d'usinage."]] },
      { t: "2. Soudage", l: [["cb", "Procédés", "TIG (précis, inox, alu), MIG/MAG (productif), électrode."], ["cy", "Effets", "Déformations et contraintes : détensionner, puis usiner les surfaces fonctionnelles."], ["co", "Tolérances", "Constructions soudées : ISO 13920."]] },
      { t: "3. Fabrication additive", l: [["cb", "Polymère", "FDM, SLA, frittage de poudre : prototypes, gabarits légers."], ["cb", "Métal", "Fusion laser sur lit de poudre : formes complexes, petites séries."], ["cg", "Pour l'outillage", "Gabarits et détrompeurs imprimés : rapides et légers."]] },
    ], retenir: ["Souder, détensionner, puis usiner."] },
    materiaux: { ic: "🧪", titre: "Matériaux et traitements", intro: "On choisit selon la résistance, la masse, la corrosion et le prix.", parts: [
      { t: "1. Les familles", l: [["cb", "Aciers", "S235 / S355 (construction, mécano-soudé), C45, 42CrMo4 (trempé revenu), inox 304L / 316L."], ["cb", "Aluminium", "5083 (plaques, stable), 6061 / 6082 (usinage courant), 7075 (très résistant)."], ["cb", "Titane, superalliages", "Ti-6Al-4V, Inconel : moteur, hautes températures."], ["cb", "Polymères techniques", "POM, PA, PEEK : patins, guides, contact doux."]] },
      { t: "2. Les traitements", l: [["co", "Thermiques", "Trempe + revenu (dureté), recuit (détente), cémentation, nitruration (surface dure)."], ["co", "Surface", "Anodisation (alu), zingage, phosphatation, nickelage chimique."], ["cy", "Corrosion galvanique", "Deux métaux différents en contact humide : le moins noble se corrode."]] },
    ], retenir: ["Alu 5083 pour des plaques stables, acier trempé pour l'usure, polymère au contact des pièces nobles."] },
    assemblages: { ic: "🔩", titre: "Assemblages et guidages", intro: "Lier, guider, positionner : chaque liaison a sa solution.", parts: [
      { t: "1. Les liaisons", l: [["cb", "Démontables", "Vis, goupilles, clavettes, circlips."], ["cb", "Permanentes", "Soudure, collage, rivets, frettage."], ["cg", "Position + tenue", "Les pions positionnent, les vis serrent : on ne positionne pas avec une vis."]] },
      { t: "2. Les vis", l: [["co", "Classe 8.8", "Rm 800 MPa, Re 640 MPa. 10.9 et 12.9 plus résistantes."], ["cg", "Serrage", "Couple de serrage défini, freinage (frein filet, rondelle) si vibrations."], ["cy", "Corps étrangers", "Sur un outillage moteur : vis imperdables, rien qui puisse tomber dans le moteur."]] },
      { t: "3. Les guidages", l: [["cb", "Glissement", "Bagues, coussinets, rails."], ["cb", "Roulement", "Roulements à billes ou à rouleaux, douilles à billes, guidages linéaires."], ["cg", "Montage", "Bague tournante serrée, bague fixe glissante."]] },
    ], retenir: ["Les pions positionnent, les vis serrent."] },
    rdm: { ic: "📊", titre: "Calcul et RDM (bases)", intro: "Vérifier qu'une pièce tient et ne se déforme pas trop.", parts: [
      { t: "1. Les contraintes", l: [["co", "Traction", "σ = F / S."], ["co", "Flexion", "σ = M × v / I (ou M / (I/v))."], ["co", "Cisaillement", "τ = T / S."], ["cg", "Critère", "σ ≤ Re / s, avec s le coefficient de sécurité (souvent 2 à 3 sur un outillage)."]] },
      { t: "2. Les déformations", l: [["cb", "Module d'Young", "Acier ≈ 210 GPa, alu ≈ 70 GPa : à section égale, l'alu fléchit 3 fois plus."], ["co", "Poutre console", "Flèche = F × L³ / (3 × E × I)."], ["cg", "Sur un outillage", "La rigidité compte souvent plus que la résistance."]] },
      { t: "3. Les éléments finis", l: [["cg", "Méthode", "Maillage, conditions aux limites, charges, puis lecture critique des résultats."], ["cy", "Piège", "Un pic de contrainte sur un angle vif ou un appui ponctuel n'est souvent qu'un artefact."]] },
    ], retenir: ["σ = F/S, flèche en L³ : la longueur coûte très cher en rigidité."] },
    conception: { ic: "🖥️", titre: "Conception et CAO", intro: "Partir du besoin, chercher plusieurs solutions, valider tôt.", parts: [
      { t: "1. La démarche", l: [["cb", "Besoin", "Cahier des charges fonctionnel : fonctions, contraintes, critères chiffrés."], ["cg", "Concepts", "2 ou 3 solutions comparées, puis le choix argumenté."], ["cg", "Validation", "Revue de conception, prototype, essai, puis plans figés."]] },
      { t: "2. La CAO", l: [["cb", "Esquisses contraintes", "Cotes de conception = cotes fonctionnelles."], ["cb", "Assemblages", "Contraintes qui représentent les vraies liaisons."], ["cg", "Mise en plan", "Vues utiles seulement, cotation fonctionnelle, nomenclature."]] },
      { t: "3. Pour un outillage de montage", l: [["cg", "Ergonomie et sécurité", "Masse, hauteur de travail, pas de pincement, levage marqué."], ["cg", "Détrompage", "Impossible de monter à l'envers."], ["cy", "Pièces moteur", "Contact doux (polymère), aucun objet perdu."]] },
    ], retenir: ["Besoin, concepts, validation par l'essai."] },
    qualite: { ic: "✅", titre: "Méthodes, qualité, validation", intro: "Prouver que le produit répond au besoin, et traiter les problèmes à la cause.", parts: [
      { t: "1. Les outils", l: [["cb", "AMDEC", "Modes de défaillance : gravité × occurrence × détection."], ["cb", "8D, 5 pourquoi, Ishikawa", "Résoudre un problème à la racine."], ["cb", "DVP", "Plan de validation : chaque exigence a son essai et son critère."]] },
      { t: "2. La validation", l: [["cg", "Avant", "Critères d'acceptation fixés avant l'essai."], ["cg", "Pendant", "Mesures, conditions notées, avis des utilisateurs."], ["cg", "Après", "Rapport, décisions, mise à jour des plans."]] },
      { t: "3. L'aéronautique", l: [["cb", "EN 9100", "La norme qualité de l'aéronautique, proche de l'ISO 9001 en plus exigeant."], ["co", "Traçabilité", "Chaque outillage a son numéro, son indice et son dossier."]] },
    ], retenir: ["Les critères avant l'essai, la cause avant la solution."] },
  };
  // domaines de l'onglet Prépa → fiche de cours
  const PAR_DOMAINE = { u: "usinage", t: "tolerie", p: "plasturgie", f: "procedes", m: "materiaux", a: "assemblages", c: "gps", r: "rdm", cao: "conception", q: "qualite", plan: "plan", gps: "gps", ch: "chaines" };

  const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const st = document.createElement("style");
  st.textContent = `.co-ov{position:fixed;inset:0;z-index:60;background:var(--bg);overflow:auto;overscroll-behavior:contain;padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(20px + env(safe-area-inset-bottom,0px))}
  .co-ov .in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
  .co-ov .top{display:flex;align-items:center;gap:10px}.co-ov .top h2{margin:0;font-family:var(--display);font-size:1.2rem;flex:1}
  .co-ov .intro{margin:0;font-size:1rem;font-weight:600;line-height:1.45}
  .co-ov .en-card h3{margin:0;font-size:1rem}
  .co-ov .tabs{display:flex;gap:6px;flex-wrap:wrap}.co-ov .tabs button{font-size:.8rem;padding:4px 10px;min-height:0;border-radius:99px}
  .co-ov .tabs button[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
  .co-ov .en-c.cr{border-color:#d9433a;background:rgba(217,67,58,.1)}.co-ov .en-c.cr b{color:#d9433a}
  .co-btn{font-size:.82rem}`;
  document.head.appendChild(st);

  function ouvrir(id) {
    id = PAR_DOMAINE[id] || id; const c = C[id]; if (!c) return;
    let ov = document.getElementById("co-ov"); if (!ov) { ov = document.createElement("div"); ov.id = "co-ov"; ov.className = "co-ov"; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="in"><div class="top"><h2>${c.ic} ${h(c.titre)}</h2><button type="button" class="small ghost" data-cours-fermer>Fermer</button></div>
      <p class="intro">${h(c.intro)}</p>
      <div class="en-leg"><span><i style="background:#3b7dd8"></i>définition</span><span><i style="background:#e8782f"></i>valeurs, zones</span><span><i style="background:#17a06b"></i>règle à retenir</span><span><i style="background:#d9a400"></i>piège</span></div>
      ${c.parts.map((p) => `<div class="en-card"><h3>${h(p.t)}</h3>${p.l.map(([k, b, t]) => `<p class="en-c ${k}"><b>${h(b)}</b>${h(t)}</p>`).join("")}</div>`).join("")}
      <p class="en-e">À retenir : ${h(c.retenir.join(" "))}</p>
      <div class="tabs">${Object.entries(C).filter(([k]) => k !== id).map(([k, x]) => `<button type="button" class="small" data-cours="${k}">${x.ic} ${h(x.titre)}</button>`).join("")}</div>
      <div class="en-row"><button type="button" class="primary" data-cours-fermer>Retour à l'exercice</button></div></div>`;
    ov.scrollTop = 0; ov.dataset.prev = document.body.style.overflow || ""; document.body.style.overflow = "hidden";
  }
  function fermer() { const ov = document.getElementById("co-ov"); if (!ov) return; const enOv = document.getElementById("en-ov") || document.getElementById("pc-ov"); ov.remove(); document.body.style.overflow = enOv ? "hidden" : ""; }
  document.addEventListener("click", (ev) => {
    const f = ev.target.closest("[data-cours-fermer]"); if (f) return fermer();
    const b = ev.target.closest("[data-cours]"); if (!b) return; ev.preventDefault(); ev.stopPropagation(); ouvrir(b.dataset.cours);
  }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(); });
  // bouton prêt à poser dans une carte
  window.jbCoursBtn = (id, label) => { id = PAR_DOMAINE[id] || id; return C[id] ? `<button type="button" class="small ghost co-btn" data-cours="${id}">📖 ${h(label || "Revoir le cours")}</button>` : ""; };
  window.jbCours = ouvrir;
  window.JB_COURS = C;
})();
