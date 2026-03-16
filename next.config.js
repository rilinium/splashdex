const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [{
    urlPattern: /^\/frog_sprites\/.*/,
    handler: 'CacheFirst',
    options: { cacheName: 'frog-sprites', expiration: { maxEntries: 200 } },
  }],
});
module.exports = withPWA({ reactStrictMode: true, images: { unoptimized: true } });
