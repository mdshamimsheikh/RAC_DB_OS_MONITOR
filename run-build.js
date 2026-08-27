import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('============================================================');
console.log('  Oracle DataCore - Cross-Platform Build Runner');
console.log('============================================================\n');

try {
  console.log('[1/2] Compiling frontend, server, and packaging WAR...');
  execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
  console.log('\n============================================================');
  console.log(' ✅ SUCCESS: Project built and oracle-datacore-api.war created!');
  console.log(' 📁 WAR File:', path.resolve(process.cwd(), 'oracle-datacore-api.war'));
  console.log('============================================================\n');
} catch (err) {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
}
