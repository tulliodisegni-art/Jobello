/* Jobello hors claude.ai : remplace window.claude par des équivalents
   - db : base de données (sur ce téléphone, ou en ligne si configurée)
   - sample : Claude via la clé Anthropic enregistrée sur ce téléphone
   - assets : fichiers (PDF de CV, lettres) rangés sur ce téléphone
   - downloads : téléchargement direct */
(function () {
  const LS = "jobello.";
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch {} },
  };
  window.jobelloStore = ls;

  /* ---------- Base locale (IndexedDB) au format attendu par l'appli ---------- */
  const idb = new Promise((res, rej) => {
    const r = indexedDB.open("jobello", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("docs"); r.result.createObjectStore("blobs"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = async (store, mode, fn) => { const d = await idb; return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); const out = fn(s); t.oncomplete = () => res(out && "result" in out ? out.result : out); t.onerror = () => rej(t.error); }); };
  const allDocs = async () => { const d = await idb; return new Promise((res) => { const out = {}; const t = d.transaction("docs"); const c = t.objectStore("docs").openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; }); };
  const local = {
    async list(col) { const all = await allDocs(); const pre = col + "/"; return Object.entries(all).filter(([k]) => k.startsWith(pre) && !k.slice(pre.length).includes("/")).map(([k, v]) => ({ id: k.slice(pre.length), data: v })); },
    async get(path) { return tx("docs", "readonly", (s) => s.get(path)); },
    async put(path, v) { await tx("docs", "readwrite", (s) => s.put(v, path)); },
    async del(path) { await tx("docs", "readwrite", (s) => s.delete(path)); },
  };
  let backend = local;
  window.jobelloSetBackend = (b) => { backend = b; refreshAll(); };

  const listeners = new Map(); // clé -> Set(fn)
  const emit = (key) => (listeners.get(key) || new Set()).forEach((f) => f());
  const listen = (key, fn) => { if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); return () => listeners.get(key).delete(fn); };
  const refreshAll = () => listeners.forEach((s) => s.forEach((f) => f()));
  window.jobelloRefresh = refreshAll;
  const colOf = (path) => path.split("/").slice(0, -1).join("/");
  const touched = (path) => { emit("doc:" + path); emit("col:" + colOf(path)); };
  const snapDoc = (id, v) => ({ id, exists: v != null, data: () => (v == null ? undefined : structuredClone(v)) });
  const newId = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-6);

  const docRef = (path) => ({
    id: path.split("/").pop(), path,
    async get() { return snapDoc(this.id, await backend.get(path)); },
    async set(v, o) { const cur = o && o.merge ? (await backend.get(path)) || {} : {}; await backend.put(path, { ...cur, ...structuredClone(v) }); touched(path); },
    async update(v) { const cur = (await backend.get(path)) || {}; await backend.put(path, { ...cur, ...structuredClone(v) }); touched(path); },
    async delete() { await backend.del(path); touched(path); },
    onSnapshot(fn, err) { const run = () => backend.get(path).then((v) => fn(snapDoc(this.id, v)), (e) => err && err(e)); run(); return listen("doc:" + path, run); },
    collection(c) { return colRef(path + "/" + c); },
  });
  const colRef = (col, q = {}) => ({
    path: col,
    doc(id) { return docRef(col + "/" + (id || newId())); },
    async add(v) { const r = docRef(col + "/" + newId()); await r.set(v); return r; },
    where(f, op, val) { return colRef(col, { ...q, w: [...(q.w || []), [f, op, val]] }); },
    orderBy(f, dir) { return colRef(col, { ...q, o: [f, dir] }); },
    limit(n) { return colRef(col, { ...q, l: n }); },
    async _docs() {
      let d = await backend.list(col);
      for (const [f, op, val] of q.w || []) d = d.filter(({ data }) => { const x = data?.[f]; return op === "==" ? x === val : op === "!=" ? x !== val : op === "<" ? x < val : op === "<=" ? x <= val : op === ">" ? x > val : op === ">=" ? x >= val : op === "in" ? val.includes(x) : op === "array-contains" ? (x || []).includes(val) : true; });
      if (q.o) { const [f, dir] = q.o; d.sort((a, b) => (a.data?.[f] > b.data?.[f] ? 1 : -1) * (dir === "desc" ? -1 : 1)); }
      if (q.l) d = d.slice(0, q.l);
      return d.map(({ id, data }) => snapDoc(id, data));
    },
    async get() { const docs = await this._docs(); return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) }; },
    onSnapshot(fn, err) { const run = () => this._docs().then((docs) => fn({ docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) }), (e) => err && err(e)); run(); return listen("col:" + col, run); },
  });
  const db = { collection: (c) => colRef(c), doc: (p) => docRef(p) };

  /* ---------- Fichiers ---------- */
  const blobUrls = {};
  const assets = {
    async upload(blob) { const id = newId(); await putBlob(id, blob); const url = URL.createObjectURL(blob); blobUrls[id] = url; return { id, url, sizeBytes: blob.size, contentType: blob.type }; },
    async list() { return { assets: [], usage: {} }; },
    async delete(id) { await tx("blobs", "readwrite", (s) => s.delete(id)); },
  };
  const remoteB = () => window.jobelloRemote && window.jobelloRemote();
  async function putBlob(id, blob) { await tx("blobs", "readwrite", (s) => s.put(blob, id)); const r = remoteB(); if (r) await r.putBlob(id, blob); }
  async function getBlob(id) { let b = await tx("blobs", "readonly", (s) => s.get(id)); if (!b) { const r = remoteB(); if (r) { b = await r.getBlob(id); if (b) await tx("blobs", "readwrite", (s) => s.put(b, id)); } } return b || null; }
  window.jobelloPutBlob = putBlob;
  // les liens "/_blob/<id>" de l'appli pointent vers les fichiers de ce téléphone
  window.jobelloBlob = async (id) => { if (blobUrls[id]) return blobUrls[id]; const b = await getBlob(id); if (!b) return null; return (blobUrls[id] = URL.createObjectURL(b)); };
  const origFetch = window.fetch.bind(window);
  window.fetch = async (u, o) => { const s = typeof u === "string" ? u : u?.url || ""; const m = s.match(/\/_blob\/([\w-]+)/); if (m) { const b = await getBlob(m[1]); return b ? new Response(b, { headers: { "content-type": b.type || "application/pdf" } }) : new Response("", { status: 404 }); } return origFetch(u, o); };

  /* ---------- Claude (clé Anthropic de ce téléphone) ---------- */
  const MODEL = "claude-opus-5-5";
  const toB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
  async function call(input, opts = {}) {
    const key = ls.get("aiKey", "");
    if (!key) { throw { code: "not_granted", message: "Demande-le à Claude dans ton projet Jobello" }; }
    let messages = typeof input === "string" ? [{ role: "user", content: input }] : input.map((m) => ({ role: m.role, content: m.content }));
    if (opts.images && opts.images.length) {
      const last = messages[messages.length - 1];
      const imgs = await Promise.all(opts.images.map(async (b) => ({ type: "image", source: { type: "base64", media_type: b.type || "image/png", data: await toB64(b) } })));
      last.content = [...imgs, { type: "text", text: typeof last.content === "string" ? last.content : "" }];
    }
    const body = { model: MODEL, max_tokens: 16000, messages, stream: !!opts.onText };
    const res = await origFetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: opts.signal, headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(body) });
    if (!res.ok) { const t = await res.text(); const code = res.status === 401 ? "not_granted" : res.status === 429 ? "rate_limited" : "error"; throw { code, message: res.status === 401 ? "Clé Anthropic refusée" : /credit/i.test(t) ? "Plus de crédit sur le compte Anthropic" : "Claude ne répond pas (" + res.status + ")" }; }
    if (!opts.onText) { const j = await res.json(); return { text: (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join(""), truncated: j.stop_reason === "max_tokens" }; }
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", text = "", stop = "";
    for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; try { const e = JSON.parse(line.slice(5)); if (e.type === "content_block_delta" && e.delta?.type === "text_delta") { text += e.delta.text; opts.onText({ text, delta: e.delta.text }); } if (e.type === "message_delta") stop = e.delta?.stop_reason || ""; } catch {} } }
    return { text, truncated: stop === "max_tokens" };
  }
  const sample = (input, opts) => call(input, opts);
  sample.json = async (input, opts = {}) => { const { text } = await call(input, opts); const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); const s = (m ? m[1] : text).trim(); const a = s.search(/[\[{]/); const t = s.slice(a); try { return JSON.parse(t); } catch { const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]")); return JSON.parse(t.slice(0, end + 1)); } };
  sample.limits = async () => ({ images: { maxCount: 10, mediaTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"] } });

  const downloads = { async save({ filename, data }) { const b = data instanceof Blob ? data : new Blob([data]); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); return { ok: true }; } };

  const caps = { db, assets, sample, downloads };
  window.claude = { use: async (n) => { await (window.jobelloReady || Promise.resolve()); return caps[n] || null; } };
  // un lien "/_blob/<id>" ouvert au toucher : on ouvre le fichier rangé
  document.addEventListener("click", async (e) => { const a = e.target.closest && e.target.closest('a[href^="/_blob/"]'); if (!a) return; e.preventDefault(); const w = window.open("", "_blank"); const u = await window.jobelloBlob(a.getAttribute("href").slice(7)); if (u) { if (w) w.location = u; else location.href = u; } else { w && w.close(); alert("Fichier introuvable"); } }, true);
  window.jobelloLocal = local;
})();
