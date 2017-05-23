import { Component } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { importers, importFile } from '@musicociel/song-formats/src/song/formats/import';
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
      <ng-container i18n>On this page, you can import songs from files on your device.</ng-container>
      <br><br>
      <input type="file" (change)="importFiles($event.target)" multiple>
    </div>
    <ion-list>
      <ion-item>
        <ion-label i18n>File format</ion-label>
        <ion-select [(ngModel)]="formatName">
          <ion-option *ngFor="let importer of importers" [value]="importer.name">{{importer.name}}</ion-option>
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-content>
  `
})
export class SongsImportPageComponent {
  formatName = 'Auto';
  importers = importers.list;

  constructor(private asyncExec: AsyncExecService, private librarySelector: LibrarySelectorService, private alertCtrl: AlertController) {}

  async importFiles(input) {
    const library = await this.librarySelector.selectWritableLibrary();
    if (library) {
      const errors = [];
      await this.asyncExec.asyncExec(async () => {
        const files = input.files;
        for (const file of files) {
          try {
            const fileContent = await readFileAsText(file);
            const song = importFile(fileContent, file.name, this.formatName);
            await library.songsManager.add(song);
          } catch (e) {
            errors.push(`${file.name}:\n${e}`);
          }
        }
        input.value = null;
      });
      if (errors.length > 0) {
        const alertCtrl = this.alertCtrl.create({
          title: 'Error',
          message: errors.join('\n'),
          buttons: ['OK']
        });
        alertCtrl.present();
      }
    }
  }

}
