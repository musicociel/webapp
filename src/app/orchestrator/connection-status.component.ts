import { Component } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { OrchestratorService } from './orchestrator.service';

@Component({
  selector: 'app-connection-status',
  template: `
    <ng-container *ngIf="!orchestrator.connected && !orchestrator.connecting">
      <ion-list>
        <ion-item-divider>Not connected</ion-item-divider>
        <button ion-item (tap)="connect()">Connect to...</button>
      </ion-list>
    </ng-container>
    <ng-container *ngIf="orchestrator.connecting">
      <ion-list>
        <ion-item-divider><ion-spinner></ion-spinner> Connecting...</ion-item-divider>
        <button ion-item (tap)="orchestrator.disconnect()">Disconnect</button>
      </ion-list>
    </ng-container>
    <ng-container *ngIf="orchestrator.connected">
      <ion-list>
        <ion-item-divider>
          <ng-container i18n>Connected</ng-container><br>
          <ng-container *ngIf="orchestrator.remoteSong">
            <ng-container i18n>Current song:</ng-container> {{ orchestrator.remoteSong.title }}
          </ng-container>
        </ion-item-divider>
        <ion-item *ngIf="orchestrator.canShareSong">
          <ion-label i18n>Share songs</ion-label>
          <ion-toggle [checked]="orchestrator.sharingSong" (ionChange)="orchestrator.setSharingSong($event.checked)"></ion-toggle>
        </ion-item>
        <ion-item *ngIf="orchestrator.canFollowSong">
          <ion-label i18n>Follow songs</ion-label>
          <ion-toggle [checked]="orchestrator.followingSong" (ionChange)="orchestrator.setFollowingSong($event.checked)"></ion-toggle>
        </ion-item>
        <button ion-item (tap)="orchestrator.disconnect()">Disconnect</button>
      </ion-list>
    </ng-container>
  `,
  styles: []
})
export class ConnectionStatusComponent {

  constructor(public orchestrator: OrchestratorService, private alertCtrl: AlertController) {}

  async connect() {
    const url = await this.orchestrator.getLastURL();
    const alertCtrl = this.alertCtrl.create({
      title: 'Connection',
      inputs: [
        {
          type: 'text',
          name: 'url',
          value: url,
          placeholder: 'URL'
        }
      ],
      buttons: ['Cancel', {
        text: 'OK',
        handler: (data) => {
          this.orchestrator.connectTo(data.url);
        }
      }]
    });
    alertCtrl.present();
  }

}
