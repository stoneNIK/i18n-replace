import consola from "consola";
import path from "path";
import fs from "fs";
import { glob } from "glob";
import csvtojson from "csvtojson";
import { ConfigOptions } from "./types";
import { getConfigOptions } from "./config";
import { Transformer } from "./transform";
import { getTranslateKey } from "./translate";

export const csvPath = path.resolve(process.cwd(), "i18n.csv");

// 替换代码中的字符串，必须存在翻译json文件
export const replaceFiles = async (noCsv) => {
  const config: ConfigOptions = await getConfigOptions();

  if (!config.importPath) {
    consola.warn("Please set import expression's filepath.");
    process.exit(1);
  }

  let locales = {};
  const outputJSONPath = path.resolve(process.cwd(), config.jsonUrl!);
  if (fs.existsSync(outputJSONPath)) {
    const content = fs.readFileSync(outputJSONPath, "utf8");
    if (content) {
      locales = JSON.parse(content);
    }
  }
  let emptyLocalesSet: Set<string> = new Set();

  const files = glob.sync(config.pattern!, { ignore: config.ignore });
  for (const filename of files) {
    const filePath = path.resolve(process.cwd(), filename);
    consola.info(`🚀 detecting file: ${filePath}`);
    const sourceCode = fs.readFileSync(filePath, "utf8");
    try {
      const { result } = new Transformer(
        {
          code: sourceCode,
          locales,
          filename,
          emptyLocalesSet,
        },
        config
      );
      fs.writeFileSync(filePath, result, "utf8");
    } catch (err) {
      consola.log(err);
    }
  }

  consola.success("🎉🎉🎉 执行成功!");

  if (noCsv) {
    // 不需要输出csv表格文件
    return;
  }

  let csvContent = `\ufeffkey,cn\n`; // 添加表头
  Object.entries(locales).forEach(
    ([key, value]) => (csvContent += `${key},${value}\n`)
  );
  emptyLocalesSet.forEach((value) => (csvContent += `,${value}\n`));

  fs.writeFileSync(csvPath, csvContent, "utf8");

  consola.success(`输出待翻译文件成功!地址是：${csvPath}`);
};

// 自动翻译csv，调用百度翻译的接口，需要配置好appid和secret
export const translateCsv = async () => {
  // TODO: 需要支持多语言翻译，目前只支持中文、英文
  const config: ConfigOptions = await getConfigOptions();
  if (!config.appid || !config.secret) {
    consola.warn("Please set appid & secret.");
    process.exit(1);
  }
  const localeArray = await csvtojson().fromFile(csvPath);
  for (const locale of localeArray) {
    if (locale.key) {
      continue;
    }
    const key = await getTranslateKey(locale.cn.trim(), {
      config,
      containChar: (str) => localeArray.find((e) => e.cn === str && e.key)?.key, // 是否已有该字符翻译
      repeatKey: (key) => localeArray.find((e) => e.key === key), // 是否包含重复key
    });
    locale.key = key;
  }

  let csvContent = `\ufeffkey,cn\n`; // 添加表头

  localeArray.forEach((e) => (csvContent += `${e.key},${e.cn}\n`));
  fs.writeFileSync(csvPath, csvContent, "utf8");

  consola.success(`🎉自动翻译文件成功!文件地址是：${csvPath}`);
};

// 将翻译好的csv转换为json文件，输出到根目录
export const csv2json = async () => {
  let result = {};
  const localeArray = await csvtojson().fromFile(csvPath);
  localeArray.forEach((obj) => {
    Object.entries(obj).forEach(([lang, value]) => {
      if (lang !== "key") {
        if (!result[lang]) {
          result[lang] = {};
        }
        result[lang][obj.key] = value;
      }
    });
  });

  Object.entries(result).forEach(([lang, data]) => {
    const outputJSONPath = path.resolve(process.cwd(), `${lang}.json`);
    fs.writeFileSync(outputJSONPath, JSON.stringify(data, null, "\t"), "utf8");
    consola.success(`JSON输出成功!文件地址是：${outputJSONPath}`);
  });
};
