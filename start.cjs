const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const { launchConfig } = await import(pathToFileURL(path.join(__dirname, 'hosting.mjs')));
  const { startShopServer } = await import(pathToFileURL(path.join(__dirname, 'server.mjs')));
  const local = process.argv.includes('--local');
  const env = local
    ? { ...process.env, SHOP_HOSTED: '0', NODE_ENV: 'development', PORT: '', DATA_DIR: '' }
    : { ...process.env, SHOP_HOSTED: '1' };
  const config = { ...launchConfig(env), root: __dirname };
  console.log(`[START] Arcangel US 1.2.0 | Node ${process.versions.node} | puerto ${config.port}`);
  const server = await startShopServer(config);
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 5000).unref();
    });
  }
})().catch(error => {
  console.error(`[STARTUP_ERROR] ${error.code || error.name || 'Error'}: ${error.message}`);
  process.exitCode = 1;
});
