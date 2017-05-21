import * as diacritics from 'diacritics';
import { PouchDBEntry, PouchDBObjectManager, PouchDBObjectRef } from '../items/pouchdb-items-manager'
import { SongsList } from '@musicociel/song-formats/src/songs-list/songs-list';

interface SongsListDBEntry extends PouchDBEntry<SongsList> {
  type: 'songslist';
}

export class PouchDBSongsListManager extends PouchDBObjectManager<SongsList, SongsListDBEntry> {
  getType(): 'songslist' {
    return 'songslist';
  }

  toPouchDBEntry(object: SongsList, existingRef?: PouchDBObjectRef<SongsList>): SongsListDBEntry {
    return this.pouchDBEntryHelper(diacritics.remove(object.title).toLowerCase(), {
      object
    }, existingRef);
  }

}
