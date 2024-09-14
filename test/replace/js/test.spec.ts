import fs from "fs";
import { expect, describe, it, beforeAll, afterAll } from "vitest";
import { replaceFile } from "../replace";
import { defaultConfig } from "../../../src/config";
import { generateFormatterJS } from "../../../src/generator";
import { parseJS } from "../../../src/parse";

const sourceUrl = __dirname + "/test.js";
const expectedUrl = __dirname + "/result.js";

let fileContent;

beforeAll(() => {
  fileContent = fs.readFileSync(sourceUrl, "utf-8");
});

afterAll(() => {
  fs.writeFileSync(sourceUrl, fileContent);
});

describe("replace js file", () => {
  it("js base", async () => {
    const sourceCode = fs.readFileSync(sourceUrl, "utf-8");

    const emptyLocalesSet: Set<string> = new Set();
    const resultCode = await replaceFile(
      {
        code: sourceCode,
        locales: {
          test: "星期四",
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
    for (const item of emptyLocalesSet) {
      console.log(item);
    }
    expect(emptyLocalesSet.size).toBe(18);
  });
});
