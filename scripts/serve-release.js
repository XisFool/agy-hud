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
const filePath = path.resolve(projectRoot, args.get('--file') || 'agy-hud.zip');
const route = `/${path.basename(filePath)}`;

if (!fs.existsSync(filePath)) {
  process.stderr.write(`Release artifact not found: ${filePath}\n`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url !== route) {
    res.writeHead(404);
    res.end();
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-Length': stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  const address = server.address();
  process.stdout.write(JSON.stringify({
    host,
    port: address.port,
    route,
    url: `http://${host}:${address.port}${route}`,
  }) + '\n');
});
