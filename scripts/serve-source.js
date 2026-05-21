#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const host = args.get('--host') || '127.0.0.1';
const port = Number(args.get('--port') || 0);

function contentType(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.md')) return 'text/markdown';
  return 'text/plain';
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
  const filePath = path.resolve(projectRoot, relative);

  if (!filePath.startsWith(projectRoot + path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  const address = server.address();
  process.stdout.write(JSON.stringify({
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
  }) + '\n');
});
