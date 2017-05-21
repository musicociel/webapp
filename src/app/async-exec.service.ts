import { LoadingController, AlertController } from 'ionic-angular';
import { Injectable } from '@angular/core';

@Injectable()
export class AsyncExecService {

  constructor(private loadingCtrl: LoadingController, private alertCtrl: AlertController) {}

  async asyncExec<T>(fn: () => Promise<T>): Promise<T> {
    const loading = this.loadingCtrl.create();
    try {
      loading.present();
      return await fn();
    } catch (error) {
      this.showError(error);
    } finally {
      loading.dismiss();
    }
  }

  showError(error) {
    // TODO: translate
    const errorAlert = this.alertCtrl.create({
      title: 'Error',
      message: `${error}`,
      buttons: ['OK']
    });
    errorAlert.present();
  }

}
