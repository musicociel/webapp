import { Component, Input, Output, EventEmitter, ViewChild, TemplateRef, OnInit, OnDestroy } from '@angular/core';
import { Searchbar, Refresher, LoadingController, NavController, NavParams, Content, AlertController } from 'ionic-angular';
import { AsyncExecService } from '../async-exec.service';
import { ItemsManager, ObjectRef } from './items-manager';
import { PartialList, toPartialList } from './items-list-utils';
import { Subscription } from 'rxjs/Subscription';

export interface ItemsListPage<T, RefT extends ObjectRef<T, RefT>> extends Function {
  new (...args: any[]): BaseItemsListPageComponent<T, RefT>;
}

export interface ButtonConfig<T> {
  icon: string;
  text?: string;
  color?: string;
  visible?: (item: T) => boolean;
  handler: (item: T, index?: number, items?: PartialList<T>) => void;
}

export interface ListPageOptions<T, RefT extends ObjectRef<T, RefT>> {
  title: string;
  manager: ItemsManager<T, RefT>;
  allowSelection?: boolean;
  allowSearch?: boolean;
  allowDelete?: boolean;
  selection?: Set<RefT>;
  keepEmptySelection?: boolean;
  extra?: any;

  itemTap?: (item: RefT, index: number, items: PartialList<RefT>) => void;
  selectedItemsPress?: (items: Set<RefT>) => void;
  toolbarButtons?: ButtonConfig<void>[];
  slidingButtons?: ButtonConfig<RefT>[];
  selectionButtons?: ButtonConfig<Set<RefT>>[];

  search?: boolean;
  partialList?: PartialList<RefT>;
  scrollTop?: number;
}

export const itemsListPageComponentTemplateBegin = `
  <ion-header>
    <ion-navbar *ngIf="!data.search && !data.selection">
      <ion-title>{{ data.title }}</ion-title>
      <ion-buttons end>
        <button *ngIf="data.allowSearch && data.manager.canSearch()" ion-button icon-only (tap)="searchStart()"><ion-icon name="search"></ion-icon></button>
        <ng-container *ngFor="let icon of data.toolbarButtons">
          <button *ngIf="!icon.visible || icon.visible()"
                  ion-button [attr.icon-only]="icon.text ? undefined : true" [attr.outline]="icon.text ? true : undefined" [color]="icon.color"
                  (tap)="icon.handler()">
            <ion-icon [name]="icon.icon"></ion-icon><ng-container>{{ icon.text || ''}}</ng-container>
          </button>
        </ng-container>
      </ion-buttons>
    </ion-navbar>
    <ion-navbar *ngIf="data.search && !data.selection">
      <ion-searchbar *ngIf="!updatingSearchIndex"
        [(ngModel)]="searchText"
        placeholder="Search" i18n-placeholder
        (keydown.esc)="searchCancel()" (ionInput)="onSearchTextChange($event.target.value)"
      ></ion-searchbar>
      <span i18n *ngIf="updatingSearchIndex">Updating search index...</span>
    </ion-navbar>
    <ion-navbar *ngIf="data.selection">
      <ion-title i18n>{{ data.selection.size }} selected item(s)</ion-title>
      <ion-buttons end>
        <ng-container *ngFor="let icon of data.selectionButtons">
          <button *ngIf="!icon.visible || icon.visible(data.selection)"
                  ion-button [attr.icon-only]="icon.text ? undefined : true" [attr.outline]="icon.text ? true : undefined"  [color]="icon.color"
                  (tap)="icon.handler(data.selection)">
            <ion-icon [name]="icon.icon"></ion-icon><ng-container>{{ icon.text || ''}}</ng-container>
          </button>
        </ng-container>
      </ion-buttons>
    </ion-navbar>
  </ion-header>
  <ion-content>
    <ion-refresher (ionRefresh)="refresherRefresh()" [enabled]="!data.selection">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>
    <div *ngIf="data.partialList.items.length === 0 && !processing" text-center padding i18n>There is no item to display.</div>
    <div *ngIf="processing && refresher.state !== 'refreshing'" text-center padding><ion-spinner></ion-spinner></div>
    <ion-list [virtualScroll]="data.partialList.items" [approxItemHeight]="approxItemHeight">
      <ion-item-sliding *virtualItem="let itemRef; let itemIndex = index">`;

