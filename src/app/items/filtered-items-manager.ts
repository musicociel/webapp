import { objectRefSorter, ObjectRef, ItemsManager } from './items-manager';
import { mergePartialResults } from './items-list-utils';
import { Subscription } from 'rxjs/Subscription';
import { flatten, filter, takeItems } from './items-list-utils';

export class FilteredManager<T, RefT extends ObjectRef<T, RefT>> extends ItemsManager<T, RefT> {
  private _changesSubscription: Subscription;

  constructor(public parentManager: ItemsManager<T, RefT>, public filterFunction: (item: RefT) => boolean) {
    super();
    this._changesSubscription = parentManager.changes.subscribe(() => this.markChange());
  }

  readonly(): boolean {
    return this.parentManager.readonly();
  }
  add(object: T): Promise<RefT> {
    return this.parentManager.add(object);
  }
  remove(objectRef: RefT): Promise<void> {
    return this.parentManager.remove(objectRef);
  }
  update(objectRef: RefT, object: T): Promise<RefT> {
    return this.parentManager.update(objectRef, object);
  }

  async * list(limit?: number): AsyncIterableIterator<RefT[]> {
    yield* takeItems(filter(flatten(this.parentManager.list(limit)), this.filterFunction), limit);
  }

  canSearch(): boolean {
    return this.parentManager.canSearch();
  }
  async * search(text: string, limit?: number): AsyncIterableIterator<RefT[]> {
    yield* takeItems(filter(flatten(this.parentManager.search(text, limit)), this.filterFunction), limit);
  }
  async updateSearchIndex() {
    await this.parentManager.updateSearchIndex();
  }

  dispose() {
    this._changesSubscription.unsubscribe();
    super.dispose();
  }
}
