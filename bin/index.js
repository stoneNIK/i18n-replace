#!/usr/bin/env node
"use strict";

const fs = require("fs");

function onError(e) {
  console.error("出错了，", e);
}

function isFileExists(path) {
  return new Promise((resolve) =>
    fs.access(path, fs.constants.F_OK, (err) => resolve(!err))
  );
}

(async function main() {
  const path = require("path");
  const rootDir = process.cwd(); // 执行环境根目录
  const configUrl = path.resolve(rootDir, "./gr-i18n.js");
  const exists = await isFileExists(configUrl);
  if (!exists) {
    console.log("文件不存在");
    return;
  }
  const config = require(configUrl);
  console.log(config);
})().catch(onError);
