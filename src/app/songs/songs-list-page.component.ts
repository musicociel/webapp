import { Component } from '@angular/core';
import { reorderArray, NavParams } from 'ionic-angular';
import { BaseItemsListPageComponent, ItemsListPage, itemsListPageComponentTemplateBegin, itemsListPageComponentTemplateEnd } from '../items/items-list-page.component';
import { ObjectRef } from '../items/items-manager';
import { Song } from '@musicociel/song-formats/src/song/song';

export const songDisplay = `
    <ion-item (tap)="itemTap($event, itemRef, itemIndex)" (press)="itemPress($event, itemRef)" [color]="isSelected(itemRef) ? 'primary' : undefined">
      <ion-label>{{ itemRef.object.title }}<br>
        <small><ng-container *ngFor="let author of itemRef.object.authors; let first = first;"><ng-container *ngIf="!first">, </ng-container>{{author.name}}</ng-container></small>
      </ion-label>
    </ion-item>
  `;

@Component({
  template: itemsListPageComponentTemplateBegin + songDisplay + itemsListPageComponentTemplateEnd
})
export class SongsListPageComponent<RefT extends ObjectRef<Song, RefT>> extends BaseItemsListPageComponent<Song, RefT> {
  approxItemHeight = '65px';

  getSamePage() {
    return SongsListPageComponent;
  }
}

export interface SongsListReorderPageOptions {
  items: ObjectRef<Song, any>[];
  validate: (items: ObjectRef<Song, any>[]) => void;
}

@Component({
  template: `
    <ion-header>
      <ion-navbar>
        <ion-title i18n>Reorder songs list</ion-title>
        <ion-buttons end>
          <button ion-button icon-only (tap)="data.validate(data.items)"><ion-icon name="checkmark"></ion-icon></button>
        </ion-buttons>
      </ion-navbar>
    </ion-header>
    <ion-content>
      <ion-list reorder="true" (ionItemReorder)="itemReorder($event)">
        <ng-container *ngFor="let itemRef of data.items; let itemIndex = index">
  ` + songDisplay + `
        </ng-container>
      </ion-list>
    </ion-content>
  `
})
export class SongsListReorderPageComponent {
  data: SongsListReorderPageOptions;

  constructor(navParams: NavParams) {
    this.data = navParams.data;
  }

  itemTap(event, itemRef, itemIndex) {}
  itemPress(event, itemRef) {}
  isSelected() { return false; }

  itemReorder(indexes) {
    reorderArray(this.data.items, indexes);
  }
}
