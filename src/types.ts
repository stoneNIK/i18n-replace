// 配置项
export interface ConfigOptions {
  appid: string;
  secret: string;
  pattern?: string;
  ignore?: string | string[];
  importPath: string;
  jsonUrl: string;
  characterReg: (code: string) => boolean;
  formatKey: (key: string, path: string) => string;
  toLocales: string[];
}

// 文件类型
export enum FileType {
  JS = ".js",
  VUE = ".vue",
  JSX = ".jsx",
  TSX = ".tsx",
  TS = ".ts",
}
