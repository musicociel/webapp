import { Component, HostListener, ViewChild} from '@angular/core';
import { NavParams } from 'ionic-angular';
import { SongLyricsComponent, Page } from './song-lyrics.component';
import { Song, SongPosition } from '@musicociel/song-formats/src/song/song';
import { getVoices } from '@musicociel/song-formats/src/song/song';
import { SongDisplaySettingsService } from './song-display-settings.service';
import { KeepAwakeService } from './keep-awake.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';

@Component({
  template: `
  <ion-header>
    <ion-navbar>
      <ion-title (tap)="toggleShowFABs()">
        <ng-container *ngIf="song">
          {{ song.title }}
          <span class="song-authors" *ngIf="song.authors && song.authors.length > 0">
            <ng-container *ngFor="let author of song.authors; let first = first;"><ng-container *ngIf="!first">, </ng-container>{{author.name}}</ng-container>
          </span>
        </ng-container>
        <ng-container *ngIf="!song" i18n>Waiting...</ng-container>
      </ion-title>
      <ion-buttons end *ngIf="song">
          <button ion-button icon-only [disabled]="songLyrics.slides.isBeginning()" (tap)="songLyrics.slides.slidePrev()"><ion-icon name="arrow-dropleft"></ion-icon></button>
          <button ion-button icon-only>{{ songLyrics.getCurrentPage() }} / {{songLyrics.pages.length}}</button>
          <button ion-button icon-only [disabled]="songLyrics.slides.isEnd()" (tap)="songLyrics.slides.slideNext()"><ion-icon name="arrow-dropright"></ion-icon></button>
        </ion-buttons>
    </ion-navbar>
  </ion-header>

  <ion-content #content class="remove-scrollbars">
    <ng-container *ngIf="displaySettings.settings.showFABs">
      <ion-fab bottom right *ngIf="chordVoices.length > 0">
        <button ion-fab mini>{{ displaySettings.settings.showChords ? displaySettings.settings.chordFormatOptions.transpose : '\u266F' }}</button>
        <ion-fab-list side="left">
          <button ion-fab (tap)="toggleDefaultAlteration()">{{ displaySettings.settings.chordFormatOptions.defaultAlteration < 0 ? '\u266F/\u266D' : '\u266D/\u266F' }}</button>
          <button ion-fab (tap)="toggleChordsStyle()" color="secondary">{{ displaySettings.settings.chordFormatOptions.doReMi ? 'C/Do' : 'Do/C' }}</button>
          <button ion-fab (tap)="toggleShowChords()" color="secondary"><ion-icon [name]="displaySettings.settings.showChords ? 'eye-off' : 'eye'"></ion-icon></button>
        </ion-fab-list>
        <ion-fab-list side="top">
          <button ion-fab (tap)="transpose(-1)" color="secondary"><ion-icon name="arrow-down"></ion-icon></button>
          <button ion-fab (tap)="transpose(-displaySettings.settings.chordFormatOptions.transpose)">{{ displaySettings.settings.chordFormatOptions.transpose }}</button>
          <button ion-fab (tap)="transpose(+1)" color="secondary"><ion-icon name="arrow-up"></ion-icon></button>
        </ion-fab-list>
      </ion-fab>
      <ion-fab bottom left>
        <button ion-fab mini><ion-icon name="resize"></ion-icon></button>
        <ion-fab-list side="top">
          <button ion-fab (tap)="changeFontSize(-1)" color="secondary"><ion-icon name="arrow-down"></ion-icon></button>
          <button ion-fab (tap)="changeFontSize(14 - displaySettings.settings.fontSize)">{{ displaySettings.settings.fontSize }}</button>
          <button ion-fab (tap)="changeFontSize(+1)" [color]="songLyrics && songLyrics.overlap ? 'danger' : 'secondary'"><ion-icon name="arrow-up"></ion-icon></button>
        </ion-fab-list>
      </ion-fab>
    </ng-container>
    <div *ngIf="!song" padding i18n>Waiting for a song to display...</div>
    <app-song-lyrics
      [fontSize]="displaySettings.settings.fontSize"
      [music]="song ? song.music : null"
      [position]="(orchestrator.connected && (orchestrator.followingSong || orchestrator.sharingSong)) ? songPosition : null"
      [commentVoices]="commentVoices"
      [chordVoices]="chordVoices"
      [lyricsVoices]="lyricsVoices"
      [showChords]="displaySettings.settings.showChords"
      [chordFormatOptions]="displaySettings.settings.chordFormatOptions"
      [content]="content"
      (songPartTap)="onSongPartTap($event)"
      (songSlideChange)="onSongSlideChange($event)"
      appVerticalSwipe (swipeup)="goDown($event)" (swipedown)="goUp($event)"
    ></app-song-lyrics>
  </ion-content>
  <ion-footer *ngIf="song && song.copyright">{{ song.copyright }}</ion-footer>
  `,
  styles: [`
    .song-authors {
      padding-left: 10px;
      font-size: small;
    }
  `]
})
export class SongPageComponent {

  private _allowSleepAgain: null | (() => void) = null;

