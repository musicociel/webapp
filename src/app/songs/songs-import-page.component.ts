import { Component } from '@angular/core';
import { autoDetectImporter } from '@musicociel/song-formats/src/song/formats/import';
import { readFileAsText } from '../../utils/read-file';
import { AsyncExecService } from '../async-exec.service';
import { LibrarySelectorService } from '../libraries/library-selector.service';

@Component({
  selector: 'app-songs-import-page',
  template: `
  <ion-header>
    <ion-navbar>
      <ion-title i18n>Import songs</ion-title>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <div padding>
      Musicociel can import songs from various file formats.
      <br><br>
      <input type="file" (change)="importFiles($event.target)" multiple>
    </div>
  </ion-content>
  `,
  styles: []
})
export class SongsImportPageComponent {

  constructor(private asyncExec: AsyncExecService, private librarySelector: LibrarySelectorService) {}

  async importFiles(input) {
    const library = await this.librarySelector.selectWritableLibrary();
    if (library) {
      await this.asyncExec.asyncExec(async () => {
        const files = input.files;
        for (const file of files) {
          try {
            const fileContent = await readFileAsText(file);
            const song = autoDetectImporter.importFile(fileContent);
            await library.songsManager.add(song);
          } catch (e) {
            // TODO: better process errors
            console.log('Error in openFiles: ', e);
          }
        }
        input.value = null;
      });
    }
  }

}
