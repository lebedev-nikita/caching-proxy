```ts
import { CachingProxy } from "@lebedev/caching-proxy";

const webpages = new CachingProxy({
  maxCount: 10,
  // invalidate cached item after 10 minutes after last .get() by it's key
  unusedTime: 60e3 * 10,
  // invalidate cached item after 1 hour anyway
  staleTime: 60e3 * 60,

  fetchItem(key: { url: string }) {
    // if will print "fetch" on every uncached .get()
    console.log("fetch");
    return fetch(key.url).then((res) => res.text());
  },
});

// prints "fetch"
await webpages.get({ url: "https://google.com" });
// does not print "fetch" because the response has already been cached
await webpages.get({ url: "https://google.com" });
process.exit(0);
```
