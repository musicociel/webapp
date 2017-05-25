import { Component, Input, Directive, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewChecked } from '@angular/core';
import { Slides, Content } from 'ionic-angular';
import { SheetMusic } from '@musicociel/song-formats/src/song/song';
import { formatChord, ChordFormatOptions } from '@musicociel/song-formats/src/song/chord';

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
  selector: 'app-song-lyrics',
  template: `
    <ion-slides>
      <div [style.font-size]="fontSize + 'px'">
        <ng-container *ngFor="let part of music.parts">
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
    </ion-slides>`,
  styles: [`
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
export class SongLyricsComponent implements AfterViewChecked {

  @Input() fontSize: number;
  @Input() music: SheetMusic;
  @Input() commentVoices: string[];
  @Input() chordVoices: string[];
  @Input() lyricsVoices: string[];
  @Input() showComments = true;
  @Input() showChords = true;
  @Input() showLyrics = true;
  @Input() chordFormatOptions: ChordFormatOptions;
  @Input() content: Content;

  needRepaginate = true;
  savedPaginateParameters = {
    contentWidth: 0,
    contentHeight: 0
  };
  pages = [{}];
  overlap = false;

  @ViewChildren(SongPartDirective) parts: QueryList<SongPartDirective>;
  @ViewChild(Slides) slides: Slides;

  ngAfterViewChecked() {
    this.paginate();
  }

  formatChord(chord) {
    return chord ? formatChord(chord, this.chordFormatOptions) : '';
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
