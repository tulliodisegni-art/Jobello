/* Jobello : onglet « Prépa entretien technique » (#entrainement), sur le modèle de l'entretien Kickmaker.
   1. Questions par domaine (usinage, tôlerie, plasturgie…), niveaux 1 à 3, réponse cachée puis « Je savais / À revoir ».
   2. Plans à corriger : on touche les erreurs sur le plan (dessinés ici en SVG, rien à télécharger).
   3. Lire une cotation géométrique (ISO GPS) et l'expliquer, plus un quiz des symboles.
   4. Chaînes de cotes : exercices générés (valeurs nouvelles à chaque fois), vérification, correction, vue 3D qu'on fait tourner.
   5. Raconter ses expériences (méthode STAR), rangées pour les relire avant l'entretien.
   + Entretien blanc : domaines choisis (devinés d'après l'annonce), niveau 1 → 3 par domaine, puis un plan, une cote, une chaîne, un récit.
   Contenu dans entrainement-data.js. Progression dans docs path entrainement/technique :
     { q: { id: "ok"|"revoir" }, plans: { id: [n° trouvés] }, gdt: { id: "ok"|"revoir" }, ch: { faits, justes }, quiz: { faits, justes },
       star: { id: { s, t, a, r, chiffre, appris } }, simus: [{ le, entreprise, score, n, revoir: [ids] }] } */
