import stringify from "fast-json-stable-stringify";

function str(key: unknown) {
  return typeof key == "string" ? key : stringify(key);
}

export class CachingProxy<TKey, TValue> {
  private readonly cache = new Map<string, { createdAt: Date; value: TValue }>();
  private readonly staleTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly unusedTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly staleTime: number;
  private readonly unusedTime: number;
  private readonly maxCount: number;
  private readonly fetchItem: (key: TKey) => TValue | Promise<TValue>;

  constructor(config: {
    maxCount?: number;
    staleTime?: number;
    unusedTime?: number;
    fetchItem: (key: TKey) => TValue | Promise<TValue>;
  }) {
    this.fetchItem = config.fetchItem;
    this.maxCount = config.maxCount ?? Infinity;
    this.staleTime = config.staleTime ?? 60e3 * 60 * 24;
    this.unusedTime = config.unusedTime ?? 60e3 * 60 * 24;
  }

  async get(key: TKey): Promise<TValue> {
    const cachedValue = this.cache.get(str(key));
    if (cachedValue) {
      this.resetUnusedTimeout(key);
      return cachedValue.value;
    }

    const fetchedValue = await this.fetchItem(key);
    this.set(key, fetchedValue);
    return fetchedValue;
  }

  set(key: TKey, value: TValue) {
    this.cache.set(str(key), { createdAt: new Date(), value });
    this.resetStaleTimeout(key);
    this.resetUnusedTimeout(key);
    if (this.cache.size > this.maxCount) {
      this.delOldest();
    }
  }

  has(key: TKey) {
    return this.cache.has(str(key));
  }

  del(key: TKey) {
    this.strDel(str(key));
  }

  private strDel(key: string) {
    this.cache.delete(key);
    this.delStaleTimeout(key);
    this.delUnusedTimout(key);
  }

  private resetStaleTimeout(key: TKey) {
    this.delStaleTimeout(key);
    const timeout = setTimeout(() => this.del(key), this.staleTime);
    this.staleTimeouts.set(str(key), timeout);
  }

  private resetUnusedTimeout(key: TKey) {
    this.delUnusedTimout(key);
    const timeout = setTimeout(() => this.del(key), this.unusedTime);
    this.unusedTimeouts.set(str(key), timeout);
  }

  private delStaleTimeout(key: TKey | string) {
    key = str(key);
    clearTimeout(this.staleTimeouts.get(key));
    this.staleTimeouts.delete(key);
  }

  private delUnusedTimout(key: TKey | string) {
    key = str(key);
    clearTimeout(this.unusedTimeouts.get(key));
    this.unusedTimeouts.delete(key);
  }

  private delOldest() {
    const oldest = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
      .at(0);

    if (oldest) {
      const key = oldest[0];
      this.strDel(key);
    }
  }
}
