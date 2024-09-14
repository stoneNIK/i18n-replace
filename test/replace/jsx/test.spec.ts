import fs from "fs";
import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { replaceFile } from "../replace";
import { defaultConfig } from "../../../src/config";
import { generateFormatterJS } from "../../../src/generator";
import { parseJS } from "../../../src/parse";

const sourceUrl = __dirname + "/page.jsx";
const expectedUrl = __dirname + "/result.jsx";

let pageContent;

beforeAll(() => {
  pageContent = fs.readFileSync(sourceUrl, "utf-8");
});

afterAll(() => {
  fs.writeFileSync(sourceUrl, pageContent);
});

describe("replace jsx", () => {
  it("jsx base", async () => {
    const sourceCode = fs.readFileSync(sourceUrl, "utf-8");

    const emptyLocalesSet: Set<string> = new Set();
    const resultCode = await replaceFile(
      {
        code: sourceCode,
        locales: {
          test: "未知状态",
        },
        filename: sourceUrl,
        emptyLocalesSet,
      },
      {
        ...defaultConfig,
        importPath: "@/i18n",
      }
    );
    const expectedCode = fs.readFileSync(expectedUrl, "utf-8");

    const testPrettierOption = {
      semi: false,
      parser: "babel",
    };
    const resultFormat = await generateFormatterJS(
      parseJS(resultCode),
      testPrettierOption
    );
    const targetFormat = await generateFormatterJS(
      parseJS(expectedCode),
      testPrettierOption
    );
    expect(resultFormat).toBe(targetFormat);
    expect(emptyLocalesSet.size).toBe(0); // 当前不会有待翻译字段
  });
});
