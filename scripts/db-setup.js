const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '../prisma/dev.db');

console.log('\n==================================================');
console.log('🐛 虫虫OvO - 数据库自适应连接引擎启动...');

try {
  // 1. 检查 SQLite 数据库文件是否存在
  if (!fs.existsSync(dbPath)) {
    console.log('📦 [检测结果]: 数据库文件 (prisma/dev.db) 不存在！');
    console.log('⏳ [自动构建]: 正在启动 Prisma 自动为您创建数据库并推送表结构，请稍候...');
    
    // 执行 prisma db push 创建 SQLite 数据库并生成客户端，带有 stdio 以便显示完美进度条
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('🟢 [创建成功]: SQLite 数据库已自动创建，且表结构已完美就绪！');
  } else {
    console.log('🟢 [检测结果]: 数据库文件 (prisma/dev.db) 已就绪。');
    
    // 为了防止在新的环境下 node_modules 缺失 Prisma 编译客户端，进行二次快速验证
    const clientPath = path.join(__dirname, '../node_modules/.prisma/client');
    if (!fs.existsSync(clientPath)) {
      console.log('⏳ [检测异常]: 缺少 Prisma 编译客户端。正在为您增量生成...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('🟢 [生成成功]: Prisma 客户端构建就绪！');
    } else {
      console.log('🟢 [连接状态]: SQLite 数据库连接畅通！');
    }
  }
} catch (error) {
  console.error('❌ [初始化失败]: 数据库自动构建出错。请检查以下信息并尝试手动运行 `npx prisma db push`:');
  console.error(error.message);
}

console.log('==================================================\n');
