/* Jobello : « Entretien combiné » dans l'onglet Prépa (d'abord pour Safran, règle du 27/11/2026).
   Format annoncé par la RH Safran : 1) motivation et présentation de tous ses postes, 2) technique centrée sur
   la lecture de plan, la cotation ISO (GPS) et les chaînes de cotes, là où les candidats échouent le plus.
   - Bloc en haut de l'onglet Prépa pour chaque entretien à venir qui a c.combine (ou une société Safran).
   - c.combine sur la fiche (écrit par Claude) : { deroule:[{t, min, dire}], fil, parcours:[{quand, poste, dire, lien}],
       questions:[{q, r}] (parcours et motivation), situation?:{q, s} }. À défaut, parcours tiré du profil.
   - Exercices progressifs (prepa-combinee-data.js), solutions en couleurs, réponses chiffrées vérifiées.
   - Entretien blanc combiné : présentation chronométrée, parcours, motivation, 2 plans, 2 GPS, 2 chaînes, mise en situation, tes questions.
   Progression : docs path entrainement/combine { ex: { id: "ok"|"revoir" }, simus: [{ le, entreprise, score, n, revoir }] } */
(function () {
  const D = window.JB_COMBI || { ateliers: [], ex: [], situations: [] };
  const AT = D.ateliers, EX = D.ex;
  const $ = (s, r = document) => r.querySelector(s);
  const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const col = (s) => h(s).replace(/\{([gorb]):([^}]*)\}/g, (m, c, t) => `<span class="c${c}">${t}</span>`);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const S0 = () => (typeof state !== "undefined" ? state : window.state) || {};
  const today = () => new Date().toISOString().slice(0, 10);
  const num = (s) => parseFloat(String(s).replace(/[\s±Ø]/g, "").replace("−", "-").replace(",", "."));
  const nfr = (x) => String(x).replace(".", ",");

  /* ---------- Quelles fiches ? ---------- */
  const estCombine = (c) => !!c && (!!c.combine || /safran/i.test([c.entreprise, c.groupe].join(" ")));
  const aVenir = (c) => c.statut === "entretien" && (!c.dateEntretien || c.dateEntretien >= today());
  const cands = () => (S0().cands || []).filter((c) => estCombine(c) && aVenir(c)).sort((a, b) => String(a.dateEntretien || "9").localeCompare(String(b.dateEntretien || "9")));

  /* ---------- Style (le reste vient de l'onglet Prépa) ---------- */
  const st = document.createElement("style");
  st.textContent = `
  #pc-root{display:flex;flex-direction:column;gap:12px}
  .pc-hero{border-radius:18px;background:var(--hero);color:var(--hero-fg);padding:16px;display:flex;flex-direction:column;gap:10px}
  .pc-hero h2{margin:0;font-family:var(--display);font-size:1.2rem}.pc-hero p{margin:0;color:var(--hero-muted);font-size:.9rem}
  .pc-hero .go{background:var(--sun);color:#10231a;border-color:var(--sun);font-weight:800;align-self:flex-start}
  .pc-hero select{background:rgba(255,255,255,.12);color:var(--hero-fg);border-color:rgba(255,255,255,.25)}.pc-hero select option{color:#111}
  .pc-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
  .pc-steps div{border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:.86rem;line-height:1.35}
  .pc-steps b{display:block;color:var(--sun);font-size:.92rem}
  .pc-alerte{border-radius:10px;padding:8px 11px;background:rgba(233,185,73,.16);color:var(--hero-fg);font-size:.88rem;font-weight:600}
  .pc-prog{display:flex;gap:12px;flex-wrap:wrap;font-size:.84rem;color:var(--hero-muted)}.pc-prog b{color:var(--hero-fg)}
  .pc-nums{display:flex;gap:6px;flex-wrap:wrap}
  .pc-nums button{min-width:38px;min-height:0;padding:5px 8px;font-size:.82rem;border-radius:9px}
  .pc-nums button.ok{border-color:#17a06b;background:rgba(23,160,107,.14)}.pc-nums button.revoir{border-color:#e8782f;background:rgba(232,120,47,.14)}
  .pc-nums button[aria-current="true"]{outline:2px solid var(--accent);outline-offset:1px}
  .pc-in{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .pc-in label{display:flex;flex-direction:column;gap:4px;font-size:.84rem;font-weight:600}
  .pc-in label i{font-style:normal;font-weight:800}
  .pc-poste{border-left:4px solid var(--accent);padding:6px 10px;border-radius:6px;background:var(--accent-soft);display:flex;flex-direction:column;gap:3px}
  .pc-poste b{font-size:.95rem}.pc-poste small{color:var(--muted);font-size:.8rem}.pc-poste p{margin:0;font-size:.9rem;line-height:1.45}
  .pc-poste .lien{color:var(--s-offer);font-weight:700}
  span.cb{color:#2a62b0;font-weight:800}[data-theme="dark"] span.cb{color:#86aef0}
  .pc-fil{margin:0;padding:8px 12px;border-radius:10px;background:var(--warn-bg);color:var(--warn-fg);font-weight:700}`;
  document.head.appendChild(st);

  /* ---------- Dessins ---------- */
  function fig(name, sol) {
    const E = window.jobelloEntrainement && window.jobelloEntrainement.dessin; if (!E) return "";
    const { sym, frame, datum, svgWrap, L, T, hdim, vdim, axe, box, INK, DIM } = E;
    const G = "#0e7a5a", O = "#c2591a", R = "#d9433a", B = "#2a62b0";
    const rond = (x, y, n, c = R) => `<circle cx="${x}" cy="${y}" r="11" fill="${c}"/>` + T(x, y + 4, String(n), { fs: 12, c: "#fff", w: 800 });
    const rect = (x, y, w, hh, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${o.f || "none"}" stroke="${o.c || INK}" stroke-width="${o.w || 2}"${o.d ? ` stroke-dasharray="${o.d}"` : ""}/>`;
    const hach = (x, y, w, hh, sens = 1) => { let s = `<clipPath id="cp${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${hh}"/></clipPath><g clip-path="url(#cp${x}${y})">`; for (let i = -hh; i < w + hh; i += 8) s += L(x + i, y + (sens > 0 ? hh : 0), x + i + hh, y + (sens > 0 ? 0 : hh), { w: .7 }); return s + "</g>" + rect(x, y, w, hh); };
    switch (name) {
      case "cartouche": {
        const rows = [["SUPPORT DE BRIDE (OUTILLAGE)", "N° OT-2418", "Indice C"], ["Matière : Al 5083", "Échelle 1:2", "Projection européenne"], ["Tolérances générales : ISO 2768-mK", "Ra 3,2 sauf indication", "Unité : mm"], ["Tolérancement ISO 8015", "Arêtes cassées 0,5", "Masse : 14,2 kg"]];
        const cl = [B, O, O, R];
        let s = "", y = 14;
        const hl = sol ? [[0, 2, B], [2, 0, O], [2, 1, O], [1, 1, G], [1, 2, G], [3, 2, G], [3, 0, "#d9a400"]] : [];
        rows.forEach((r, i) => { let x = 10; [230, 160, 150].forEach((w, j) => { const m = hl.find((k) => k[0] === i && k[1] === j); s += rect(x, y, w, 34, { w: 1.2, f: m ? m[2] + "22" : "#fff", c: m ? m[2] : INK }) + T(x + 8, y + 22, r[j], { fs: 11.5, a: "start", w: i === 0 && j === 0 ? 700 : 0, c: m ? m[2] : INK }); x += w; }); y += 34; });
        return svgWrap(540, 166, s);
      }
      case "vues": {
        const bx = (x, y, t, c) => rect(x, y, 110, 64, { w: 1.4, f: c ? c + "18" : "#fff", c: c || DIM, d: c ? "" : "6 4" }) + T(x + 55, y + 38, t, { fs: 13, w: 700, c: c || DIM });
        return svgWrap(400, 250, bx(145, 20, sol ? "au-dessus : US" : "", sol ? O : "") + bx(20, 95, sol ? "à gauche : US" : "", sol ? O : "") + rect(145, 95, 110, 64, { w: 2 }) + T(200, 133, "FACE", { fs: 14, w: 800 })
          + bx(270, 95, sol ? "vue de GAUCHE" : "?", sol ? G : "") + bx(145, 170, sol ? "vue de DESSUS" : "?", sol ? G : ""));
      }
      case "traits": {
        const l = [["", 2.6], ["", 1], ["8 5", 1], ["16 4 3 4", 1], ["16 4 3 4 3 4", 1.2]], noms = ["arêtes vues", "cotes, hachures", "arêtes cachées", "axes", "pièce voisine (moteur)"], cs = [G, B, B, O, G];
        return svgWrap(420, 190, l.map(([d, w], i) => T(24, 34 + i * 34, String(i + 1), { fs: 15, w: 800 }) + L(44, 30 + i * 34, 220, 30 + i * 34, { w, d: d || undefined, c: INK }) + (sol ? T(232, 34 + i * 34, noms[i], { fs: 13, a: "start", w: 700, c: cs[i] }) : "")).join(""));
      }
      case "trous": {
        let s = rect(40, 40, 300, 160);
        [[90, 80], [290, 80], [90, 160], [290, 160]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M${x + 9},${y} A9,9 0 1,1 ${x},${y - 9}" fill="none" stroke="${INK}" stroke-width=".8"/>` + axe(x - 13, y, x + 13, y) + axe(x, y - 13, x, y + 13); });
        [[150, 120], [230, 120]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${INK}" stroke-width="1.6"/>` + axe(x - 14, y, x + 14, y) + axe(x, y - 14, x, y + 14); });
        s += `<circle cx="190" cy="170" r="8" fill="none" stroke="${INK}" stroke-width="1.6"/><circle cx="190" cy="170" r="13" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
        const c1 = sol ? B : DIM, c2 = sol ? G : DIM;
        s += L(98, 74, 130, 22, { w: .8, c: DIM }) + T(132, 20, "4× M8-6H prof. 16 · avant-trou Ø6,8 prof. 20", { fs: 11.5, a: "start", c: c1, w: sol ? 700 : 0 });
        s += L(236, 113, 290, 232, { w: .8, c: DIM }) + T(292, 234, "2× Ø10 H7 prof. 15", { fs: 11.5, a: "start", c: c2, w: sol ? 700 : 0 });
        s += L(180, 180, 130, 232, { w: .8, c: DIM }) + T(20, 234, "Ø9 lamé Ø15 prof. 9", { fs: 11.5, a: "start", c: c2, w: sol ? 700 : 0 });
        return svgWrap(440, 246, s);
      }
      case "coupe": {
        let s = hach(40, 60, 300, 40, 1) + hach(40, 100, 300, 50, -1);
        s += `<rect x="110" y="40" width="22" height="90" fill="#fff" stroke="${INK}" stroke-width="2"/>` + `<rect x="100" y="40" width="42" height="20" fill="#fff" stroke="${INK}" stroke-width="2"/>` + T(121, 30, "vis", { fs: 12, c: DIM });
        s += `<rect x="250" y="70" width="20" height="70" fill="#fff" stroke="${INK}" stroke-width="2"/>` + T(260, 30, "pion", { fs: 12, c: DIM }) + L(260, 34, 260, 66, { w: .7, c: DIM });
        s += axe(121, 34, 121, 140) + axe(260, 62, 260, 150) + T(360, 84, "pièce 1", { fs: 11, a: "start", c: DIM }) + T(360, 130, "pièce 2", { fs: 11, a: "start", c: DIM });
        if (sol) s += T(121, 170, "non hachuré : normal", { fs: 12, c: G, w: 700 }) + T(270, 170, "non hachuré : normal", { fs: 12, c: G, w: 700 }) + T(200, 192, "hachures en sens opposés : 2 pièces", { fs: 12, c: B, w: 700 });
        return svgWrap(420, 200, s);
      }
      case "pion": {
        let s = hach(40, 110, 320, 50, 1);
        s += `<path d="M180,160 L180,92 L174,92 L174,62 L178,52 L202,52 L206,62 L206,92 L200,92 L200,160 Z" fill="#fff" stroke="${INK}" stroke-width="2"/>` + axe(190, 40, 190, 172);
        s += `<rect x="150" y="54" width="20" height="40" fill="none" stroke="${DIM}" stroke-width="1.2" stroke-dasharray="10 3 3 3 3 3"/><rect x="210" y="54" width="20" height="40" fill="none" stroke="${DIM}" stroke-width="1.2" stroke-dasharray="10 3 3 3 3 3"/>` + T(240, 64, "pièce moteur", { fs: 11, a: "start", c: DIM });
        if (sol) s += T(290, 140, "H7/m6 : serré", { fs: 13, c: G, w: 800 }) + T(290, 84, "H7/g6 : glissant", { fs: 13, c: B, w: 800 }) + T(110, 48, "entrée en cône", { fs: 12, c: O, w: 700 });
        else s += T(300, 140, "plaque", { fs: 11, c: DIM }) + T(70, 84, "?", { fs: 18, c: DIM, w: 800 });
        return svgWrap(420, 180, s);
      }
      case "soudure": {
        let s = `<path d="M60,170 L300,170 L300,150 L80,150 L80,40 L60,40 Z" fill="none" stroke="${INK}" stroke-width="2"/>` + `<path d="M80,150 L80,136 L94,150 Z" fill="${INK}"/>`;
        s += L(98, 146, 160, 90, { w: 1.2, me: "ea" }).replace('marker-end', 'marker-start') + L(160, 90, 320, 90, { w: 1.4 }) + L(160, 96, 320, 96, { w: 1, d: "6 3" });
        s += `<circle cx="160" cy="90" r="7" fill="none" stroke="${sol ? B : INK}" stroke-width="1.6"/>` + `<path d="M220,90 L220,72 L238,90 Z" fill="none" stroke="${sol ? G : INK}" stroke-width="1.8"/>` + T(202, 86, "a5", { fs: 14, c: sol ? O : INK, w: 700 });
        if (sol) s += T(250, 66, "angle", { fs: 12, c: G, w: 700, a: "start" }) + T(176, 60, "gorge 5", { fs: 12, c: O, w: 700 }) + T(140, 120, "tout autour", { fs: 12, c: B, w: 700 });
        return svgWrap(380, 190, s);
      }
      case "erreurs": {
        let s = rect(60, 60, 300, 140);
        [[100, 100], [320, 100]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${INK}" stroke-width="1.6"/>` + axe(x - 13, y, x + 13, y) + axe(x, y - 13, x, y + 13); });
        [[150, 170], [270, 170], [150, 130], [270, 130]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${INK}" stroke-width="1.5"/><path d="M${x + 7},${y} A7,7 0 1,1 ${x},${y - 7}" fill="none" stroke="${INK}" stroke-width=".8"/>`; });
        s += hdim(60, 100, 44, "40", 60) + hdim(100, 320, 44, "220", 60) + hdim(320, 360, 44, "40", 60) + hdim(60, 360, 22, "300", 60) + vdim(60, 100, 40, "40", 60) + vdim(60, 200, 384, "140", 360);
        s += L(326, 106, 360, 232, { w: .8, c: DIM }) + T(362, 236, "2× Ø10", { fs: 12, a: "start", c: DIM });
        s += L(155, 175, 120, 232, { w: .8, c: DIM }) + T(70, 236, "4× M8", { fs: 12, a: "start", c: DIM });
        if (sol) s += rond(210, 12, 1) + rond(418, 228, 2) + rond(56, 228, 3) + rond(336, 88, 4) + rond(210, 76, 5);
        return svgWrap(450, 250, s);
      }
      case "plan": {
        const f = frame(150, 40, ["@plan", "0,02"], { couleurs: sol });
        return svgWrap(360, 190, (sol ? L(60, 110, 300, 110, { w: 6, c: "#e8782f" }).replace("/>", ' opacity=".7"/>') : "") + rect(60, 110, 240, 40) + f.svg + L(f.x1 - 6, 64, 220, 110, { w: .8, c: DIM, me: "ea" }) + T(180, 176, "face d'appui de la pièce moteur", { fs: 12, c: DIM }));
      }
      case "pions": {
        let s = rect(40, 40, 320, 150, { f: sol ? "#3b7dd818" : "none" });
        s += `<circle cx="110" cy="115" r="13" fill="${sol ? "#17a06b33" : "#fff"}" stroke="${INK}" stroke-width="1.8"/>` + axe(90, 115, 130, 115) + axe(110, 95, 110, 135);
        const cx = 290, cy = 115; s += `<path d="M${cx - 5},${cy - 12} A13,13 0 0,1 ${cx + 5},${cy - 12} L${cx + 5},${cy + 12} A13,13 0 0,1 ${cx - 5},${cy + 12} Z" fill="${sol ? "#17a06b33" : "#fff"}" stroke="${INK}" stroke-width="1.8"/>` + axe(270, cy, 310, cy) + axe(cx, 95, cx, 135);
        s += T(110, 152, "B · rond", { fs: 13, w: 700 }) + T(290, 152, "C · losange", { fs: 13, w: 700 }) + T(200, 30, "A = face du dessus", { fs: 12, c: DIM }) + L(124, 115, 276, 115, { w: .6, c: DIM, d: "4 3" });
        if (sol) s += T(110, 175, "2 translations", { fs: 12, c: G, w: 800 }) + T(290, 175, "1 rotation", { fs: 12, c: G, w: 800 }) + T(200, 62, "A : 3 degrés", { fs: 12, c: B, w: 800 });
        return svgWrap(400, 200, s);
      }
      case "bride": {
        const cx = 170, cy = 145; let s = `<circle cx="${cx}" cy="${cy}" r="100" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="46" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="74" fill="none" stroke="#6b7785" stroke-width=".9" stroke-dasharray="14 3 2 3"/>`;
        for (let i = 0; i < 8; i++) { const a = (i * 45 * Math.PI) / 180, x = cx + 74 * Math.cos(a), y = cy + 74 * Math.sin(a); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${sol ? "#e8782f55" : "none"}" stroke="${INK}" stroke-width="1.5"/>`; }
        s += axe(cx - 112, cy, cx + 112, cy) + axe(cx, cy - 112, cx, cy + 112);
        s += box(cx - 30, cy - 82, "Ø250").replace(/stroke="[^"]*"/, `stroke="${sol ? B : DIM}"`) + box(cx + 66, cy - 40, "45°").replace(/stroke="[^"]*"/, `stroke="${sol ? B : DIM}"`);
        const f = frame(250, 22, ["@pos", "Ø0,2(M)", "A", "B"], { couleurs: sol });
        s += T(252, 16, "8× Ø9 +0,2/0", { fs: 12, a: "start", c: DIM }) + f.svg + L(270, 46, cx + 52, cy - 52, { w: .8, c: DIM, me: "ea" });
        s += datum(cx + 46, cy + 30, "B", "right", sol ? "#d3f0e2" : "#fff") + T(36, 268, "A = face d'appui de la bride (dessous)", { fs: 12, a: "start", c: sol ? G : DIM, w: sol ? 700 : 0 });
        return svgWrap(440, 280, s);
      }
      case "perp": {
        let s = rect(60, 140, 260, 40) + `<path d="M180,140 L180,72 L184,64 L196,64 L200,72 L200,140" fill="${sol ? "#e8782f44" : "none"}" stroke="${INK}" stroke-width="2"/>` + axe(190, 52, 190, 186);
        if (sol) s += rect(186, 60, 8, 80, { w: 1, c: O, d: "3 2" });
        const f = frame(230, 30, ["@perp", "Ø0,02", "A"], { couleurs: sol });
        s += f.svg + L(232, 54, 202, 92, { w: .8, c: DIM, me: "ea" }) + datum(120, 180, "A", "down", sol ? "#d3f0e2" : "#fff") + T(110, 90, "pion Ø10", { fs: 12, c: DIM });
        return svgWrap(380, 230, s);
      }
      case "pile": {
        let s = L(40, 200, 300, 200, { w: 2.4 }) + hach(80, 170, 140, 30, 1) + rect(100, 70, 100, 100, { f: "#dfe8f3" }) + rect(80, 44, 140, 26, { f: "#f6ead9" });
        s += T(150, 190, "A", { fs: 14, w: 800, c: sol ? G : INK }) + T(150, 124, "B", { fs: 14, w: 800, c: sol ? G : INK }) + T(150, 62, "C", { fs: 14, w: 800, c: sol ? G : INK });
        s += vdim(44, 200, 262, "H", 220) + T(320, 120, "H = ?", { fs: 14, w: 800, c: sol ? B : DIM, a: "start" });
        return svgWrap(400, 214, s);
      }
      case "butee": {
        let s = L(30, 230, 360, 230, { w: 2.4 }) + hach(60, 120, 180, 110, 1) + rect(80, 108, 140, 12, { f: "#f6ead9" }) + rect(70, 82, 160, 26, { f: "#dfe8f3", c: INK, d: "" }) + T(150, 100, "bride (pièce moteur)", { fs: 11, c: DIM });
        s += `<path d="M300,230 L300,50 L190,50 L190,62 L280,62 L280,230" fill="url(#eh)" stroke="${INK}" stroke-width="1.8"/>`;
        s += T(150, 180, "H1 plateau", { fs: 12, w: 700, c: sol ? O : INK }) + T(150, 118, "H2", { fs: 11, w: 700, c: sol ? O : INK }) + T(122, 77, "H3", { fs: 12, w: 700, c: sol ? O : INK });
        s += T(210, 75, "J", { fs: 16, w: 800, c: R }) + L(222, 64, 222, 80, { w: .8, c: R, m: "ea" });
        s += vdim(50, 230, 330, "274", 300);
        return svgWrap(380, 244, s);
      }
      case "transfert": {
        let s = `<path d="M60,60 L160,60 L160,100 L310,100 L310,180 L60,180 Z" fill="none" stroke="${INK}" stroke-width="2"/>`;
        s += T(60, 196, "face 1", { fs: 11, c: DIM }) + T(310, 196, "face 2", { fs: 11, c: DIM }) + T(160, 50, "épaulement", { fs: 11, c: DIM });
        s += hdim(60, 160, 36, "C = 20 ±0,1 (BE)", 60, sol ? R : B) + hdim(60, 310, 222, "L1 = 50 ±0,05", 180, sol ? G : DIM) + hdim(160, 310, 82, sol ? "L2 = 30 ±0,05" : "L2 = ?", 100, sol ? O : DIM);
        return svgWrap(380, 236, s);
      }
    }
    return "";
  }

  /* ---------- Progression ---------- */
  let P = { ex: {}, simus: [] }, db = null, saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (db) db.doc("entrainement/combine").set({ ...P, updatedAt: new Date().toISOString() }).catch(() => {}); }, 600); };
  async function charger() {
    if (!window.claude) return; db = await window.claude.use("db"); if (!db) return;
    db.doc("entrainement/combine").onSnapshot((snap) => { if (!snap.exists) return; const v = snap.data(); delete v.updatedAt; P = { ex: {}, simus: [], ...v }; if (!ui.simu) render(); }, () => {});
  }

  /* ---------- État de l'écran ---------- */
  const ui = { cand: "", candAuto: true, at: { plan: { n: 0, i: 0 }, gps: { n: 0, i: 0 }, ch: { n: 0, i: 0 } }, sol: {}, vals: {}, res: {}, simu: null, open: "" };
  const liste = (a) => EX.filter((x) => x.a === a && (!ui.at[a].n || x.n === ui.at[a].n));
  const candOf = (id) => (S0().cands || []).find((c) => c.id === id);
  const dateFr = (c) => c.dateEntretien ? new Date(c.dateEntretien + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + (c.heureEntretien ? " à " + c.heureEntretien.replace(":", " h ") : "") : "";

  // parcours : celui de la fiche (écrit par Claude), sinon tiré du profil
  function parcoursDe(c) {
    if (c?.combine?.parcours?.length) return c.combine.parcours;
    const xs = (S0().profil?.kit?.experiences || []).slice().reverse();
    return xs.map((x) => ({ quand: x.dates, poste: [x.poste, x.societe].filter(Boolean).join(" · "), dire: String(x.desc || "").split("\n")[0], lien: "" }));
  }
  const DEROULE0 = [
    { t: "Toi et ton parcours", min: "15 min", dire: "Présentation de 3 à 4 minutes, poste par poste, du plus ancien au plus récent." },
    { t: "Pourquoi Safran, pourquoi ce poste", min: "10 min", dire: "Ce que tu sais du site et du métier, ce que tu veux construire." },
    { t: "Technique", min: "20 à 30 min", dire: "Lecture de plan, cotation ISO (GPS), chaînes de cotes. Là où les candidats échouent le plus." },
  ];

  /* ---------- Cartes ---------- */
  function exCard(x, inS) {
    const sol = inS ? ui.simu.rev : !!ui.sol[x.id], vals = ui.vals[x.id] || [], res = ui.res[x.id];
    const at = AT.find((a) => a.id === x.a) || {};
    const stat = P.ex[x.id];
    return `<div class="en-card" data-pc-ex="${x.id}">
      <div class="en-meta"><span>${at.ic || ""} ${h(at.nom || "")}</span><span class="en-niv">${[1, 2, 3].map((k) => `<i class="${k <= x.n ? "on" : ""}"></i>`).join("")} niveau ${x.n}</span>${stat ? `<span class="${stat === "ok" ? "en-ok" : "en-ko"}">${stat === "ok" ? "✓ su" : "à revoir"}</span>` : ""}</div>
      <p class="en-q">${h(x.t)}</p><p class="en-r">${h(x.q)}</p>
      ${x.fig ? `<div class="en-paper" style="max-width:560px">${fig(x.fig, sol)}</div>` : ""}
      ${x.in ? `<div class="pc-in">${x.in.map((f, k) => `<label>${h(f.l)}<input inputmode="decimal" data-pc-val="${k}" value="${h(vals[k] ?? "")}" autocomplete="off">${res ? `<i class="${res[k] ? "en-ok" : "en-ko"}">${res[k] ? "✓ juste" : "✗ réponse : " + nfr(f.v)}</i>` : ""}</label>`).join("")}</div>
        <div class="en-row"><button type="button" class="small primary" data-pc-check>Vérifier</button>${res ? `<span class="${res.every(Boolean) ? "en-ok" : "en-ko"}">${res.every(Boolean) ? "Bravo, tout est juste" : "Pas tout : regarde la solution"}</span>` : ""}</div>` : ""}
      ${sol ? `<div class="en-leg"><span><i style="background:#3b7dd8"></i>on lit / on contrôle</span><span><i style="background:#e8782f"></i>zone, tolérance, −</span><span><i style="background:#17a06b"></i>juste, à dire, +</span><span><i style="background:#d9a400"></i>piège</span></div>
        ${x.s.map(([c, l, t]) => `<p class="en-c ${c === "cr" ? "" : c}"${c === "cr" ? ' style="border-color:#d9433a;background:rgba(217,67,58,.1)"' : ""}><b${c === "cr" ? ' style="color:#d9433a"' : ""}>${h(l)}</b>${col(t)}</p>`).join("")}
        ${x.e ? `<p class="en-e">${h(x.e)}</p>` : ""}
        ${inS ? "" : `<div class="en-row"><span style="font-size:.88rem;font-weight:600">Tu savais ?</span><button type="button" class="small primary" data-pc-s="ok">Je savais</button><button type="button" class="small" data-pc-s="revoir">À revoir</button></div>`}`
        : `<div class="en-row"><button type="button" class="small${x.in ? "" : " primary"}" data-pc-sol>Voir la solution</button><span class="en-tip">Réponds d'abord à voix haute, comme devant le recruteur.</span></div>`}
    </div>`;
  }
  function atelierHTML(a) {
    const l = liste(a.id), u = ui.at[a.id]; if (u.i >= l.length) u.i = 0;
    const x = l[u.i];
    return `<div class="en-chips">${[0, 1, 2, 3].map((n) => `<button type="button" class="small" data-pc-niv="${a.id}:${n}" aria-pressed="${u.n === n}">${n ? "Niveau " + n : "Tous"}</button>`).join("")}</div>
      <div class="pc-nums">${l.map((e, k) => `<button type="button" class="small ${P.ex[e.id] || ""}" data-pc-go="${a.id}:${k}" aria-current="${k === u.i}">${e.id.replace(/\D/g, "")}</button>`).join("")}</div>
      ${x ? exCard(x, false) : ""}
      ${x ? `<div class="en-row"><button type="button" class="small ghost" data-pc-nav="${a.id}:-1">← Précédent</button><span class="sp"></span><button type="button" class="small" data-pc-nav="${a.id}:1">Suivant →</button></div>` : ""}
      ${a.id === "ch" ? `<p class="en-link">Pour t'entraîner sans fin : <a href="#en-f-ch" data-pc-plus>les chaînes générées plus bas</a> (valeurs nouvelles à chaque fois).</p>` : a.id === "plan" ? `<p class="en-link">Encore plus : <a href="#en-f-plans" data-pc-plus>les plans à corriger plus bas</a>.</p>` : `<p class="en-link">Encore plus : <a href="#en-f-gdt" data-pc-plus>10 cotes et le quiz des symboles plus bas</a>.</p>`}`;
  }
  function parcoursHTML(c) {
    const cb = c?.combine || {}, ps = parcoursDe(c), qs = cb.questions || [];
    return `${cb.fil ? `<p class="pc-fil">Ton fil rouge : ${h(cb.fil)}</p>` : ""}
      <p class="en-tip">Raconte du plus ancien au plus récent. Une ou deux phrases par poste, et le lien avec le poste visé en vert.</p>
      ${ps.map((p) => `<div class="pc-poste"><small>${h(p.quand || "")}</small><b>${h(p.poste || "")}</b>${p.dire ? `<p>${h(p.dire)}</p>` : ""}${p.lien ? `<p class="lien">→ ${h(p.lien)}</p>` : ""}</div>`).join("")}
      ${c?.prepa?.pitch ? `<details class="en-more"><summary>Ta présentation en 1 minute (fiche)</summary><p>${h(c.prepa.pitch)}</p></details>` : ""}
      ${qs.length ? `<b style="margin-top:6px">Les questions sur ton parcours et ta motivation</b>${qs.map((x) => `<details class="qa"><summary>${h(x.q)}</summary><p>${h(x.r)}</p></details>`).join("")}` : ""}`;
  }
  const compte = (a) => { const l = EX.filter((x) => x.a === a); return [l.filter((x) => P.ex[x.id] === "ok").length, l.length]; };

  function render() {
    const root = $("#pc-root"); if (!root) return;
    const cs = cands();
    if (!cs.length) { root.hidden = true; root.innerHTML = ""; return; }
    root.hidden = false;
    if (ui.candAuto || !cs.find((c) => c.id === ui.cand)) ui.cand = cs[0].id;
    const c = candOf(ui.cand), der = c.combine?.deroule?.length ? c.combine.deroule : DEROULE0, last = (P.simus || []).filter((s) => !s.entreprise || s.entreprise === c.entreprise).slice(-1)[0];
    const ouvert = document.activeElement && root.contains(document.activeElement) && document.activeElement.tagName === "INPUT" ? null : 1;
    if (!ouvert) return;
    root.innerHTML = `<div class="pc-hero">
        <h2>Entretien combiné · ${h(c.entreprise || "")}</h2>
        <p>${h(dateFr(c))}${(c.combine?.avec || c.avecQui) ? " · avec " + h(c.combine?.avec || c.avecQui) : ""}${c.lieuEntretien ? " · " + h(String(c.lieuEntretien).split(",").slice(0, 1).join("")) : ""}</p>
        ${cs.length > 1 ? `<select id="pc-cand">${cs.map((x) => `<option value="${h(x.id)}"${x.id === c.id ? " selected" : ""}>${h(x.entreprise)} · ${h(x.poste || "")}</option>`).join("")}</select>` : ""}
        <div class="pc-steps">${der.map((d, i) => `<div><b>${i + 1}. ${h(d.t)}</b>${h(d.dire || "")}${d.min ? ` <span style="opacity:.7">(${h(d.min)})</span>` : ""}</div>`).join("")}</div>
        <p class="pc-alerte">⚠ La RH l'a dit : c'est sur la lecture de plan, la cotation ISO et les chaînes de cotes que les candidats échouent le plus.</p>
        <div class="pc-prog">${AT.map((a) => { const [k, n] = compte(a.id); return `<span>${a.ic} ${h(a.court)} <b>${k} / ${n}</b></span>`; }).join("")}</div>
        <div class="en-row"><button type="button" class="go" data-pc-simu>Entretien blanc combiné (≈ 40 min)</button>${last ? `<span style="font-size:.84rem;color:var(--hero-muted)">Dernier : ${last.score} %, le ${new Date(last.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</div>
      </div>
      ${[["parc", "A. Ta présentation et tes postes", parcoursHTML(c)], ...AT.map((a, i) => [a.id, `${"BCD"[i]}. ${a.nom}`, atelierHTML(a)])].map(([k, t, b]) => `<details class="fold" data-pc-fold="${k}"${ui.open === k ? " open" : ""}><summary><span class="fold-t">${h(t)}</span><span class="fold-s">${k === "parc" ? "motivation et parcours" : (() => { const [a, n] = compte(k); return `${a} / ${n} sus · niveaux 1 → 3`; })()}</span></summary><div class="fold-b" style="display:flex;flex-direction:column;gap:10px">${b}</div></details>`).join("")}
      <p class="en-link" style="margin:2px 0 0">Plus bas : l'entraînement technique complet (tous les domaines).</p>`;
  }

  /* ---------- Entretien blanc combiné ---------- */
  function startSimu() {
    const c = candOf(ui.cand), qs = c?.combine?.questions || [], ps = parcoursDe(c);
    const steps = [{ k: "pres" }];
    const qParc = qs.filter((x) => x.type === "parcours"), qMot = qs.filter((x) => x.type !== "parcours");
    shuffle(qParc.length ? qParc : qs).slice(0, 2).forEach((x) => steps.push({ k: "qr", x, titre: "Ton parcours" }));
    const rh = (c?.prepa?.rh || []).map((x) => ({ q: x.q, r: x.r }));
    shuffle(qMot.length ? qMot : rh).slice(0, 2).forEach((x) => steps.push({ k: "qr", x, titre: "Ta motivation" }));
    if (!ps.length && !qs.length) steps.push({ k: "qr", x: { q: "Pourquoi Safran ?", r: "Ce que tu sais du site, du moteur et du métier, puis ce que tu veux y construire." }, titre: "Ta motivation" });
    for (const a of ["plan", "gps", "ch"]) {
      const choisir = (ns) => { const pool = EX.filter((x) => x.a === a && ns.includes(x.n)), pref = pool.filter((x) => P.ex[x.id] !== "ok"); return pick(pref.length ? pref : pool); };
      const e1 = choisir([1, 2]), e2 = choisir([2, 3].filter((n) => n >= e1.n)) || choisir([3]);
      [e1, e2.id === e1.id ? choisir([3]) : e2].forEach((x) => x && steps.push({ k: "ex", id: x.id }));
    }
    const sit = c?.combine?.situation || pick(D.situations); steps.push({ k: "sit", x: sit });
    steps.push({ k: "fin" });
    ui.simu = { steps, i: 0, res: [], t0: Date.now(), entreprise: c?.entreprise || "", rev: false, t: null };
    Object.keys(ui.vals).forEach((k) => delete ui.vals[k]); Object.keys(ui.res).forEach((k) => delete ui.res[k]);
    document.body.style.overflow = "hidden"; renderSimu();
  }
  let chrono = 0;
  function renderSimu() {
    let ov = $("#pc-ov"); if (!ov) { ov = document.createElement("div"); ov.id = "pc-ov"; ov.className = "en-ov"; document.body.appendChild(ov); }
    const S = ui.simu, n = S.steps.length, c = candOf(ui.cand);
    if (S.i >= n) return finSimu(ov);
    const stp = S.steps[S.i]; let titre = "", body = "";
    if (stp.k === "pres") {
      titre = "1 · Présente-toi";
      body = `<div class="en-card"><p class="en-q">« Présentez-vous, et racontez-moi votre parcours. »</p><p class="en-tip">À voix haute, 3 à 4 minutes. Poste par poste, du plus ancien au plus récent, puis pourquoi ce poste.</p>
        <div class="en-row"><span class="en-timer" id="pc-timer">4:00</span><button type="button" class="small" data-pc-chrono>${S.t ? "Recommencer" : "▶ Démarrer"}</button></div>
        ${S.rev ? parcoursHTML(c) : `<button type="button" class="small" data-pc-rev>J'ai fini, voir mon fil</button>`}</div>`;
    } else if (stp.k === "qr") {
      titre = stp.titre;
      body = `<div class="en-card"><p class="en-q">${h(stp.x.q)}</p><p class="en-tip">Réponds à voix haute, 1 à 2 minutes.</p>${S.rev ? `<p class="en-c cg"><b>Ce qu'il faut dire</b>${h(stp.x.r)}</p>` : `<button type="button" class="small" data-pc-rev>Voir la réponse conseillée</button>`}</div>`;
    } else if (stp.k === "ex") {
      const x = EX.find((e) => e.id === stp.id); titre = "Technique · " + (AT.find((a) => a.id === x.a) || {}).nom;
      body = exCard(x, true).replace("data-pc-sol", "data-pc-rev");
    } else if (stp.k === "sit") {
      titre = "Mise en situation";
      body = `<div class="en-card"><p class="en-q">${h(stp.x.q)}</p><p class="en-tip">Réfléchis à voix haute : reformule, pose des questions, propose.</p>${S.rev ? stp.x.s.map(([cc, l, t]) => `<p class="en-c ${cc}"><b>${h(l)}</b>${col(t)}</p>`).join("") : `<button type="button" class="small" data-pc-rev>Voir la méthode</button>`}</div>`;
    } else {
      titre = "« Avez-vous des questions ? »";
      const qs = c?.prepa?.aPoser || [];
      body = `<div class="en-card"><p class="en-q">Pose 2 ou 3 questions, sans les lire.</p>${S.rev ? (qs.length ? `<ul style="margin:0;padding-left:18px">${qs.map((q) => `<li>${h(q)}</li>`).join("")}</ul>` : "<p>Une question sur l'équipe, une sur les outillages, une sur la suite.</p>") : `<button type="button" class="small" data-pc-rev>Voir tes questions</button>`}</div>`;
    }
    const pret = S.rev || (stp.k === "ex" && ui.res[stp.id]);
    const notes = pret ? `<div class="en-row"><span style="font-size:.88rem;font-weight:600">Comment ça s'est passé ?</span><button type="button" class="small primary" data-pc-sr="ok">Réussi</button><button type="button" class="small" data-pc-sr="moyen">Moyen</button><button type="button" class="small" data-pc-sr="ko">Raté</button></div>` : "";
    const min = Math.floor((Date.now() - S.t0) / 60000);
    ov.innerHTML = `<div class="in"><div class="top"><h2>Entretien blanc combiné${S.entreprise ? " · " + h(S.entreprise) : ""}</h2><span class="en-meta">${S.i + 1} / ${n} · ${min} min</span><button type="button" class="small ghost" data-pc-quit>Arrêter</button></div>
      <div class="en-bar"><i style="width:${(S.i / n) * 100}%"></i></div><div class="en-meta" style="font-weight:700">${h(titre)}</div>${body}${notes}</div>`;
    ov.scrollTop = 0;
  }
  function note(r) {
    const S = ui.simu, stp = S.steps[S.i]; S.res.push({ ...stp, r });
    if (stp.k === "ex") { P.ex[stp.id] = r === "ok" ? "ok" : "revoir"; save(); }
    S.i++; S.rev = false; clearInterval(chrono); S.t = null; renderSimu();
  }
  function finSimu(ov) {
    const S = ui.simu, n = S.res.length, sc = Math.round((S.res.reduce((a, x) => a + (x.r === "ok" ? 1 : x.r === "moyen" ? .5 : 0), 0) / Math.max(1, n)) * 100);
    const part = (x) => x.k === "pres" || (x.k === "qr") ? "Motivation et parcours" : x.k === "ex" ? (AT.find((a) => a.id === EX.find((e) => e.id === x.id).a) || {}).nom : "Mise en situation et questions";
    const lbl = (x) => x.k === "pres" ? "Ta présentation" : x.k === "qr" ? x.x.q : x.k === "ex" ? EX.find((e) => e.id === x.id).t : x.k === "sit" ? x.x.q : "Tes questions";
    const rev = S.res.filter((x) => x.r !== "ok"), parts = {};
    S.res.forEach((x) => (parts[part(x)] ||= []).push(x.r));
    if (!S.saved) { S.saved = true; P.simus = [...(P.simus || []), { le: new Date().toISOString(), entreprise: S.entreprise, score: sc, n, revoir: rev.map((x) => x.id || x.k) }].slice(-20); save(); }
    ov.innerHTML = `<div class="in"><div class="top"><h2>Bilan de l'entretien blanc</h2><button type="button" class="small ghost" data-pc-quit>Fermer</button></div>
      <p class="en-score">${sc} %</p><p class="en-r">${sc >= 75 ? "Très bien : tu peux y aller confiant. Relis juste les points ci-dessous." : sc >= 50 ? "Correct. Reprends les points ci-dessous avant le jour J." : "Encore du travail : refais les exercices ci-dessous, puis un nouvel entretien blanc."} (${Math.round((Date.now() - S.t0) / 60000)} min)</p>
      <div class="en-card"><b>Par partie</b>${Object.entries(parts).map(([p, rs]) => `<div class="en-row"><span>${h(p)}</span><span class="sp"></span>${rs.map((r) => (r === "ok" ? "🟢" : r === "moyen" ? "🟡" : "🔴")).join(" ")}</div>`).join("")}</div>
      ${rev.length ? `<div class="en-card"><b>À revoir</b><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${rev.map((x) => `<li>${h(lbl(x))}</li>`).join("")}</ul></div>` : ""}
      <div class="en-row"><button type="button" class="primary" data-pc-quit>Terminer</button><button type="button" class="small" data-pc-simu>Refaire un entretien blanc</button></div></div>`;
  }
  function quitSimu() { clearInterval(chrono); ui.simu = null; const ov = $("#pc-ov"); if (ov) ov.remove(); document.body.style.overflow = ""; render(); }

  /* ---------- Clics ---------- */
  function verifier(card, x) {
    const vals = [...card.querySelectorAll("[data-pc-val]")].map((i) => i.value);
    ui.vals[x.id] = vals;
    ui.res[x.id] = x.in.map((f, k) => { const v = num(vals[k]); return isFinite(v) && Math.abs(Math.abs(v) - f.v) <= f.tol + 1e-9; });
  }
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-pc-simu],[data-pc-quit],[data-pc-sol],[data-pc-rev],[data-pc-check],[data-pc-s],[data-pc-sr],[data-pc-niv],[data-pc-go],[data-pc-nav],[data-pc-chrono],[data-pc-plus]");
    if (!t) return;
    const d = t.dataset, card = t.closest("[data-pc-ex]"), x = card ? EX.find((e) => e.id === card.dataset.pcEx) : null, inS = !!t.closest("#pc-ov");
    if ("pcPlus" in d) { const f = document.querySelector(t.getAttribute("href")); if (f) { ev.preventDefault(); f.open = true; f.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if ("pcSimu" in d) { if (ui.simu) { const ov = $("#pc-ov"); if (ov) ov.remove(); } return startSimu(); }
    if ("pcQuit" in d) return quitSimu();
    if ("pcSr" in d) return note(d.pcSr);
    if ("pcRev" in d) { ui.simu.rev = true; return renderSimu(); }
    if ("pcChrono" in d) {
      const S = ui.simu; clearInterval(chrono); S.t = Date.now(); renderSimu();
      chrono = setInterval(() => { const el = $("#pc-timer"); if (!el || !ui.simu) return clearInterval(chrono); const r = Math.max(0, 240 - Math.floor((Date.now() - S.t) / 1000)); el.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`; el.style.color = r < 30 ? "#d9433a" : ""; if (!r) clearInterval(chrono); }, 500);
      return;
    }
    if ("pcCheck" in d && x) { verifier(card, x); if (inS) { if (ui.res[x.id].every(Boolean)) ui.simu.rev = true; return renderSimu(); } ui.sol[x.id] = true; return render(); }
    if ("pcSol" in d && x) { ui.sol[x.id] = true; return render(); }
    if (d.pcS && x) { P.ex[x.id] = d.pcS; save(); const a = ui.at[x.a], l = liste(x.a); a.i = Math.min(a.i + 1, l.length - 1); if (P.ex[x.id] === "ok" && a.i === l.indexOf(x)) a.i = 0; return render(); }
    if (d.pcNiv) { const [a, n] = d.pcNiv.split(":"); ui.at[a] = { n: +n, i: 0 }; ui.open = a; return render(); }
    if (d.pcGo) { const [a, k] = d.pcGo.split(":"); ui.at[a].i = +k; ui.open = a; return render(); }
    if (d.pcNav) { const [a, k] = d.pcNav.split(":"), l = liste(a); ui.at[a].i = (ui.at[a].i + +k + l.length) % l.length; ui.open = a; return render(); }
  });
  document.addEventListener("toggle", (ev) => { const f = ev.target; if (f.dataset && f.dataset.pcFold) { if (f.open) ui.open = f.dataset.pcFold; else if (ui.open === f.dataset.pcFold) ui.open = ""; } }, true);
  document.addEventListener("input", (ev) => { const i = ev.target.closest && ev.target.closest("[data-pc-val]"); if (!i) return; const card = i.closest("[data-pc-ex]"); const id = card.dataset.pcEx; const v = ui.vals[id] || (ui.vals[id] = []); v[+i.dataset.pcVal] = i.value; });
  document.addEventListener("change", (ev) => { if (ev.target.id === "pc-cand") { ui.cand = ev.target.value; ui.candAuto = false; render(); } });
  // depuis la fiche : « Entretien combiné »
  document.addEventListener("click", (ev) => { const a = ev.target.closest("[data-pc-cand]"); if (!a) return; ui.cand = a.dataset.pcCand; ui.candAuto = false; ui.open = "parc"; setTimeout(() => { render(); const r = $("#pc-root"); if (r) r.scrollIntoView({ block: "start" }); }, 150); });

  /* ---------- Branchement ---------- */
  function brancher() {
    const sec = document.getElementById("v-entrainement"), head = sec && sec.querySelector(".en-head");
    if (!head || !window.jobelloEntrainement) return setTimeout(brancher, 150);
    const root = document.createElement("div"); root.id = "pc-root"; root.hidden = true; head.after(root);
    const montrer = () => { if (location.hash === "#entrainement") render(); };
    addEventListener("hashchange", () => setTimeout(montrer, 0));
    montrer(); charger();
    let sig = "";
    setInterval(() => {
      if (sec.hidden || ui.simu) return;
      const nsig = cands().map((c) => c.id + c.dateEntretien + JSON.stringify(c.combine || "").length).join("|");
      if (nsig !== sig) { sig = nsig; render(); }
    }, 2500);
  }
  brancher();
  window.jobelloCombine = { render, EX, estCombine, fig };
})();