export const itemsListPageComponentTemplateEnd = `
        <ion-item-options side="left" *ngIf="!data.selection">
          <ng-container *ngFor="let icon of data.slidingButtons">
            <button *ngIf="!icon.visible || icon.visible(itemRef)"
                    ion-button [attr.icon-only]="icon.text ? undefined : true" [attr.outline]="icon.text ? true : undefined"  [color]="icon.color"
                    (tap)="icon.handler(itemRef, itemIndex, data.partialList)">
              <ion-icon [name]="icon.icon"></ion-icon><ng-container>{{ icon.text || ''}}</ng-container>
            </button>
          </ng-container>
        </ion-item-options>
      </ion-item-sliding>
    </ion-list>
    <ion-infinite-scroll [enabled]="!!data.partialList.fetchMore" (ionInfinite)="$event.waitFor(baseListFetchMore())">
      <ion-infinite-scroll-content></ion-infinite-scroll-content>
    </ion-infinite-scroll>
  </ion-content>
`;

@Component({
  template: itemsListPageComponentTemplateBegin + itemsListPageComponentTemplateEnd
})
export class BaseItemsListPageComponent<T, RefT extends ObjectRef<T, RefT>> implements OnInit, OnDestroy {
  data: ListPageOptions<T, RefT>;
  isActive = false;
  outdatedData = false;
  managerChangesSubscription: Subscription;

  approxItemHeight = '46px';

  processing: {} | null = null;

  updatingSearchIndex = false;
  searchText: string;

  @ViewChild(Searchbar) searchBar: Searchbar;
  @ViewChild(Refresher) refresher: Refresher;
  @ViewChild(Content) content: Content;

  constructor(protected asyncExec: AsyncExecService, protected navCtrl: NavController, navParams: NavParams, protected alertCtrl: AlertController) {
    const data: ListPageOptions<T, RefT> = this.data = navParams.data;
    if (!data.extra) {
      data.extra = {};
    }
    if (data.allowDelete) {
      data.allowDelete = false;
      if (!data.slidingButtons) {
        data.slidingButtons = [];
      }
      data.slidingButtons.push({
        icon: 'trash',
        text: 'Remove',
        color: 'danger',
        visible: (item) => !item.manager.readonly(),
        handler: (item) => this.itemRemove(item)
      });
      if (!data.selectionButtons) {
        data.selectionButtons = [];
      }
      data.selectionButtons.unshift({
        icon: 'trash',
        color: 'danger',
        visible: (items) => {for (const item of items) { if (item.manager.readonly()) {return false; } } return true; },
        handler: (items) => this.itemsRemove(items)
      });
    }
    if (!data.partialList) {
      this.outdatedData = true;
      data.partialList = {
        items: []
      };
    }
    if (data.search) {
      this.updateSearchIndex();
    }
  }

  ngOnInit(): void {
    this.managerChangesSubscription = this.data.manager.changes.subscribe(() => this.onManagerChange());
  }

  onManagerChange() {
    if (this.isActive) {
      this.refresh();
    } else {
      this.outdatedData = true;
    }
  }

  ngOnDestroy(): void {
    this.managerChangesSubscription.unsubscribe();
  }

