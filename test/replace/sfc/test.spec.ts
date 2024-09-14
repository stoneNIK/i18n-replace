import fs from "fs";
import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { replaceFile } from "../replace";
import { defaultConfig } from "../../../src/config";
import { generateSfc } from "../../../src/generator";
import { parseVue } from "../../../src/parse";
import { Options } from "prettier";

const sourceUrl = __dirname + "/test.vue";
const expectedUrl = __dirname + "/result.vue";

let pageContent;

beforeAll(() => {
  pageContent = fs.readFileSync(sourceUrl, "utf-8");
});

afterAll(() => {
  fs.writeFileSync(sourceUrl, pageContent);
});

describe("replace sfc", () => {
  it("sfc simple", async () => {
    const sourceCode = fs.readFileSync(sourceUrl, "utf-8");

    const emptyLocalesSet: Set<string> = new Set();

    const testPrettierOption: Options = {
      semi: false,
      parser: "vue",
      htmlWhitespaceSensitivity: "ignore", // 解决闭合标签异常换行的问题
      bracketSameLine: false,
    };

    const resultCode = await replaceFile(
      {
        code: sourceCode,
        locales: {
          test: "测试",
          hello: "你好",
        },
        filename: sourceUrl,
        emptyLocalesSet,
        prettierOptions: testPrettierOption,
      },
      {
        ...defaultConfig,
        importPath: "@/i18n",
      }
    );
    const expectedCode = fs.readFileSync(expectedUrl, "utf-8");

    const resultFormat = await generateSfc(
      parseVue(resultCode),
      testPrettierOption
    );
    const targetFormat = await generateSfc(
      parseVue(expectedCode),
      testPrettierOption
    );
    expect(resultFormat).toBe(targetFormat);
    expect(emptyLocalesSet.size).toBe(0); // 当前不会有待翻译字段
  });
});
