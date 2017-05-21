import { EventEmitter } from '@angular/core';

export interface ObjectRef<T, RefT extends ObjectRef<T, RefT>> {
  manager: ItemsManager<T, RefT>;
  object: T;
  orderKey?: string | number;
}

export abstract class ItemsManager<T, RefT extends ObjectRef<T, RefT>> {
  changes = new EventEmitter();

  protected _delayNotifyChangesCalls = 0;
  protected _markedChanges = false;

  protected async _notifyChange() {
    this.changes.emit();
  }

  protected async _delayNotifyChanges(fn: () => Promise<void>) {
    this._delayNotifyChangesCalls++;
    try {
      await fn();
    } finally {
      this._delayNotifyChangesCalls--;
      if (this._delayNotifyChangesCalls <= 0 && this._markedChanges) {
        await this._notifyChange();
      }
    }
  }

  async markChange() {
    if (this._delayNotifyChangesCalls <= 0) {
      await this._notifyChange();
    } else {
      this._markedChanges = true;
    }
  }

  abstract readonly(): boolean;
  abstract add(object: T): Promise<RefT>;

  async addAll(objects: T[]): Promise<RefT[]> {
    const res = [];
    await this._delayNotifyChanges(async () => {
      for (const object of objects) {
        res.push(await this.add(object));
      }
    });
    return res;
  }

  abstract remove(objectRef: RefT): Promise<void>;

  async removeAll(objectRefs: RefT[]): Promise<void> {
    await this._delayNotifyChanges(async () => {
      for (const objectRef of objectRefs) {
        await this.remove(objectRef);
      }
    });
  }

  abstract update(objectRef: RefT, newObject: T): Promise<RefT>;

  abstract list(limit?: number): AsyncIterableIterator<RefT[]>;

  abstract canSearch(): boolean;
  abstract search(text: string, limit?: number): AsyncIterableIterator<RefT[]>;

  dispose() {
    this.changes.complete();
  }
}

export function objectRefSorter<T, RefT extends ObjectRef<T, RefT>>(a: RefT, b: RefT) {
  return (a.orderKey < b.orderKey) ? -1 : (a.orderKey > b.orderKey ? 1 : 0);
}
