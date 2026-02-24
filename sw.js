const CACHE_NAME = "neon-strike-v3-stable"; // Incrementing version to clear old bad cache

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ================= INSTALL =================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Safe caching loop: prevents one failed file from breaking the whole install
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
          console.log("Neon Strike Cached:", file);
        } catch (err) {
          console.warn("Neon Strike failed to cache:", file);
        }
      }
    })
  );
  self.skipWaiting();
});

// ================= ACTIVATE =================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ================= FETCH =================
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // 1️⃣ Fix for ERR_FAILED: Network-First for Navigation
  // This ensures if index.html is broken in cache, it grabs a fresh one from GitHub
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", clone));
          return response;
        })
        .catch(() => caches.match("./index.html")) // Fallback to cache only if network is totally dead
    );
    return;
  }

  // 2️⃣ Better Offline Backup: Cache-First + Auto-Cache New Assets
  // This automatically saves any new icons, sounds, or fonts you add later
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // Fallback for broken assets
        return caches.match("./index.html");
      });
    })
  );
});
