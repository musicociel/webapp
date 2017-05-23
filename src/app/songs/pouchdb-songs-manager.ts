import { PouchDBEntry, PouchDBObjectManager, PouchDBObjectRef } from '../items/pouchdb-items-manager'
import { Song, extractLyrics } from '@musicociel/song-formats/src/song/song';
import { songToPouchDBEntry, SongPouchDBEntry } from '@musicociel/song-formats/src/song/pouchdb';

const filterSongs = (doc) => doc.type === 'song';

const baseSongSearchQuery = {
  filter: filterSongs,
  fields: ['object.title', 'lyrics', 'object.authors.name'],
  language: ['en', 'fr']
};

export class PouchDBSongManager extends PouchDBObjectManager<Song, SongPouchDBEntry> {
  getType(): 'song' {
    return 'song';
  }

  toPouchDBEntry(object: Song, existingRef?: PouchDBObjectRef<Song>): SongPouchDBEntry {
    return songToPouchDBEntry(object);
  }

  protected async _put(entry) {
    try {
      return await super._put(entry);
    } catch (e) {
      if (e.name === 'conflict') {
        // as the id contains the checksum of the content, if a document with the same
        // id already exists, it means (with a very high probability) that it is the same document
        const db = this._getDB();
        const existingDocument = await db.get(entry._id);
        return {
          ok: true,
          id: existingDocument._id,
          rev: existingDocument._rev
        };
      } else {
        throw e;
      }
    }
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
