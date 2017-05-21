import { Component } from '@angular/core';
import { BaseItemsListPageComponent, ItemsListPage, itemsListPageComponentTemplateBegin, itemsListPageComponentTemplateEnd } from '../items/items-list-page.component';
import { ObjectRef } from '../items/items-manager';
import { Song } from '@musicociel/song-formats/src/song/song';

@Component({
  template: itemsListPageComponentTemplateBegin + `
    <ion-item (tap)="itemTap($event, itemRef, itemIndex)" (press)="itemPress($event, itemRef)" [color]="isSelected(itemRef) ? 'primary' : undefined">
      <ion-label>{{ itemRef.object.title }}</ion-label>
    </ion-item>
  ` + itemsListPageComponentTemplateEnd
})
export class SongsListsListPageComponent<RefT extends ObjectRef<Song, RefT>> extends BaseItemsListPageComponent<Song, RefT> {
  getSamePage() {
    return SongsListsListPageComponent;
  }
}
