// Service worker do OMS Logística: guarda o app para abrir rápido (e sem sinal) e recebe as notificações.
// Ao publicar mudança em qualquer arquivo do app, suba VERSAO.
const VERSAO = 'log-v24';
const ARQUIVOS = [
  './', './index.html', './css/app.css?v=24', './js/app.js?v=24', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)));
});

// A nova versão espera o usuário tocar em "Atualizar" no app (mensagem abaixo).
self.addEventListener('message', e => { if (e.data === 'ATUALIZAR') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // API sempre pela rede
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  const titulo = d.title || d.titulo || 'OMS Logística';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.body || d.corpo || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: d.url || './' }, tag: d.tag, renotify: !!d.tag, vibrate: [200, 100, 200], requireInteraction: /sugeriu|Pode outro/i.test(titulo + (d.corpo || '')),
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) { c.navigate(alvo); return c.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
