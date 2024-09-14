import { transformFile, Options } from "../../src/transform";
import { ConfigOptions } from "../../src/types";

export const replaceFile = (
  param: Options,
  config: ConfigOptions
): Promise<string> => {
  return transformFile(param, config);
};
