import { Component } from '@angular/core';
import { LibrarySelectorService } from './libraries/library-selector.service';
import { SongsListPageComponent } from './songs/songs-list-page.component';
import { SongsListsListPageComponent } from './songs-lists/songs-lists-list-page.component';
import { ToggleableLibrariesListPageComponent } from './libraries/libraries-list-page.component';
import { SongSelectorService } from './songs/song-selector.service';
import { SongsListSelectorService } from './songs-lists/songs-list-selector.service';

@Component({
  selector: 'app-root',
  template: `
    <ion-menu [content]="content">
      <ion-header>
        <ion-toolbar>
          <ion-title i18n>Menu</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <app-connection-status></app-connection-status>
      </ion-content>
    </ion-menu>
    <ion-tabs #content>
      <ion-tab [root]="songsList" [rootParams]="songsParams" tabTitle="Songs" i18n-tabTitle [tabsHideOnSubPages]="true"></ion-tab>
      <ion-tab [root]="songsListsList" [rootParams]="songsListsParams" tabTitle="Songs lists" i18n-tabTitle [tabsHideOnSubPages]="true"></ion-tab>
      <ion-tab [root]="libraries" [rootParams]="librariesParams" tabTitle="Libraries" i18n-tabTitle></ion-tab>
    </ion-tabs>
  `
})
export class AppComponent {
  songsList = SongsListPageComponent;
  songsListsList = SongsListsListPageComponent;
  libraries = ToggleableLibrariesListPageComponent;

  songsParams = this.songSelector.getHomeConfiguration();
  songsListsParams = this.songsListSelector.getHomeConfiguration();
  librariesParams = this.librarySelector.getHomeConfiguration();

  constructor(private songSelector: SongSelectorService, private songsListSelector: SongsListSelectorService, private librarySelector: LibrarySelectorService) {}
}
