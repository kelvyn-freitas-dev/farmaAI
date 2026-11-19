/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const configuredUrl = process.env.FARMASTUDY_APP_URL;
if (!configuredUrl) {
  throw new Error(
    'Defina FARMASTUDY_APP_URL com a URL HTTPS hospedada antes de empacotar.',
  );
}

const appUrl = new URL(configuredUrl);
if (appUrl.protocol !== 'https:') {
  throw new Error('FARMASTUDY_APP_URL deve usar HTTPS para o pacote Windows.');
}

const configPath = path.join(__dirname, 'app-config.json');
fs.writeFileSync(configPath, `${JSON.stringify({ appUrl: appUrl.href }, null, 2)}\n`);
console.log(`URL do FarmaStudy AI configurada para o pacote: ${appUrl.origin}`);
