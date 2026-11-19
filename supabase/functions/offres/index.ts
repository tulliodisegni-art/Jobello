// Fonction Supabase « offres » : la recherche automatique des offres pour les utilisateurs de Jobello
// (tous sauf le propriétaire, qui a sa propre veille Claude). Sans IA et sans frais :
// les offres viennent de l'API gratuite d'Adzuna (250 appels par jour), cherchées d'après la fiche de chacun
// (postes visés, ville, trajet, contrats, mots à éviter), notées par mots-clés, puis rangées dans alertes/jour.
// Le déclencheur push_jobello_offres envoie ensuite la notification « N nouvelles offres pour toi ».
// Appels : chaque matin par pg_cron (en-tête x-cron = push_config.cron_secret), ou par l'appli pour un seul
// utilisateur (« Chercher maintenant », avec son jeton de connexion, une fois par heure au plus).
// « Verify JWT » est désactivé : la fonction vérifie elle-même le code du réveil ou le jeton.

const SB_URL = Deno.env.get("SUPABASE_URL") || "https://vvxkkqcmjrwytagbxdfg.supabase.co";
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUB = "sb_publishable_A-kJQIoJXxdXmjHF8iM40g_RP6myhMo";
const PROPRIO = "36cd7f8d-6cb5-4dcc-8a44-b915f98212f2"; // Tullio : sa veille passe par Claude
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const H = () => ({ apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" });
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...H(), ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${path} : ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
const getDoc = async (owner: string, path: string) => ((await rest(`docs?owner=eq.${owner}&path=eq.${encodeURIComponent(path)}&select=data`)) || [])[0]?.data || null;
const setDoc = (owner: string, path: string, col: string, data: unknown) =>
  rest("docs?on_conflict=owner,path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ owner, path, col, data, updated_at: new Date().toISOString() }]) });

/* ---------- Texte ---------- */
const norm = (s: string) => " " + String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/<[^>]+>/g, " ").replace(/[^a-z0-9+#]+/g, " ").trim() + " ";
const VIDES = new Set(["de", "des", "du", "la", "le", "les", "et", "en", "a", "au", "aux", "un", "une", "h", "f", "hf", "fh", "pour", "sur", "dans", "ou", "d", "l"]);
const mots = (s: string) => norm(s).trim().split(" ").filter((w) => w.length > 1 && !VIDES.has(w));
const contient = (txt: string, terme: string) => { const t = norm(terme).trim(); return !!t && txt.includes(" " + t + " "); };
const PRESTA = /\b(alten|altran|capgemini|segula|akkodis|expleo|assystem|ausy|aktor|amaris|modis|adecco|manpower|randstad|synergie|crit|start people|proman|interim|intérim|recrutement|cabinet|consulting|conseil|ingenierie|ingénierie|esn|hays|michael page|page personnel|robert half|spring|fed|kicklox)\b/i;

/* Trajet maximum → rayon autour de la ville */
const RAYON: Record<string, number> = { "30 min": 15, "45 min": 25, "40 min à 1 h": 30, "1 h": 35, "1 h 15": 45, "1 h 30": 60 };

type Offre = Record<string, unknown> & { url: string; titre: string; entreprise: string };

async function chercherAdzuna(cle: { id: string; key: string }, quoi: string, ou: string, rayon: number) {
  const p = new URLSearchParams({ app_id: cle.id, app_key: cle.key, results_per_page: "25", what: quoi, max_days_old: "7", sort_by: "date", "content-type": "application/json" });
  if (ou) { p.set("where", ou); p.set("distance", String(rayon)); }
  const r = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${p}`);
  if (r.status === 401 || r.status === 403) throw new Error("cle_adzuna");
  if (!r.ok) { console.log("adzuna", r.status, (await r.text()).slice(0, 200)); return []; }
  const j = await r.json();
  return (j.results || []) as Record<string, any>[];
}

function noter(o: Record<string, any>, fiche: Record<string, any>, profil: Record<string, any>, recherche: string) {
  const titre = norm(o.title), desc = norm(o.title + " " + (o.description || ""));
  const mt = mots(recherche), hits = mt.filter((w) => titre.includes(" " + w + " "));
  const savoirs = [...(fiche.logiciels || []), ...(fiche.competences || [])].filter((x: string) => contient(desc, x));
  let score = 35 + Math.round((hits.length / Math.max(1, mt.length)) * 35) + Math.min(20, savoirs.length * 5);
  const mode = PRESTA.test(String(o.company?.display_name || "")) ? "prestataire" : "direct";
  if (mode === "prestataire" && fiche.typeEntreprise === "direct") score -= 10;
  if (o.contract_type === "permanent" && (fiche.contrats || []).includes("CDI")) score += 5;
  score = Math.max(10, Math.min(95, score));
  const verdict = score >= 70 ? "fonce" : score >= 50 ? "tente" : "bof";
  const pourquoi = [`Proche de ta recherche « ${recherche} »`, savoirs.length ? `l'annonce parle de ${savoirs.slice(0, 3).join(", ")}` : ""].filter(Boolean).join(" ; ") + ".";
  return { score, verdict, mode, pourquoi };
}

async function pourUtilisateur(owner: string, cle: { id: string; key: string }) {
  const profil = (await getDoc(owner, "profil/main")) || {};
  const fiche = profil.fiche || {};
  const postes: string[] = [...new Set(((profil.postes || []) as string[]).map((x) => String(x).trim()).filter(Boolean))].slice(0, 3);
  if (!fiche.faite || !postes.length) return { owner, ignore: "fiche incomplète" };
  const ville = String(fiche.ville || profil.mobilite || "").replace(/\s*\(.*\)\s*/g, "").trim();
  const rayon = RAYON[profil.conditions?.trajetMax || ""] || 30;
  const eviter = String(fiche.eviter || "").split(/[,;\n]+/).map((x) => x.trim()).filter((x) => x.length > 2);
  const contrats: string[] = fiche.contrats || [];
  const alertes = (await getDoc(owner, "alertes/jour")) || { offres: [], vus: [] };
  const vus = new Set<string>([...(alertes.vus || []), ...((alertes.offres || []) as Offre[]).map((o) => o.url)]);
  const cands = (await rest(`docs?owner=eq.${owner}&col=eq.candidatures&select=data->>lien`)) || [];
  cands.forEach((c: Record<string, string>) => c.lien && vus.add(c.lien));
  const vuesCles = new Set<string>(), nouvelles: Offre[] = [];
  for (const q of postes) {
    const res = await chercherAdzuna(cle, q, ville, rayon);
    for (const o of res) {
      const url = String(o.redirect_url || ""); if (!url || vus.has(url)) continue;
      const entreprise = String(o.company?.display_name || "").trim(), titre = String(o.title || "").replace(/<[^>]+>/g, "").trim();
      const k = norm(entreprise + " " + titre); if (vuesCles.has(k)) continue; vuesCles.add(k);
      const txt = norm(titre + " " + (o.description || ""));
      if (eviter.some((e) => contient(txt, e))) continue;
      const ct = o.contract_type === "permanent" ? "CDI" : o.contract_type === "contract" ? "CDD" : "";
      if (ct && contrats.length && !contrats.includes(ct) && !(ct === "CDD" && (contrats.includes("Intérim") || contrats.includes("Freelance")))) continue;
      const n = noter(o, fiche, profil, q);
      if (n.mode === "prestataire" && fiche.typeEntreprise === "direct" && n.score < 50) continue;
      const sal = o.salary_min ? `${Math.round(o.salary_min / 1000)}${o.salary_max && o.salary_max !== o.salary_min ? "-" + Math.round(o.salary_max / 1000) : ""} k€${o.salary_is_predicted === "1" ? " (estimé)" : ""}` : "";
      nouvelles.push({ url, titre, entreprise, ville: String(o.location?.display_name || ""), type: ct || (o.contract_time === "part_time" ? "Temps partiel" : ""), salaire: sal,
        source: "Adzuna", date: String(o.created || "").slice(0, 10), description: String(o.description || "").replace(/<[^>]+>/g, "").trim(), recherche: q, auto: true, ...n });
    }
  }
  nouvelles.sort((a, b) => (a.mode === "prestataire" ? 1 : 0) - (b.mode === "prestataire" ? 1 : 0) || (b.score as number) - (a.score as number));
  const garder = nouvelles.filter((o) => o.verdict !== "bof").slice(0, 15);
  const vusL: string[] = alertes.vus || [];
  const anciennes = ((alertes.offres || []) as Offre[]).filter((o) => !vusL.includes(o.url));
  const doc = { ...alertes, date: new Date().toISOString().slice(0, 10), offres: garder.concat(anciennes).slice(0, 30), vus: vusL.slice(-400), auto: { le: new Date().toISOString(), trouvees: garder.length, source: "Adzuna" } };
  await setDoc(owner, "alertes/jour", "alertes", doc);
  return { owner, trouvees: garder.length };
}

async function cleAdzuna() {
  const r = ((await rest("offres_config?id=eq.1&select=adzuna_id,adzuna_key")) || [])[0];
  return r && r.adzuna_id && r.adzuna_key ? { id: r.adzuna_id, key: r.adzuna_key } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!SRV) return json({ erreur: "configuration" }, 500);
    const cron = req.headers.get("x-cron");
    let cibles: string[] = [];
    if (cron) {
      const s = ((await rest("push_config?id=eq.1&select=cron_secret")) || [])[0];
      if (!s || s.cron_secret !== cron) return json({ erreur: "refusé" }, 401);
      const rows = (await rest("docs?path=eq.profil/main&select=owner,faite:data->fiche->>faite")) || [];
      cibles = rows.filter((r: Record<string, string>) => r.faite && r.owner !== PROPRIO).map((r: Record<string, string>) => r.owner);
    } else {
      const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const u = jeton ? await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: PUB, Authorization: `Bearer ${jeton}` } }) : null;
      if (!u || !u.ok) return json({ erreur: "connexion nécessaire" }, 401);
      const id = (await u.json()).id as string;
      const a = await getDoc(id, "alertes/jour");
      if (a?.auto?.le && Date.now() - Date.parse(a.auto.le) < 60 * 60e3) return json({ attendre: true, le: a.auto.le });
      cibles = [id];
    }
    const cle = await cleAdzuna();
    if (!cle) return json({ erreur: "cle_adzuna_absente" }, 503);
    const out = [];
    for (const o of cibles) {
      try { out.push(await pourUtilisateur(o, cle)); }
      catch (e) { if (String(e).includes("cle_adzuna")) return json({ erreur: "cle_adzuna_refusee" }, 503); out.push({ owner: o, erreur: String(e).slice(0, 200) }); }
    }
    return json({ ok: true, utilisateurs: out.length, resultats: cron ? out.map((x: Record<string, unknown>) => ({ ...x, owner: String(x.owner).slice(0, 8) })) : out });
  } catch (e) { console.log(String(e)); return json({ erreur: String(e).slice(0, 300) }, 500); }
});
