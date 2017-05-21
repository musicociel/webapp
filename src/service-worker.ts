declare var staticFiles: {hash: string, files: {[key: string]: string}, languages: string[]};

const detectLanguage = () => {
  const availableLanguages = staticFiles.languages;
  // note that neither navigator.languages or navigator.language is not available to service workers in Chrome
  // cf https://bugs.chromium.org/p/chromium/issues/detail?id=276159
  // but this is not a big issue as the right files will be added to the cache when first requested
  const preferredLanguages = [].concat(navigator['languages'], self.navigator['language']);
  for (let language of preferredLanguages) {
    if (language) {
      language = language.toLowerCase();
      if (availableLanguages.indexOf(language) > -1) {
        return language;
      }
    }
  }
  return availableLanguages[0];
}

self.addEventListener('install', (event: any) => {
  event.waitUntil((async () => {
    const installLanguage = detectLanguage();
    const filesMap = staticFiles.files;
    const cacheToFill = await caches.open(staticFiles.hash);
    await Promise.all(Object.keys(filesMap).map(async (curFile) => {
      // first look in existing caches in case it is already there:
      const cachedResponse = await caches.match(curFile);
      if (cachedResponse) {
        cacheToFill.put(curFile, cachedResponse);
      } else {
        const usage = filesMap[curFile];
        if (usage === installLanguage || usage === 'all') {
          await cacheToFill.add(curFile);
        }
      }
    }));
  })());
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    const hash = staticFiles.hash;
    await Promise.all(cacheKeys.map(async cacheKey => {
      if (cacheKey !== hash) {
        caches.delete(cacheKey);
      }
    }));
  })());
});

self.addEventListener('fetch', (event: any) => {
  const request: Request = event.request;
  const url = new URL(request.url);
  if (staticFiles.files[url.pathname]) {
    event.respondWith((async () => {
      let response: Response = await caches.match(request);
      if (!response) {
        response = await fetch(url.pathname);
        const cacheToFill = await caches.open(staticFiles.hash);
        cacheToFill.put(url.pathname, response.clone());
      }
      return response;
    })());
  }
});

