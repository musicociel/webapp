import * as diacritics from 'diacritics';
import { PouchDBEntry, PouchDBObjectManager, PouchDBObjectRef } from '../items/pouchdb-items-manager'
import { Song, extractLyrics } from '@musicociel/song-formats/src/song/song';

interface SongDBEntry extends PouchDBEntry<Song> {
  type: 'song';
  lyrics: string;
}

const filterSongs = (doc) => doc.type === 'song';

const baseSongSearchQuery = {
  filter: filterSongs,
  fields: ['object.title', 'lyrics', 'object.authors.name'],
  language: ['en', 'fr']
};

export class PouchDBSongManager extends PouchDBObjectManager<Song, SongDBEntry> {
  getType(): 'song' {
    return 'song';
  }

  toPouchDBEntry(object: Song, existingRef?: PouchDBObjectRef<Song>): SongDBEntry {
    return this.pouchDBEntryHelper(diacritics.remove(object.title).toLowerCase(), {
      object,
      lyrics: extractLyrics(object.music)
    }, existingRef);
  }

  canSearch(): boolean {
    return this._getDB().adapter !== 'http';
  }

  async * search(text: string): AsyncIterableIterator<PouchDBObjectRef<Song>[]> {
    const db = this._getDB();
    if (db.adapter !== 'http') {
      const response = await db.search({
        query: text,
        include_docs: true,
        ...baseSongSearchQuery
      });
      const rows = response.rows;
      const items = rows.map(row => this.toPouchDBObjectRef(row.id, row.rev, row.doc.object, -row.score));
      yield items;
    }
  }

  async updateSearchIndex() {
    const db = this._getDB();
    if (db.adapter !== 'http') {
      await db.search({
        ...baseSongSearchQuery,
        build: true
      });
    }
  }
}