  ionViewWillEnter() {
    this.isActive = true;
    if (this.outdatedData) {
      this.refresh();
    }
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  ionViewDidEnter() {
    this.focusSearchBar();
    const scrollTop = this.data.scrollTop;
    if (scrollTop) {
      delete this.data.scrollTop;
      this.content.scrollTo(0, scrollTop);
    }
  }

  focusSearchBar() {
    setTimeout(() => {
      const searchBar = this.searchBar;
      if (searchBar) {
        searchBar.setFocus();
      }
    });
  }

  itemTap(event, itemRef: RefT, index: number) {
    if (this.data.selection) {
      this.toggleSelection(itemRef);
    } else if (this.data.itemTap) {
      setTimeout(() => this.data.itemTap(itemRef, index, this.data.partialList));
    }
  }

  itemPress(event, itemRef: RefT) {
    if (!this.data.selection) {
      this.toggleSelection(itemRef);
    } else if (this.data.selectedItemsPress) {
      this.data.selectedItemsPress(this.data.selection);
    }
  }

  toggleSelection(itemRef: RefT) {
    if (!this.data.selection) {
      this.selectionStart(itemRef);
      return;
    }
    if (this.data.selection.has(itemRef)) {
      this.data.selection.delete(itemRef);
    } else {
      this.data.selection.add(itemRef);
    }
    if (this.data.selection.size === 0 && !this.data.keepEmptySelection) {
      this.selectionCancel();
    }
  }

  getSamePage() {
    return BaseItemsListPageComponent;
  }

  isSelected(itemRef: RefT) {
    return this.data.selection && this.data.selection.has(itemRef);
  }

  searchStart() {
    this.navCtrl.push(this.getSamePage(), Object.assign({}, this.data, {
      search: true,
      partialList: null
    }));
  }

  searchCancel() {
    this.navCtrl.pop();
  }

  selectionStart(itemRef: RefT) {
    if (!this.data.allowSelection) {
      return;
    }
    const selection = new Set();
    selection.add(itemRef);
    this.navCtrl.push(this.getSamePage(), Object.assign({}, this.data, {
      selection,
      scrollTop: this.content.scrollTop
    }));
  }

  selectionCancel() {
    this.navCtrl.pop();
  }

  async * listItems(): AsyncIterableIterator<RefT[]> {
    const data = this.data;
    if (data.search) {
      yield* data.manager.search(this.searchText);
    } else {
      yield* data.manager.list();
    }
  }

  async onSearchTextChange(newSearchText: string) {
    this.searchText = newSearchText;
    await this.refresh();
  }

  async updateSearchIndex() {
    const manager = this.data.manager;
    if (manager.canSearch()) {
      this.updatingSearchIndex = true;
      try {
        await manager.updateSearchIndex();
      } finally {
        this.updatingSearchIndex = false;
        this.focusSearchBar();
      }
    }
  }

  async confirmRemove() {
    let confirmed = false;
    const alertCtrl = this.alertCtrl.create({
      title: 'Confirmation',
      message: 'Are you sure you want to remove the selected item(s)?',
      buttons: [{
        text: 'Yes',
        role: 'destructive',
        handler: () => {confirmed = true}
      }, 'No']
    });
    alertCtrl.present();
    await new Promise(resolve => alertCtrl.didLeave.subscribe(resolve));
    return confirmed;
  }

  async itemRemove(itemRef: RefT) {
    const confirmed = await this.confirmRemove();
    if (confirmed) {
      this.asyncExec.asyncExec(async () => {
        await itemRef.manager.remove(itemRef);
      });
    }
  }

  async itemsRemove(itemsRef: Set<RefT>) {
    const confirmed = await this.confirmRemove();
    if (confirmed) {
      this.asyncExec.asyncExec(async () => {
        const mapManagersToItemsToRemove = new Map<ItemsManager<T, RefT>, RefT[]>();
        for (const itemRef of itemsRef) {
          const manager = itemRef.manager;
          let managerItems = mapManagersToItemsToRemove.get(manager);
          if (!managerItems) {
            managerItems = [];
            mapManagersToItemsToRemove.set(manager, managerItems);
          }
          managerItems.push(itemRef);
        }
        for (const managerAndItems of mapManagersToItemsToRemove) {
          await managerAndItems[0].removeAll(managerAndItems[1]);
        }
        this.navCtrl.pop();
      });
    }
  }

  async refresherRefresh() {
    try {
      await this.refresh();
    } finally {
      this.refresher.complete();
    }
  }

  async baseListChangePartialList(changeFn: () => Promise<PartialList<RefT>>) {
    const processing = this.processing = {};
    let newPartialList: PartialList<RefT>;
    try {
      newPartialList = await changeFn();
    } finally {
      if (this.processing === processing) {
        if (newPartialList) {
          this.data.partialList = newPartialList
        }
        this.processing = null;
      }
    }
  }

  async baseListFetchMore() {
    const baseListPartialList = this.data.partialList;
    if (baseListPartialList.fetchMore) {
      await this.baseListChangePartialList(async () => await baseListPartialList.fetchMore());
    }
  }

  async refresh() {
    this.outdatedData = false;
    await this.baseListChangePartialList(async () => await toPartialList(this.listItems()));
  }
}
