const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../prisma/dev.db');

try {
  if (!fs.existsSync(dbPath)) {
    execSync('npx prisma db push', { stdio: 'inherit' });
  } else {
    const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
    if (!fs.existsSync(clientPath)) {
      execSync('npx prisma generate', { stdio: 'inherit' });
    }
  }
} catch (error) {
  console.error('数据库初始化失败:', error.message);
}
