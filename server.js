/**
 * 极简 HTTP 服务器（Node.js 内置模块，无需 npm 安装）
 * 用于本地预览 style-knowledge 网站
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8767;
const ROOT = __dirname;

// MIME 类型映射
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  
  // 安全检查：防止路径穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + req.url);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n✅ 形式风格知识库已启动');
  console.log('📂 根目录: ' + ROOT);
  console.log('🌐 访问地址: http://localhost:' + PORT + '\n');
});
