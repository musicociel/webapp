import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { ChordFormatOptions } from '@musicociel/song-formats/src/song/chord';

export interface DisplaySettings {
  fontSize: number;
  showChords: boolean;
  chordFormatOptions: ChordFormatOptions;
}

const defaultSettings = (): DisplaySettings => ({
  fontSize: 14,
  showChords: true,
  chordFormatOptions: {
    acceptUnknownChords: true,
    doReMi: true,
    resetAlterations: true,
    transpose: 0,
    defaultAlteration: 1
  }
});

@Injectable()
export class SongDisplaySettingsService {
  settings: DisplaySettings = defaultSettings();

  constructor(private storage: Storage) {
    this.load();
  }

  async load() {
    this.settings = (await this.storage.get('song-display-settings')) || defaultSettings();
  }

  async save() {
    try {
      await this.storage.set('song-display-settings', this.settings);
    } catch (e) {}
  }
}