  song: Song | null;
  songPosition: SongPosition | null;

  @ViewChild(SongLyricsComponent) songLyrics: SongLyricsComponent;

  commentVoices: string[];
  chordVoices: string[];
  lyricsVoices: string[];

  _goUp;
  _goDown;

  constructor(
    navParams: NavParams,
    public displaySettings: SongDisplaySettingsService,
    private keepAwake: KeepAwakeService,
    public orchestrator: OrchestratorService
  ) {
    this._goUp = navParams.get('goUp');
    this._goDown = navParams.get('goDown');
    this.setSong(navParams.get('song'));
  }

  @HostListener('document:keydown.arrowup', ['$event'])
  goUp(event) {
    const goUp = this._goUp;
    if (goUp) {
      goUp(this);
    }
  }

  @HostListener('document:keydown.arrowdown', ['$event'])
  goDown(event) {
    const goDown = this._goDown;
    if (goDown) {
      goDown(this);
    }
  }

  @HostListener('document:keydown.8', ['$event'])
  selectPreviousPart(event) {
    this.updateSelectedPart(-1);
  }

  @HostListener('document:keydown.2', ['$event'])
  selectNextPart(event) {
    this.updateSelectedPart(1);
  }

  updateSelectedPart(increment: number) {
    const song = this.song;
    if (!song) {
      return;
    }
    let currentPart = this.songPosition ? this.songPosition.currentPart || 0 : 0;
    currentPart += increment;
    currentPart = Math.min(Math.max(currentPart, 0), song.music.parts.length - 1);
    this.localSetSongPosition({
      currentPart
    });
  }

  onSongPartTap(songPartIndex) {
    this.localSetSongPosition({
      currentPart: songPartIndex
    });
  }

  onSongSlideChange(pageInfo: Page) {
    const initialCurrentPart = this.songPosition ? this.songPosition.currentPart || 0 : 0;
    let newCurrentPart = initialCurrentPart;
    if (newCurrentPart > pageInfo.lastPart) {
      newCurrentPart = pageInfo.lastPart;
    } else if (newCurrentPart < pageInfo.firstPart) {
      newCurrentPart = pageInfo.firstPart;
    }
    if (initialCurrentPart !== newCurrentPart) {
      this.localSetSongPosition({
        currentPart: newCurrentPart
      });
    }
  }

  setSong(song: Song) {
    this.orchestrator.onLocalSongChange(song);
    this.song = song;
    if (song) {
      const songMusic = this.song.music;
      this.commentVoices = getVoices(songMusic, ['comments']);
      this.chordVoices = getVoices(songMusic, ['chords']);
      this.lyricsVoices = getVoices(songMusic, ['lyrics']);
      this.needRepaginate();
    } else {
      this.commentVoices = [];
      this.chordVoices = [];
      this.lyricsVoices = [];
    }
    this.songPosition = {
      currentPart: 0
    };
    if (this.songLyrics && this.songLyrics.slides) {
      this.songLyrics.slides.slideTo(0);
    }
  }

  localSetSongPosition(songPosition: SongPosition) {
    if (this.orchestrator.canSetSongPosition) {
      this.setSongPosition(songPosition, true);
    }
  }

  setSongPosition(songPosition: SongPosition, show: boolean) {
    this.songPosition = songPosition;
    this.orchestrator.onLocalSongPositionChange(songPosition);
    if (show && songPosition && songPosition.currentPart != null && this.songLyrics) {
      this.songLyrics.showPart(songPosition.currentPart);
    }
  }

  toggleShowFABs() {
    const settings = this.displaySettings.settings;
    settings.showFABs = !settings.showFABs;
    this.displaySettings.save();
  }

  needRepaginate() {
    if (this.songLyrics) {
      this.songLyrics.repaginationNeeded();
    }
  }

  changeFontSize(step) {
    const settings = this.displaySettings.settings;
    settings.fontSize = Math.max(4, Math.min(settings.fontSize + step, 64));
    this.displaySettings.save();
    this.needRepaginate();
  }

  toggleShowChords() {
    const settings = this.displaySettings.settings;
    settings.showChords = !settings.showChords;
    this.displaySettings.save();
    this.needRepaginate();
  }

  toggleChordsStyle() {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.doReMi = !settings.chordFormatOptions.doReMi
    this.displaySettings.save();
    this.needRepaginate();
  }

  toggleDefaultAlteration() {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.resetAlterations = true;
    settings.chordFormatOptions.defaultAlteration = (- (settings.chordFormatOptions.defaultAlteration as -1 | 1) as -1 | 1);
    this.displaySettings.save();
    this.needRepaginate();
  }

  transpose(value) {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.transpose += value;
    settings.chordFormatOptions.resetAlterations = (settings.chordFormatOptions.transpose !== 0);
    this.displaySettings.save();
    this.needRepaginate();
  }

  ionViewDidEnter() {
    this._allowSleepAgain = this.keepAwake.keepAwake();
  }

  ionViewDidLeave() {
    if (this._allowSleepAgain) {
      this._allowSleepAgain();
      this._allowSleepAgain = null;
    }
  }

}
