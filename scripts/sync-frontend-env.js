const fs = require('fs');
const path = require('path');

const rootEnvPath = path.resolve(__dirname, '..', '.env');
const frontendEnvPath = path.resolve(__dirname, '..', 'frontend', '.env');

if (!fs.existsSync(rootEnvPath)) {
  console.error('Root .env not found. Copy .env.example to .env first.');
  process.exit(1);
}

const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
const mapping = {
  UNIVERSITY_NAME: 'VITE_UNIVERSITY_NAME',
  PRIMARY_BRAND_COLOR: 'VITE_PRIMARY_BRAND_COLOR',
  LOGO_URL: 'VITE_LOGO_URL',
};

const vars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  if (mapping[key]) {
    vars[mapping[key]] = value;
  }
}

const output = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
fs.writeFileSync(frontendEnvPath, output);
console.log('Synced frontend/.env from root .env');
console.log(output.trim());
