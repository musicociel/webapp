import { objectRefSorter, ObjectRef, ItemsManager } from './items-manager';
import { mergePartialResults } from './items-list-utils';
import { Subscription } from 'rxjs/Subscription';

export class MergeManager<T, RefT extends ObjectRef<T, RefT>> extends ItemsManager<T, RefT> {
  private managers: {manager: ItemsManager<T, RefT>, subscription: Subscription}[] = [];

  constructor() {
    super();
  }

  async setManagers(managers: ItemsManager<T, RefT>[]) {
    await this._delayNotifyChanges(async () => {
      const existingManagers = new Set<ItemsManager<T, RefT>>();
      this.managers.forEach(manager => existingManagers.add(manager.manager));
      for (const manager of managers) {
        if (existingManagers.has(manager)) {
          existingManagers.delete(manager);
        } else {
          this.addManager(manager);
        }
      }
      for (const manager of existingManagers) {
        this.removeManager(manager);
      }
    });
  }

  addManager(manager: ItemsManager<T, RefT>) {
    this.managers.push({
      manager,
      subscription: manager.changes.subscribe(() => this.markChange())
    });
    this.markChange();
  }

  removeManager(manager: ItemsManager<T, RefT>) {
    const index = this.managers.findIndex(managerInfo => managerInfo.manager === manager);
    if (index > -1) {
      const managerInfo = this.managers[index];
      managerInfo.subscription.unsubscribe();
      this.managers.splice(index, 1);
      this.markChange();
    }
  }

  readonly(): boolean {
    return true;
  }
  add(object: T): Promise<RefT> {
    throw new Error('readonly');
  }
  remove(objectRef: RefT): Promise<void> {
    throw new Error('readonly');
  }
  update(objectRef: RefT, object: T): Promise<RefT> {
    throw new Error('readonly');
  }

  async * list(limit?: number): AsyncIterableIterator<RefT[]> {
    const managersResults = this.managers.map(manager => manager.manager.list(limit));
    yield* mergePartialResults(managersResults, objectRefSorter);
  }

  canSearch(): boolean {
    return this.managers.some(manager => manager.manager.canSearch());
  }
  async * search(text: string, limit?: number): AsyncIterableIterator<RefT[]> {
    const managersResults = this.managers.map(manager => manager.manager.search(text, limit));
    yield* mergePartialResults(managersResults, objectRefSorter);
  }
}
