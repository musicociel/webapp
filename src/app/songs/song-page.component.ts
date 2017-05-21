import { Component, Directive, Input, OnChanges, SimpleChanges, HostBinding, HostListener, ViewChildren, QueryList, ElementRef, ViewChild, AfterViewChecked} from '@angular/core';
import { NavParams, Content, Slides } from 'ionic-angular';
import { Song } from '@musicociel/song-formats/src/song/song';
import { formatChord, ChordFormatOptions } from '@musicociel/song-formats/src/song/chord';
import { SheetMusic, getVoices } from '@musicociel/song-formats/src/song/song';

@Directive({
  selector: '[appSongPart]'
})
export class SongPartDirective {
  width: number;
  height: number;

  constructor(private element: ElementRef) {}

  updateWidth() {
    this.width = this.element.nativeElement.offsetWidth;
    return this.width;
  }

  updateHeight() {
    this.height = this.element.nativeElement.offsetHeight;
    return this.height;
  }

  setPagePosition(left, top) {
    const elementStyle = this.element.nativeElement.style;
    elementStyle.left = `${left}px`;
    elementStyle.top = `${top}px`;
    elementStyle.visibility = 'visible';
  }
}

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
          <button ion-button icon-only [disabled]="slides.isBeginning()" (tap)="slides.slidePrev()"><ion-icon name="arrow-dropleft"></ion-icon></button>
          <button ion-button icon-only>{{ getCurrentPage() }} / {{pages.length}}</button>
          <button ion-button icon-only [disabled]="slides.isEnd()" (tap)="slides.slideNext()"><ion-icon name="arrow-dropright"></ion-icon></button>
        </ion-buttons>
    </ion-navbar>
  </ion-header>

  <ion-content>
    <ng-container *ngIf="showFABs">
      <ion-fab bottom right *ngIf="chordVoices.length > 0">
        <button ion-fab mini>{{ showChords ? chordFormatOptions.transpose : '\u266F' }}</button>
        <ion-fab-list side="left">
          <button ion-fab (tap)="toggleChordsStyle()" color="secondary">{{ chordFormatOptions.doReMi ? 'C/Do' : 'Do/C' }}</button>
          <button ion-fab (tap)="toggleShowChords()" color="secondary"><ion-icon [name]="showChords ? 'eye-off' : 'eye'"></ion-icon></button>
        </ion-fab-list>
        <ion-fab-list side="top">
          <button ion-fab (tap)="toggleDefaultAlteration()">{{ this.chordFormatOptions.defaultAlteration < 0 ? '\u266F/\u266D' : '\u266D/\u266F' }}</button>
          <button ion-fab (tap)="transpose(-1)" color="secondary"><ion-icon name="arrow-down"></ion-icon></button>
          <button ion-fab (tap)="transpose(-chordFormatOptions.transpose)">{{ chordFormatOptions.transpose }}</button>
          <button ion-fab (tap)="transpose(+1)" color="secondary"><ion-icon name="arrow-up"></ion-icon></button>
        </ion-fab-list>
      </ion-fab>
      <ion-fab bottom left>
        <button ion-fab mini><ion-icon name="resize"></ion-icon></button>
        <ion-fab-list side="top">
          <button ion-fab (tap)="changeFontSize(-1)" color="secondary"><ion-icon name="arrow-down"></ion-icon></button>
          <button ion-fab (tap)="changeFontSize(14 - fontSize)">{{ fontSize }}</button>
          <button ion-fab (tap)="changeFontSize(+1)" [color]="overlap ? 'danger' : 'secondary'"><ion-icon name="arrow-up"></ion-icon></button>
        </ion-fab-list>
      </ion-fab>
    </ng-container>
    <ion-slides (swipeup)="goDown($event)" (swipedown)="goUp($event)" appVerticalSwipe>
      <div [style.font-size]="fontSize + 'px'">
        <ng-container *ngFor="let part of song.music.parts">
          <div appSongPart>
            <div class="song-part" [class.song-chorus]="part.type === 'chorus'">
              <ng-container *ngFor="let line of part.content">
                <table class="song-line" border="0" cellpadding="0" cellspacing="0">
                  <tbody>
                    <ng-container *ngIf="showComments"><tr *ngFor="let commentVoice of commentVoices" class="song-comments"><td *ngFor="let event of line">{{event[commentVoice]}}</td></tr></ng-container>
                    <ng-container *ngIf="showChords"><tr *ngFor="let chordVoice of chordVoices" class="song-chords"><td *ngFor="let event of line">{{formatChord(event[chordVoice])}}</td></tr></ng-container>
                    <ng-container *ngIf="showLyrics"><tr *ngFor="let lyricsVoice of lyricsVoices" class="song-lyrics"><td *ngFor="let event of line">{{event[lyricsVoice]}}</td></tr></ng-container>
                  </tbody>
                </table>
              </ng-container>
            </div>
          </div>
          <br>
        </ng-container>
      </div>
      <ion-slide *ngFor="let page of pages"></ion-slide>
    </ion-slides>
  </ion-content>
  <ion-footer *ngIf="song.copyright">{{ song.copyright }}</ion-footer>
  `,
  styles: [`
    .song-authors {
      padding-left: 10px;
      font-size: small;
    }
    div[appSongPart] {
      visibility: hidden;
      display: inline-block;
      position: absolute;
    }
    .song-part {
      padding: 5px;
    }
    .song-chorus {
      border-left: 4px solid #31708f;
      padding-left: 10px;
      margin: 10px;
    }
    .song-line {
      border-collapse: collapse;
      white-space: pre;
      line-height: 1em;
    }
    .song-comments {
      font-weight: bold;
      font-size: smaller;
    }
    .song-chords {
      font-weight: bold;
      color: #31708f;
    }
    .song-chords>td {
      padding-right: 10px;
    }
  `]
})
export class SongPageComponent implements AfterViewChecked {

  song: Song;
  chordFormatOptions: ChordFormatOptions = {
    acceptUnknownChords: true,
    doReMi: true,
    resetAlterations: true,
    transpose: 0,
    defaultAlteration: 1
  };
  pages = [{}];
  fontSize = 14;
  overlap = false;

  needRepaginate = true;
  savedPaginateParameters = {
    contentWidth: 0,
    contentHeight: 0
  };

  @ViewChildren(SongPartDirective) parts: QueryList<SongPartDirective>;
  @ViewChild(Content) content: Content;
  @ViewChild(Slides) slides: Slides;

  commentVoices: string[];
  chordVoices: string[];
  lyricsVoices: string[];

  showComments = true;
  showChords = true;
  showLyrics = true;
  showFABs = true;

  _goUp;
  _goDown;

  constructor(navParams: NavParams) {
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
    this.showFABs = !this.showFABs;
  }

  changeFontSize(step) {
    this.fontSize = Math.max(4, Math.min(this.fontSize + step, 64));
    this.needRepaginate = true;
  }

  toggleShowChords() {
    this.showChords = !this.showChords;
    this.needRepaginate = true;
  }

  toggleChordsStyle() {
    this.showChords = true;
    this.chordFormatOptions.doReMi = !this.chordFormatOptions.doReMi
    this.needRepaginate = true;
  }

  toggleDefaultAlteration() {
    this.showChords = true;
    this.chordFormatOptions.resetAlterations = true;
    this.chordFormatOptions.defaultAlteration = (- (this.chordFormatOptions.defaultAlteration as -1 | 1) as -1 | 1);
    this.needRepaginate = true;
  }

  transpose(value) {
    this.showChords = true;
    this.chordFormatOptions.transpose += value;
    this.chordFormatOptions.resetAlterations = (this.chordFormatOptions.transpose !== 0)
    this.needRepaginate = true;
  }

  formatChord(chord) {
    return chord ? formatChord(chord, this.chordFormatOptions) : '';
  }

  ngAfterViewChecked() {
    this.paginate();
  }

  getCurrentPage() {
    return Math.min(1 + this.slides.getActiveIndex(), this.pages.length);
  }

  paginate() {
    const savedPaginateParameters = this.savedPaginateParameters;
    const contentWidth = this.content.contentWidth;
    const contentHeight = this.content.contentHeight;
    if (contentWidth <= 0 || contentHeight <= 0) {
      return;
    }
    const realWidth = document.documentElement.offsetWidth;
    if (realWidth !== contentWidth) {
      // calling resize is useful only for the next time
      this.content.resize();
      return;
    }
    if (savedPaginateParameters.contentWidth === contentWidth &&
        savedPaginateParameters.contentHeight === contentHeight &&
        !this.needRepaginate
       ) {
      // nothing to do in this case: same case as previous pagination
      return;
    }
    this.savedPaginateParameters = {
      contentWidth: contentWidth,
      contentHeight: contentHeight
    };
    this.needRepaginate = false;
    let overlap = false;
    const pages = [{
      columns: [{
        parts: [] as SongPartDirective[],
        minWidth: 0,
        minHeight: 0
      }],
      minWidth: 0
    }];
    const parts = this.parts.toArray();
    let curPage = pages[0];
    let curColumn = curPage.columns[0];
    let curPosX = 0;
    let curPosY = 0;
    for (const curPart of parts) {
      const curPartWidth = curPart.updateWidth();
      const curPartHeight = curPart.updateHeight();
      const overlapX = curPartWidth > contentWidth;
      const overlapY = curPartHeight > contentHeight;
      if (overlapX || overlapY) {
        overlap = true;
      }
      if ((curPosX + curPartWidth > contentWidth && curPosX > 0) || (curPosY + curPartHeight > contentHeight && curPosY > 0)) {
        // it is not possible to add the item in the same column, add a new column
        curPosX += curColumn.minWidth;
        curPosY = 0;
        curColumn = {
          parts: [],
          minWidth: 0,
          minHeight: 0
        };
        if (curPosX + curPartWidth > contentWidth && curPosX > 0) {
          // not possible to add the item in the same page, add a new page
          curPosX = 0;
          curPage = {
            columns: [],
            minWidth: 0
          };
          pages.push(curPage);
        }
        curPage.columns.push(curColumn);
      }
      curColumn.parts.push(curPart);
      curPosY += curPartHeight;
      curColumn.minWidth = Math.max(curColumn.minWidth, curPartWidth);
      curPage.minWidth = Math.max(curPage.minWidth, curPosX + curColumn.minWidth);
      curColumn.minHeight = Math.max(curColumn.minHeight, curPosY);
    }
    let curPageNumber = 0;
    for (const page of pages) {
      const extraWidth = Math.max(0, Math.floor((contentWidth - page.minWidth) / (page.columns.length + 1)));
      curPosX = extraWidth;
      for (const column of page.columns) {
        const extraHeight = Math.max(0, Math.floor((contentHeight - column.minHeight) / (column.parts.length + 1)));
        curPosY = extraHeight;
        for (const part of column.parts) {
          part.setPagePosition(curPageNumber * contentWidth + curPosX, curPosY);
          curPosY += part.height + extraHeight;
        }
        curPosX += column.minWidth + extraWidth;
      }
      curPageNumber++;
    }
    if (pages.length !== this.pages.length || this.overlap !== overlap) {
      setTimeout(() => {
        this.pages = pages;
        this.overlap = overlap;
        if (this.slides.getActiveIndex() >= this.pages.length) {
          this.slides.slideTo(this.pages.length - 1);
        }
      });
    }
  }

}
