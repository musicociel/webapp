import { Injectable, Injector } from '@angular/core';
import { App, ActionSheetController } from 'ionic-angular';
import { Song } from '@musicociel/song-formats/src/song/song';
import { ObjectRef, ItemsManager } from '../items/items-manager';
import { PartialList } from '../items/items-list-utils';
import { ListPageOptions } from '../items/items-list-page.component';
import { LibrariesManagerService } from '../libraries/libraries-manager.service';
import { SongPageComponent } from './song-page.component';
import { LibrarySelectorService } from '../libraries/library-selector.service';
import { SongsListSelectorService } from '../songs-lists/songs-list-selector.service';
import { SongsListPageComponent, SongsListReorderPageComponent } from '../songs/songs-list-page.component';
import { SongsImportPageComponent } from './songs-import-page.component';
import { ItemSelectorService } from '../items/item-selector.service';
import { AsyncExecService } from '../async-exec.service';

@Injectable()
export class SongSelectorService {
  private _songsListSelector: SongsListSelectorService;

  constructor(
    private itemSelector: ItemSelectorService,
    private librariesManager: LibrariesManagerService,
    private app: App,
    private actionSheetCtrl: ActionSheetController,
    private librarySelector: LibrarySelectorService,
    private asyncExec: AsyncExecService,
    private injector: Injector
  ) {}

  private getSongsListSelector() {
    let res = this._songsListSelector;
    if (!res) {
      res = this._songsListSelector = this.injector.get(SongsListSelectorService);
    }
    return res;
  }

  async selectSongs(): Promise<Set<ObjectRef<Song, any>>> {
    let selection: Set<ObjectRef<Song, any>> | null = null;
    const selector = this.itemSelector.displayItemSelector(SongsListPageComponent, {
      title: 'Select songs',
      manager: this.librariesManager.songsManager,
      allowSearch: true,
      allowSelection: true,
      itemTap: (song) => {
        selection = new Set();
        selection.add(song);
        selector.close();
      },
      selectionButtons: [{
        icon: 'checkmark',
        handler: (songs) => {
          selection = songs;
          selector.close();
        }
      }]
    });
    await selector.wait();
    return selection;
  }

  async reorderSongs<T extends ObjectRef<Song, T>>(songs: ObjectRef<Song, T>[]): Promise<ObjectRef<Song, T>[]> {
    let response: ObjectRef<Song, T>[] | null = null;
    const selector = this.itemSelector.displayItemSelector(SongsListReorderPageComponent, {
      items: songs,
      validate: (newOrder) => {
        response = newOrder;
        selector.close();
      }
    });
    await selector.wait();
    return response;
  }

  displaySongFromList(list: PartialList<ObjectRef<Song, any>>, index: number) {
    let itemIndex = index;
    const displaySong = async (songPageInstance, newItemIndex) => {
      while (newItemIndex >= list.items.length && list.fetchMore) {
        list = await list.fetchMore();
      }
      const newSongRef = list.items[newItemIndex];
      if (!newSongRef) {
        return;
      }
      itemIndex = newItemIndex;
      songPageInstance.setSong(newSongRef.object);
    };
    const activeNav = this.app.getActiveNav();
    activeNav.push(SongPageComponent, {
      song: list.items[index].object,
      goUp: (songPageInstance) => {
        displaySong(songPageInstance, itemIndex - 1);
      },
      goDown: (songPageInstance) => {
        displaySong(songPageInstance, itemIndex + 1);
      }
    });
  }

  addSongsButton() {
    return {
      icon: 'add',
      handler: () => {
        this.app.getActiveNav().push(SongsImportPageComponent);
      }
    };
  }

  async copyToLibrary(songs: Set<ObjectRef<Song, any>>) {
    const library = await this.librarySelector.selectWritableLibrary();
    if (library) {
      await this.copyTo(songs, library.songsManager);
    }
  }

  async copyToSongsList(songs: Set<ObjectRef<Song, any>>) {
    const songsListManager = await this.getSongsListSelector().selectWritableSongsListManager();
    if (songsListManager) {
      await this.copyTo(songs, songsListManager);
      songsListManager.dispose();
    }
  }

  async copyTo<T, RefT extends ObjectRef<T, RefT>>(objectRefs: Set<RefT>, manager: ItemsManager<T, RefT>) {
    await this.asyncExec.asyncExec(async () => {
      const itemObjects = [];
      for (const item of objectRefs) {
        itemObjects.push(item.object);
      }
      await manager.addAll(itemObjects);
    });
  }

  copyButton() {
    return {
      icon: 'copy',
      handler: (songs: Set<ObjectRef<Song, any>>) => {
        const actionSheet = this.actionSheetCtrl.create({
          buttons: [
            {
              text: 'Add to library...',
              handler: () => {
                this.copyToLibrary(songs);
              }
            },
            {
              text: 'Add to songs list...',
              handler: () => {
                this.copyToSongsList(songs);
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {}
            }
          ]
        });

        actionSheet.present();
      }
    };
  }

  getHomeConfiguration(): ListPageOptions<Song, any> {
    return {
      title: 'Songs',
      allowSearch: true,
      allowSelection: true,
      allowDelete: true,
      itemTap: (unused, index, array) => {
        this.displaySongFromList(array, index);
      },
      manager: this.librariesManager.songsManager,
      toolbarButtons: [
        this.addSongsButton()
      ],
      selectionButtons: [
        this.copyButton()
      ]
    };
  }
}
