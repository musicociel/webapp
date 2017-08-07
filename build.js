const fs = require('fs');
const crypto = require('crypto');
const child_process = require('child_process');
const path = require('path');
const recursiveCopy = require('recursive-copy');
const ng = require.resolve('@angular/cli/bin/ng');
const tsc = require.resolve('typescript/bin/tsc');
const uglifyjs = require.resolve('uglify-js/bin/uglifyjs');
const {xliffmergeOptions} = require('./xliffmerge.json');
const promisify = require('pify');
const rimraf = promisify(require('rimraf'));
const parse5 = require('parse5');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

const sourceFolder = path.join(__dirname, 'src');
const buildFolder = path.join(__dirname, 'build');
const destinationFolder = path.join(buildFolder, 'output');
const languagesFolder = path.join(buildFolder, 'tmp-languages');
const serviceWorkerBuildFolder = path.join(buildFolder, 'service-worker');
const selectLanguageBuildFolder = path.join(buildFolder, 'select-language');

const rootAssets = ['index.html', 'manifest.json', 'favicon.ico', 'icon512.png', 'icon144.png'];

function fork(...args) {
  return new Promise((resolve, reject) => {
    const proc = child_process.fork(...args);
    proc.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with ${code} ${signal}`));
      }
    });
  });
}

async function clean() {
  console.log(`> rm -rf ${buildFolder}`);
  await rimraf(buildFolder);
  console.log(`> mkdir ${buildFolder}`);
  await mkdir(buildFolder);
}

async function buildLanguage({language, production, destinationFolder}) {
  const commandLine = [
    'build',
    '--output-path', destinationFolder,
    '--deploy-url', './statics/',
    '--locale', language,
    '--i18n-file', `src/i18n/messages.${language}.xlf`,
    '--i18n-format', 'xlf'
  ];
  if (production) {
    commandLine.push('--aot', '--target=production');
  } else {
    commandLine.push('--target=development');
  }
  console.log(`> ng ${commandLine.join(' ')}`);
  await fork(ng, commandLine);
}

async function buildAllLanguages({languages, production}) {
  console.log(`> mkdir ${languagesFolder}`);
  await mkdir(languagesFolder);
  const filesPerLanguage = {};
  for (const language of languages) {
    const curLanguageFolder = `${languagesFolder}/${language}`;
    await buildLanguage({language, production, destinationFolder: curLanguageFolder});
    const curLanguageFiles = filesPerLanguage[language] = [];
    await recursiveCopy(curLanguageFolder, `${destinationFolder}/statics`, {
      rename: (fileName) => {
        if (rootAssets.indexOf(fileName) > -1) {
          return `../${fileName}`;
        }
        if (fileName) {
          curLanguageFiles.push(fileName);
        }
        return fileName;
      },
      overwrite: true
    });
  }
  return filesPerLanguage;
}

function compareStaticFiles(filesPerLanguage) {
  const files = {};
  const languages = Object.keys(filesPerLanguage);
  for (const language of languages) {
    for (const file of filesPerLanguage[language]) {
      const key = `/statics/${file}`;
      let entry = files[key];
      if (entry) {
        files[key] = 'all';
      } else {
        files[key] = language;
      }
    }
  }
  for (const file of rootAssets) {
    files[`/${file}`] = 'all';
  }
  return {
    files
  };
}

async function buildServiceWorker({production, staticFiles}) {
  const tscCommandLine = [
    '-p', path.join(sourceFolder, 'tsconfig.serviceworker.json')
  ];
  console.log(`> tsc ${tscCommandLine.join(' ')}`);
  await fork(tsc, tscCommandLine);
  const serviceWorkerTempFileName = path.join(serviceWorkerBuildFolder, 'service-worker.js');
  const serviceWorkerDestinationFileName = path.join(destinationFolder, 'service-worker.js');
  let serviceWorkerFileContent = await readFile(serviceWorkerTempFileName, 'utf-8');
  serviceWorkerFileContent = `(function (staticFiles){\n${serviceWorkerFileContent}\n})(${JSON.stringify(staticFiles)});`;
  if (production) {
    await writeFile(serviceWorkerTempFileName, serviceWorkerFileContent, 'utf-8');
    const uglifyCommandLine = [
      '-o', serviceWorkerDestinationFileName,
      '--compress', '--mangle', '--',
      serviceWorkerTempFileName
    ]
    console.log(`> uglifyjs ${uglifyCommandLine.join(' ')}`);
    await fork(uglifyjs, uglifyCommandLine);
  } else {
    await writeFile(serviceWorkerDestinationFileName, serviceWorkerFileContent, 'utf-8');
  }
}

async function buildSelectLanguage(languageDiffs) {
  const tscCommandLine = [
    '-p', path.join(sourceFolder, 'tsconfig.selectlanguage.json')
  ];
  console.log(`> tsc ${tscCommandLine.join(' ')}`);
  await fork(tsc, tscCommandLine);
  const tempFileName = path.join(selectLanguageBuildFolder, 'select-language.js');
  let fileContent = await readFile(tempFileName, 'utf-8');
  fileContent = `(function (languageDiffs){\n${fileContent}\n})(${JSON.stringify(languageDiffs)});`;
  await writeFile(tempFileName, fileContent, 'utf-8');
  const uglifyCommandLine = [
    '-o', tempFileName,
    '--compress', '--mangle', '--',
    tempFileName
  ];
  console.log(`> uglifyjs ${uglifyCommandLine.join(' ')}`);
  await fork(uglifyjs, uglifyCommandLine);
  fileContent = await readFile(tempFileName, 'utf-8');
  const destinationFileName = `select-language.${createHash(fileContent)}.js`;
  await writeFile(path.join(destinationFolder, 'statics', destinationFileName), fileContent, 'utf-8');
  return destinationFileName;
}

function isSameNode(node1, node2) {
  const attrs1 = node1.attrs;
  const attrs2 = node2.attrs;
  let res = node1.nodeName === node2.nodeName && (!!attrs1 === !!attrs2);
  if (res && !!attrs1) {
    const length = attrs1.length;
    if (length === attrs2.length) {
      for (let i = length - 1; i >= 0; i--) {
        const obj1 = attrs1[i];
        const obj2 = attrs2[i];
        if (obj1.name !== obj2.name || obj1.value !== obj2.value) {
          res = false;
          break;
        }
      }
    } else {
      res = false;
    }
  }
  return res;
}

function findDiffs(curPath, node1, node2, diffs) {
  const node1ChildNodes = node1.childNodes;
  const node2ChildNodes = node2.childNodes;
  if (node1ChildNodes && node2ChildNodes) {
    const length = node1ChildNodes.length;
    if (length != node2ChildNodes.length) {
      throw new Error(`Different child count: ${length} != ${node2ChildNodes.length}`);
    }
    for (let i = 0; i < length; i++) {
      child1 = node1ChildNodes[i];
      child2 = node2ChildNodes[i];
      if (isSameNode(child1, child2)) {
        findDiffs(curPath.concat(i), child1, child2, diffs);
      } else {
        diffs.push({
          parentPath: curPath,
          index: i,
          child1,
          child2
        });
      }
    }
  }
  return diffs;
}

function serializeNodes(nodes) {
  const fragment = parse5.treeAdapters.default.createDocumentFragment();
  fragment.childNodes = nodes;
  return parse5.serialize(fragment);
}

function createHash(content) {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex').slice(0, 20);
}

function createScriptTag(src) {
  return parse5.treeAdapters.default.createElement('script', null, [{
    name: 'type',
    value: "text/javascript"
  }, {
    name: 'src',
    value: src
  }]);
}

function isNotEmptyTextNode(node) {
  return node.nodeName === '#text' ? !/^\s*$/.test(node.value) : true;
}

function filterHtmlNodes(node, fn) {
  const res = fn(node);
  if (res) {
    const childNodes = node.childNodes;
    if (childNodes) {
      for (let i = childNodes.length - 1; i >= 0; i--) {
        if (!filterHtmlNodes(childNodes[i], fn)) {
          childNodes.splice(i, 1);
        }
      }
    }
  }
  return res;
};

async function buildIndex({ languages, staticFiles }) {
  const firstLanguage = languages[0];
  let indexContent = await readFile(`${languagesFolder}/${firstLanguage}/index.html`, 'utf-8');
  const indexDocument = parse5.parse(indexContent);
  if (languages.length > 1) {
    const languageDiffs = {};
    let firstDiff = null;
    let lastDiff = null;
    let diffParentPath = null;
    let firstDiffIndex = null;
    let lastDiffIndex = null;
    for (const language of languages) {
      if (language === firstLanguage) {
        continue;
      }
      const curLanguageIndexContent = await readFile(`${languagesFolder}/${language}/index.html`, 'utf-8');
      const curLanguageIndexDocument = parse5.parse(curLanguageIndexContent);

      const curLanguageDiffs = findDiffs([], curLanguageIndexDocument, indexDocument, []);
      const curLanguageFirstDiff = curLanguageDiffs[0];
      const curLanguageFirstDiffParentPath = curLanguageFirstDiff.parentPath.join('/');
      const curLanguageLastDiff = curLanguageDiffs[curLanguageDiffs.length - 1];
      const curLanguageLastDiffParentPath = curLanguageLastDiff.parentPath.join('/');
      if (curLanguageFirstDiffParentPath !== curLanguageLastDiffParentPath) {
        throw new Error(`Found differences in different parent nodes in ${language}`);
      }
      if (firstDiff == null) {
        firstDiff = curLanguageFirstDiff;
        lastDiff = curLanguageLastDiff;
        firstDiffIndex = firstDiff.index;
        lastDiffIndex = lastDiff.index;
        diffParentPath = curLanguageFirstDiffParentPath;
        languageDiffs[firstLanguage] = serializeNodes(firstDiff.child2.parentNode.childNodes.slice(firstDiffIndex, lastDiffIndex + 1));
      } else if (diffParentPath !== curLanguageFirstDiffParentPath || firstDiffIndex !== curLanguageFirstDiff.index || lastDiffIndex !== curLanguageLastDiff.index) {
        throw new Error(`Found differences at different places depending on the language!`);
      }
      languageDiffs[language] = serializeNodes(curLanguageFirstDiff.child1.parentNode.childNodes.slice(firstDiffIndex, lastDiffIndex + 1));
    }
    const languageSelectionFileName = await buildSelectLanguage(languageDiffs);
    staticFiles.files[`/statics/${languageSelectionFileName}`] = 'all';

    const cordovaScriptTag = parse5.treeAdapters.default.createElement('script');
    const bodyChildNodes = firstDiff.child2.parentNode.childNodes;
    bodyChildNodes.splice(
      firstDiffIndex,
      lastDiffIndex - firstDiffIndex + 1,
      createScriptTag(`./statics/${languageSelectionFileName}`)
    );
  }
  filterHtmlNodes(indexDocument, isNotEmptyTextNode);
  indexContent = parse5.serialize(indexDocument);
  staticFiles.hash = createHash(indexContent);
  staticFiles.languages = languages;
  await writeFile(`${destinationFolder}/index.html`, indexContent, 'utf-8');
}

async function createIndexCordova() {
  const indexContent = await readFile(`${destinationFolder}/index.html`, 'utf-8');
  const indexDocument = parse5.parse(indexContent);
  filterHtmlNodes(indexDocument, (node) => {
    const nodeName = node.nodeName;
    if (nodeName === 'body') {
      node.childNodes.unshift(createScriptTag('cordova.js'));
    } else if (nodeName === 'base') {
      // removes the base tag
      return false;
    } else if (nodeName === 'rel' && node.attrs.some(attr => attr.name === 'rel' && attr.value === 'manifest')) {
      // removes the link to the manifest file
      return false;
    }
    return isNotEmptyTextNode(node);
  });
  await writeFile(`${destinationFolder}/index.cordova.html`, parse5.serialize(indexDocument), 'utf-8');
}

async function build(args) {
  const production = args.indexOf('--production') > -1;
  const languages = production ? xliffmergeOptions.languages : [xliffmergeOptions.defaultLanguage];
  await clean();
  const filesPerLanguage = await buildAllLanguages({ production, languages });
  const staticFiles = compareStaticFiles(filesPerLanguage);
  await buildIndex({ languages, staticFiles });
  await createIndexCordova();
  await buildServiceWorker({production, staticFiles});
}

build(process.argv.slice(2)).catch(error => {
  console.error(`${error}`);
  process.exit(1);
});
