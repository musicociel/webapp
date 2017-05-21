import { Component, OnInit } from '@angular/core';
import { NavParams, NavController } from 'ionic-angular';
import { AsyncExecService } from '../async-exec.service';
import { LibrariesManagerService, defaultLibraryConfig } from './libraries-manager.service';
import { Library, LibraryConfig } from './library';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <ng-container *ngIf="!library" i18n>Add a library</ng-container>
          <ng-container *ngIf="library" i18n>Edit a library</ng-container>
        </ion-title>
        <ion-buttons end>
          <button ion-button icon-only (tap)="cancel()"><ion-icon name="close"></ion-icon></button>
          <button ion-button icon-only (tap)="validate()"><ion-icon name="checkmark"></ion-icon></button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label i18n color="primary">Library name</ion-label>
          <ion-input placeholder="Type here the name of the library" i18n-placeholder [(ngModel)]="libraryConfig.displayName"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label i18n color="primary">Link to remote library</ion-label>
          <ion-toggle [(ngModel)]="libraryConfig.remoteEnabled"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label i18n color="primary">Library URL</ion-label>
          <ion-input type="url" [disabled]="!libraryConfig.remoteEnabled" placeholder="Type here the URL of the library" i18n-placeholder [(ngModel)]="libraryConfig.remoteURL"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label i18n color="primary">Store locally</ion-label>
          <ion-toggle [(ngModel)]="libraryConfig.localEnabled"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label i18n color="primary">Read-only</ion-label>
          <ion-toggle [disabled]="mustBeWritable" [(ngModel)]="libraryConfig.readonly"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label i18n color="primary">Enabled</ion-label>
          <ion-toggle [disabled]="mustBeWritable" [(ngModel)]="libraryConfig.enabled"></ion-toggle>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: []
})
export class LibraryEditPageComponent {

  library: Library;
  libraryConfig: LibraryConfig;
  mustBeWritable = false;

  constructor(navParams: NavParams, public asyncExec: AsyncExecService, private navController: NavController, private librariesManager: LibrariesManagerService) {
    const library = this.library = navParams.get('library');
    if (library) {
      this.libraryConfig = Object.assign({}, this.library.object);
    } else {
      this.mustBeWritable = navParams.get('mustBeWritable');
      this.libraryConfig = defaultLibraryConfig();
      if (this.mustBeWritable) {
        this.libraryConfig.readonly = false;
        this.libraryConfig.enabled = true;
      }
    }
  }

  async validate() {
    await this.asyncExec.asyncExec(async () => {
      if (!this.library) {
        await this.librariesManager.add(this.libraryConfig);
      } else {
        await this.librariesManager.update(this.library, this.libraryConfig);
      }
      this.navController.pop();
    });
  }

  cancel() {
    this.navController.pop();
  }

}
