import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { App, ViewController } from 'ionic-angular';
import * as Sockjs from 'sockjs-client';
import { Song, SongPosition } from '@musicociel/song-formats/src/song/song';
import { SongPageComponent } from '../songs/song-page.component';

@Injectable()
export class OrchestratorService {

  socket;
  connected = false;
  connecting = false;

  canShareSong = true;
  sharingSong = false;

  canFollowSong = true;
  followingSong = false;

  canSetSongPosition = true;

  displayingView: null | ViewController = null;

  remoteSong: Song;
  remoteSongPosition: SongPosition;

  localSong: Song;
  localSongPosition: SongPosition;

  private _url: string;
  private _joinMeetingMessage;

  constructor(private app: App, private storage: Storage) {
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onClose = this.onClose.bind(this);
  }

  setSharingSong(value) {
    this.sharingSong = !!value;
    this.canSetSongPosition = this.sharingSong;
    if (value) {
      this.setFollowingSong(false);
      if (this.connected) {
        this.sendLocalSong();
        if (this.localSongPosition) {
          this.sendLocalSongPosition();
        }
      }
    }
  }

  setFollowingSong(value) {
    this.followingSong = !!value;
    if (value) {
      this.setSharingSong(false);
      this.showDisplayingView();
    }
  }

  sendLocalSong() {
    this.send({
      type: 'setSong',
      song: this.localSong
    });
  }

  sendLocalSongPosition() {
    this.send({
      type: 'setSongPosition',
      songPosition: this.localSongPosition
    });
  }

  showRemoteSong() {
    if (this.displayingView) {
      this.displayingView.instance.setSong(this.remoteSong);
    }
  }

  showRemoteSongPosition() {
    if (this.displayingView) {
      this.displayingView.instance.setSongPosition(this.remoteSongPosition, true);
    }
  }

  async showDisplayingView() {
    const activeNav = this.app.getActiveNav();
    if (this.displayingView) {
      this.showRemoteSong();
      this.showRemoteSongPosition();
    } else {
      await activeNav.push(SongPageComponent, {
        song: this.remoteSong
      });
      this.displayingView = activeNav.getActive();
      this.displayingView.willUnload.subscribe(() => {
        this.displayingView = null;
        this.setFollowingSong(false);
      });
    }
  }

  connectTo(url) {
    if (this.socket) {
      this.disconnect();
    }
    this._url = url;
    const parsedURL = new URL(url);
    const meetingId = parsedURL.searchParams.get('meetingId');
    const meetingPassword = parsedURL.searchParams.get('meetingPassword');
    this._joinMeetingMessage = {
      type: 'joinMeeting',
      meetingId,
      meetingPassword
    };
    parsedURL.search = '';
    const socket = this.socket = new Sockjs(parsedURL.href);
    this.connecting = true;
    socket.onopen = this.onOpen;
    socket.onclose = this.onClose;
    socket.onmessage = this.onMessage;
    this.storage.set('orchestratorLastURL', url);
  }

  async getLastURL() {
    return await this.storage.get('orchestratorLastURL');
  }

  disconnect() {
    this.socket.close();
  }

  send(data) {
    const message = JSON.stringify(data);
    this.socket.send(message);
  }

  onOpen() {
    this.connecting = false;
    this.connected = true;
    this.send(this._joinMeetingMessage);
    this._joinMeetingMessage = null;
    if (this.sharingSong) {
      this.sendLocalSong();
    }
  }

  onMessage({data}) {
    const message = JSON.parse(data);
    const type = message.type;
    const handler = this[`onMessage_${type}`];
    if (handler) {
      handler.call(this, message);
    }
  }

  onMessage_setSong(message) {
    this.remoteSong = message.song;
    if (this.followingSong) {
      this.showRemoteSong();
    }
  }

  onMessage_setSongPosition(message) {
    this.remoteSongPosition = message.songPosition;
    if (this.followingSong) {
      this.showRemoteSongPosition();
    }
  }

  onClose() {
    this.connected = false;
    this.connecting = false;
    this.socket = null;
  }

  onLocalSongChange(song: Song) {
    this.localSong = song;
    this.localSongPosition = null;
    if (this.connected && this.sharingSong) {
      this.sendLocalSong();
    }
  }

  onLocalSongPositionChange(songPosition: SongPosition) {
    this.localSongPosition = songPosition;
    if (this.connected && this.sharingSong) {
      this.sendLocalSongPosition();
    }
  }

}
