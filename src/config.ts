import path from "path";
import fs from "fs";
import consola from "consola";
import { ConfigOptions, ConfigParam } from "./types";

export const defaultConfig: ConfigOptions = {
  appid: "",
  secret: "",
  jsonUrl: "",
  pattern: "**/*.{vue,js}",
  ignore: ["node_modules/**"],
  importPath: "",
  importVar: "i18n",
  isTargetCode: (code) => /[\u{4E00}-\u{9FFF}]/gmu.test(code), // 翻译中文
  toLocales: [],
  formatKey: (key) => key,
};

const configPath = path.resolve(process.cwd(), "./gri18n.js");

export async function getConfigOptions(): Promise<ConfigOptions> {
  if (!fs.existsSync(configPath)) {
    consola.error(
      "The configuration file does not exist, please create gri18n.js in the project root directory！"
    );
    process.exit(0);
  }
  try {
    const { default: obj }: { default: ConfigParam } = await import(
      "file://" + configPath
    );
    return { ...defaultConfig, ...obj };
  } catch (err) {
    consola.error(err);
    process.exit(1);
  }
}
