// Fonction Supabase « notifications » : envoie les notifications programmées des applis (Jobello d'abord)
// et fabrique les fichiers « Ajouter au calendrier ». Aucune dépendance : tout est fait avec WebCrypto.
// Réglage à faire une fois dans Supabase : désactiver « Verify JWT » pour cette fonction (voir NOTIFICATIONS.md).

const SB_URL = Deno.env.get("SUPABASE_URL") || "https://vvxkkqcmjrwytagbxdfg.supabase.co";
const SB_KEY = "sb_publishable_A-kJQIoJXxdXmjHF8iM40g_RP6myhMo"; // clé publique : les fonctions serveur sont protégées par le code secret
const CONTACT = "https://tulliodisegni-art.github.io/Jobello/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-cron", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const rpc = async (fn: string, args: Record<string, unknown>) => {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn} : ${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};

async function envoyer(secret: string) {
  let keys = await rpc("push_server_keys", { p_secret: secret });
  if (!keys.public) { const k = await generateVapid(); keys = await rpc("push_server_keys", { p_secret: secret, p_public: k.publicKey, p_private: k.privateJwk }); }
  const items = await rpc("push_server_due", { p_secret: secret }) as { key: string; kind: string; title: string; body: string; url: string; subs: { endpoint: string; sub: { endpoint: string; keys: { p256dh: string; auth: string } } }[] }[];
  const gone: string[] = []; let ok = 0, ko = 0;
  for (const it of items) {
    const payload = JSON.stringify({ title: it.title, body: it.body || "", url: it.url || "./", tag: it.key });
    for (const s of it.subs) {
      try {
        const st = await sendPush(s.sub, payload, { publicKey: keys.public, privateJwk: keys.private, subject: CONTACT });
        if (st === 404 || st === 410) gone.push(s.endpoint); else if (st >= 200 && st < 300) ok++; else { ko++; console.log("refus", st, s.endpoint.slice(0, 40)); }
      } catch (e) { ko++; console.log("erreur", String(e)); }
    }
  }
  if (gone.length) await rpc("push_server_gone", { p_secret: secret, p_endpoints: gone });
  return { notifications: items.length, envoyees: ok, echecs: ko, appareils_retires: gone.length };
}

/* ---------- Web Push (RFC 8291 aes128gcm + VAPID RFC 8292), avec WebCrypto ---------- */
const te = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const hkdf = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) =>
  new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), len * 8));

async function generateVapid() {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { publicKey: b64u(new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey))), privateJwk: await crypto.subtle.exportKey("jwk", k.privateKey) };
}

async function encrypt(sub: { keys: { p256dh: string; auth: string } }, payload: Uint8Array) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const ua = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: ua }, as.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(auth, secret, cat(te.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(payload, new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, 4096); head[20] = 65;
  return cat(head, asPub, ct);
}

async function vapid(endpoint: string, v: { publicKey: string; privateJwk: JsonWebKey; subject: string }) {
  const enc = (o: unknown) => b64u(te.encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: v.subject });
  const key = await crypto.subtle.importKey("jwk", v.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(unsigned)));
  return `vapid t=${unsigned}.${b64u(sig)}, k=${v.publicKey}`;
}

async function sendPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, text: string, v: { publicKey: string; privateJwk: JsonWebKey; subject: string }) {
  const body = await encrypt(sub, te.encode(text));
  const r = await fetch(sub.endpoint, { method: "POST", headers: { Authorization: await vapid(sub.endpoint, v), TTL: "86400", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" }, body });
  await r.body?.cancel();
  return r.status;
}

/* ---------- Fichier calendrier (.ics) : l'iPhone propose « Ajouter au calendrier » ---------- */
const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (l: string) => { const out: string[] = []; let s = l; while (new TextEncoder().encode(s).length > 74) { let n = 74; while (new TextEncoder().encode(s.slice(0, n)).length > 74) n--; out.push(s.slice(0, n)); s = " " + s.slice(n); } out.push(s); return out.join("\r\n"); };
function calendrier(q: URLSearchParams) {
  const date = (q.get("date") || "").replace(/\D/g, "").slice(0, 8), heure = (q.get("heure") || "").replace(/\D/g, "").slice(0, 4);
  if (date.length !== 8) return new Response("date manquante", { status: 400, headers: CORS });
  const duree = Math.min(600, Math.max(15, Number(q.get("duree")) || 60));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  let debut: string, fin: string;
  if (heure.length === 4) {
    const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8), +heure.slice(0, 2), +heure.slice(2, 4)));
    const f = new Date(d.getTime() + duree * 60000), p = (n: number) => String(n).padStart(2, "0");
    debut = `DTSTART;TZID=Europe/Paris:${date}T${heure}00`;
    fin = `DTEND;TZID=Europe/Paris:${f.getUTCFullYear()}${p(f.getUTCMonth() + 1)}${p(f.getUTCDate())}T${p(f.getUTCHours())}${p(f.getUTCMinutes())}00`;
  } else {
    const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8) + 1)), p = (n: number) => String(n).padStart(2, "0");
    debut = `DTSTART;VALUE=DATE:${date}`; fin = `DTEND;VALUE=DATE:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
  }
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jobello//Entretiens//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT", `UID:${(q.get("id") || crypto.randomUUID()).replace(/[^\w-]/g, "")}-${date}${heure}@jobello`, `DTSTAMP:${stamp}`, debut, fin,
    `SUMMARY:${icsEsc(q.get("titre") || "Entretien")}`];
  if (q.get("lieu")) lines.push(`LOCATION:${icsEsc(q.get("lieu")!)}`);
  if (q.get("notes")) lines.push(`DESCRIPTION:${icsEsc(q.get("notes")!)}`);
  if (q.get("lien")) lines.push(`URL:${icsEsc(q.get("lien")!)}`);
  if (heure.length === 4) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Entretien dans 1 heure", "TRIGGER:-PT1H", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", { headers: { ...CORS, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="entretien.ics"` } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const q = new URL(req.url).searchParams;
  if (req.method === "GET" && q.has("ics")) return calendrier(q);
  if (req.method === "GET") return Response.json({ ok: true, service: "notifications" }, { headers: CORS });
  const secret = req.headers.get("x-cron") || "";
  if (!secret) return new Response("non autorisé", { status: 401, headers: CORS });
  try { return Response.json(await envoyer(secret), { headers: CORS }); }
  catch (e) { console.log(String(e)); return Response.json({ erreur: String(e) }, { status: 500, headers: CORS }); }
});
