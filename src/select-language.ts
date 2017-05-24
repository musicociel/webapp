declare var languageDiffs: {[language: string]: string};

const urlMatch = /(&|\\?)language=([^&]*)(&|$)/i.exec(location.search);
const preferredLanguages = (urlMatch ? [urlMatch[2]] : []).concat(navigator['languages'], self.navigator['language']);

for (let language of preferredLanguages) {
  if (language) {
    language = language.toLowerCase();
    const dash = language.indexOf('-');
    if (dash > -1) {
      language = language.slice(0, dash);
    }
    if (languageDiffs.hasOwnProperty(language)) {
      document.write(languageDiffs[language]);
      break;
    }
  }
}
