import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const cfg = {
  host: process.env.ORACLE_HOST || 'localhost',
  port: Number(process.env.ORACLE_PORT) || 1521,
  serviceName: process.env.ORACLE_SERVICE_NAME || 'ORCL',
  user: process.env.ORACLE_USER || 'datacore_admin',
  password: process.env.ORACLE_PASSWORD || 'Password123',
  tablespace: process.env.ORACLE_TABLESPACE || 'DATACORE_TS',
  connected: false
};

fs.writeFileSync(path.join(distDir, 'oracle-db-config.json'), JSON.stringify(cfg, null, 2));
console.log('Successfully generated dist/oracle-db-config.json');
