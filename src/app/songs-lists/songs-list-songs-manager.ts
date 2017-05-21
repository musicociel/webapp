import { Song } from '@musicociel/song-formats/src/song/song';
import { SongsList } from '@musicociel/song-formats/src/songs-list/songs-list';
import { ObjectRef, ItemsManager } from '../items/items-manager';
import { MemoryItemsManager } from '../items/memory-items-manager';

// tslint:disable-next-line:no-empty-interface
export interface SongInSongsList extends ObjectRef<Song, SongInSongsList> {};

export class SongsListSongsManager extends MemoryItemsManager<Song, SongInSongsList> {
  constructor(private songsListRef: ObjectRef<SongsList, any>) {
    super();
  }

  readonly() {
    return this.songsListRef.manager.readonly();
  }

  protected async _createObjectRef(object: Song): Promise<SongInSongsList> {
    return {
      manager: this,
      object
    };
  }

  protected async _notifyChange() {
    await this.save();
    super._notifyChange();
  }

  async load() {
    await this._internalAddAll(this.songsListRef.object.songs);
  }

  async save() {
    this.songsListRef = await this.songsListRef.manager.update(this.songsListRef, Object.assign({}, this.songsListRef.object, {
      songs: this.syncList().map(songRef => songRef.object)
    }));
  }
}
