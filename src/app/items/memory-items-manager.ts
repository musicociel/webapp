import { ItemsManager, ObjectRef } from './items-manager';

export abstract class MemoryItemsManager<T, RefT extends ObjectRef<T, RefT>> extends ItemsManager<T, RefT> {
  private _itemRefs: RefT[] = [];

  protected abstract async _createObjectRef(object: T): Promise<RefT>;
  protected async _removeObjectRef(objectRef: RefT) {}
  protected async _changeObjectRef(objectRef: RefT, newObject: T): Promise<RefT> {
    objectRef.object = newObject;
    return objectRef;
  }

  readonly(): boolean {
    return false;
  }

  size() {
    return this._itemRefs.length;
  }

  protected _checkModifiable() {
    if (this.readonly()) {
      throw new Error('readonly');
    }
  }

  protected _clearAll() {
    this._itemRefs = [];
  }

  protected async _internalAddAll(objects: T[]) {
    for (const object of objects) {
      await this._internalAdd(object);
    }
  }

  protected async _internalAdd(object: T) {
    const itemRef = await this._createObjectRef(object);
    this._itemRefs.push(itemRef);
    return itemRef;
  }

  async add(object: T): Promise<RefT> {
    this._checkModifiable();
    const itemRef = await this._internalAdd(object);
    await this.markChange();
    return itemRef;
  }

  async remove(objectRef: RefT): Promise<void> {
    this._checkModifiable();
    const index = this._itemRefs.indexOf(objectRef);
    if (index > -1) {
      this._itemRefs.splice(index, 1);
      await this._removeObjectRef(objectRef);
      await this.markChange();
    }
  }

  async update(objectRef: RefT, newObject: T): Promise<RefT> {
    this._checkModifiable();
    const index = this._itemRefs.indexOf(objectRef);
    if (index > -1) {
      objectRef = await this._changeObjectRef(objectRef, newObject);
      this._itemRefs[index] = objectRef;
      await this.markChange();
      return objectRef;
    } else {
      throw new Error('item was removed');
    }
  }

  async resetList(objects: T[]) {
    this._checkModifiable();
    this._clearAll();
    await this._internalAddAll(objects);
    await this.markChange();
  }

  syncList(): RefT[] {
    return this._itemRefs.slice(0);
  }

  async * list(limit?: number): AsyncIterableIterator<RefT[]> {
    yield this.syncList();
  }

}
