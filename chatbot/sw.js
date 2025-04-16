self.addEventListener('install', event => {
    event.waitUntil(
      caches.open('chatbot-cache').then(cache =>
        cache.addAll([
          '/chatbot/',
          '/chatbot/index.html',
          '/chatbot/styles.css',
          '/chatbot/script.js'
        ])
      )
    );
  });
  
  self.addEventListener('fetch', event => {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  });