import { Injectable } from '@angular/core';

const insomnia = (window['plugins'] || {}).insomnia;

@Injectable()
export class KeepAwakeService {
  private _counter = 0;

  keepAwake() {
    let canceled = false;
    this._counter++;
    if (insomnia) {
      insomnia.keepAwake();
    }
    return () => {
      if (canceled) {
        return;
      }
      canceled = true;
      this._counter--;
      if (insomnia && this._counter <= 0) {
        insomnia.allowSleepAgain();
      }
    };
  }
}
