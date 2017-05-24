declare var staticFiles: {hash: string, files: {[key: string]: string}, languages: string[]};

function detectLanguage(availableLanguages) {
  // note that neither navigator.languages or navigator.language is not available to service workers in Chrome
  // cf https://bugs.chromium.org/p/chromium/issues/detail?id=276159
  // but this is not a big issue as the right files will be added to the cache when first requested
  const preferredLanguages = [].concat(navigator['languages'], self.navigator['language']);
  for (let language of preferredLanguages) {
    if (language) {
      language = language.toLowerCase();
      const dash = language.indexOf('-');
      if (dash > -1) {
        language = language.slice(0, dash);
      }
      if (availableLanguages.indexOf(language) > -1) {
        return language;
      }
    }
  }
  return availableLanguages[0];
}

self.addEventListener('install', (event: any) => {
  event.waitUntil((async () => {
    const fileWithHashRegExp = /\.[0-9a-f]{20}\./;
    const installLanguage = detectLanguage(staticFiles.languages);
    const filesMap = staticFiles.files;
    const cacheToFill = await caches.open(staticFiles.hash);
    await Promise.all(Object.keys(filesMap).map(async (curFile) => {
      // if the file contains a hash and if it was already in the previous cache,
      // then the old file is still valid
      const cachedResponse = fileWithHashRegExp.test(curFile) ? await caches.match(curFile) : null;
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
  if (url.pathname === '/') {
    url.pathname = '/index.html';
  }
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

