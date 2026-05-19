#!/usr/bin/env node
import fs from 'fs';

// 尝试读取 stdin 并记录到临时文件，看看是否有数据推过来
const fd = process.stdin.fd;
const stats = fs.fstatSync(fd);

if (!stats.isFIFO() && !stats.isCharacterDevice()) {
  fs.writeFileSync('/Users/c/agy-hud/stdin_test.log', 'No input stream detected.');
} else {
  process.stdin.on('data', (data) => {
    fs.appendFileSync('/Users/c/agy-hud/stdin_test.log', data.toString());
  });
}

setTimeout(() => process.exit(0), 1000);
