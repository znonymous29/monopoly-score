// Service Worker 版本号 - 更新此版本号以刷新缓存
const CACHE_VERSION = "v1";
const CACHE_NAME = `monopoly-score-${CACHE_VERSION}`;

// 需要缓存的资源列表
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./footage/价格.svg",
  "./footage/城市.svg",
  "./footage/度假村.svg",
  "./footage/抵押.svg",
  "./footage/撤销.svg",
  "./footage/民宿.svg",
  "./footage/空地.svg",
  "./footage/观光费.svg",
  "./footage/记录.svg",
  "./footage/赎回.svg",
  "./footage/重做.svg",
  "./footage/重新开始.svg",
];

// 安装事件 - 缓存静态资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] 缓存静态资源");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // 立即激活新的 service worker
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) => name.startsWith("monopoly-score-") && name !== CACHE_NAME
          )
          .map((name) => {
            console.log("[SW] 删除旧缓存:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // 立即控制所有客户端
  self.clients.claim();
});

// 请求拦截 - 缓存优先策略
self.addEventListener("fetch", (event) => {
  // 只处理 GET 请求
  if (event.request.method !== "GET") return;

  // 只处理 http/https 协议，跳过 chrome-extension:// 等
  const url = new URL(event.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 如果有缓存，返回缓存
      if (cachedResponse) {
        return cachedResponse;
      }

      // 没有缓存，发起网络请求
      return fetch(event.request)
        .then((networkResponse) => {
          // 检查是否是有效响应
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // 克隆响应（因为响应只能使用一次）
          const responseToCache = networkResponse.clone();

          // 将新资源添加到缓存
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // 网络请求失败，返回离线页面（如果有的话）
          console.log("[SW] 网络请求失败:", event.request.url);
        });
    })
  );
});
