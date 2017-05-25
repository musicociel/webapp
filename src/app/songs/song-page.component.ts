import { Component, HostListener, ViewChild} from '@angular/core';
import { NavParams } from 'ionic-angular';
import { SongLyricsComponent } from './song-lyrics.component';
import { Song } from '@musicociel/song-formats/src/song/song';
import { getVoices } from '@musicociel/song-formats/src/song/song';
import { SongDisplaySettingsService } from './song-display-settings.service';
import { KeepAwakeService } from './keep-awake.service';

@Component({
  template: `
  <ion-header>
    <ion-navbar>
      <ion-title (tap)="toggleShowFABs()">{{song.title}}
        <span class="song-authors" *ngIf="song.authors && song.authors.length > 0">
          <ng-container *ngFor="let author of song.authors; let first = first;"><ng-container *ngIf="!first">, </ng-container>{{author.name}}</ng-container>
        </span>
      </ion-title>
      <ion-buttons end>
          <button ion-button icon-only [disabled]="songLyrics.slides.isBeginning()" (tap)="songLyrics.slides.slidePrev()"><ion-icon name="arrow-dropleft"></ion-icon></button>
          <button ion-button icon-only>{{ songLyrics.getCurrentPage() }} / {{songLyrics.pages.length}}</button>
          <button ion-button icon-only [disabled]="songLyrics.slides.isEnd()" (tap)="songLyrics.slides.slideNext()"><ion-icon name="arrow-dropright"></ion-icon></button>
        </ion-buttons>
    </ion-navbar>
  </ion-header>

  <ion-content #content>
    <ng-container *ngIf="displaySettings.settings.showFABs">
      <ion-fab bottom right *ngIf="chordVoices.length > 0">
        <button ion-fab mini>{{ displaySettings.settings.showChords ? displaySettings.settings.chordFormatOptions.transpose : '\u266F' }}</button>
        <ion-fab-list side="left">
          <button ion-fab (tap)="toggleChordsStyle()" color="secondary">{{ displaySettings.settings.chordFormatOptions.doReMi ? 'C/Do' : 'Do/C' }}</button>
          <button ion-fab (tap)="toggleShowChords()" color="secondary"><ion-icon [name]="displaySettings.settings.showChords ? 'eye-off' : 'eye'"></ion-icon></button>
        </ion-fab-list>
        <ion-fab-list side="top">
          <button ion-fab (tap)="toggleDefaultAlteration()">{{ displaySettings.settings.chordFormatOptions.defaultAlteration < 0 ? '\u266F/\u266D' : '\u266D/\u266F' }}</button>
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
          <button ion-fab (tap)="changeFontSize(+1)" [color]="songLyrics.overlap ? 'danger' : 'secondary'"><ion-icon name="arrow-up"></ion-icon></button>
        </ion-fab-list>
      </ion-fab>
    </ng-container>
    <app-song-lyrics
      [fontSize]="displaySettings.settings.fontSize"
      [music]="song.music"
      [commentVoices]="commentVoices"
      [chordVoices]="chordVoices"
      [lyricsVoices]="lyricsVoices"
      [showChords]="displaySettings.settings.showChords"
      [chordFormatOptions]="displaySettings.settings.chordFormatOptions"
      [content]="content"
      appVerticalSwipe (swipeup)="goDown($event)" (swipedown)="goUp($event)"
    ></app-song-lyrics>
  </ion-content>
  <ion-footer *ngIf="song.copyright">{{ song.copyright }}</ion-footer>
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

  song: Song;

  @ViewChild(SongLyricsComponent) songLyrics: SongLyricsComponent;

  commentVoices: string[];
  chordVoices: string[];
  lyricsVoices: string[];

  _goUp;
  _goDown;

  constructor(navParams: NavParams, public displaySettings: SongDisplaySettingsService, private keepAwake: KeepAwakeService) {
    this.song = navParams.get('song');
    this._goUp = navParams.get('goUp');
    this._goDown = navParams.get('goDown');
    const songMusic = this.song.music;
    this.commentVoices = getVoices(songMusic, ['comments']);
    this.chordVoices = getVoices(songMusic, ['chords']);
    this.lyricsVoices = getVoices(songMusic, ['lyrics']);
  }

  @HostListener('document:keydown.arrowup', ['$event'])
  goUp(event) {
    const goUp = this._goUp;
    if (goUp) {
      goUp();
    }
  }

  @HostListener('document:keydown.arrowdown', ['$event'])
  goDown(event) {
    const goDown = this._goDown;
    if (goDown) {
      goDown();
    }
  }

  toggleShowFABs() {
    const settings = this.displaySettings.settings;
    settings.showFABs = !settings.showFABs;
    this.displaySettings.save();
  }

  changeFontSize(step) {
    const settings = this.displaySettings.settings;
    settings.fontSize = Math.max(4, Math.min(settings.fontSize + step, 64));
    this.displaySettings.save();
    this.songLyrics.needRepaginate = true;
  }

  toggleShowChords() {
    const settings = this.displaySettings.settings;
    settings.showChords = !settings.showChords;
    this.displaySettings.save();
    this.songLyrics.needRepaginate = true;
  }

  toggleChordsStyle() {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.doReMi = !settings.chordFormatOptions.doReMi
    this.displaySettings.save();
    this.songLyrics.needRepaginate = true;
  }

  toggleDefaultAlteration() {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.resetAlterations = true;
    settings.chordFormatOptions.defaultAlteration = (- (settings.chordFormatOptions.defaultAlteration as -1 | 1) as -1 | 1);
    this.displaySettings.save();
    this.songLyrics.needRepaginate = true;
  }

  transpose(value) {
    const settings = this.displaySettings.settings;
    settings.showChords = true;
    settings.chordFormatOptions.transpose += value;
    settings.chordFormatOptions.resetAlterations = (settings.chordFormatOptions.transpose !== 0);
    this.displaySettings.save();
    this.songLyrics.needRepaginate = true;
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