(function () {
  const D = window.JB_ENTR || { domaines: [], questions: [] };
  const DOM = D.domaines, QS = D.questions;
  const e$ = (s, r = document) => r.querySelector(s);
  const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sg = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0");
  const nf = (x, d = 3) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, "").replace(".", ",").replace(/^-/, "−") || "0";
  const num = (s) => parseFloat(String(s).replace(/\s/g, "").replace("−", "-").replace(",", "."));
  const domNom = (id) => (id === "soc" ? "Questions de l'entreprise" : (DOM.find((d) => d.id === id) || {}).nom || id);
  const S0 = () => (typeof state !== "undefined" ? state : window.state) || {};
  const candOf = (id) => (S0().cands || []).find((c) => c.id === id);
  const phrase1 = (t) => { const m = String(t || "").match(/^.{20,180}?[.!?](\s|$)/); return m ? m[0].trim() : ""; };
  // questions propres à une société : préparées par Claude sur la fiche (« Préparer avec Claude », « 5 questions »)
  function socQs(c) {
    if (!c) return [];
    const l = [...(c.prepa?.techniques || []).map((x) => ({ q: x.q, r: x.r })), ...(c.questionsEntretien || []).map((x) => ({ q: x.q, r: x.a }))].filter((x) => x.q);
    return l.map((x, i) => { const e = phrase1(x.r); return { id: `soc-${c.id}-${i}`, d: "soc", dn: "Chez " + (c.entreprise || "cette société"), q: x.q, r: x.r || "", e: e && e.length < (x.r || "").length ? e : "" }; });
  }
  const findQ = (id) => QS.find((q) => q.id === id) || (id.startsWith("soc-") ? socQs(candOf(id.slice(4, id.lastIndexOf("-")))).find((q) => q.id === id) : null);

  /* ---------- Style ---------- */
  const css = `
  #v-entrainement{gap:14px}
  .en-head h1{margin:0;font-family:var(--display);font-size:1.5rem}.en-head p{margin:4px 0 0;color:var(--muted);font-size:.92rem}
  .en-hero{border-radius:18px;background:var(--hero);color:var(--hero-fg);padding:16px;display:flex;flex-direction:column;gap:10px}
  .en-hero h2{margin:0;font-family:var(--display);font-size:1.15rem}.en-hero p{margin:0;color:var(--hero-muted);font-size:.9rem}
  .en-hero select{background:rgba(255,255,255,.12);color:var(--hero-fg);border-color:rgba(255,255,255,.25)}
  .en-hero select option{color:#111}
  .en-hero .en-chips button{background:rgba(255,255,255,.1);color:var(--hero-fg);border-color:rgba(255,255,255,.25)}
  .en-hero .en-chips button[aria-pressed="true"]{background:var(--sun);color:#10231a;border-color:var(--sun)}
  .en-hero .go{background:var(--sun);color:#10231a;border-color:var(--sun);font-weight:800;align-self:flex-start}
  .en-chips{display:flex;gap:6px;flex-wrap:wrap}
  .en-chips button{font-size:.84rem;padding:5px 11px;border-radius:99px;min-height:0}
  .en-chips button[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
  .en-chips button .mono{opacity:.7;margin-left:3px}
  .en-card{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:10px}
  .en-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.8rem;color:var(--muted)}
  .en-niv{display:inline-flex;gap:2px;align-items:center;font-weight:700;color:var(--accent)}
  .en-niv i{width:8px;height:8px;border-radius:2px;background:var(--line)}.en-niv i.on{background:var(--accent)}
  .en-q{font-size:1.08rem;font-weight:700;line-height:1.35;margin:0}
  .en-r{margin:0;line-height:1.55}
  .en-k{display:flex;flex-wrap:wrap;gap:6px}.en-k span{font-size:.78rem;padding:2px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-weight:600}
  .en-p{margin:0;font-size:.88rem;padding:8px 10px;border-radius:10px;background:var(--warn-bg);color:var(--warn-fg)}
  .en-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .en-row .sp{flex:1}
  .en-tip{font-size:.85rem;color:var(--muted);margin:0}
  .en-ok{color:var(--s-offer);font-weight:700}.en-ko{color:var(--s-refused);font-weight:700}
  .en-paper{background:#fff;color:#1b1f24;border-radius:10px;border:1px solid var(--line);overflow:hidden;touch-action:manipulation}
  .en-paper svg{display:block;width:100%;height:auto;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .en-paper.click svg{cursor:crosshair}
  .en-found{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:.9rem}
  .en-found li b{display:block}
  .en-sec{display:flex;flex-direction:column;gap:4px}.en-sec b{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.en-sec p{margin:0;line-height:1.5}
  .en-in{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
  .en-in label{display:flex;flex-direction:column;gap:4px;font-size:.84rem;font-weight:600}
  .en-steps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;line-height:1.5}
  .en-3d{position:relative}.en-3d canvas{display:block;width:100%;height:300px;touch-action:none;cursor:grab;background:linear-gradient(#f6f9fb,#e4ecf1);border-radius:10px}
  .en-3d .hint{position:absolute;left:10px;bottom:8px;font-size:.75rem;color:#56697a;pointer-events:none}
  .en-star textarea{min-height:64px}
  .en-star label{display:flex;flex-direction:column;gap:4px;font-size:.84rem;font-weight:700}
  .en-star label small{font-weight:400;color:var(--muted)}
  .en-oral{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
  .en-oral div{border-radius:12px;padding:10px;background:var(--accent-soft)}.en-oral b{display:block;color:var(--accent)}
  .en-timer{font-family:var(--mono);font-size:1.4rem;font-weight:700}
  .en-sym{display:grid;place-items:center;padding:14px;background:#fff;border-radius:12px;border:1px solid var(--line)}
  .en-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
  .en-choices button:disabled{opacity:1}
  .en-choices button.bon{background:var(--s-offer);color:#fff;border-color:var(--s-offer)}.en-choices button.faux{background:var(--s-refused);color:#fff;border-color:var(--s-refused)}
  .en-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden}.en-bar i{display:block;height:100%;background:var(--accent);transition:width .3s}
  .en-ov{position:fixed;inset:0;z-index:45;background:var(--bg);overflow:auto;overscroll-behavior:contain;padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(20px + env(safe-area-inset-bottom,0px))}
  .en-ov .in{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
  .en-ov .top{display:flex;align-items:center;gap:10px}.en-ov .top h2{margin:0;font-family:var(--display);font-size:1.15rem;flex:1;min-width:0}
  .en-score{font-family:var(--display);font-size:2.6rem;font-weight:800;color:var(--accent);margin:0}
  .en-link{font-size:.86rem;color:var(--muted)}.en-link a{color:var(--accent);font-weight:600}
  .en-dom-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  .en-dom{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:10px 12px;border-radius:12px;min-height:0}
  .en-dom[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
  .en-dom small{font-weight:500;color:var(--muted);font-size:.76rem}
  .en-dom .en-bar{width:100%}
  .en-e{margin:0;padding:8px 12px;border-left:4px solid var(--s-offer);border-radius:6px;background:var(--accent-soft);font-weight:700;line-height:1.45}
  .en-more>summary{cursor:pointer;font-size:.84rem;color:var(--muted);font-weight:600;list-style:none}.en-more>summary::-webkit-details-marker{display:none}
  .en-more>summary::before{content:"▸ ";}.en-more[open]>summary::before{content:"▾ ";}.en-more p{margin:6px 0 0;font-size:.9rem;line-height:1.5;color:var(--muted)}
  .en-c{margin:0;padding:6px 10px;border-left:4px solid var(--line);border-radius:6px;background:var(--surface-2, rgba(0,0,0,.03));line-height:1.45;font-size:.93rem}
  .en-c b{margin-right:6px}
  .en-c.cg,.en-c.co{color:var(--fg);font-weight:400}
  .en-data{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.92rem}.en-data span{white-space:nowrap}.en-data small{color:var(--muted);font-weight:400;margin-left:2px}
  .en-data span.cg,.en-data span.co{font-weight:600}
  .en-glisse{display:none}
  @media (max-width:700px){.en-paper.pl{overflow-x:auto;-webkit-overflow-scrolling:touch}.en-paper.pl svg{min-width:580px}.en-glisse{display:inline}}
  .en-pick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.88rem}.en-pick b{font-weight:700}
  .en-pick button{background:transparent;color:var(--hero-fg);border-color:rgba(255,255,255,.35);padding:3px 10px;font-size:.8rem;min-height:0}
  .en-paper.pl{max-width:820px}.en-paper.gd{max-width:520px}.en-paper.ch{max-width:700px}
  .en-c.cb{border-color:#3b7dd8;background:rgba(59,125,216,.1)}.en-c.cb b{color:#2a62b0}
  .en-c.co{border-color:#e8782f;background:rgba(232,120,47,.12)}.en-c.co b{color:#c2591a}
  .en-c.cg{border-color:#17a06b;background:rgba(23,160,107,.12)}.en-c.cg b{color:#0e7a5a}
  .en-c.cy{border-color:#d9a400;background:var(--warn-bg);color:var(--warn-fg)}
  .en-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--muted)}.en-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
  .cg{color:#0e7a5a;font-weight:800}.co{color:#c2591a;font-weight:800}.cr{color:#d9433a;font-weight:800}
  [data-theme="dark"] :is(span,b).cg,[data-theme="dark"] .en-c.cg b{color:#3fcf9b}[data-theme="dark"] :is(span,b).co,[data-theme="dark"] .en-c.co b{color:#ffa25c}[data-theme="dark"] .en-c.cb b{color:#86aef0}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]) :is(span,b).cg,:root:not([data-theme="light"]) .en-c.cg b{color:#3fcf9b}:root:not([data-theme="light"]) :is(span,b).co,:root:not([data-theme="light"]) .en-c.co b{color:#ffa25c}:root:not([data-theme="light"]) .en-c.cb b{color:#86aef0}}
  .en-errs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .en-errs li{display:flex;gap:10px;align-items:flex-start;font-size:.92rem;line-height:1.4}
  .en-errs .n{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:.8rem}
  .en-errs .n.ok{background:#0e7a5a}.en-errs .n.ko{background:#d9433a}
  .en-errs .x{display:flex;flex-direction:column;gap:2px}.en-errs .x span{color:var(--muted)}
  .en-soc{border:1px dashed var(--accent);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;background:rgba(255,255,255,.06)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- Dessin technique (SVG) ---------- */
  const INK = "#1b1f24", DIM = "#2f3a45";
  let uid = 0;
  const defs = () => `<defs><marker id="ea" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,2 L10,5 L0,8 z" fill="${DIM}"/></marker>
    <marker id="eg" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="#0e7a5a"/></marker>
    <marker id="eo" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="#d06a1f"/></marker>
    <pattern id="eh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${INK}" stroke-width="1"/></pattern></defs>`;
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 13}" text-anchor="${o.a || "middle"}" fill="${o.c || INK}"${o.w ? ` font-weight="${o.w}"` : ""}${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ""}>${h(s)}</text>`;
  const L = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.c || INK}" stroke-width="${o.w || 1}"${o.d ? ` stroke-dasharray="${o.d}"` : ""}${o.m ? ` marker-start="url(#${o.m})" marker-end="url(#${o.m})"` : ""}${o.me ? ` marker-end="url(#${o.me})"` : ""}/>`;
  const axe = (x1, y1, x2, y2) => L(x1, y1, x2, y2, { d: "14 3 2 3", c: "#6b7785" });
  // cote horizontale de x1 à x2 sur la ligne y ; lignes d'attache depuis ey (hauteur de la pièce)
  const hdim = (x1, x2, y, lab, ey, col = DIM) => (ey != null ? L(x1, ey, x1, y + (y > ey ? 5 : -5), { w: .7, c: DIM }) + L(x2, ey, x2, y + (y > ey ? 5 : -5), { w: .7, c: DIM }) : "") + L(x1, y, x2, y, { w: .8, c: DIM, m: "ea" }) + T((x1 + x2) / 2, y - 5, lab, { fs: 12, c: col, w: col !== DIM ? 700 : 0 });
  const vdim = (y1, y2, x, lab, ex) => (ex != null ? L(ex, y1, x + (x > ex ? 5 : -5), y1, { w: .7, c: DIM }) + L(ex, y2, x + (x > ex ? 5 : -5), y2, { w: .7, c: DIM }) : "") + L(x, y1, x, y2, { w: .8, c: DIM, m: "ea" }) + T(x - 5, (y1 + y2) / 2, lab, { fs: 12, c: DIM, r: -90 });
  // symboles ISO GPS dessinés (pas de police spéciale nécessaire)
  function sym(n, cx, cy, k = 1, c = INK) {
    const P = (d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${1.4 / k}" stroke-linejoin="round" transform="translate(${cx} ${cy}) scale(${k})"/>`;
    const head = (x, y, ang) => `<path d="M0,0 L-5,-2.6 L-5,2.6 z" fill="${c}" transform="translate(${cx} ${cy}) scale(${k}) translate(${x} ${y}) rotate(${ang})"/>`;
    switch (n) {
      case "plan": return P("M-8,4 L-3,-4 L8,-4 L3,4 Z");
      case "rect": return P("M-8,0 L8,0");
      case "circ": return P("M-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0");
      case "cyl": return P("M-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M-9,7 L-3,-7 M3,7 L9,-7");
      case "profL": return P("M-8,4 A8,8 0 0,1 8,4");
      case "profS": return P("M-8,4 A8,8 0 0,1 8,4 Z");
      case "par": return P("M-7,6 L-2,-6 M2,6 L7,-6");
      case "perp": return P("M-8,6 L8,6 M0,6 L0,-7");
      case "inc": return P("M8,6 L-8,6 L6,-6");
      case "pos": return P("M-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M-9,0 L9,0 M0,-9 L0,9");
      case "coax": return P("M-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0 M-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0");
      case "sym": return P("M-4,-4 L4,-4 M-8,0 L8,0 M-4,4 L4,4");
      case "batt": return P("M-6,7 L5,-5") + head(6, -6, -48);
      case "battT": return P("M-9,7 L3,7 M-8,7 L-1,-4 M-2,7 L5,-4") + head(0, -5, -57) + head(6, -5, -57);
    }
    return "";
  }
  const SYMS = [
    { s: "rect", nom: "Rectitude", cat: "forme" }, { s: "plan", nom: "Planéité", cat: "forme" }, { s: "circ", nom: "Circularité", cat: "forme" },
    { s: "cyl", nom: "Cylindricité", cat: "forme" }, { s: "profL", nom: "Forme d'une ligne (profil)", cat: "forme ou position" }, { s: "profS", nom: "Forme d'une surface (profil)", cat: "forme ou position" },
    { s: "par", nom: "Parallélisme", cat: "orientation" }, { s: "perp", nom: "Perpendicularité", cat: "orientation" }, { s: "inc", nom: "Inclinaison", cat: "orientation" },
    { s: "pos", nom: "Localisation (position)", cat: "position" }, { s: "coax", nom: "Coaxialité / concentricité", cat: "position" }, { s: "sym", nom: "Symétrie", cat: "position" },
    { s: "batt", nom: "Battement simple", cat: "battement" }, { s: "battT", nom: "Battement total", cat: "battement" },
  ];
  // cadre de tolérance : cellules = "@sym" | texte (« (M) » et « (E) » dessinés dans un cercle)
  // o.couleurs : colore les cases quand on montre la solution (symbole bleu, tolérance orange, références vertes)
  function frame(x, y, cells, o = {}) {
    const H = 24; let cx = x, out = "", pos = [];
    cells.forEach((c, ci) => {
      const fill = !o.couleurs ? "#fff" : c.startsWith("@") ? "#dbe8fb" : ci === 0 || ci === 1 || cells.length === 1 ? "#fde3cc" : "#d3f0e2";
      let w, inner = "";
      if (c.startsWith("@")) { w = 28; inner = sym(c.slice(1), cx + 14, y + H / 2); }
      else {
        const parts = c.split(/(\([ME]\))/).filter(Boolean);
        w = 10 + parts.reduce((s, p) => s + (/^\([ME]\)$/.test(p) ? 17 : p.length * 7.6), 0);
        let tx = cx + 5;
        for (const p of parts) {
          if (/^\([ME]\)$/.test(p)) { inner += `<circle cx="${tx + 8}" cy="${y + H / 2}" r="7" fill="none" stroke="${INK}" stroke-width="1"/>` + T(tx + 8, y + H / 2 + 4, p[1], { fs: 10 }); tx += 17; }
          else { inner += T(tx, y + H / 2 + 5, p, { fs: 13, a: "start" }); tx += p.length * 7.6; }
        }
      }
      out += `<rect x="${cx}" y="${y}" width="${w}" height="${H}" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>` + inner;
      pos.push([cx, cx + w]); cx += w;
    });
    return { svg: out, pos, x1: cx, H, cy: y + H / 2 };
  }
  // repère de référence : triangle noirci posé sur (x, y), lettre dans un carré dans la direction dir
  function datum(x, y, letter, dir = "down", fill = "#fff") {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir], len = 20;
    const bx = x + d[0] * (len + 11), by = y + d[1] * (len + 11);
    const tri = dir === "down" || dir === "up" ? `M${x - 6},${y} L${x + 6},${y} L${x},${y + d[1] * 9} Z` : `M${x},${y - 6} L${x},${y + 6} L${x + d[0] * 9},${y} Z`;
    return `<path d="${tri}" fill="${INK}"/>` + L(x + d[0] * 9, y + d[1] * 9, x + d[0] * len, y + d[1] * len) + `<rect x="${bx - 11}" y="${by - 11}" width="22" height="22" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>` + T(bx, by + 5, letter, { fs: 13, w: 700 });
  }
  const box = (x, y, s) => `<rect x="${x - s.length * 4 - 4}" y="${y - 13}" width="${s.length * 8 + 8}" height="18" fill="#fff" stroke="${DIM}" stroke-width=".9"/>` + T(x, y, s, { fs: 12, c: DIM });
  const svgWrap = (w, hh, inner, attrs = "") => { const k = "x" + (++uid); return `<svg viewBox="0 0 ${w} ${hh}" ${attrs} xmlns="http://www.w3.org/2000/svg">${defs().replace(/id="(ea|eg|eo|eh)"/g, `id="$1${k}"`)}<rect width="${w}" height="${hh}" fill="#fff"/>${inner.replace(/url\(#(ea|eg|eo|eh)\)/g, `url(#$1${k})`)}</svg>`; };

  /* ---------- 2. Plans à corriger ---------- */
  const PLANS = [
    { id: "arbre", titre: "Arbre de sortie (tourné)", n: 1, w: 640, hh: 400,
      draw() {
        const sh = `<path d="M84,130 L200,130 L200,110 L400,110 L400,130 L536,130 L540,134 L540,206 L536,210 L400,210 L400,230 L200,230 L200,210 L84,210 L80,206 L80,134 Z" fill="none" stroke="${INK}" stroke-width="2"/>`
          + L(84, 130, 84, 210) + L(536, 130, 536, 210) + L(200, 130, 200, 210) + L(400, 130, 400, 210) + axe(60, 170, 560, 170);
        const dims = hdim(80, 200, 262, "30", 210) + hdim(200, 400, 262, "50", 230) + hdim(400, 540, 262, "35", 210) + hdim(80, 540, 300, "115", 266)
          + L(140, 130, 140, 210, { w: .8, c: DIM, m: "ea" }) + T(134, 170, "Ø20 g6", { fs: 12, c: DIM, r: -90 })
          + L(300, 110, 300, 230, { w: .8, c: DIM, m: "ea" }) + T(294, 170, "30", { fs: 12, c: DIM, r: -90 })
          + L(470, 130, 470, 210, { w: .8, c: DIM, m: "ea" }) + T(464, 170, "Ø20 H7", { fs: 12, c: DIM, r: -90 })
          + T(560, 128, "2× 1×45°", { fs: 12, c: DIM, a: "start" }) + L(558, 124, 540, 132, { w: .7, c: DIM });
        const f = frame(250, 50, ["@coax", "Ø0,02", "A"]);
        const lead = L(300, 74, 330, 108, { w: .8, c: DIM, me: "ea" });
        const cart = `<rect x="360" y="318" width="270" height="74" fill="none" stroke="${INK}" stroke-width="1.4"/>` + L(360, 343, 630, 343) + L(360, 368, 630, 368)
          + T(372, 336, "Arbre de sortie  ·  Plan n° 1024-A", { a: "start", w: 700 }) + T(372, 361, "Échelle 1:1  ·  Tol. gén. ISO 2768-m", { a: "start", fs: 12 }) + T(372, 386, "Matière : —", { a: "start", fs: 12 });
        return sh + dims + f.svg + lead + cart;
      },
      err: [
        { x: 310, y: 294, t: "Cote surabondante", e: "115 = 30 + 50 + 35 : la longueur est cotée deux fois.", c: "Supprimer une cote, ou la mettre entre parenthèses (cote auxiliaire)." },
        { x: 300, y: 170, t: "Symbole Ø manquant", e: "« 30 » sans Ø : on ne sait pas que c'est un diamètre.", c: "Écrire Ø30." },
        { x: 470, y: 170, t: "H7 sur un arbre", e: "Majuscule = alésage. Ici c'est un arbre.", c: "Une lettre minuscule : h6, g6 ou k6 selon l'ajustement." },
        { x: 336, y: 62, t: "Référence A inexistante", e: "Le cadre cite A, mais aucun repère A n'est posé.", c: "Poser le triangle A sur une portée Ø20." },
        { x: 410, y: 382, t: "Matière non indiquée", e: "Sans matière, on ne peut ni chiffrer ni fabriquer.", c: "Indiquer la matière (et le traitement s'il y en a un)." },
      ] },
    { id: "equerre", titre: "Équerre en tôle pliée", n: 2, w: 640, hh: 400,
      draw() {
        const prof = `<path d="M80,50 L100,50 L100,60 L90,60 L90,290 L280,290 L280,300 L80,300 Z" fill="url(#eh)" stroke="${INK}" stroke-width="2"/>`;
        const dims = vdim(50, 300, 46, "50 ±0,02", 80) + hdim(80, 280, 334, "40", 300) + hdim(80, 100, 30, "4", 50)
          + T(150, 250, "R0", { fs: 12, c: DIM, a: "start" }) + L(148, 246, 93, 287, { w: .7, c: DIM, me: "ea" }) + T(180, 120, "Vue de profil", { fs: 12, c: "#6b7785" });
        const dessus = `<rect x="350" y="80" width="10" height="200" fill="url(#eh)" stroke="${INK}" stroke-width="1.6"/><rect x="360" y="80" width="200" height="200" fill="none" stroke="${INK}" stroke-width="2"/>`
          + L(360, 80, 360, 280, { d: "6 4", c: "#6b7785" }) + `<circle cx="378" cy="180" r="15" fill="none" stroke="${INK}" stroke-width="1.6"/>` + axe(355, 180, 400, 180) + axe(378, 158, 378, 202)
          + hdim(360, 378, 56, "3,6", 80) + T(410, 150, "Ø6", { fs: 12, c: DIM, a: "start" }) + L(408, 146, 388, 170, { w: .7, c: DIM, me: "ea" }) + T(460, 300, "Vue de dessus", { fs: 12, c: "#6b7785" });
        const cart = `<rect x="360" y="318" width="270" height="74" fill="none" stroke="${INK}" stroke-width="1.4"/>` + L(360, 343, 630, 343) + L(360, 368, 630, 368)
          + T(372, 336, "Équerre de fixation", { a: "start", w: 700 }) + T(372, 361, "Matière : Alu 5754 H111", { a: "start", fs: 12 }) + T(372, 386, "Épaisseur : —   ·   Tol. gén. ISO 2768-m", { a: "start", fs: 12 });
        return prof + dims + dessus + cart;
      },
      err: [
        { x: 92, y: 288, t: "Rayon de pliage nul", e: "Un rayon nul fait fissurer la tôle.", c: "Rayon intérieur d'environ 1 à 2 × e (outil standard du plieur)." },
        { x: 46, y: 175, t: "Tolérance irréaliste", e: "±0,02 à travers un pli est impossible (environ ±0,2 par pli).", c: "Mettre ±0,2 à ±0,3." },
        { x: 90, y: 38, t: "Bord trop court", e: "4 mm, c'est trop court pour porter sur le vé de la plieuse.", c: "Au moins 3 × e + R environ, ou supprimer ce bord." },
        { x: 378, y: 180, t: "Trou trop près du pli", e: "À 1 mm du pli, le trou va ovaliser au pliage.", c: "Bord du trou à 2 × e + R du pli, ou percer après pliage." },
        { x: 470, y: 386, t: "Épaisseur non indiquée", e: "Sans épaisseur : ni tôle, ni rayon, ni développé.", c: "Indiquer l'épaisseur dans le cartouche." },
      ] },
    { id: "boitier", titre: "Boîtier injecté, vue en coupe", n: 2, w: 640, hh: 400,
      draw() {
        const hat = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="url(#eh)" stroke="${INK}" stroke-width="1.8"/>`;
        const coupe = hat(80, 80, 12, 220) + hat(80, 288, 480, 12) + hat(548, 80, 12, 60) + hat(548, 170, 12, 130) + hat(250, 180, 12, 108) + hat(380, 200, 80, 88);
        const notes = T(320, 40, "↑ Sens d'ouverture du moule", { fs: 12, c: "#6b7785" }) + T(140, 140, "Dépouille : 0°", { fs: 12, c: DIM, a: "start" }) + L(138, 136, 94, 160, { w: .7, c: DIM, me: "ea" })
          + T(286, 170, "Nervure ép. 2", { fs: 12, c: DIM, a: "start" }) + T(470, 130, "Trou Ø5 traversant", { fs: 12, c: DIM, a: "end" }) + L(474, 128, 546, 152, { w: .7, c: DIM, me: "ea" })
          + T(420, 190, "Bossage plein", { fs: 12, c: DIM }) + vdim(180, 288, 236, "18", 250);
        const cart = `<rect x="80" y="318" width="480" height="50" fill="none" stroke="${INK}" stroke-width="1.4"/>` + L(80, 343, 560, 343)
          + T(92, 336, "Boîtier capteur  ·  Coupe A-A", { a: "start", w: 700 }) + T(92, 361, "Matière : PC  ·  Épaisseur nominale 2 mm  ·  Tol. ISO 20457", { a: "start", fs: 12 });
        return coupe + notes + cart;
      },
      err: [
        { x: 86, y: 180, t: "Pas de dépouille", e: "Des parois à 0° frottent et accrochent au démoulage.", c: "0,5 à 1° au minimum." },
        { x: 256, y: 232, t: "Nervure trop épaisse et trop haute", e: "2 mm comme la paroi et 18 mm de haut : retassure assurée.", c: "Environ 1,2 mm d'épaisseur, 6 mm de haut au plus, avec dépouille." },
        { x: 420, y: 245, t: "Zone massive", e: "Le bossage plein refroidit lentement : retassures et vides.", c: "Évider le bossage (épaisseur constante, relié par des nervures)." },
        { x: 95, y: 285, t: "Angles intérieurs vifs", e: "Concentration de contraintes et mauvais écoulement de la matière.", c: "Rayon intérieur ≈ 0,5 × e, extérieur ≈ 1,5 × e." },
        { x: 554, y: 155, t: "Contre-dépouille", e: "Trou perpendiculaire au sens d'ouverture : la pièce ne sort pas du moule.", c: "Tiroir (moule plus cher) ou trou ouvert vers le haut." },
      ] },
    { id: "platine", titre: "Platine fraisée cotée en ISO GPS", n: 3, w: 640, hh: 420,
      draw() {
        const dessus = `<rect x="100" y="80" width="400" height="220" fill="none" stroke="${INK}" stroke-width="2"/>` + [[140, 120], [460, 120], [140, 260], [460, 260]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${INK}" stroke-width="1.6"/>` + axe(x - 18, y, x + 18, y) + axe(x, y - 18, x, y + 18)).join("");
        const cote = hdim(100, 140, 60, "10 ±0,1", 80) + T(160, 104, "4× Ø6 H8", { fs: 12, c: DIM, a: "start" });
        const cote2 = box(300, 74, "80") + L(140, 70, 280, 70, { w: .7, c: DIM, me: "ea" }) + L(320, 70, 460, 70, { w: .7, c: DIM, me: "ea" });
        const f1 = frame(510, 98, ["@pos", "0,1", "A", "B"]), l1 = L(510, 110, 472, 118, { w: .8, c: DIM, me: "ea" });
        const f3 = frame(520, 220, ["@perp", "0,05", "C"]), l3 = L(520, 232, 502, 240, { w: .8, c: DIM, me: "ea" });
        const cote3 = datum(100, 190, "B", "left");
        const profil = `<rect x="100" y="330" width="400" height="20" fill="none" stroke="${INK}" stroke-width="2"/>` + datum(200, 350, "A", "down");
        const f2 = frame(360, 372, ["@plan", "0,05", "A"]), l2 = L(400, 372, 430, 332, { w: .8, c: DIM, me: "ea" });
        return dessus + cote + cote2 + f1.svg + l1 + f3.svg + l3 + cote3 + profil + f2.svg + l2;
      },
      err: [
        { x: 437, y: 384, t: "Planéité avec une référence", e: "Une tolérance de forme ne prend jamais de référence.", c: "Enlever le A (ou faire un parallélisme par rapport à A)." },
        { x: 552, y: 110, t: "Ø manquant devant 0,1", e: "Sans Ø, la zone est entre 2 plans au lieu d'un cylindre.", c: "Écrire Ø0,1." },
        { x: 120, y: 55, t: "Position cotée avec ±", e: "Avec un cadre de position, les cotes de placement sont exactes.", c: "Encadrer la cote 10, sans ±." },
        { x: 597, y: 232, t: "Référence C inexistante", e: "Le cadre cite C, qui n'est défini nulle part.", c: "Poser le repère C, ou citer une référence qui existe." },
      ] },
  ];

  /* ---------- 3. Lire une cotation géométrique ---------- */
  function tpl(kind) {
    const hat = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="url(#eh)" stroke="${INK}" stroke-width="1.6"/>`;
    switch (kind) {
      case "plaque": return { s: `<rect x="60" y="110" width="240" height="40" fill="none" stroke="${INK}" stroke-width="2"/>`, a: [220, 110] };
      case "bloc": return { s: hat(80, 90, 80, 90) + hat(200, 90, 80, 90) + axe(180, 78, 180, 192) + L(160, 90, 160, 180, { w: 2 }) + L(200, 90, 200, 180, { w: 2 }) + hdim(160, 200, 70, "Ø12 H7", 90), a: [200, 64] };
      case "arbre": return { s: `<path d="M60,95 L130,95 L130,80 L250,80 L250,95 L320,95 L320,135 L250,135 L250,150 L130,150 L130,135 L60,135 Z" fill="none" stroke="${INK}" stroke-width="2"/>` + L(130, 95, 130, 135) + L(250, 95, 250, 135) + axe(45, 115, 335, 115), a: [190, 80] };
      case "trous": return { s: `<rect x="60" y="60" width="240" height="130" fill="none" stroke="${INK}" stroke-width="2"/>` + [[100, 95], [260, 95], [100, 155], [260, 155]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${INK}" stroke-width="1.5"/>` + axe(x - 14, y, x + 14, y) + axe(x, y - 14, x, y + 14)).join("") + box(180, 125, "160") + box(320, 129, "60") + T(112, 80, "4× Ø8 +0,2/0", { fs: 12, c: DIM, a: "start" }), a: [266, 90] };
      case "courbe": return { s: `<path d="M60,170 L60,120 Q180,40 300,120 L300,170 Z" fill="none" stroke="${INK}" stroke-width="2"/>`, a: [200, 82] };
      case "rainure": return { s: `<path d="M60,90 L160,90 L160,130 L200,130 L200,90 L300,90 L300,170 L60,170 Z" fill="none" stroke="${INK}" stroke-width="2"/>` + axe(180, 76, 180, 182) + hdim(160, 200, 74, "12 H9", 90) + hdim(60, 300, 196, "60", 170), a: [200, 68] };
    }
  }
  // géométrie des modèles, pour colorer la solution (orange = élément tolérancé, vert = références)
  const G = {
    plaqueH: "M60,110 L300,110", plaqueB: "M60,150 L300,150",
    blocAxe: "M180,84 L180,186", blocB: "M80,180 L160,180 M200,180 L280,180",
    arbreM: "M130,80 L250,80 M130,150 L250,150", arbreMAxe: "M130,115 L250,115", arbreG: "M60,95 L130,95 M60,135 L130,135 M60,115 L130,115", arbreD: "M250,95 L320,95 M250,135 L320,135 M250,115 L320,115",
    trous: [[100, 95], [260, 95], [100, 155], [260, 155]].map(([x, y]) => `M${x - 9},${y} a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0`).join(" "), trousB: "M60,60 L60,190", trousC: "M60,190 L300,190",
    courbe: "M60,120 Q180,40 300,120", courbeA: "M60,170 L300,170", courbeB: "M60,120 L60,170",
    rainure: "M160,90 L160,130 M200,90 L200,130", rainureA: "M60,90 L60,170 M300,90 L300,170",
  };
  const GDT = [
    { id: "g1", n: 1, nom: "Planéité", t: "plaque", f: ["@plan", "0,05"], fx: 150, fy: 40, dat: [], hl: [G.plaqueH], hd: [],
      r: { dit: "La face du dessus doit être plane.", zone: "Entre 2 plans parallèles écartés de 0,05 mm.", ref: "Aucune : c'est une tolérance de forme.", ctrl: "Comparateur promené sur la face, ou machine à mesurer (MMT).", piege: "Elle ne dit rien sur l'épaisseur de la plaque." } },
    { id: "g2", n: 1, nom: "Parallélisme", t: "plaque", f: ["@par", "0,05", "A"], fx: 150, fy: 40, dat: [[120, 150, "A", "down"]], hl: [G.plaqueH], hd: [G.plaqueB],
      r: { dit: "Le dessus doit être parallèle au dessous.", zone: "2 plans parallèles à A, écartés de 0,05 mm.", ref: "A = la face d'appui du dessous.", ctrl: "Pièce posée sur A, comparateur promené sur le dessus.", piege: "Il limite aussi la planéité du dessus, mais pas l'épaisseur." } },
    { id: "g3", n: 2, nom: "Perpendicularité d'un axe", t: "bloc", f: ["@perp", "Ø0,02", "A"], fx: 210, fy: 52, dat: [[240, 180, "A", "down"]], hl: [G.blocAxe], hd: [G.blocB],
      r: { dit: "L'axe du trou doit être perpendiculaire à A.", zone: "Un cylindre de Ø0,02 : le Ø veut dire zone cylindrique.", ref: "A = la face d'appui du dessous.", ctrl: "Broche dans le trou et comparateur, ou MMT.", piege: "Le cadre est accroché à la cote Ø12 : on tolère l'axe, pas la surface du trou." } },
    { id: "g4", n: 2, nom: "Localisation avec Ⓜ", t: "trous", f: ["@pos", "Ø0,1(M)", "A", "B", "C"], fx: 150, fy: 18, dat: [[60, 125, "B", "left"], [180, 190, "C", "down"]], hl: [G.trous], hd: [G.trousB, G.trousC],
      r: { dit: "Chaque trou doit être à sa place exacte (cotes encadrées 160 et 60).", zone: "Un cylindre Ø0,1 autour de la position exacte, plus un bonus si le trou est plus grand que Ø8 (Ⓜ).", ref: "Pièce plaquée sur A (dessous), orientée par B, arrêtée par C.", ctrl: "Calibre à 4 piges, ou MMT.", piege: "Trou à Ø8,2 → zone de Ø0,3 (0,1 + 0,2 de bonus)." } },
    { id: "g5", n: 2, nom: "Coaxialité", t: "arbre", f: ["@coax", "Ø0,03", "A"], fx: 160, fy: 30, dat: [[95, 135, "A", "down"]], hl: [G.arbreM, G.arbreMAxe], hd: [G.arbreG],
      r: { dit: "La grande portée doit être dans l'axe de la portée A.", zone: "Un cylindre Ø0,03 centré sur l'axe A.", ref: "A = l'axe de la portée de gauche.", ctrl: "MMT (on calcule les axes).", piege: "Ce n'est pas un battement : le battement compte aussi le défaut de forme." } },
    { id: "g6", n: 2, nom: "Battement radial", t: "arbre", f: ["@batt", "0,02", "A-B"], fx: 160, fy: 30, dat: [[95, 135, "A", "down"], [285, 135, "B", "down"]], hl: [G.arbreM], hd: [G.arbreG, G.arbreD],
      r: { dit: "En tournant, la grande portée ne doit pas battre de plus de 0,02.", zone: "Dans chaque section : entre 2 cercles concentriques écartés de 0,02.", ref: "A-B = l'axe commun des deux portées.", ctrl: "Arbre sur 2 vés, un tour, comparateur : maxi − mini ≤ 0,02.", piege: "A-B est UNE référence commune, pas deux références." } },
    { id: "g7", n: 2, nom: "Exigence de l'enveloppe", t: "arbre", f: ["Ø40 h7 (E)"], fx: 140, fy: 30, dat: [], hl: [G.arbreM], hd: [],
      r: { dit: "Ø40 h7, et la portée doit en plus passer dans un cylindre parfait de Ø40.", zone: "La taille h7, avec une forme limitée par cette enveloppe parfaite.", ref: "Aucune.", ctrl: "Bague calibre Ø40, plus un micromètre pour le mini.", piege: "Sans Ⓔ, en ISO, Ø40 h7 ne limite pas la forme (l'arbre peut être banané)." } },
    { id: "g8", n: 3, nom: "Cylindricité", t: "arbre", f: ["@cyl", "0,01"], fx: 160, fy: 30, dat: [], hl: [G.arbreM], hd: [],
      r: { dit: "La grande portée doit être un cylindre presque parfait.", zone: "Entre 2 cylindres coaxiaux dont les rayons diffèrent de 0,01.", ref: "Aucune : c'est une forme pure.", ctrl: "Machine de mesure de forme, ou MMT.", piege: "Très serré : seulement si la fonction l'exige (roulement de précision, joint)." } },
    { id: "g9", n: 3, nom: "Profil de surface", t: "courbe", f: ["@profS", "0,2", "A", "B", "C"], fx: 150, fy: 22, dat: [[120, 170, "A", "down"], [60, 145, "B", "left"]], hl: [G.courbe], hd: [G.courbeA, G.courbeB],
      r: { dit: "La surface courbe doit suivre le modèle CAO, à sa place.", zone: "±0,1 de part et d'autre de la surface théorique (0,2 au total).", ref: "A, B, C : on contrôle forme + orientation + position.", ctrl: "MMT ou scan 3D comparé au modèle.", piege: "Le repère C n'est pas posé sur le plan : il faut le signaler !" } },
    { id: "g10", n: 3, nom: "Symétrie d'une rainure", t: "rainure", f: ["@sym", "0,05", "A"], fx: 210, fy: 30, dat: [[180, 210, "A", "down"]], hl: [G.rainure], hd: [G.rainureA],
      r: { dit: "La rainure doit être centrée sur la pièce.", zone: "2 plans écartés de 0,05, centrés sur le plan médian A.", ref: "A = le plan médian de la largeur 60.", ctrl: "Cale dans la rainure, mesure des deux côtés.", piege: "A est un plan médian (accroché à la cote 60), pas une face." } },
  ];
  const surligne = (ds, c) => ds.map((d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`).join("");
  function gdtSVG(g, rev) {
    const t = tpl(g.t), f = frame(g.fx, g.fy, g.f, { couleurs: rev });
    const lead = L(f.x1 - 6, g.fy + f.H, t.a[0], t.a[1], { w: .8, c: DIM, me: "ea" });
    return svgWrap(360, 230, (rev ? surligne(g.hd, "#17a06b") + surligne(g.hl, "#e8782f") : "") + t.s + g.dat.map((d) => datum(...d, rev ? "#d3f0e2" : "#fff")).join("") + f.svg + lead);
  }

  /* ---------- 4. Chaînes de cotes ---------- */
  const FITS = { 1: [10, 18], 2: [18, 30], 3: [30, 50] };
  const ECARTS = { // µm : [ei, es] (arbres) ou [EI, ES] (alésages)
    1: { H7: [0, 18], g6: [-17, -6], h6: [-11, 0], k6: [1, 12], p6: [18, 29], f7: [-34, -16] },
    2: { H7: [0, 21], g6: [-20, -7], h6: [-13, 0], k6: [2, 15], p6: [22, 35], f7: [-41, -20] },
    3: { H7: [0, 25], g6: [-25, -9], h6: [-16, 0], k6: [2, 18], p6: [26, 42], f7: [-50, -25] },
  };
  const tol = (d) => (d.sup === -d.inf ? `±${nf(d.sup)}` : `${d.sup >= 0 ? "+" : "−"}${nf(Math.abs(d.sup))} / ${d.inf >= 0 ? "+" : "−"}${nf(Math.abs(d.inf))}`);
  const lab = (d) => `${d.n} = ${nf(d.v, 2)} ${tol(d)}`;
  function genCh(type) {
    if (type === "empil" || type === "stat") {
      const B = rnd(8, 24), C = rnd(6, 20), Dd = rnd(5, 14), Jn = pick([0.2, 0.3, 0.4, 0.5]);
      const dims = [
        { n: "A", v: B + C + Dd + Jn, sup: pick([0.1, 0.15, 0.2]), sgn: 1, role: "carter" },
        { n: "B", v: B, sup: pick([0.05, 0.1]), sgn: -1, role: "pièce 1" },
        { n: "C", v: C, sup: pick([0.05, 0.1]), sgn: -1, role: "pièce 2" },
        { n: "D", v: Dd, sup: pick([0.03, 0.05]), sgn: -1, role: "pièce 3" },
      ].map((d) => ({ ...d, inf: -d.sup }));
      return { type, dims, ...calc(dims) };
    }
    if (type === "circlip") {
      const B = pick([8, 9, 10, 12]), C = rnd(4, 12), Jn = pick([0.1, 0.2, 0.3]);
      const dims = [
        { n: "A", v: B + C + Jn, sup: 0.1, inf: 0, sgn: 1, role: "épaulement → gorge" },
        { n: "B", v: B, sup: 0, inf: -0.12, sgn: -1, role: "roulement" },
        { n: "C", v: C, sup: 0.05, inf: -0.05, sgn: -1, role: "entretoise" },
      ];
      return { type, dims, e: pick([1, 1.2, 1.5]), ...calc(dims) };
    }
    // ajustement
    const r = rnd(1, 3), Dn = pick({ 1: [12, 16], 2: [20, 25], 3: [35, 40] }[r]), arb = pick(["g6", "h6", "k6", "p6", "f7"]);
    const [EI, ES] = ECARTS[r].H7, [ei, es] = ECARTS[r][arb];
    const jmin = EI - es, jmax = ES - ei;
    return { type, Dn, arb, EI, ES, ei, es, jmin, jmax, genre: jmin >= 0 ? "jeu" : jmax <= 0 ? "serre" : "incertain" };
  }
  function calc(dims) {
    let jmin = 0, jmax = 0, it = 0, it2 = 0;
    for (const d of dims) { if (d.sgn > 0) { jmax += d.v + d.sup; jmin += d.v + d.inf; } else { jmax -= d.v + d.inf; jmin -= d.v + d.sup; } const i = d.sup - d.inf; it += i; it2 += i * i; }
    return { jmin: Math.round(jmin * 1000) / 1000, jmax: Math.round(jmax * 1000) / 1000, it: Math.round(it * 1000) / 1000, itq: Math.round(Math.sqrt(it2) * 1000) / 1000 };
  }
  function chSVG(ex, sol) {
    if (ex.type === "ajust") {
      const k = 2, top = Math.max(ex.ES, ex.es, 0), bas = Math.max(0, -Math.min(ex.EI, ex.ei)), y0 = 36 + top * k, Y = (um) => y0 - um * k, yb = y0 + bas * k + 34;
      const bar = (x, a, b, c, t) => `<rect x="${x}" y="${Y(b)}" width="80" height="${Math.max(2, (b - a) * k)}" fill="${c}" opacity=".85"/>` + T(x + 40, Y(b) - 7, t, { fs: 15, w: 800 });
      return svgWrap(380, yb + 12, L(20, y0, 360, y0, { w: 1.4 }) + T(24, y0 + 16, "ligne zéro = Ø" + ex.Dn, { fs: 12, a: "start", c: "#6b7785" })
        + bar(130, ex.EI, ex.ES, "#4f7fd6", "H7") + bar(250, ex.ei, ex.es, "#e8782f", ex.arb)
        + T(170, yb, `${sg(ex.EI)} / ${sg(ex.ES)} µm`, { fs: 13 }) + T(290, yb, `${sg(ex.ei)} / ${sg(ex.es)} µm`, { fs: 13 }));
    }
    // schéma compact et lisible sur téléphone : sur le dessin, seulement les lettres ; les valeurs sont dans la liste en dessous
    const circ = ex.type === "circlip", A0 = ex.dims[0], x0 = circ ? 70 : 40, span = circ ? 250 : 300;
    const sc = span / (circ ? A0.v + ex.e + 4 : A0.v), X = (mm) => x0 + mm * sc, colOf = (d) => (sol ? (d.sgn > 0 ? "#0e7a5a" : "#c2591a") : DIM);
    const let_ = (x1, x2, y, d, ey) => hdim(x1, x2, y, d.n, ey, colOf(d)).replace('font-size="12"', 'font-size="15" font-weight="800"');
    let s = "", yb;
    if (circ) {
      const [A, B, C] = ex.dims, xe = X(A.v + ex.e + 4);
      s += `<path d="M${x0 - 46},118 L${x0},118 L${x0},150 L${X(A.v)},150 L${X(A.v)},143 L${X(A.v + ex.e)},143 L${X(A.v + ex.e)},150 L${xe},150" fill="none" stroke="${INK}" stroke-width="2"/>` + axe(x0 - 56, 196, xe + 6, 196);
      s += L(x0 - 46, 118, x0 - 46, 196, { w: 1 }) + T(x0 - 24, 140, "arbre", { fs: 11, c: "#6b7785" });
      s += `<rect x="${X(0)}" y="92" width="${B.v * sc}" height="58" fill="#dfe8f3" stroke="${INK}" stroke-width="1.6"/>` + L(X(0), 92, X(B.v), 150, { w: .8 }) + L(X(0), 150, X(B.v), 92, { w: .8 });
      s += `<rect x="${X(B.v)}" y="120" width="${C.v * sc}" height="30" fill="url(#eh)" stroke="${INK}" stroke-width="1.6"/>`;
      s += `<rect x="${X(A.v)}" y="124" width="${Math.max(3, ex.e * sc)}" height="20" fill="${INK}"/>` + T(X(A.v + ex.e) + 4, 116, "circlip", { fs: 12, c: "#6b7785", a: "start" });
      s += T((X(B.v + C.v) + X(A.v)) / 2, 112, "J", { fs: 16, w: 800, c: "#d9433a" }) + L((X(B.v + C.v) + X(A.v)) / 2, 116, (X(B.v + C.v) + X(A.v)) / 2, 134, { w: .8, c: "#d9433a", me: "ea" });
      s += let_(X(0), X(B.v), 72, B, 92) + let_(X(B.v), X(B.v + C.v), 72, C, 120) + let_(X(0), X(A.v), 232, A, 150);
      yb = 244;
    } else {
      const parts = ex.dims.slice(1), hs = [70, 50, 62], cols = ["#dfe8f3", "#e3f1e8", "#f6ead9"];
      s += `<path d="M${x0 - 16},60 L${x0},60 L${x0},150 L${X(A0.v)},150 L${X(A0.v)},60 L${X(A0.v) + 16},60 L${X(A0.v) + 16},166 L${x0 - 16},166 Z" fill="url(#eh)" stroke="${INK}" stroke-width="1.8"/>`;
      let cur = 0;
      parts.forEach((d, i) => { s += `<rect x="${X(cur)}" y="${150 - hs[i]}" width="${d.v * sc}" height="${hs[i]}" fill="${cols[i]}" stroke="${INK}" stroke-width="1.6"/>`; cur += d.v; });
      s += T(X(cur) + (X(A0.v) - X(cur)) / 2, 48, "J", { fs: 16, w: 800, c: "#d9433a" }) + L(X(cur) + (X(A0.v) - X(cur)) / 2, 52, X(cur) + (X(A0.v) - X(cur)) / 2, 76, { w: .8, c: "#d9433a", me: "ea" });
      let c2 = 0; parts.forEach((d) => { s += let_(X(c2), X(c2 + d.v), 194, d, 150); c2 += d.v; });
      s += let_(X(0), X(A0.v), 230, A0, 166);
      yb = 242;
    }
    if (sol) {
      const yA = yb + 22, yN = yb + 46; let cur = 0;
      s += L(X(0), yA, X(A0.v), yA, { c: "#0e7a5a", w: 2.4, me: "eg" }) + T(X(A0.v / 2), yA - 6, "+" + A0.n, { fs: 14, w: 800, c: "#0e7a5a" });
      ex.dims.slice(1).forEach((d) => { s += L(X(cur + d.v), yN, X(cur), yN, { c: "#d06a1f", w: 2.4, me: "eo" }) + T(X(cur + d.v / 2), yN + 17, "−" + d.n, { fs: 14, w: 800, c: "#d06a1f" }); cur += d.v; });
      yb += 74;
    }
    return svgWrap(380, yb + 8, s);
  }
  // les valeurs de l'exercice, en liste lisible (colorées dans la correction)
  function chData(ex, sol) {
    if (ex.type === "ajust") return "";
    return `<div class="en-data">${ex.dims.map((d) => `<span${sol ? ` class="${d.sgn > 0 ? "cg" : "co"}"` : ""}><b>${d.n}</b> = ${nf(d.v, 2)} ${tol(d)} <small>${h(d.role)}</small></span>`).join("")}${ex.type === "circlip" ? `<span><b>circlip</b> épaisseur ${nf(ex.e, 2)}</span>` : ""}</div>`;
  }
  function chCorr(ex) {
    if (ex.type === "ajust") {
      const g = { jeu: "<b class=\"cg\">avec jeu</b> (glissant)", serre: "<b class=\"cr\">serré</b> (montage à la presse)", incertain: "<b class=\"co\">incertain</b> (jeu ou serrage selon les pièces)" }[ex.genre];
      return `<p class="en-c cb"><b>Jeu maxi</b>alésage maxi − arbre mini = ${sg(ex.ES)} − (${sg(ex.ei)}) = <b>${sg(ex.jmax)} µm</b></p>
        <p class="en-c co"><b>Jeu mini</b>alésage mini − arbre maxi = ${sg(ex.EI)} − (${sg(ex.es)}) = <b>${sg(ex.jmin)} µm</b>${ex.jmin < 0 ? " (négatif = serrage)" : ""}</p>
        <p class="en-c">Ajustement ${g}.</p>`;
    }
    const pos = ex.dims.filter((d) => d.sgn > 0), neg = ex.dims.filter((d) => d.sgn < 0);
    const P_ = (t) => `<span class="cg">${t}</span>`, N_ = (t) => `<span class="co">${t}</span>`;
    const mx = (d) => nf(d.v + d.sup), mn = (d) => nf(d.v + d.inf);
    let o = `<div class="en-leg"><span><i style="background:#0e7a5a"></i>dans le sens de J : +</span><span><i style="background:#d06a1f"></i>sens inverse : −</span><span><i style="background:#d9433a"></i>le jeu J</span></div>
      <p class="en-c"><b>Chaîne</b><span class="cr">J</span> = ${pos.map((d) => P_("+" + d.n)).join(" ")} ${neg.map((d) => N_("− " + d.n)).join(" ")}</p>
      <p class="en-c cb"><b>J maxi</b>${pos.map((d) => P_(d.n + " maxi")).join(" + ")} − (${neg.map((d) => N_(d.n + " mini")).join(" + ")}) = ${pos.map((d) => P_(mx(d))).join(" + ")} − (${neg.map((d) => N_(mn(d))).join(" + ")}) = <b>${nf(ex.jmax)}</b></p>
      <p class="en-c cb"><b>J mini</b>${pos.map((d) => P_(d.n + " mini")).join(" + ")} − (${neg.map((d) => N_(d.n + " maxi")).join(" + ")}) = ${pos.map((d) => P_(mn(d))).join(" + ")} − (${neg.map((d) => N_(mx(d))).join(" + ")}) = <b>${nf(ex.jmin)}</b></p>
      <p class="en-c"><b>Contrôle</b>J maxi − J mini = ${nf(ex.it)} = somme des tolérances.</p>`;
    if (ex.jmin < 0) o += `<p class="en-c cy"><b>⚠</b>J mini est négatif : au pire, les pièces ne rentrent pas. Il faut resserrer les tolérances ou agrandir A.</p>`;
    if (ex.type === "circlip") o += `<p class="en-c cy"><b>⚠</b>L'épaisseur du circlip (${nf(ex.e, 2)}) n'entre PAS dans la chaîne : J s'arrête au flanc de la gorge.</p>`;
    if (ex.type === "stat") o += `<p class="en-c cg"><b>Statistique</b>IT(J) = √(somme des IT²) = <b>${nf(ex.itq)}</b> au lieu de ${nf(ex.it)} : on peut élargir les tolérances si les procédés sont maîtrisés.</p>`;
    return o;
  }
  const CH_TYPES = [
    { id: "empil", nom: "Empilage", n: 1, q: "Calcule le jeu J mini et maxi (au pire des cas)." },
    { id: "circlip", nom: "Arrêt par circlip", n: 2, q: "Calcule le jeu axial J mini et maxi entre l'entretoise et le circlip." },
    { id: "ajust", nom: "Ajustement ISO", n: 2, q: "Calcule le jeu mini et maxi en µm, et dis quel type d'ajustement c'est." },
    { id: "stat", nom: "Pire cas + statistique", n: 3, q: "Calcule Jmini, Jmaxi, puis l'IT de J en méthode statistique." },
  ];

  /* ---------- 3D : carter et pièces de l'exercice d'empilage ---------- */
  function vue3D(canvas, ex, chaine) {
    const ctx = canvas.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const A = ex.dims[0].v, P = ex.dims.slice(1), Dp = 20, hs = [14, 10, 12], cols = ["#9db8d9", "#9ccbb0", "#e5c79a"];
    const boxes = [
      { b: [-4, 0, -3, A + 4, Dp, 0], c: "#b9c2ca" }, { b: [-4, 0, 0, 0, Dp, 18], c: "#b9c2ca" }, { b: [A, 0, 0, A + 4, Dp, 18], c: "#b9c2ca" },
    ];
    let cur = 0; P.forEach((d, i) => { boxes.push({ b: [cur, 3, 0, cur + d.v, Dp - 3, hs[i]], c: cols[i], t: d.n }); cur += d.v; });
    let yaw = -0.6, pitch = 0.55;
    const cx = A / 2, cy = Dp / 2, cz = 6;
    function proj(p, W, H, s) {
      const x = p[0] - cx, y = p[1] - cy, z = p[2] - cz;
      const x1 = x * Math.cos(yaw) - y * Math.sin(yaw), y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
      const y2 = y1 * Math.cos(pitch) - z * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z * Math.cos(pitch);
      return [W / 2 + x1 * s, H / 2 - z2 * s * 1 + 10, y2];
    }
    function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }
    function draw() {
      const W = canvas.clientWidth, H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const s = Math.min(W / (A + 20), H / 40) * 0.95, faces = [];
      for (const bx of boxes) {
        const [x0, y0, z0, x1, y1, z1] = bx.b, v = (x, y, z) => proj([x, y, z], W, H, s);
        const F = [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 1], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], .82], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], .7],
          [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], .74], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], .9], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], .6]];
        for (const f of F) { const pts = f.slice(0, 4).map((p) => v(...p)); faces.push({ pts, z: pts.reduce((a, p) => a + p[2], 0) / 4, c: shade(bx.c, f[4]) }); }
      }
      faces.sort((a, b) => a.z - b.z);
      for (const f of faces) { ctx.beginPath(); f.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = f.c; ctx.fill(); ctx.strokeStyle = "rgba(20,30,40,.55)"; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.font = "700 14px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#10202c";
      for (const bx of boxes) if (bx.t) { const [x0, y0, , x1, y1, z1] = bx.b, p = proj([(x0 + x1) / 2, (y0 + y1) / 2, z1 + 1.5], W, H, s); ctx.fillText(bx.t, p[0], p[1]); }
      const pj = proj([cur + (A - cur) / 2, Dp / 2, 6], W, H, s); ctx.fillStyle = "#d9433a"; ctx.fillText("J", pj[0], pj[1]);
      if (chaine()) {
        const arrow = (a, b, col, t) => { const p = proj(a, W, H, s), q = proj(b, W, H, s); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); const an = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] - 10 * Math.cos(an - .4), q[1] - 10 * Math.sin(an - .4)); ctx.lineTo(q[0] - 10 * Math.cos(an + .4), q[1] - 10 * Math.sin(an + .4)); ctx.fill(); ctx.font = "700 12px system-ui"; ctx.fillText(t, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 6); };
        arrow([0, Dp / 2, 24], [A, Dp / 2, 24], "#0e7a5a", "+A"); let c = 0; P.forEach((d) => { arrow([c + d.v, Dp / 2, 20], [c, Dp / 2, 20], "#d06a1f", "−" + d.n); c += d.v; });
      }
    }
    let drag = null;
    canvas.onpointerdown = (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
    canvas.onpointermove = (e) => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) * 0.01; pitch = Math.max(-0.2, Math.min(1.45, drag[3] + (e.clientY - drag[1]) * 0.01)); draw(); };
    canvas.onpointerup = canvas.onpointercancel = () => { drag = null; canvas.style.cursor = "grab"; };
    draw();
    return { draw, face: () => { yaw = 0; pitch = 0.02; draw(); }, iso: () => { yaw = -0.6; pitch = 0.55; draw(); } };
  }

  /* ---------- 5. STAR ---------- */
  const STAR = [
    { id: "s1", q: "Parle-moi d'un problème technique difficile que tu as résolu.", piste: "Un essai qui ne passait pas chez Plastic Omnium, ou une pièce qui ne fonctionnait pas chez IDI ou EssilorLuxottica : comment tu as trouvé la cause." },
    { id: "s2", q: "Raconte une contrainte de conception que tu as dû concilier (coût, encombrement, masse, fabrication).", piste: "Une pièce injectée ou surmoulée chez EssilorLuxottica : ce que voulait le cahier des charges, ce que permettait le procédé, le compromis trouvé." },
    { id: "s3", q: "Parle-moi d'un essai de validation que tu as mené de A à Z.", piste: "Un plan de validation chez Plastic Omnium (fatigue, pression, température, étanchéité) ou les essais de fatigue et de stérilisation chez IDI." },
    { id: "s4", q: "As-tu déjà fait une rétroconception ? Comment t'y es-tu pris ?", piste: "EssilorLuxottica : mesure, remodélisation dans SolidWorks, validation." },
    { id: "s5", q: "Raconte une non-conformité que tu as traitée.", piste: "IDI (ISO 13485) : comment tu as contenu, trouvé la cause, corrigé." },
    { id: "s6", q: "Parle-moi d'une erreur que tu as faite et de ce que tu en as tiré.", piste: "Une cote oubliée, une tolérance mal choisie, un essai mal préparé : l'important est ce que tu as changé ensuite." },
    { id: "s7", q: "Un désaccord technique avec un collègue ou un fournisseur : comment l'as-tu géré ?", piste: "Un échange avec un mouliste ou un fournisseur sur la faisabilité d'une pièce." },
    { id: "s8", q: "Raconte une situation où les délais étaient très courts.", piste: "Un prototype à sortir vite (impression 3D chez Lyra Dental ou GK Concept), un essai à boucler avant une revue." },
    { id: "s9", q: "Une amélioration que tu as proposée de ta propre initiative.", piste: "Un gain de temps, de coût ou de fiabilité que tu as amené sans qu'on te le demande." },
    { id: "s10", q: "Comment as-tu appris rapidement un outil ou un domaine nouveau ?", piste: "La fabrication additive (FDM, SLA, DLP) chez Lyra Dental et GK Concept, ou les normes médicales chez IDI." },
  ];
  const STAR_F = [["s", "Situation", "Le contexte, en 2 phrases."], ["t", "Tâche", "Ce qu'on attendait de toi."], ["a", "Action", "Ce que TU as fait (dis « je »). La partie la plus longue."], ["r", "Résultat", "Ce que ça a donné, chiffré si possible."], ["chiffre", "Le chiffre à retenir", "Ex. : 2 semaines gagnées."], ["appris", "Ce que j'en ai appris", "Une phrase positive pour finir."]];

  /* ---------- État ---------- */
  let P = { q: {}, plans: {}, gdt: {}, ch: { faits: 0, justes: 0 }, quiz: { faits: 0, justes: 0 }, star: {}, simus: [] };
  const ui = { dom: "", niv: 0, idx: 0, rev: false, ordre: null, plan: PLANS[0].id, found: {}, miss: 0, sol: false, gmode: "lire", gi: 0, grev: false, quiz: null, ct: "empil", ex: null, res: null, csol: false, v3d: false, chaine: false, oral: null, simu: null, simuDoms: null, simuCand: "", candAuto: true, domsAuto: true };
  let db = null, saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(async () => { if (!db) return; try { await db.doc("entrainement/technique").set({ ...P, updatedAt: new Date().toISOString() }); } catch { window.toast && toast("Enregistrement refusé, réessaie."); } }, 500); };

  /* ---------- Rendu ---------- */
  const sec = document.createElement("section"); sec.className = "view"; sec.id = "v-entrainement"; sec.hidden = true;
  const FOLDS = [["q", "Questions par domaine"], ["plans", "Plans à corriger"], ["gdt", "Cotation géométrique"], ["ch", "Chaînes de cotes"], ["star", "Mes expériences (STAR)"]];
  sec.innerHTML = `<header class="en-head"><h1>Prépa entretien technique</h1><p>Questions du niveau 1 au niveau 3, plans à corriger, cotes à lire, chaînes de cotes et tes expériences.</p></header>
    <div class="en-hero" id="en-hero"></div>
    ${FOLDS.map(([k, t], i) => `<details class="fold" id="en-f-${k}"><summary><span class="fold-t">${i + 1}. ${t}</span><span class="fold-s" id="en-s-${k}"></span></summary><div class="fold-b" id="en-${k}"></div></details>`).join("")}
    <p class="en-link">Questions RH (parcours, motivation, salaire) : <a href="#documents" data-en-rh>CV &amp; lettres → S'entraîner à l'entretien</a>.</p>`;

  const niv = (n) => `<span class="en-niv" title="Niveau ${n}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")} Niveau ${n}</span>`;
  const statQ = (id) => P.q[id];
  function sums() {
    const ok = QS.filter((x) => statQ(x.id) === "ok").length;
    e$("#en-s-q").textContent = `${ok} / ${QS.length}`;
    const pf = PLANS.filter((p) => (P.plans[p.id] || []).length >= p.err.length).length; e$("#en-s-plans").textContent = `${pf} / ${PLANS.length}`;
    const gk = GDT.filter((g) => P.gdt[g.id] === "ok").length; e$("#en-s-gdt").textContent = `${gk} / ${GDT.length}`;
    e$("#en-s-ch").textContent = P.ch.faits ? `${P.ch.justes} justes / ${P.ch.faits}` : "";
    const sk = STAR.filter((s) => (P.star[s.id] || {}).a).length; e$("#en-s-star").textContent = `${sk} / ${STAR.length}`;
  }

  /* Entretien blanc (carte du haut) */
  const candsEntretien = () => (S0().cands || []).filter((c) => c.statut === "entretien" || (c.dateEntretien && c.dateEntretien >= new Date().toISOString().slice(0, 10))).sort((a, b) => String(a.dateEntretien || "9").localeCompare(String(b.dateEntretien || "9")));
  const texteCand = (c) => [c.poste, c.entreprise, c.description, c.annonce ? JSON.stringify(c.annonce) : "", (c.prepa?.techniques || []).map((x) => x.q).join(" "), (c.competences || []).join?.(" ") || ""].join(" ");
  function domsPour(c) {
    if (!c) return ["u", "t", "p"];
    const t = texteCand(c), found = DOM.filter((d) => d.mots.test(t)).map((d) => d.id);
    const base = found.filter((x) => x !== "cao" && x !== "q");
    const out = [...base, ...found.filter((x) => x === "cao" || x === "q")];
    return (out.length ? out : ["u", "t", "p"]).slice(0, 4);
  }
  function socHTML() {
    const c = candOf(ui.simuCand); if (!c) return "";
    const n = socQs(c).length, dem = (S0().ia?.liste || []).some((d) => d.cand === c.id && d.type === "prepa" && ["en_attente", "en_cours"].includes(d.statut));
    return `<div class="en-soc">${n ? `<span>🏢 <b>${n} question${n > 1 ? "s" : ""} propre${n > 1 ? "s" : ""} à ${h(c.entreprise || "cette société")}</b> ajoutée${n > 1 ? "s" : ""} à l'entretien blanc et dans « Questions par domaine ».</span>`
      : dem ? `<span>🏢 Claude prépare les questions propres à ${h(c.entreprise || "cette société")} ⏳ Elles arriveront ici toutes seules.</span>`
      : `<span>🏢 Pour des questions propres à ${h(c.entreprise || "cette société")}, demande la préparation à Claude sur sa fiche.</span><button type="button" class="small" data-en-fiche="${h(c.id)}" style="align-self:flex-start">Ouvrir la fiche → Préparer avec Claude</button>`}</div>`;
  }
  function renderHero() {
    const cs = candsEntretien();
    // tant que Tullio n'a rien choisi : le prochain entretien, et ses domaines devinés d'après l'annonce
    if (ui.candAuto && (cs[0]?.id || "") !== ui.simuCand) { ui.simuCand = cs[0]?.id || ""; ui.domsAuto = true; }
    if (ui.domsAuto || ui.simuDoms == null) ui.simuDoms = domsPour(candOf(ui.simuCand));
    const last = P.simus[P.simus.length - 1];
    e$("#en-hero").innerHTML = `<h2>Entretien blanc</h2>
      <p>Comme chez Kickmaker : niveau 1 → 3 par domaine, puis un plan, une cote, une chaîne de cotes et une expérience. Environ 25 min.</p>
      ${cs.length ? `<label style="display:flex;flex-direction:column;gap:4px;font-size:.84rem;font-weight:600">Pour quel entretien ?<select id="en-cand"><option value="">Aucun en particulier</option>${cs.map((c) => `<option value="${h(c.id)}"${c.id === ui.simuCand ? " selected" : ""}>${h(c.entreprise || "?")} · ${h(c.poste || "")}${c.dateEntretien ? " · " + h(c.dateEntretien.split("-").reverse().slice(0, 2).join("/")) : ""}</option>`).join("")}</select></label>` : ""}
      ${socHTML()}
      <div class="en-pick"><span>Domaines${ui.simuCand && ui.domsAuto ? " (d'après l'annonce)" : ""} : <b>${ui.simuDoms.map(domNom).join(", ") || "aucun"}</b></span><button type="button" data-en-domsopen>${ui.domsOpen ? "OK" : "Changer"}</button></div>
      ${ui.domsOpen ? `<div class="en-chips">${DOM.map((d) => `<button type="button" class="small" data-en-sdom="${d.id}" aria-pressed="${ui.simuDoms.includes(d.id)}">${d.ic} ${h(d.nom)}</button>`).join("")}</div>` : ""}
      <div class="en-row"><button type="button" class="go" data-en-go>Commencer l'entretien blanc</button>${last ? `<span style="font-size:.84rem;color:var(--hero-muted)">Dernier : ${last.score} %${last.entreprise ? " (" + h(last.entreprise) + ")" : ""}, le ${new Date(last.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</div>`;
  }

  /* 1. Questions */
  function listeQ() {
    let l = ui.dom === "soc" ? socQs(candOf(ui.simuCand)) : QS.filter((x) => (!ui.dom || x.d === ui.dom) && (!ui.niv || x.n === ui.niv));
    if (ui.ordre) l = ui.ordre.map((id) => l.find((x) => x.id === id)).filter(Boolean);
    return l;
  }
  function renderQ() {
    const socs = socQs(candOf(ui.simuCand)); if (ui.dom === "soc" && !socs.length) ui.dom = "";
    const el = e$("#en-q"), l = listeQ(); if (ui.idx >= l.length) ui.idx = 0;
    const x = l[ui.idx];
    const dstat = (id) => { const qq = QS.filter((q) => q.d === id); return [qq.filter((q) => statQ(q.id) === "ok").length, qq.length]; };
    el.innerHTML = `<p class="en-tip">Réponds à voix haute, puis touche « Voir la réponse ».</p>
      <div class="en-dom-grid">${[{ id: "", nom: "Tous les domaines", ic: "🎯" }, ...(socs.length ? [{ id: "soc", nom: "Chez " + (candOf(ui.simuCand)?.entreprise || "?"), ic: "🏢" }] : []), ...DOM].map((d) => { const [a, b] = d.id === "soc" ? [socs.filter((q) => statQ(q.id) === "ok").length, socs.length] : d.id ? dstat(d.id) : [QS.filter((q) => statQ(q.id) === "ok").length, QS.length]; return `<button type="button" class="en-dom" data-en-dom="${d.id}" aria-pressed="${ui.dom === d.id}"><span>${d.ic} ${h(d.nom)}</span><small>${a} / ${b} sues</small><span class="en-bar"><i style="width:${b ? (a / b) * 100 : 0}%"></i></span></button>`; }).join("")}</div>
      <div class="en-chips">${[0, 1, 2, 3].map((n) => `<button type="button" class="small" data-en-niv="${n}" aria-pressed="${ui.niv === n}">${n ? "Niveau " + n : "Tous niveaux"}</button>`).join("")}<button type="button" class="small ghost" data-en-mix>🔀 Mélanger</button><button type="button" class="small ghost" data-en-revoir>À revoir seulement</button></div>
      ${x ? qCard(x, `${ui.idx + 1} / ${l.length}`, true) : `<p class="en-tip">Aucune question ici.</p>`}`;
  }
  function qCard(x, pos, nav) {
    const st = statQ(x.id);
    return `<div class="en-card"><div class="en-meta">${x.n ? niv(x.n) : ""}<span>${h(x.dn || domNom(x.d))}</span>${pos ? `<span>· ${pos}</span>` : ""}${st ? `<span class="${st === "ok" ? "en-ok" : "en-ko"}">${st === "ok" ? "✓ sue" : "↻ à revoir"}</span>` : ""}</div>
      <p class="en-q">${h(x.q)}</p>
      ${ui.rev ? `${x.e ? `<p class="en-e">${h(x.e)}</p>` : ""}${x.k ? `<div class="en-k">${x.k.map((k) => `<span>${h(k)}</span>`).join("")}</div>` : ""}${x.p ? `<p class="en-c cy"><b>⚠</b>${h(x.p)}</p>` : ""}
        ${x.r && x.r !== x.e ? `<details class="en-more"${x.e ? "" : " open"}><summary>Détail</summary><p>${h(x.r)}</p></details>` : ""}
        <div class="en-row"><button type="button" class="small primary" data-en-qs="ok" data-id="${h(x.id)}">✓ Je savais</button><button type="button" class="small" data-en-qs="revoir" data-id="${h(x.id)}">↻ À revoir</button></div>`
        : `<div class="en-row"><button type="button" class="primary" data-en-rev>Voir la réponse</button></div>`}
      ${nav ? `<div class="en-row"><button type="button" class="small ghost" data-en-nav="-1">← Précédente</button><span class="sp"></span><button type="button" class="small ghost" data-en-nav="1">Suivante →</button></div>` : ""}</div>`;
  }

  /* 2. Plans */
  function planBlock(p, found, sol, inSimu) {
    const marks = p.err.map((er, i) => found.includes(i) ? `<circle cx="${er.x}" cy="${er.y}" r="20" fill="rgba(14,122,90,.12)" stroke="#0e7a5a" stroke-width="2.5"/><text x="${er.x + 18}" y="${er.y - 14}" font-size="14" font-weight="800" fill="#0e7a5a">${i + 1}</text>`
      : sol ? `<circle cx="${er.x}" cy="${er.y}" r="20" fill="rgba(217,67,58,.1)" stroke="#d9433a" stroke-width="2.5" stroke-dasharray="5 3"/><text x="${er.x + 18}" y="${er.y - 14}" font-size="14" font-weight="800" fill="#d9433a">${i + 1}</text>` : "").join("");
    const shown = p.err.map((er, i) => ({ ...er, i })).filter((er) => found.includes(er.i) || sol);
    return `<div class="en-meta">${niv(p.n)}<span>${h(p.titre)}</span><span>· ${found.length} / ${p.err.length} erreurs trouvées</span>${ui.miss ? `<span>· ${ui.miss} touche${ui.miss > 1 ? "s" : ""} à côté</span>` : ""}</div>
      <p class="en-tip">Touche les ${p.err.length} erreurs sur le plan, et dis à voix haute pourquoi c'est faux.<span class="en-glisse"> Fais glisser le plan sur le côté pour tout voir.</span></p>
      <div class="en-paper click pl">${svgWrap(p.w, p.hh, p.draw() + marks, `data-en-plan="${p.id}"`)}</div>
      ${shown.length ? `<div class="en-leg"><span><i style="background:#0e7a5a"></i>trouvée par toi</span>${sol ? `<span><i style="background:#d9433a"></i>ratée</span>` : ""}</div>
        <ul class="en-errs">${shown.sort((a, b) => a.i - b.i).map((er) => `<li><span class="n ${found.includes(er.i) ? "ok" : "ko"}">${er.i + 1}</span><span class="x"><b>${h(er.t)}</b><span>${h(er.e)}</span><span class="cg">✓ ${h(er.c)}</span></span></li>`).join("")}</ul>` : ""}
      <div class="en-row">${sol || found.length === p.err.length ? "" : `<button type="button" class="small" data-en-psol>Voir les solutions</button>`}<button type="button" class="small ghost" data-en-preset>Recommencer</button>${inSimu ? "" : ""}</div>`;
  }
  function renderPlans() {
    const p = PLANS.find((x) => x.id === ui.plan), found = ui.found[p.id] || [];
    e$("#en-plans").innerHTML = `<div class="en-chips">${PLANS.map((x) => `<button type="button" class="small" data-en-plan-sel="${x.id}" aria-pressed="${x.id === ui.plan}">${h(x.titre)}${(P.plans[x.id] || []).length >= x.err.length ? " ✓" : ""}</button>`).join("")}</div>${planBlock(p, found, ui.sol)}`;
  }
  function clicPlan(svg, ev) {
    const p = PLANS.find((x) => x.id === svg.dataset.enPlan); if (!p) return;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const enS = !!ui.simu && !!svg.closest("#en-ov"), found = enS ? ui.simu.found : (ui.found[p.id] || (ui.found[p.id] = []));
    let best = -1, bd = 1e9; p.err.forEach((er, i) => { const d = Math.hypot(er.x - q.x, er.y - q.y); if (d < bd) { bd = d; best = i; } });
    if (bd <= 34 && !found.includes(best)) {
      found.push(best);
      const saved = new Set(P.plans[p.id] || []); saved.add(best); P.plans[p.id] = [...saved]; save();
      if (window.toast) toast(found.length === p.err.length ? "Bravo, toutes les erreurs sont trouvées !" : `Bien vu : ${p.err[best].t.toLowerCase()}`);
    } else if (bd > 34) { if (enS) ui.simu.miss = (ui.simu.miss || 0) + 1; else ui.miss++; const c = document.createElementNS("http://www.w3.org/2000/svg", "text"); c.setAttribute("x", q.x); c.setAttribute("y", q.y + 6); c.setAttribute("text-anchor", "middle"); c.setAttribute("font-size", "20"); c.setAttribute("fill", "#d9433a"); c.textContent = "✕"; svg.appendChild(c); setTimeout(() => c.remove(), 700); return; }
    ui.simu ? renderSimu() : (renderPlans(), sums());
  }

  /* 3. GD&T */
  function gdtCard(g, rev) {
    const r = g.r;
    return `<div class="en-card"><div class="en-meta">${niv(g.n)}<span>${h(g.nom)}</span>${P.gdt[g.id] ? `<span class="${P.gdt[g.id] === "ok" ? "en-ok" : "en-ko"}">${P.gdt[g.id] === "ok" ? "✓ sue" : "↻ à revoir"}</span>` : ""}</div>
      <div class="en-paper gd">${gdtSVG(g, rev)}</div>
      ${rev ? `<p class="en-c cb"><b>Quoi ?</b>${h(r.dit)}</p><p class="en-c co"><b>Zone</b>${h(r.zone)}</p><p class="en-c cg"><b>Par rapport à</b>${h(r.ref)}</p><p class="en-c"><b>Contrôle</b>${h(r.ctrl)}</p><p class="en-c cy"><b>⚠</b>${h(r.piege)}</p>
        <div class="en-row"><button type="button" class="small primary" data-en-gs="ok" data-id="${g.id}">✓ Je savais</button><button type="button" class="small" data-en-gs="revoir" data-id="${g.id}">↻ À revoir</button></div>`
        : `<p class="en-q">Explique cette cote : quoi, quelle zone, par rapport à quoi, et comment la contrôler ?</p><div class="en-row"><button type="button" class="primary" data-en-grev>Voir la solution</button></div>`}</div>`;
  }
  function newQuiz() { const good = pick(SYMS); ui.quiz = { good, ch: shuffle([good, ...shuffle(SYMS.filter((s) => s !== good)).slice(0, 3)]), rep: null }; }
  function renderGdt() {
    let body;
    if (ui.gmode === "lire") { const g = GDT[ui.gi]; body = `<div class="en-chips">${GDT.map((x, i) => `<button type="button" class="small" data-en-gi="${i}" aria-pressed="${i === ui.gi}">${h(x.nom)}${P.gdt[x.id] === "ok" ? " ✓" : ""}</button>`).join("")}</div>${gdtCard(g, ui.grev)}`; }
    else {
      if (!ui.quiz) newQuiz(); const z = ui.quiz;
      body = `<p class="en-tip">Quel est ce symbole ? Et sa famille (forme, orientation, position, battement) ? Score : ${P.quiz.justes} / ${P.quiz.faits}</p>
        <div class="en-sym"><svg viewBox="-20 -16 40 32" width="120" height="96">${sym(z.good.s, 0, 0, 1)}</svg></div>
        <div class="en-choices">${z.ch.map((s) => `<button type="button" data-en-qz="${s.s}" class="${z.rep ? (s === z.good ? "bon" : s.s === z.rep ? "faux" : "") : ""}"${z.rep ? " disabled" : ""}>${h(s.nom)}</button>`).join("")}</div>
        ${z.rep ? `<p class="en-r">${z.rep === z.good.s ? "✓ Juste." : "✕ C'était : " + h(z.good.nom) + "."} Famille : <b>${h(z.good.cat)}</b>.</p><div class="en-row"><button type="button" class="primary" data-en-qznext>Symbole suivant</button></div>` : ""}`;
    }
    e$("#en-gdt").innerHTML = `<div class="en-chips"><button type="button" class="small" data-en-gm="lire" aria-pressed="${ui.gmode === "lire"}">Expliquer une cote</button><button type="button" class="small" data-en-gm="quiz" aria-pressed="${ui.gmode === "quiz"}">Quiz des symboles</button></div>${body}`;
  }

  /* 4. Chaînes */
  function chBlock(ex, res, csol, inSimu) {
    const ct = CH_TYPES.find((c) => c.id === ex.type);
    const champs = ex.type === "ajust"
      ? `<label>Jeu mini (µm)<input inputmode="decimal" data-en-in="jmin"></label><label>Jeu maxi (µm)<input inputmode="decimal" data-en-in="jmax"></label><label>Type<select data-en-in="genre"><option value="">—</option><option value="jeu">Avec jeu</option><option value="incertain">Incertain</option><option value="serre">Serré</option></select></label>`
      : `<label>J mini (mm)<input inputmode="decimal" data-en-in="jmin"></label><label>J maxi (mm)<input inputmode="decimal" data-en-in="jmax"></label>${ex.type === "stat" ? `<label>IT statistique (mm)<input inputmode="decimal" data-en-in="itq"></label>` : ""}`;
    const can3D = ex.type === "empil" || ex.type === "stat";
    return `<div class="en-meta">${niv(ct.n)}<span>${h(ct.nom)}</span></div>
      <p class="en-q">${h(ct.q)}</p>
      ${ex.type === "ajust" ? `<p class="en-r">Ø${ex.Dn} H7/${ex.arb}. Alésage H7 : ${sg(ex.EI)} / ${sg(ex.ES)} µm. Arbre ${ex.arb} : ${sg(ex.ei)} / ${sg(ex.es)} µm.</p>` : ""}
      ${ui.v3d && can3D && !inSimu ? `<div class="en-3d"><canvas id="en-cv"></canvas><span class="hint">Fais glisser pour tourner</span></div><div class="en-row"><button type="button" class="small" data-en-cam="face">Vue de face</button><button type="button" class="small" data-en-cam="iso">Vue 3D</button><label style="display:flex;gap:6px;align-items:center;font-size:.85rem"><input type="checkbox" data-en-chaine ${ui.chaine ? "checked" : ""} style="width:auto"> Montrer la chaîne</label></div>`
        : `<div class="en-paper ch">${chSVG(ex, csol)}</div>`}
      ${chData(ex, csol)}
      ${can3D && !inSimu ? `<div class="en-row"><button type="button" class="small" data-en-trois>${ui.v3d ? "Revenir au schéma" : "🧊 Voir en 3D"}</button></div>` : ""}
      <div class="en-in">${champs}</div>
      ${res ? `<p class="en-r ${res.ok ? "en-ok" : "en-ko"}">${res.ok ? "✓ Juste !" : "✕ Pas encore : " + h(res.msg)}</p>` : ""}
      ${csol ? chCorr(ex) : ""}
      <div class="en-row"><button type="button" class="primary" data-en-check>Vérifier</button>${csol ? "" : `<button type="button" class="small" data-en-csol>Voir la correction</button>`}${inSimu ? "" : `<span class="sp"></span><button type="button" class="small ghost" data-en-cnew>Nouvel exercice</button>`}</div>`;
  }
  function renderCh() {
    if (!ui.ex || ui.ex.type !== ui.ct) { ui.ex = genCh(ui.ct); ui.res = null; ui.csol = false; }
    e$("#en-ch").innerHTML = `<div class="en-chips">${CH_TYPES.map((c) => `<button type="button" class="small" data-en-ct="${c.id}" aria-pressed="${c.id === ui.ct}">${h(c.nom)} · niv. ${c.n}</button>`).join("")}</div>
      <details class="qa"><summary><span>La méthode en 4 étapes</span></summary><div class="qa-b"><ol class="en-steps"><li>Repérer la condition : le jeu J et ses deux surfaces.</li><li>Tracer la chaîne : de la surface de gauche de J, passer de pièce en pièce par les surfaces de contact jusqu'à la surface de droite. Une seule cote par pièce.</li><li>Signer : un vecteur dans le sens de J compte +, en sens inverse −.</li><li>Calculer : Jmaxi = Σ(+ maxi) − Σ(− mini) ; Jmini = Σ(+ mini) − Σ(− maxi). Contrôle : IT(J) = Σ IT.</li></ol><p class="en-tip">Dans SolidWorks, on peut mesurer le jeu dans l'assemblage et faire une analyse de tolérance avec TolAnalyst (version Premium). Dans CATIA, on travaille avec l'atelier FT&amp;A (annotations 3D).</p></div></details>
      <div class="en-card">${chBlock(ui.ex, ui.res, ui.csol)}</div>`;
    if (ui.v3d) { const cv = e$("#en-cv"); if (cv) ui.v = vue3D(cv, ui.ex, () => ui.chaine); }
  }
  function checkCh(root, ex) {
    const v = (k) => { const i = root.querySelector(`[data-en-in="${k}"]`); return i ? i.value : ""; };
    if (ex.type === "ajust") {
      const a = num(v("jmin")), b = num(v("jmax")), g = v("genre");
      const ok = Math.abs(a - ex.jmin) < 0.6 && Math.abs(b - ex.jmax) < 0.6 && g === ex.genre;
      return { ok, msg: isNaN(a) || isNaN(b) ? "remplis les deux jeux (en µm)." : !g ? "choisis le type d'ajustement." : "regarde la correction : jeu maxi = ES − ei, jeu mini = EI − es." };
    }
    const a = num(v("jmin")), b = num(v("jmax")), c = num(v("itq"));
    let ok = Math.abs(a - ex.jmin) < 0.0015 && Math.abs(b - ex.jmax) < 0.0015;
    if (ex.type === "stat") ok = ok && Math.abs(c - ex.itq) < 0.002;
    return { ok, msg: isNaN(a) || isNaN(b) ? "remplis J mini et J maxi (en mm)." : Math.abs(a - ex.jmax) < 0.0015 && Math.abs(b - ex.jmin) < 0.0015 ? "tu as inversé mini et maxi." : "vérifie les signes de la chaîne et quelles bornes (maxi ou mini) tu prends." };
  }

  /* 5. STAR */
  function renderStar() {
    if (e$("#en-star").contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA") return;
    e$("#en-star").innerHTML = `<p class="en-tip">« Raconte-moi une fois où… » : prépare tes histoires en 4 temps, <b>S</b>ituation, <b>T</b>âche, <b>A</b>ction, <b>R</b>ésultat. 2 minutes à l'oral, un résultat chiffré. Tout s'enregistre tout seul.</p>
      <div class="qa-list">${STAR.map((s) => { const v = P.star[s.id] || {}; const pret = !!v.a; return `<details class="qa${pret ? " ok" : ""}" data-en-sd="${s.id}"${ui.oral === s.id || ui.openStar === s.id ? " open" : ""}><summary><span>${h(s.q)}</span>${pret ? '<span class="qa-ok">✓</span>' : ""}</summary><div class="qa-b en-star" style="display:flex;flex-direction:column;gap:8px">
        <p class="en-tip"><b>Piste :</b> ${h(s.piste)}</p>
        ${ui.oral === s.id ? oralHTML(s, v) : STAR_F.map(([k, t, aide]) => `<label>${t} <small>${h(aide)}</small><textarea rows="${k === "a" ? 4 : 2}" data-en-star="${s.id}" data-k="${k}">${h(v[k] || "")}</textarea></label>`).join("") + `<div class="en-row"><button type="button" class="small primary" data-en-oral="${s.id}">🎤 S'entraîner à l'oral (2 min)</button></div>`}
      </div></details>`; }).join("")}</div>`;
  }
  function oralHTML(s, v) {
    return `<div class="en-row"><span class="en-timer" id="en-timer">2:00</span><span class="sp"></span><button type="button" class="small" data-en-oralgo>▶ Démarrer</button><button type="button" class="small ghost" data-en-oralstop>Fermer</button></div>
      <div class="en-oral">${STAR_F.slice(0, 4).map(([k, t]) => `<div><b>${t}</b>${h(v[k] || "(à écrire)")}</div>`).join("")}</div>${v.chiffre ? `<p class="en-r">Le chiffre à placer : <b>${h(v.chiffre)}</b></p>` : ""}`;
  }
  let oralT = 0;

  /* ---------- Entretien blanc ---------- */
  function startSimu() {
    const doms = ui.simuDoms.length ? ui.simuDoms : ["u", "t", "p"], c = (S0().cands || []).find((x) => x.id === ui.simuCand);
    const steps = [];
    for (const d of doms) for (const n of [1, 2, 3]) {
      const pool = QS.filter((q) => q.d === d && q.n === n), pref = pool.filter((q) => statQ(q.id) !== "ok");
      const q = pick(pref.length ? pref : pool); if (q) steps.push({ k: "q", id: q.id });
    }
    shuffle(socQs(c)).slice(0, 3).forEach((q) => steps.push({ k: "q", id: q.id }));
    const plansP = PLANS.filter((p) => (P.plans[p.id] || []).length < p.err.length);
    steps.push({ k: "plan", id: pick(plansP.length ? plansP : PLANS).id });
    const gP = GDT.filter((g) => P.gdt[g.id] !== "ok"); steps.push({ k: "gdt", id: pick(gP.length ? gP : GDT).id });
    steps.push({ k: "ch", ex: genCh(pick(["empil", "circlip", "ajust"])) });
    steps.push({ k: "star", id: pick(STAR).id });
    ui.simu = { steps, i: 0, res: [], t0: Date.now(), entreprise: c ? c.entreprise : "", found: [], rev: false, cres: null, csol: false };
    document.body.style.overflow = "hidden";
    renderSimu();
  }
  function renderSimu() {
    let ov = e$("#en-ov"); if (!ov) { ov = document.createElement("div"); ov.id = "en-ov"; ov.className = "en-ov"; document.body.appendChild(ov); }
    const S = ui.simu, n = S.steps.length;
    if (S.i >= n) return finSimu(ov);
    const st = S.steps[S.i]; let body = "", titre = "";
    if (st.k === "q") { const x = findQ(st.id); titre = x.d === "soc" ? x.dn : `${domNom(x.d)} · niveau ${x.n}`; ui.rev = S.rev; body = qCard(x, "", false); }
    else if (st.k === "plan") { const p = PLANS.find((x) => x.id === st.id); titre = "Plan à corriger"; ui.miss = S.miss || 0; body = `<div class="en-card">${planBlock(p, S.found, S.rev, true)}</div>`; }
    else if (st.k === "gdt") { const g = GDT.find((x) => x.id === st.id); titre = "Lire une cotation"; body = gdtCard(g, S.rev); }
    else if (st.k === "ch") { titre = "Chaîne de cotes"; body = `<div class="en-card">${chBlock(st.ex, S.cres, S.csol, true)}</div>`; }
    else { const s = STAR.find((x) => x.id === st.id), v = P.star[s.id] || {}; titre = "Ton expérience"; body = `<div class="en-card"><p class="en-q">${h(s.q)}</p><p class="en-tip">Réponds à voix haute en 2 minutes avec la méthode STAR (Situation, Tâche, Action, Résultat).</p>${S.rev ? (v.a ? `<div class="en-oral">${STAR_F.slice(0, 4).map(([k, t]) => `<div><b>${t}</b>${h(v[k] || "")}</div>`).join("")}</div>` : `<p class="en-p">Tu n'as pas encore écrit ce récit. Après l'entretien blanc, prépare-le dans « Raconter mes expériences ». Piste : ${h(s.piste)}</p>`) : `<div class="en-row"><button type="button" class="primary" data-en-rev>J'ai répondu, voir mes notes</button></div>`}</div>`; }
    const done = st.k === "plan" ? S.rev || S.found.length === PLANS.find((x) => x.id === st.id).err.length : st.k === "ch" ? S.csol || (S.cres && S.cres.ok) : S.rev;
    const notes = st.k === "q" || st.k === "gdt" ? "" : done ? `<div class="en-row"><span style="font-size:.88rem;font-weight:600">Comment ça s'est passé ?</span><button type="button" class="small primary" data-en-sr="ok">Réussi</button><button type="button" class="small" data-en-sr="moyen">Moyen</button><button type="button" class="small" data-en-sr="ko">Raté</button></div>` : st.k === "plan" ? `<div class="en-row"><button type="button" class="small" data-en-psol>J'ai fini, voir les solutions</button></div>` : "";
    const min = Math.floor((Date.now() - S.t0) / 60000);
    ov.innerHTML = `<div class="in"><div class="top"><h2>Entretien blanc${S.entreprise ? " · " + h(S.entreprise) : ""}</h2><span class="en-meta">${S.i + 1} / ${n} · ${min} min</span><button type="button" class="small ghost" data-en-quit>Arrêter</button></div>
      <div class="en-bar"><i style="width:${(S.i / n) * 100}%"></i></div><div class="en-meta" style="font-weight:700">${h(titre)}</div>${body}${notes}</div>`;
    ov.scrollTop = 0;
  }
  function simuNote(r) {
    const S = ui.simu, st = S.steps[S.i]; S.res.push({ ...st, r }); S.i++; S.rev = false; S.found = []; S.miss = 0; S.cres = null; S.csol = false; renderSimu();
  }
  function finSimu(ov) {
    const S = ui.simu, n = S.res.length, sc = Math.round((S.res.reduce((a, x) => a + (x.r === "ok" ? 1 : x.r === "moyen" ? .5 : 0), 0) / Math.max(1, n)) * 100);
    const lbl = (x) => x.k === "q" ? findQ(x.id).q : x.k === "plan" ? "Plan : " + PLANS.find((p) => p.id === x.id).titre : x.k === "gdt" ? "Cote : " + GDT.find((g) => g.id === x.id).nom : x.k === "ch" ? "Chaîne de cotes : " + CH_TYPES.find((c) => c.id === x.ex.type).nom : "Récit : " + STAR.find((s) => s.id === x.id).q;
    const rev = S.res.filter((x) => x.r !== "ok");
    if (!S.saved) { S.saved = true; P.simus = [...(P.simus || []), { le: new Date().toISOString(), entreprise: S.entreprise, score: sc, n, revoir: rev.map((x) => x.id || x.k) }].slice(-20); save(); }
    const parDom = {}; S.res.filter((x) => x.k === "q").forEach((x) => { const q = findQ(x.id); (parDom[q.d] ||= []).push(x.r); });
    ov.innerHTML = `<div class="in"><div class="top"><h2>Bilan de l'entretien blanc</h2><button type="button" class="small ghost" data-en-quit>Fermer</button></div>
      <p class="en-score">${sc} %</p><p class="en-r">${sc >= 75 ? "Très bon niveau : tu peux y aller confiant. Relis juste les points ci-dessous." : sc >= 50 ? "Correct. Quelques points à reprendre avant le jour J." : "Il reste du travail : reprends les points ci-dessous dans chaque partie, puis refais un entretien blanc."} (${Math.round((Date.now() - S.t0) / 60000)} min)</p>
      <div class="en-card"><b>Par domaine</b>${Object.entries(parDom).map(([d, rs]) => `<div class="en-row"><span>${h(d === "soc" && S.entreprise ? "Chez " + S.entreprise : domNom(d))}</span><span class="sp"></span>${rs.map((r) => (r === "ok" ? "🟢" : r === "moyen" ? "🟡" : "🔴")).join(" ")}</div>`).join("")}</div>
      ${rev.length ? `<div class="en-card"><b>À revoir</b><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${rev.map((x) => `<li>${h(lbl(x))}</li>`).join("")}</ul></div>` : ""}
      <div class="en-row"><button type="button" class="primary" data-en-quit>Terminer</button><button type="button" class="small" data-en-go>Refaire un entretien blanc</button></div></div>`;
  }
  function quitSimu() { clearInterval(oralT); ui.simu = null; ui.rev = false; const ov = e$("#en-ov"); if (ov) ov.remove(); document.body.style.overflow = ""; renderAll(); }

  function renderAll() { if (sec.hidden && !ui.simu) return; renderHero(); renderQ(); renderPlans(); renderGdt(); renderCh(); renderStar(); sums(); }

  /* ---------- Événements ---------- */
  const setQ = (id, s) => { P.q[id] = s; save(); };
  document.addEventListener("click", (ev) => {
    const root = ev.target.closest("#v-entrainement, #en-ov"); if (!root) return;
    const svg = ev.target.closest("svg[data-en-plan]"); if (svg) return clicPlan(svg, ev);
    const t = ev.target.closest("button, a[data-en-rh]"); if (!t) return;
    const d = t.dataset, inS = !!ui.simu && root.id === "en-ov";
    if (d.enFiche) { if (typeof openCand === "function") { openCand(d.enFiche); setTimeout(() => { const f = document.getElementById("sec-prepa"); if (f) { f.open = true; f.scrollIntoView({ block: "start" }); } }, 200); } return; }
    if ("enRh" in d) { setTimeout(() => { const f = document.getElementById("sec-entr"); if (f) { f.open = true; f.scrollIntoView({ block: "start" }); } }, 80); return; }
    if ("enGo" in d) { if (ui.simu) { ui.simu = null; } return startSimu(); }
    if ("enQuit" in d) return quitSimu();
    if (d.enSdom != null) { const s = new Set(ui.simuDoms); s.has(d.enSdom) ? s.delete(d.enSdom) : s.size < 4 ? s.add(d.enSdom) : window.toast && toast("4 domaines au plus"); ui.simuDoms = [...s]; ui.domsAuto = false; return renderHero(); }
    if (d.enSr) return simuNote(d.enSr);
    if ("enDomsopen" in d) { ui.domsOpen = !ui.domsOpen; return renderHero(); }
    // questions
    if (d.enDom != null) { ui.dom = d.enDom; ui.idx = 0; ui.rev = false; ui.ordre = null; return renderQ(); }
    if (d.enNiv != null) { ui.niv = +d.enNiv; ui.idx = 0; ui.rev = false; ui.ordre = null; return renderQ(); }
    if ("enMix" in d) { ui.ordre = shuffle(QS.map((x) => x.id)); ui.idx = 0; ui.rev = false; return renderQ(); }
    if ("enRevoir" in d) { const l = QS.filter((x) => statQ(x.id) === "revoir").map((x) => x.id); if (!l.length) return window.toast && toast("Aucune question marquée « à revoir »"); ui.dom = ""; ui.niv = 0; ui.ordre = l; ui.idx = 0; ui.rev = false; return renderQ(); }
    if ("enRev" in d) { if (inS) { ui.simu.rev = true; return renderSimu(); } ui.rev = true; return renderQ(); }
    if (d.enNav) { const l = listeQ(); ui.idx = (ui.idx + +d.enNav + l.length) % l.length; ui.rev = false; return renderQ(); }
    if (d.enQs) { setQ(d.id, d.enQs); if (inS) return simuNote(d.enQs === "ok" ? "ok" : "ko"); const l = listeQ(); ui.idx = (ui.idx + 1) % Math.max(1, l.length); ui.rev = false; renderQ(); return sums(); }
    // plans
    if (d.enPlanSel) { ui.plan = d.enPlanSel; ui.sol = false; ui.miss = 0; return renderPlans(); }
    if ("enPsol" in d) { if (inS) { ui.simu.rev = true; return renderSimu(); } ui.sol = true; return renderPlans(); }
    if ("enPreset" in d) { if (inS) { ui.simu.found = []; ui.simu.rev = false; return renderSimu(); } ui.found[ui.plan] = []; ui.sol = false; ui.miss = 0; return renderPlans(); }
    // gdt
    if (d.enGm) { ui.gmode = d.enGm; return renderGdt(); }
    if (d.enGi != null) { ui.gi = +d.enGi; ui.grev = false; return renderGdt(); }
    if ("enGrev" in d) { if (inS) { ui.simu.rev = true; return renderSimu(); } ui.grev = true; return renderGdt(); }
    if (d.enGs) { P.gdt[d.id] = d.enGs; save(); if (inS) return simuNote(d.enGs === "ok" ? "ok" : "ko"); ui.gi = (ui.gi + 1) % GDT.length; ui.grev = false; renderGdt(); return sums(); }
    if (d.enQz) { ui.quiz.rep = d.enQz; P.quiz.faits++; if (d.enQz === ui.quiz.good.s) P.quiz.justes++; save(); return renderGdt(); }
    if ("enQznext" in d) { newQuiz(); return renderGdt(); }
    // chaînes
    if (d.enCt) { ui.ct = d.enCt; ui.ex = null; ui.v3d = false; return renderCh(); }
    if ("enCnew" in d) { ui.ex = null; return renderCh(); }
    if ("enCheck" in d) {
      const ex = inS ? ui.simu.steps[ui.simu.i].ex : ui.ex, r = checkCh(t.closest(".en-card"), ex);
      P.ch.faits++; if (r.ok) P.ch.justes++; save();
      const vals0 = [...t.closest(".en-card").querySelectorAll("[data-en-in]")].map((i) => i.value);
      if (inS) { ui.simu.cres = r; renderSimu(); [...e$("#en-ov").querySelectorAll("[data-en-in]")].forEach((i, k) => (i.value = vals0[k] ?? "")); return; } ui.res = r; const vals = [...e$("#en-ch").querySelectorAll("[data-en-in]")].map((i) => i.value); renderCh(); [...e$("#en-ch").querySelectorAll("[data-en-in]")].forEach((i, k) => (i.value = vals[k] ?? "")); return sums();
    }
    if ("enCsol" in d) { if (inS) { ui.simu.csol = true; return renderSimu(); } ui.csol = true; return renderCh(); }
    if ("enTrois" in d) { ui.v3d = !ui.v3d; return renderCh(); }
    if (d.enCam) { ui.v && ui.v[d.enCam === "face" ? "face" : "iso"](); return; }
    // STAR
    if (d.enOral) { ui.oral = d.enOral; return renderStar(); }
    if ("enOralstop" in d) { clearInterval(oralT); ui.openStar = ui.oral; ui.oral = null; return renderStar(); }
    if ("enOralgo" in d) { clearInterval(oralT); let s = 120; const tm = e$("#en-timer"); t.textContent = "↺ Recommencer"; oralT = setInterval(() => { s--; if (tm) { tm.textContent = `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`; tm.style.color = s <= 15 ? "var(--s-refused)" : ""; } if (s <= 0) { clearInterval(oralT); window.toast && toast("2 minutes : conclus avec ton résultat !"); } }, 1000); return; }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.id === "en-cand") { ui.simuCand = ev.target.value; ui.candAuto = false; ui.domsAuto = true; renderHero(); return renderQ(); }
    if (ev.target.matches("[data-en-chaine]")) { ui.chaine = ev.target.checked; ui.v && ui.v.draw(); }
  });
  document.addEventListener("input", (ev) => {
    const ta = ev.target.closest("[data-en-star]"); if (!ta) return;
    const id = ta.dataset.enStar; P.star[id] = { ...(P.star[id] || {}), [ta.dataset.k]: ta.value }; ui.openStar = id; save();
  });
  document.addEventListener("focusout", (ev) => { if (ev.target.closest && ev.target.closest("[data-en-star]")) setTimeout(() => { if (!e$("#en-star").contains(document.activeElement)) { sums(); } }, 50); });
  addEventListener("resize", () => { if (ui.v3d && ui.v) ui.v.draw(); });

  /* ---------- Fiche candidature → entraînement ---------- */
  document.addEventListener("click", (ev) => { const a = ev.target.closest("[data-entr-cand]"); if (!a) return; ui.simuCand = a.dataset.entrCand; ui.candAuto = false; ui.domsAuto = true; if (typeof closeSheet === "function") closeSheet(); });

  /* ---------- Branchement dans l'appli ---------- */
  function brancher() {
    const after = document.getElementById("v-plateformes"), nav = document.getElementById("tabs");
    if (!after || !nav || typeof TABS === "undefined") return setTimeout(brancher, 100);
    after.after(sec);
    if (!TABS.includes("entrainement")) TABS.push("entrainement");
    const a = document.createElement("a"); a.href = "#entrainement"; a.dataset.tab = "entrainement";
    a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg><span class="desk">Prépa entretien</span><span class="mob">Prépa</span>`;
    nav.appendChild(a);
    const montrer = () => { if (location.hash === "#entrainement") { renderAll(); } };
    addEventListener("hashchange", () => setTimeout(montrer, 0));
    if (location.hash === "#entrainement" && typeof showTab === "function") { showTab("entrainement"); }
    montrer();
    charger();
  }
  // progression rangée dans docs path entrainement/technique (suit le compte, synchronisée entre appareils)
  async function charger() {
    if (!window.claude) return;
    db = await window.claude.use("db"); if (!db) return;
    db.doc("entrainement/technique").onSnapshot((snap) => {
      if (!snap.exists) return; const v = snap.data(); delete v.updatedAt;
      P = { ...P, ...v, ch: { faits: 0, justes: 0, ...(v.ch || {}) }, quiz: { faits: 0, justes: 0, ...(v.quiz || {}) } };
      if (!sec.hidden && !ui.simu) { sums(); renderHero(); if (!e$("#en-star").contains(document.activeElement)) renderStar(); }
    }, () => {});
  }
  let sig = "";
  setInterval(() => {
    if (sec.hidden || ui.simu) return;
    const st0 = S0(), c = candOf(ui.simuCand);
    const nsig = (st0.cands || []).length + "|" + (st0.cands || []).map((x) => x.statut + x.dateEntretien).join() + "|" + (c ? socQs(c).length : 0) + "|" + JSON.stringify(st0.ia?.liste?.length || 0);
    if (nsig === sig) return; sig = nsig;
    if (!document.activeElement || !sec.contains(document.activeElement) || document.activeElement.tagName === "BUTTON") { renderHero(); renderQ(); }
  }, 2500);
  brancher();
  window.jobelloEntrainement = { renderAll, charger, PLANS, GDT, QS };
})();
