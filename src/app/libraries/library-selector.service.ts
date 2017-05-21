import { Injectable } from '@angular/core';
import { App } from 'ionic-angular';
import { LibrariesManagerService } from './libraries-manager.service';
import { ItemsManager, ObjectRef } from '../items/items-manager';
import { ListPageOptions } from '../items/items-list-page.component';
import { Library, LibraryConfig } from './library';
import { LibrariesListPageComponent } from './libraries-list-page.component';
import { LibraryEditPageComponent } from './library-edit-page.component';
import { ItemSelectorService } from '../items/item-selector.service';
import { AsyncExecService } from '../async-exec.service';

@Injectable()
export class LibrarySelectorService {

  constructor(
    private itemSelector: ItemSelectorService,
    private librariesManager: LibrariesManagerService,
    private asyncExec: AsyncExecService,
    private app: App
  ) {}

  getHomeConfiguration(): ListPageOptions<LibraryConfig, Library> {
    return {
      title: 'Libraries',
      manager: this.librariesManager,
      allowDelete: true,
      allowSelection: true,
      itemTap: (library) => {
        this.editLibrary(library);
      },
      toolbarButtons: [
        this.synchronizeAllButton(),
        this.addLibraryButton()
      ]
    };
  }

  editLibrary(library?: Library, mustBeWritable = false) {
    this.app.getActiveNav().push(LibraryEditPageComponent, {
      library,
      mustBeWritable
    });
  }

  synchronizeAllButton() {
    return {
      icon: 'sync',
      color: 'primary',
      visible: () => this.librariesManager.synchronizableLibraries.length > 0,
      handler: async () => {
        await this.asyncExec.asyncExec(async () => {
          const libraries = this.librariesManager.synchronizableLibraries;
          for (const library of libraries) {
            await library.synchronize();
          }
        });
      }
    };
  }

  addLibraryButton(mustBeWritable = false) {
    return {
      icon: 'add',
      handler: () => {
        this.editLibrary(null, mustBeWritable);
      }
    };
  }

  async selectWritableLibrary(): Promise<Library> {
    let selection: Library | null = null;
    const selector = this.itemSelector.displayItemSelector(LibrariesListPageComponent, {
      title: 'Destination library',
      manager: this.librariesManager.writableLibraries,
      itemTap: library => {
        selection = library;
        selector.close();
      },
      extra: {
        selectWritableLibrary: true
      },
      toolbarButtons: [
        this.addLibraryButton(true)
      ]
    });
    await selector.wait();
    return selection;
  }

}
