import md5 from "md5-node";
import axios from "axios";
import { ConfigOptions } from "./types";

// 调接口翻译文本
export const translate = (msg = "", { appid, secret }) => {
  const q = msg;
  const salt = parseInt(Math.random() * 1000000000 + "");
  const sign = md5(appid + q + salt + secret);
  const params = encodeURI(
    `q=${q}&from=zh&to=en&appid=${appid}&salt=${salt}&sign=${sign}`
  );
  const url = `http://api.fanyi.baidu.com/api/trans/vip/translate?${params}`;
  return axios.get(url).then((res) => {
    const obj = res.data.trans_result?.[0];
    return obj.dst;
  });
};

// 将翻译后的文案（英文）转换为驼峰命名key
export const formatTranslateKey = (str) => {
  // 单词间去掉空格，比如"add task" -> "addTask"
  let word = str.replace(/\s([a-zA-Z])/g, (match, char) => char.toUpperCase());
  // 手动去掉标点符号和空格，只保留英文字符作为key
  word = word.replace(/[^a-zA-Z_]/g, "");
  if (word.length > 50) {
    // 过长的key直接使用tips替代，一般都是提示语句
    word = "tips_" + Math.random().toString(36).slice(2);
  }
  // 首字母小写，这里不是必须，只是小驼峰更好看
  return word.charAt(0).toLowerCase() + word.slice(1);
};

type GetTranslateKey = (
  str: string,
  {
    config,
    containChar,
    repeatKey,
  }: {
    config: ConfigOptions;
    containChar: (str: string) => string | undefined;
    repeatKey: (str: string) => string | undefined;
  }
) => Promise<string>;

// 翻译字符串
export const getTranslateKey: GetTranslateKey = async (
  str,
  { config, containChar, repeatKey }
) => {
  let result = "";
  str = str.trim(); // 去除两边空格
  const specialList = [
    { reg: /^请(?:输入|填入|填写)([^，]+)$/, prefix: "pinput_" },
    { reg: /^请选择([^，]+)$/, prefix: "psel_" },
  ];
  const specialItem = specialList.find((e) => e.reg.test(str));
  if (specialItem) {
    const zhKey = specialItem.reg.exec(str)[1];
    const existKey = containChar(zhKey);
    if (existKey) {
      // 如果已经翻译过，减少一次请求
      result = formatTranslateKey(
        specialItem.prefix + (existKey.split(".")[1] || existKey)
      );
    } else {
      const _translatekey = await translate(zhKey, config);
      result = formatTranslateKey(specialItem.prefix + _translatekey);
    }
  } else {
    const _key = await translate(str, config);
    result = formatTranslateKey(_key);
  }
  if (config.formatKey) {
    result = config.formatKey(result, ""); // 目前拿不到路径，所以先暂时传空
  }
  if (repeatKey(result)) {
    // 不同中文翻译+转换后出现重复，就加1处理
    result = result + "1";
  }
  return result;
};
