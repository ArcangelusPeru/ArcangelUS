// Run locally. Save the result in GoDaddy Secrets and in a private password manager.
// Never commit the generated key or replace a key already in use.
console.log(require('node:crypto').randomBytes(32).toString('base64'));
