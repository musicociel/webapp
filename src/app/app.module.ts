import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { IonicApp, IonicModule } from 'ionic-angular';
import { IonicStorageModule } from '@ionic/storage';

import { AppComponent } from './app.component';

import { SongPageComponent, SongPartDirective } from './songs/song-page.component';
import { LibrariesListPageComponent, ToggleableLibrariesListPageComponent } from './libraries/libraries-list-page.component';
import { LibrariesManagerService } from './libraries/libraries-manager.service';
import { LibraryEditPageComponent } from './libraries/library-edit-page.component';
import { AsyncExecService } from './async-exec.service';
import { LibrarySelectorService } from './libraries/library-selector.service';
import { BaseItemsListPageComponent } from './items/items-list-page.component';
import { VerticalSwipeDirective } from './vertical-swipe.directive';
import { SongSelectorService } from './songs/song-selector.service';
import { SongsListSelectorService } from './songs-lists/songs-list-selector.service';
import { SongsListPageComponent, SongsListReorderPageComponent } from './songs/songs-list-page.component';
import { SongsListsListPageComponent } from './songs-lists/songs-lists-list-page.component';
import { SongsImportPageComponent } from './songs/songs-import-page.component';
import { ItemSelectorService } from './items/item-selector.service';

@NgModule({
  declarations: [
    AppComponent,
    SongPartDirective,
    SongPageComponent,
    ToggleableLibrariesListPageComponent,
    LibrariesListPageComponent,
    LibraryEditPageComponent,
    VerticalSwipeDirective,
    SongsListPageComponent,
    SongsListReorderPageComponent,
    SongsListsListPageComponent,
    BaseItemsListPageComponent,
    SongsImportPageComponent
  ],
  entryComponents: [
    ToggleableLibrariesListPageComponent,
    LibrariesListPageComponent,
    LibraryEditPageComponent,
    SongPageComponent,
    SongsListPageComponent,
    SongsListReorderPageComponent,
    SongsListsListPageComponent,
    SongsImportPageComponent
  ],
  imports: [
    IonicModule.forRoot(AppComponent, {}),
    IonicStorageModule.forRoot(),
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [AsyncExecService, LibrariesManagerService, LibrarySelectorService, SongSelectorService, SongsListSelectorService, ItemSelectorService],
  bootstrap: [IonicApp]
})
export class AppModule { }
