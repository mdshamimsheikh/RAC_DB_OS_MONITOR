import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import AdmZip from 'adm-zip';

const distDir = path.resolve(process.cwd(), 'dist');
const rootWarFile = path.resolve(process.cwd(), 'oracle-datacore-api.war');
const distWarFile = path.resolve(distDir, 'oracle-datacore-api.war');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 0. Create build timestamp info file so user can easily verify deployed build version
const buildInfo = {
  appName: 'Oracle DataCore Enterprise Portal API',
  buildTime: new Date().toISOString(),
  timestamp: Date.now()
};
fs.writeFileSync(path.join(distDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2), 'utf-8');

// 1. Create WEB-INF structure inside dist for Tomcat auto-extraction
const webInfDir = path.join(distDir, 'WEB-INF');
fs.mkdirSync(path.join(webInfDir, 'classes'), { recursive: true });
fs.mkdirSync(path.join(webInfDir, 'lib'), { recursive: true });

const webXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                             http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">
  <display-name>Oracle DataCore Enterprise Portal API</display-name>
  <description>Oracle DataCore Unified Cluster &amp; Data Guard Management API</description>

  <welcome-file-list>
    <welcome-file>index.html</welcome-file>
  </welcome-file-list>

  <error-page>
    <error-code>404</error-code>
    <location>/index.html</location>
  </error-page>
</web-app>`;

fs.writeFileSync(path.join(webInfDir, 'web.xml'), webXmlContent, 'utf-8');

// 2. Copy config and script files to dist
const copyIfExist = (srcName, destName = srcName) => {
  const srcPath = path.resolve(process.cwd(), srcName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(distDir, destName));
  }
};

copyIfExist('oracle-tablespace-setup.sql');
copyIfExist('.env.example');
copyIfExist('package.json');
copyIfExist('nodes.json');
copyIfExist('databases.json');
copyIfExist('tomcat-deploy-pack.sh');
copyIfExist('tomcat-deploy-windows.bat');

const defaultConfig = {
  host: process.env.ORACLE_HOST || 'localhost',
  port: Number(process.env.ORACLE_PORT) || 1521,
  serviceName: process.env.ORACLE_SERVICE_NAME || 'ORCL',
  user: process.env.ORACLE_USER || 'datacore_admin',
  password: process.env.ORACLE_PASSWORD || 'Password123',
  tablespace: process.env.ORACLE_TABLESPACE || 'DATACORE_TS',
  connected: false
};

if (!fs.existsSync(path.join(distDir, 'oracle-db-config.json'))) {
  fs.writeFileSync(path.join(distDir, 'oracle-db-config.json'), JSON.stringify(defaultConfig, null, 2), 'utf-8');
}

// 3. Create WAR archive using adm-zip (Standard ZIP format recognized by Tomcat)
try {
  // Remove existing root WAR file if it exists
  if (fs.existsSync(rootWarFile)) {
    fs.unlinkSync(rootWarFile);
  }

  const zip = new AdmZip();
  zip.addLocalFolder(distDir);
  zip.writeZip(rootWarFile);

  // Copy WAR file to dist folder as well so both locations have it
  fs.copyFileSync(rootWarFile, distWarFile);

  console.log(`\n============================================================`);
  console.log(` ✅ SUCCESS: oracle-datacore-api.war created successfully!`);
  console.log(` 🕒 Build Timestamp: ${buildInfo.buildTime}`);
  console.log(` 📁 Location 1: ./oracle-datacore-api.war`);
  console.log(` 📁 Location 2: ./dist/oracle-datacore-api.war`);
  console.log(`============================================================`);
  console.log(` 📌 TOMCAT DEPLOYMENT & CACHE CLEARING GUIDE:`);
  console.log(` 1. Why Tomcat auto-deletes the extracted folder:`);
  console.log(`    When you delete 'oracle-datacore-api.war' from Tomcat webapps,`);
  console.log(`    Tomcat's autoDeploy deletes 'webapps/oracle-datacore-api/' automatically.`);
  console.log(`    This is NORMAL Tomcat behavior.`);
  console.log(``);
  console.log(` 2. How to ensure your VS Code changes take effect:`);
  console.log(`    a) Stop Tomcat OR remove old WAR + extracted folder.`);
  console.log(`    b) Clear Tomcat cache folder: 'tomcat/work/Catalina/localhost/oracle-datacore-api'`);
  console.log(`    c) Copy new 'oracle-datacore-api.war' to Tomcat 'webapps/'`);
  console.log(`    d) In Chrome/Browser, press Ctrl + Shift + R (Hard Refresh) or Ctrl + F5.`);
  console.log(`============================================================\n`);
} catch (err) {
  console.error(`❌ Error creating WAR archive:`, err);
}

