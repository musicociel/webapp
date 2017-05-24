import * as uuid from 'uuid';
import { ObjectRef, ItemsManager } from './items-manager';

export interface PouchDBEntry<T> {
  _id: string;
  _rev?: string;
  type: string;
  object: T;
}

export interface PouchDBObjectRef<T> extends ObjectRef<T, PouchDBObjectRef<T>> {
  id: string;
  rev: string;
}

export abstract class PouchDBObjectManager<T, DBEntry extends PouchDBEntry<T>> extends ItemsManager<T, PouchDBObjectRef<T>> {
  _readonly: () => boolean;

  constructor(protected _getDB: () => any, readonly: () => boolean) {
    super();
    this._readonly = readonly;
  }

  protected abstract getType(): string;
  protected abstract toPouchDBEntry(object: T, previousObject?: PouchDBObjectRef<T>): DBEntry;

  readonly() {
    return this._readonly();
  }

  protected pouchDBEntryHelper(partialId: string, properties, previousObject?: PouchDBObjectRef<T>): DBEntry {
    const type = this.getType();
    let id = `${type}\u0001${partialId}\u0001`;
    if (previousObject && previousObject.id.startsWith(id)) {
      id = previousObject.id;
      return {
        _id: id,
        _rev: previousObject.rev,
        type,
        ...properties
      };
    } else {
      id += uuid.v4();
      return {
        _id: id,
        type,
        ...properties
      };
    }
  }

  protected toPouchDBObjectRef(id: string, rev: string, object: T, orderKey?): PouchDBObjectRef<T> {
    return {
      manager: this,
      id, rev, object, orderKey: orderKey || id
    };
  }

  protected _getWritableDB() {
    if (this.readonly()) {
      throw new Error('readonly');
    }
    return this._getDB();
  }

  protected async _put(entry) {
    const db = this._getWritableDB();
    return await db.put(entry);
  }

  async add(object: T) {
    const res = await this._put(this.toPouchDBEntry(object));
    this.changes.emit();
    return this.toPouchDBObjectRef(res.id, res.rev, object);
  }

  async remove(objectRef: PouchDBObjectRef<T>) {
    await this._put({
      type: this.getType(),
      _id: objectRef.id,
      _rev: objectRef.rev,
      _deleted: true
    });
    this.changes.emit();
  }

  async update(objectRef: PouchDBObjectRef<T>, newObject: T) {
    const toInsert = this.toPouchDBEntry(newObject, objectRef);
    const res = await this._put(toInsert);
    if (toInsert._id !== objectRef.id) {
      // the id changed, let's also remove the old document
      await this._put({
        type: toInsert.type,
        newId: toInsert._id,
        _id: objectRef.id,
        _rev: objectRef.rev,
        _deleted: true
      });
    }
    this.changes.emit();
    return this.toPouchDBObjectRef(res.id, res.rev, newObject);
  }

  async * list(limit = 40): AsyncIterableIterator<PouchDBObjectRef<T>[]> {
    let begin = true;
    let hasMore = true;
    const prefix = this.getType();
    let startkey = `${prefix}\u0001`;
    const endkey = `${startkey}\uffff`;
    while (hasMore) {
      const db = this._getDB();
      const response = await db.allDocs({
        startkey,
        endkey,
        limit,
        skip: begin ? 0 : 1,
        include_docs: true
      });
      const rows = response.rows;
      yield rows.map(row => this.toPouchDBObjectRef(row.doc._id, row.doc._rev, row.doc.object));
      hasMore = rows.length >= limit;
      if (hasMore) {
        startkey = rows[rows.length - 1].doc._id;
        begin = false;
      }
    };
  }

  canSearch(): boolean {
    return false;
  }

  async * search(text: string, limit?: number): AsyncIterableIterator<PouchDBObjectRef<T>[]> {}
}
