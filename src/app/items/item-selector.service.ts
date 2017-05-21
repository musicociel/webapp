import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { App, NavController, ViewController } from 'ionic-angular';
import { ObjectRef } from './items-manager';

class ItemSelectorDisplay {
  constructor(private activeNav: NavController, private previousActiveView: ViewController) {}

  close() {
    this.activeNav.popTo(this.previousActiveView);
  }

  async wait() {
    let subscription: Subscription;
    await new Promise(resolve => {
      subscription = this.previousActiveView.didEnter.subscribe(resolve);
    });
    subscription.unsubscribe();
  }
}

@Injectable()
export class ItemSelectorService {
  constructor(private app: App) {}

  displayItemSelector<T, RefT extends ObjectRef<T, RefT>>(page, config): ItemSelectorDisplay {
    const activeNav = this.app.getActiveNav();
    const activeView = activeNav.getActive();
    const res = new ItemSelectorDisplay(activeNav, activeView);
    activeNav.push(page, config);
    return res;
  }
}
