import { Injectable, EventEmitter } from '@angular/core';
import * as PouchDB from 'pouchdb-browser';
import * as lunr from 'lunr';
import * as lunrStemmer from 'lunr-languages/lunr.stemmer.support';
import * as lunrMulti from 'lunr-languages/lunr.multi';
import * as lunrFr from 'lunr-languages/lunr.fr';
import * as pouchdbQuickSearch from 'pouchdb-quick-search';
import * as pouchdbCordovaSqlite from 'pouchdb-adapter-cordova-sqlite';
import { ItemsManager, ObjectRef } from '../items/items-manager';
import { PouchDBSongManager } from '../songs/pouchdb-songs-manager';
import { PouchDBSongsListManager } from '../songs-lists/pouchdb-songs-lists-manager';

window['lunr'] = lunr;
lunrStemmer(lunr);
lunrMulti(lunr);
lunrFr(lunr);

PouchDB.plugin(pouchdbQuickSearch);

const cordova = !!window['cordova'];
if (cordova) {
  PouchDB.plugin(pouchdbCordovaSqlite);
}

export interface LibraryConfig {
  id: string;
  displayName: string;
  enabled: boolean;
  remoteURL: string;
  remoteEnabled: boolean;
  localEnabled: boolean;
  readonly: boolean;
}

export class Library implements ObjectRef<LibraryConfig, Library> {
  db: PouchDB.Database<SongDBEntry> | null;

  songsManager = new PouchDBSongManager(() => this.getDB(), () => this.readonly());
  songsListsManager = new PouchDBSongsListManager(() => this.getDB(), () => this.readonly());

  constructor(public manager: ItemsManager<LibraryConfig, Library>, public object: LibraryConfig) {}

  readonly() {
    return this.object.readonly;
  }

  async close() {
    const db = this.db;
    this.db = null;
    if (db) {
      await db.close();
    }
  }

  _localDatabaseConfig() {
    return cordova ? {
      adapter: 'cordova-sqlite',
      name: `library-${this.object.id}.db`,
      auto_compaction: true
    } : {
      name: `library-${this.object.id}`,
      auto_compaction: true
    };
  }

  _remoteDatabaseConfig() {
    return {
      adapter: 'http',
      name: this.object.remoteURL
    };
  }

  getDB() {
    if (!this.db) {
      const config = this.object;
      if (config.enabled && (config.localEnabled || config.remoteEnabled)) {
        this.db = new PouchDB(config.localEnabled ? this._localDatabaseConfig() : this._remoteDatabaseConfig());
      }
    }
    return this.db;
  }

  async destroy() {
    await this.close();
    const dbConfig: any = this._localDatabaseConfig();
    dbConfig.skip_setup = true;
    const db = new PouchDB(dbConfig);
    await db.destroy();
  }

  dispose() {
    this.songsManager.dispose();
    this.songsListsManager.dispose();
  }

  isSynchronizable() {
    const config = this.object;
    return config.enabled && config.remoteEnabled && config.localEnabled;
  }

  async synchronize() {
    const config = this.object;
    if (this.isSynchronizable()) {
      const db = this.getDB();
      const remoteURL = this.object.remoteURL;
      if (config.readonly) {
        // one-way
        await db.replicate.from(remoteURL);
      } else {
        // two-way
        await db.sync(remoteURL);
      }
      await this.songsManager.markChange();
      await this.songsListsManager.markChange();

      // start building search index in the background:
      this.songsManager.updateSearchIndex();
    }
  }

  async setEnabled(newValue: boolean) {
    const config = Object.assign({}, this.object);
    if (config.enabled !== newValue) {
      config.enabled = newValue;
      await this.manager.update(this, config);
    }
  }
}
