export type PartialListFetchFunction<T> = () => Promise<PartialList<T>>;
export interface PartialList<T> {
  items: T[];
  fetchMore?: PartialListFetchFunction<T>;
}

export async function * flatten<T>(generator: AsyncIterableIterator<T[]>): AsyncIterableIterator<T> {
  for await (const values of generator) {
    for (const value of values) {
      yield value;
    }
  }
}

export async function * takeSmallest<T>(generators: AsyncIterableIterator<T>[], sortFn: ((a: T, b: T) => number)): AsyncIterableIterator<T> {
  const queues: {value: T, generator: AsyncIterableIterator<T>}[] = [];
  for (const generator of generators) {
    const nextValue = await generator.next();
    if (!nextValue.done) {
      queues.push({
        value: nextValue.value,
        generator
      });
    }
  }
  let queuesNbr = queues.length;
  while (queuesNbr > 0) {
    let bestValueIndex = 0;
    let bestValue = queues[bestValueIndex].value;
    for (let i = 1; i < queuesNbr; i++) {
      const queueValue = queues[i].value;
      if (sortFn(queueValue, bestValue) < 0) {
        bestValueIndex = i;
        bestValue = queueValue;
      }
    }
    yield bestValue;
    const bestQueue = queues[bestValueIndex];
    const nextValue = await bestQueue.generator.next();
    if (nextValue.done) {
      queues.splice(bestValueIndex, 1);
      queuesNbr--;
    } else {
      bestQueue.value = nextValue.value;
    }
  }
}

export async function * takeItems<T>(generator: AsyncIterableIterator<T>, limit = 20): AsyncIterableIterator<T[]> {
  let notFinished = true;
  while (notFinished) {
    const items: T[] = [];
    for (let i = 0; i < limit; i++) {
      const nextValue = await generator.next();
      if (nextValue.done) {
        notFinished = false;
        break;
      } else {
        items.push(nextValue.value);
      }
    }
    yield items;
  }
}

export async function * filter<T>(source: AsyncIterableIterator<T>, filter: (item: T) => boolean): AsyncIterableIterator<T> {
  for await (const item of source) {
    if (filter(item)) {
      yield item;
    }
  }
}

export const mergePartialResults = async function * <T>(generators: AsyncIterableIterator<T[]>[], sortFn: ((a: T, b: T) => number), limit = 20) {
  yield* takeItems(takeSmallest(generators.map(generator => flatten(generator)), sortFn), limit);
};

export const toPartialList = async <T>(generator: AsyncIterableIterator<T[]>): Promise<PartialList<T>> => {
  let done = false;
  const items: T[] = [];
  const fetchMore = async () => {
    if (!done) {
      const nextResult = await generator.next();
      done = nextResult.done;
      if (!done) {
        items.push.apply(items, nextResult.value);
      }
    }
    return done ? {items} : {items, fetchMore};
  };
  return await fetchMore();
};
