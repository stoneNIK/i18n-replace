#!/usr/bin/env node

"use strict";

import path from "path";
import fs from "fs";
import { program } from "commander";
import consola from "consola";

import { replaceFiles, translateCsv, csv2json } from "../lib/index.mjs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

program
  .name(packageJson.name)
  .version(packageJson.version)
  .description(packageJson.description);

// 替换代码中的字符串，必须存在翻译json文件
program
  .command("replace")
  .description("find and replace cn character")
  .option("-n, --noCsv", "Do not output csv files", true)
  .action((options) => {
    replaceFiles(options.noCsv);
  });

// 自动翻译csv，调用百度翻译的接口，需要配置好appid和secret
program
  .command("translate")
  .description("auto translate i18n.csv")
  .action(() => {
    const csvPath = path.resolve(process.cwd(), "./i18n.csv");
    if (!fs.existsSync(csvPath)) {
      consola.error(
        "翻译csv文件不存在，请检查!或执行replace后自动生成未翻译的i18n.csv文件"
      );
      process.exit(1);
    }
    translateCsv(csvPath);
  });

// 将翻译好的csv转换为json文件
program
  .command("csv2json")
  .description("i18n.csv transform to json")
  .action(() => {
    const csvPath = path.resolve(process.cwd(), "./i18n.csv");
    if (!fs.existsSync(csvPath)) {
      consola.error(
        "翻译csv文件不存在，请检查!或执行replace后自动生成未翻译的i18n.csv文件"
      );
      process.exit(1);
    }
    csv2json(csvPath);
  });

program.parse(process.argv);
