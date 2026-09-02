const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('base64url');
console.log(key);
console.error('Store this value only in ignored .env files and firmware/esp32-smartbin/src/secrets.h. Do not commit it.');
