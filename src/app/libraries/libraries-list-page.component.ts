import { Component, ViewChild } from '@angular/core';
import { Library, LibraryConfig } from './library';
import { BaseItemsListPageComponent, ItemsListPage, itemsListPageComponentTemplateBegin, itemsListPageComponentTemplateEnd } from '../items/items-list-page.component';

@Component({
  template: itemsListPageComponentTemplateBegin + `
    <ion-item>
      <ion-toggle item-start [checked]="itemRef.object.enabled" (ionChange)="toggleLibraryEnabled(itemRef, $event)"></ion-toggle>
      <ion-label (tap)="itemTap($event, itemRef, itemIndex)" (press)="itemPress($event, itemRef)">
        {{itemRef.object.displayName}} <ion-icon padding-left [name]="itemRef.object.readonly ? 'glasses' : 'create'" color="primary"></ion-icon>
      </ion-label>
      <button *ngIf="itemRef.isSynchronizable()" item-right outline icon-left ion-button (tap)="synchronize(itemRef)">
        <ion-icon name="sync"></ion-icon>
        <ng-container i18n>Synchronize</ng-container>
      </button>
    </ion-item>
  ` + itemsListPageComponentTemplateEnd
})
export class ToggleableLibrariesListPageComponent extends BaseItemsListPageComponent<LibraryConfig, Library> {

  synchronizableLibraries: Library[] = [];

  getSamePage() {
    return LibrariesListPageComponent;
  }

  async synchronize(library: Library) {
    this.asyncExec.asyncExec(async () => {
      await library.synchronize();
    });
  }

  async toggleLibraryEnabled(library: Library, event) {
    await this.asyncExec.asyncExec(async () => {
      await library.setEnabled(event.checked);
    });
  }
}

@Component({
  template: itemsListPageComponentTemplateBegin + `
    <ion-item [color]="isSelected(itemRef) ? 'primary' : undefined" (tap)="itemTap($event, itemRef, itemIndex)" (press)="itemPress($event, itemRef)">
      <ion-label>{{itemRef.object.displayName}} <ion-icon padding-left [name]="itemRef.object.readonly ? 'glasses' : 'create'" [color]="isSelected(itemRef) ? undefined : 'primary'"></ion-icon></ion-label>
    </ion-item>
  ` + itemsListPageComponentTemplateEnd
})
export class LibrariesListPageComponent extends BaseItemsListPageComponent<LibraryConfig, Library> {

  getSamePage() {
    return LibrariesListPageComponent;
  }
}
