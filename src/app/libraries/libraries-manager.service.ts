import { Storage } from '@ionic/storage';
import { Injectable } from '@angular/core';
import * as uuid from 'uuid';
import { Library, LibraryConfig } from './library';
import { Subscription } from 'rxjs/Subscription';
import { MergeManager } from '../items/merge-manager';
import { MemoryItemsManager } from '../items/memory-items-manager';
import { FilteredManager } from '../items/filtered-items-manager';

const librariesSorter = (library1: Library, library2: Library): number => {
  const library1Config = library1.object, library2Config = library2.object;
  if (library1Config.enabled !== library2Config.enabled) {
    return library1Config.enabled ? -1 : 1;
  } else {
    const name1 = library1Config.displayName.toLowerCase(), name2 = library2Config.displayName.toLowerCase();
    if (name1 !== name2) {
      return name1 < name2 ? -1 : 1;
    } else {
      return 0;
    }
  }
};

export const defaultLibraryConfig = (): LibraryConfig => {
  return {
    displayName: '',
    id: '',
    enabled: true,
    localEnabled: true,
    readonly: true,
    remoteEnabled: true,
    remoteURL: ''
  };
};

export const validateLibraryConfig = (config: LibraryConfig = defaultLibraryConfig()) => {
  if (!config.id) {
    config.id = uuid.v4();
  }
  if (!config.remoteURL) {
    config.remoteEnabled = false;
  }
  if (!config.localEnabled && !config.remoteEnabled) {
    config.enabled = false;
  }
  return config;
};

const enabledLibraryFilter = (library: Library) => library.object.enabled;
const writableLibraryFilter = (library: Library) => enabledLibraryFilter(library) && !library.readonly();
const getSongsListManager = (library: Library) => library.songsListsManager;
const getSongsManager = (library: Library) => library.songsManager;

@Injectable()
export class LibrariesManagerService extends MemoryItemsManager<LibraryConfig, Library> {
  songsManager = new MergeManager();
  songsListsManager = new MergeManager();
  writableSongsListsManager = new MergeManager();
  writableLibraries = new FilteredManager(this, writableLibraryFilter);
  synchronizableLibraries: Library[] = [];

  constructor(private storage: Storage) {
    super();
    this.load();
  }

  protected async _notifyChange() {
    await this.save();
    await super._notifyChange();
  }

  async load() {
    const libraryConfigs = (await this.storage.get('libraries')) || [];
    this._clearAll();
    await this._internalAddAll(libraryConfigs);
    await this.save();
  }

  async save() {
    const list = this.syncList();
    await this.storage.set('libraries', list.map(library => library.object));
    const enabledList = list.filter(enabledLibraryFilter);
    await this.songsManager.setManagers(enabledList.map(getSongsManager));
    await this.songsListsManager.setManagers(enabledList.map(getSongsListManager));
    const writableList = enabledList.filter(writableLibraryFilter);
    await this.writableSongsListsManager.setManagers(writableList.map(getSongsListManager));
    this.synchronizableLibraries = enabledList.filter(library => library.isSynchronizable());
  }

  protected async _createObjectRef(object: LibraryConfig): Promise<Library> {
    return new Library(this, validateLibraryConfig(object));
  }

  protected async _removeObjectRef(objectRef: Library) {
    await objectRef.destroy();
    objectRef.dispose();
  }

  protected async _changeObjectRef(objectRef: Library, newConfig: LibraryConfig): Promise<Library> {
    const oldConfig = objectRef.object;
    newConfig = validateLibraryConfig(newConfig);
    objectRef.object = newConfig;
    const oldHasLocal = oldConfig.enabled && oldConfig.localEnabled;
    const newHasLocal = newConfig.enabled && newConfig.localEnabled;
    const oldIsRemote = !oldHasLocal && oldConfig.enabled && oldConfig.remoteEnabled;
    const newIsRemote = !newHasLocal && newConfig.enabled && newConfig.remoteEnabled;
    const oldRemote = (oldConfig.enabled && oldConfig.remoteEnabled) ? oldConfig.remoteURL : null;
    const newRemote = (newConfig.enabled && newConfig.remoteEnabled) ? newConfig.remoteURL : null;
    if (oldHasLocal !== newHasLocal || oldIsRemote !== newIsRemote || (oldIsRemote && newIsRemote && oldRemote !== newRemote)) {
      await objectRef.close();
    }
    return objectRef;
  }
}
