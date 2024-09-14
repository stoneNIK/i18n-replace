export type ExecCodeFunc = (code: string) => boolean;

// 配置项
export interface ConfigOptions {
  appid: string;
  secret: string;
  pattern: string;
  ignore: string | string[];
  importPath: string;
  importVar?: string;
  jsonUrl: string;
  isTargetCode: ExecCodeFunc;
  formatKey: (key: string, path: string) => string;
  toLocales: string[];
}

// 指定字段为可选，其他保持不变
export type CustomPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// 指定字段为必填，其他变为可选
export type CustomRequire<T, K extends keyof T> = Partial<Omit<T, K>> &
  Required<Pick<T, K>>;

// 这两项必须配置，无法设置默认值
export type ConfigParam = CustomRequire<
  ConfigOptions,
  "jsonUrl" | "importPath"
>;

// 文件类型
export enum FileType {
  JS = ".js",
  VUE = ".vue",
  JSX = ".jsx",
  TSX = ".tsx",
  TS = ".ts",
}
