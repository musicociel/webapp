import { Injectable, Injector } from '@angular/core';
import { App, AlertController } from 'ionic-angular';
import { ObjectRef } from '../items/items-manager';
import { ListPageOptions } from '../items/items-list-page.component';
import { SongsListPageComponent } from '../songs/songs-list-page.component';
import { SongsListsListPageComponent } from '../songs-lists/songs-lists-list-page.component';
import { LibrariesManagerService } from '../libraries/libraries-manager.service';
import { Song } from '@musicociel/song-formats/src/song/song';
import { SongsList } from '@musicociel/song-formats/src/songs-list/songs-list';
import { SongsListSongsManager } from './songs-list-songs-manager';
import { LibrarySelectorService } from '../libraries/library-selector.service';
import { AsyncExecService } from '../async-exec.service';
import { SongSelectorService } from '../songs/song-selector.service';
import { ItemSelectorService } from '../items/item-selector.service';

@Injectable()
export class SongsListSelectorService {
  _songSelector: SongSelectorService;

  constructor(
    private itemSelector: ItemSelectorService,
    private librariesManager: LibrariesManagerService,
    private asyncExec: AsyncExecService,
    private alertCtrl: AlertController,
    private librarySelector: LibrarySelectorService,
    private app: App,
    private injector: Injector
  ) {}

  private getSongSelector() {
    let res = this._songSelector;
    if (!res) {
      res = this._songSelector = this.injector.get(SongSelectorService);
    }
    return res;
  }

  async selectWritableSongsList() {
    let selection: ObjectRef<SongsList, any> = null;
    const selector = this.itemSelector.displayItemSelector(SongsListsListPageComponent, {
      title: 'Destination list',
      manager: this.librariesManager.writableSongsListsManager,
      itemTap: (songsListRef) => {
        selection = songsListRef;
        selector.close();
      },
      toolbarButtons: [
        this.addSongListButton()
      ]
    });
    await selector.wait();
    return selection;
  }

  async selectWritableSongsListManager() {
    const songsListRef = await this.selectWritableSongsList();
    if (songsListRef) {
      const res = new SongsListSongsManager(songsListRef);
      await res.load();
      return res;
    }
  }

  async copyToLibrary(songsLists: Set<ObjectRef<SongsList, any>>) {
    const library = await this.librarySelector.selectWritableLibrary();
    if (library) {
      await this.getSongSelector().copyTo(songsLists, library.songsListsManager);
    }
  }

  copyButton() {
    return {
      icon: 'copy',
      handler: (songsLists: Set<ObjectRef<SongsList, any>>) => {
        this.copyToLibrary(songsLists);
      }
    };
  }

  renameSongListButton() {
    return {
      icon: 'create',
      text: 'rename',
      visible: (songsListRef: ObjectRef<SongsList, any>) => !songsListRef.manager.readonly(),
      handler: (songsListRef: ObjectRef<SongsList, any>) => {
        const alertCtrl = this.alertCtrl.create({
          title: 'Rename songs list',
          inputs: [
            {
              name: 'title',
              placeholder: 'Title',
              value: songsListRef.object.title
            }
          ],
          buttons: ['Cancel', {
            text: 'Ok',
            handler: (data) => {
              if (data.title === songsListRef.object.title) {
                return; // not changed!!
              }
              this.asyncExec.asyncExec(async () => {
                await songsListRef.manager.update(songsListRef, Object.assign({}, songsListRef.object, {
                  title: data.title
                }));
              });
            }
          }]
        });
        alertCtrl.present();
      }
    };
  }

  addSongListButton() {
    return {
      icon: 'add',
      handler: async () => {
        const alertCtrl = this.alertCtrl.create({
          title: 'New songs list',
          inputs: [
            {
              name: 'title',
              placeholder: 'Title'
            }
          ],
          buttons: ['Cancel', {
            text: 'Ok',
            handler: (data) => {
              (async () => {
                const library = await this.librarySelector.selectWritableLibrary();
                if (!library) {
                  return;
                }
                this.asyncExec.asyncExec(async () => {
                  await library.songsListsManager.add({
                    title: data.title,
                    songs: []
                  });
                });
              })()
            }
          }]
        });
        alertCtrl.present();
      }
    };
  }

  async displaySongsList(songsListRef: ObjectRef<SongsList, any>) {
    const manager = new SongsListSongsManager(songsListRef);
    await manager.load();
    const selector = this.itemSelector.displayItemSelector(SongsListPageComponent, {
      title: songsListRef.object.title,
      manager,
      toolbarButtons: [{
        icon: 'reorder',
        visible: () => !manager.readonly() && manager.size() > 1,
        handler: async () => {
          const songs = await this.getSongSelector().reorderSongs(manager.syncList());
          if (songs) {
            this.asyncExec.asyncExec(async () => {
              await manager.resetList(songs.map(songRef => songRef.object));
            });
          }
        }
      }, {
        icon: 'add',
        visible: () => !manager.readonly(),
        handler: async () => {
          const songs = await this.getSongSelector().selectSongs();
          if (songs) {
            await this.getSongSelector().copyTo(songs, manager);
          }
        }
      }],
      selectionButtons: [
        this.getSongSelector().copyButton()
      ],
      itemTap: (song, index, array) => {
        this.getSongSelector().displaySongFromList(array, index);
      },
      allowSelection: true,
      allowDelete: true
    });
    await selector.wait();
    manager.dispose();
  }

  getHomeConfiguration(): ListPageOptions<SongsList, any> {
    return {
      title: 'Songs lists',
      allowSearch: false,
      allowSelection: true,
      allowDelete: true,
      manager: this.librariesManager.songsListsManager,
      itemTap: (songsListRef) => {
        this.displaySongsList(songsListRef);
      },
      toolbarButtons: [
        this.addSongListButton()
      ],
      selectionButtons: [
        this.copyButton()
      ],
      slidingButtons: [
        this.renameSongListButton()
      ]
    };
  }
}
