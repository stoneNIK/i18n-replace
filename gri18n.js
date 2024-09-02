// import path from "path";

export default {
  appid: "", // 必填，百度翻译的appid
  secret: "", // 必填, 百度翻译的secret
  jsonUrl: "./test/zh.json", // 翻译JSON文件路径，目前只支持JSON，如果遇到使用JS配置i18n的项目，需要改造
  characterReg: (code) => /[\u{4E00}-\u{9FFF}]/gmu.test(code), // 必填。替换代码中的中文，也可以修改为其他语言
  pattern: "./test/*.{vue,js,ts,tsx}",
  ignore: "node_modules",
  importPath: "@/i18n", // 用于自动导入
  // formatKey: function (key, filePath) {
  //   // 为pages目录下每个文件夹分组命名，比如page/user下的都命名成 user.xxx
  //   const obj = path.parse(filePath);
  //   const temp = obj.dir.match(/pages\\([a-z]+)/);
  //   return !temp ? key : `${temp[1]}.${newKey}`;
  // },
  
  toLocales: [], // translateCsv命令需要翻译哪些语言，默认只翻译当前语言和英文。语种代码参考：https://fanyi-api.baidu.com/doc/21
};
