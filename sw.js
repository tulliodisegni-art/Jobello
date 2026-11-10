// Garde Jobello disponible même avec un réseau faible : la page et ses scripts sont mis de côté.
// Garde aussi la pastille de l'icône à jour. Reçoit aussi les notifications envoyées par le serveur (voir notifs.js et supabase/).
const CACHE = "jobello-v26";
const SHELL = ["./", "index.html", "config.js", "shim.js", "sync.js", "gate.js", "notifs.js", "plus.js", "vendor/supabase.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== "jobello-meta").map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});

/* ---------- Pastille sur l'icône : le nombre de choses urgentes, envoyé par l'appli ---------- */
let badge = 0;
const BADGE_URL = "./__badge";
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "jobello-badge") return;
  badge = Math.max(0, e.data.n | 0);
  e.waitUntil(caches.open("jobello-meta").then((c) => c.put(BADGE_URL, new Response(String(badge)))));
});
const lireBadge = () => caches.open("jobello-meta").then((c) => c.match(BADGE_URL)).then((r) => (r ? r.text() : "0")).then((t) => (badge = parseInt(t, 10) || 0)).catch(() => badge);

/* ---------- Notifications ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  const pastille = () => (self.navigator && self.navigator.setAppBadge ? lireBadge().then((n) => self.navigator.setAppBadge(Math.max(n, 1))).catch(() => {}) : Promise.resolve());
  e.waitUntil(pastille().then(() => self.registration.showNotification(d.title || "Jobello", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || undefined, lang: "fr",
    data: { url: new URL(d.url || "./", self.registration.scope).href },
  })));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: "jobello-ouvrir", url }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
