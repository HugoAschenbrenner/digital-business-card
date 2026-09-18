import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const origin = "https://card.example";
type WorkerEvent = {
  request?: Request;
  waitUntil(promise: Promise<unknown>): void;
  respondWith(promise: Promise<Response>): void;
};

async function worker() {
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const saved = new Map<string, Response>();
  const network = new Map<string, string | (() => Promise<Response>)>();
  const requests: string[] = [];
  const key = (input: string | Request) =>
    new URL(typeof input === "string" ? input : input.url, origin).href;
  const cache = {
    match: async (input: string | Request) => saved.get(key(input))?.clone(),
    put: async (input: string | Request, response: Response) => {
      saved.set(key(input), response.clone());
    },
  };
  let offline = false;
  vm.runInNewContext(await readFile("public/sw.js", "utf8"), {
    self: {
      location: { origin },
      addEventListener: (name: string, handler: (event: WorkerEvent) => void) =>
        handlers.set(name, handler),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    URL,
    Response,
    caches: { open: async () => cache },
    fetch: async (input: string | Request) => {
      if (offline) throw new Error("Network disconnected");
      const path = new URL(key(input)).pathname + new URL(key(input)).search;
      requests.push(path);
      const value = network.get(path);
      const response =
        typeof value === "function"
          ? await value()
          : new Response(value ?? "asset");
      Object.defineProperty(response, "type", { value: "basic" });
      return response;
    },
  });
  async function request(path: string) {
    const pending: Promise<unknown>[] = [];
    let result: Promise<Response> | undefined;
    handlers.get("fetch")!({
      request: new Request(new URL(path, origin)),
      waitUntil: (promise) => {
        pending.push(promise);
      },
      respondWith: (promise) => {
        result = promise;
      },
    });
    return {
      response: result ? await result : undefined,
      async settle() {
        while (pending.length) await Promise.all(pending.splice(0));
      },
    };
  }
  return {
    request,
    cache,
    network,
    requests,
    disconnect: () => {
      offline = true;
    },
  };
}

const documentFor = (revision: string) =>
  `<h1>Card ${revision}</h1><link href="/_next/static/${revision}.css" rel="stylesheet"><script src="/_next/static/${revision}.js"></script><img src="/media/profile?v=${revision}"><a href="/admin">Admin</a><img src="https://external.example/private.png">`;

test("a refreshed card keeps new deployment scripts, styles, photo and contact available offline", async () => {
  const w = await worker();
  w.network.set("/card", documentFor("old"));
  await (await w.request("/card")).settle();
  w.network.set("/card", documentFor("new"));
  w.network.set("/_next/static/new.js", "new share implementation");
  w.network.set("/contact.vcf", "updated contact");
  const refresh = await w.request("/card");
  assert.match(await refresh.response!.text(), /Card old/);
  await refresh.settle();
  w.disconnect();
  for (const [path, expected] of [
    ["/card", "Card new"],
    ["/_next/static/new.js", "new share implementation"],
    ["/_next/static/new.css", "asset"],
    ["/media/profile?v=new", "asset"],
    ["/contact.vcf", "updated contact"],
  ]) {
    const result = await w.request(path);
    assert.ok((await result.response!.text()).includes(expected));
    await result.settle();
  }
  assert.ok(!w.requests.includes("/admin"));
  assert.ok(!w.requests.includes("/private.png"));
  assert.equal((await w.request("/admin")).response, undefined);
});

test("a failed deployment asset does not replace the last complete offline card", async () => {
  const w = await worker();
  w.network.set("/card", documentFor("old"));
  await (await w.request("/card")).settle();
  w.network.set("/card", documentFor("new"));
  w.network.set("/_next/static/new.js", async () => {
    throw new Error("Failed download");
  });
  await (await w.request("/card")).settle();
  w.disconnect();
  const result = await w.request("/card");
  assert.match(await result.response!.text(), /Card old/);
  await result.settle();
});

test(
  "warming offline dependencies never delays a network card response",
  { timeout: 3000 },
  async () => {
    const w = await worker();
    let resolveAsset!: (response: Response) => void;
    const slowAsset = new Promise<Response>((resolve) => {
      resolveAsset = resolve;
    });
    w.network.set("/card", documentFor("new"));
    w.network.set("/_next/static/new.js", () => slowAsset);
    const result = await w.request("/card");
    assert.match(await result.response!.text(), /Card new/);
    resolveAsset(new Response("ready"));
    await result.settle();
    assert.equal(
      await (await w.cache.match("/_next/static/new.js"))!.text(),
      "ready",
    );
  },
);
