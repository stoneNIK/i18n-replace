import type { Visitor, NodePath } from "@babel/traverse";
import babelTraverse from "@babel/traverse";
import * as t from "@babel/types";
import {
  generateInterpolation,
  generateJS,
  generateFormatterJS,
  generateSfc,
  generateTemplate,
} from "./generator";
import { ConfigOptions, FileType } from "./types";
import { parseVue, parseJS } from "./parse";
import { NodeTypes } from "@vue/compiler-core";
import consola from "consola";
import path from "path";
import prettier, { AST } from "prettier";
import { SFCDescriptor } from "@vue/compiler-sfc";

function createDirectiveAttr(type: string, name: string, value: string) {
  // 处理特殊的事件属性
  if (type === "on") {
    return {
      name: "on",
      type: NodeTypes.DIRECTIVE,
      loc: {
        source: `@${name}="${value}"`,
      },
    };
  }

  return {
    name: "bind",
    type: NodeTypes.DIRECTIVE,
    loc: {
      source: `:${name}="${value}"`,
    },
  };
}

function createInterpolationNode(content: string) {
  return {
    type: NodeTypes.INTERPOLATION,
    loc: {
      source: `{{ ${content} }}`,
    },
  };
}

export interface Options {
  code: string;
  locales: Record<string, string>;
  filename: string;
  emptyLocalesSet: Set<string>;
  prettierOptions?: prettier.Options;
}

export const transformFile = async (
  options: Options,
  config: ConfigOptions
): Promise<string> => {
  const { code: sourceCode, filename, locales, emptyLocalesSet } = options;
  const fileType = path.extname(filename) as FileType;

  const hasTargetChar = (code: string): boolean => config.isTargetCode(code);

  const extractChar = (char: string): string => {
    const locale = char.trim().replace(/(\r\n|(\n))/g, ","); // 处理多行文字的情况，替换换行符
    const existKey = Object.keys(locales).find((c) => locales[c] === locale);
    if (existKey) {
      return existKey;
    }
    emptyLocalesSet.add(locale); // 用于后期输出待翻译列表
  };

  const transformJS = (code: string, isInTemplate?: boolean): AST => {
    const ast = parseJS(code);
    let shouldImportVar = false;

    const visitor: Visitor = {
      Program: {
        exit: (nodePath: NodePath) => {
          // 解析import语句
          nodePath.traverse({
            ImportDeclaration: (importPath) => {
              if (
                importPath.node.specifiers.find(
                  (item) => item.local.name === config.importVar
                )
              ) {
                shouldImportVar = false;
                importPath.stop();
              }
            },
          });

          if (shouldImportVar) {
            nodePath.unshiftContainer(
              "body",
              t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(config.importVar))],
                t.stringLiteral(config.importPath)
              )
            );
          }
        },
      },
      StringLiteral: {
        exit: (nodePath: NodePath) => {
          const rawValue: string = nodePath.node.extra?.rawValue;
          if (hasTargetChar(rawValue)) {
            const localeKey = extractChar(rawValue);
            if (!localeKey) {
              return;
            }

            if ([FileType.JS, FileType.JSX].includes(fileType)) {
              shouldImportVar = true;
              nodePath.replaceWith(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(config.importVar),
                    t.identifier("t")
                  ),
                  [t.stringLiteral(localeKey)]
                )
              );
            } else if (fileType === FileType.VUE) {
              if (isInTemplate) {
                nodePath.replaceWith(
                  t.callExpression(t.identifier("$t"), [
                    t.stringLiteral(localeKey),
                  ])
                );
              } else {
                // sfc中的script，这里不使用this.$t是因为有些插件组件可能没有引入i18n，比如vue.extend
                // 所以统一处理成import后使用i18n.t('xxx')
                shouldImportVar = true;
                nodePath.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(config.importVar),
                      t.identifier("t")
                    ),
                    [t.stringLiteral(localeKey)]
                  )
                );
              }
            }
          }
        },
      },
      TemplateLiteral: {
        exit: (nodePath: NodePath) => {
          // 检测模板字符串内部是否含有中文字符
          if (nodePath.node.quasis.some((q) => hasTargetChar(q.value.cooked))) {
            // 生成替换字符串，注意这里不需要过滤quasis里的空字符串
            const replaceStr = nodePath.node.quasis
              .map((q) => q.value.cooked)
              .join(" ");
            const localeKey = extractChar(replaceStr);
            if (!localeKey) {
              return;
            }
            const isIncludeInterpolation = !!nodePath.node.expressions?.length;
            if ([FileType.JS, FileType.JSX].includes(fileType)) {
              shouldImportVar = true;
              if (isIncludeInterpolation) {
                nodePath.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(config.importVar),
                      t.identifier("t")
                    ),
                    [
                      t.stringLiteral(localeKey),
                      t.objectExpression(
                        nodePath.node.expressions.map((e, i) =>
                          t.objectProperty(
                            e.type === "Identifier" ? e : t.identifier(`$${i}`), // 兼容`xx${obj.name}yy`的情况，如果是Identifier直接使用其作为key
                            e
                          )
                        )
                      ),
                    ]
                  )
                );
              } else {
                nodePath.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(config.importVar),
                      t.identifier("t")
                    ),
                    [t.stringLiteral(localeKey)]
                  )
                );
              }
            } else if (fileType === FileType.VUE) {
              if (isInTemplate) {
                if (isIncludeInterpolation) {
                  nodePath.replaceWith(
                    t.callExpression(t.identifier("$t"), [
                      t.stringLiteral(localeKey),
                      t.objectExpression(
                        nodePath.node.expressions.map((e, i) =>
                          t.objectProperty(
                            e.type === "Identifier" ? e : t.identifier(`$${i}`), // 兼容`xx${obj.name}yy`的情况，如果是Identifier直接使用其作为key
                            e
                          )
                        )
                      ),
                    ])
                  );
                } else {
                  nodePath.replaceWith(
                    t.callExpression(t.identifier("$t"), [
                      t.stringLiteral(localeKey),
                    ])
                  );
                }
              } else {
                shouldImportVar = true;
                if (isIncludeInterpolation) {
                  nodePath.replaceWith(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier(config.importVar),
                        t.identifier("t")
                      ),
                      [
                        t.stringLiteral(localeKey),
                        t.objectExpression(
                          nodePath.node.expressions.map((e, i) =>
                            t.objectProperty(
                              e.type === "Identifier"
                                ? e
                                : t.identifier(`$${i}`), // 兼容`xx${obj.name}yy`的情况，如果是Identifier直接使用其作为key
                              e
                            )
                          )
                        ),
                      ]
                    )
                  );
                } else {
                  nodePath.replaceWith(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier(config.importVar),
                        t.identifier("t")
                      ),
                      [t.stringLiteral(localeKey)]
                    )
                  );
                }
              }
            }
          }
        },
      },
      JSXText: {
        exit: (nodePath: NodePath) => {
          if (hasTargetChar(nodePath.node.value)) {
            shouldImportVar = true;

            const localeKey = extractChar(
              nodePath.node.extra?.rawValue as string
            );

            if (!localeKey) {
              return;
            }

            nodePath.replaceWith(
              t.jsxExpressionContainer(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(config.importVar),
                    t.identifier("t")
                  ),
                  [t.stringLiteral(localeKey)]
                )
              )
            );
          }
        },
      },
    };

    babelTraverse(ast, visitor);
    return ast;
  };

  const transformTemplate = (ast: AST): AST => {
    if (ast.props?.length) {
      ast.props = ast.props.map((prop) => {
        // vue指令
        if (
          prop.type === NodeTypes.DIRECTIVE &&
          hasTargetChar(prop.exp?.content)
        ) {
          const jsCode = generateInterpolation(
            transformJS(prop.exp?.content, true)
          );
          return createDirectiveAttr(prop.name, prop.exp?.content, jsCode);
        }
        // 普通属性
        if (
          prop.type === NodeTypes.ATTRIBUTE &&
          hasTargetChar(prop.value?.content)
        ) {
          const localeKey = extractChar(prop.value.content);
          if (localeKey) {
            return createDirectiveAttr("bind", prop.name, `$t('${localeKey}')`);
          }
        }

        return prop;
      });
    }

    if (ast.children.length) {
      ast.children = ast.children.map((child) => {
        if (child.type === NodeTypes.TEXT && hasTargetChar(child.content)) {
          const localeKey = extractChar(child.content);
          if (localeKey) {
            return createInterpolationNode(`$t('${localeKey}')`);
          }
        }

        // 插值语法，插值语法的内容包含在child.content内部，如果匹配到中文字符，则进行JS表达式解析并替换
        if (
          child.type === NodeTypes.INTERPOLATION &&
          hasTargetChar(child.content?.content)
        ) {
          const jsCode = generateInterpolation(
            transformJS(child.content?.content, true)
          );
          return createInterpolationNode(jsCode);
        }

        // 元素
        if (child.type === NodeTypes.ELEMENT) {
          return transformTemplate(child);
        }

        return child;
      });
    }
    return ast;
  };

  const transformVue = (code: string): SFCDescriptor => {
    const descriptor = parseVue(code);
    let { template, script, scriptSetup } = descriptor;
    if (template?.content && hasTargetChar(template?.content)) {
      const templateAst = transformTemplate(template?.ast);
      descriptor.template.content = generateTemplate(templateAst, "");
    }

    if (script?.content) {
      descriptor.script.content = generateJS(transformJS(script.content));
    } else if (scriptSetup?.content) {
      descriptor.scriptSetup.content = generateJS(
        transformJS(scriptSetup.content)
      );
    }
    return descriptor;
  };

  if (!Object.values(FileType).includes(fileType)) {
    consola.warn(`Unsupported file type: ${filename}`);
    return;
  }
  if (!hasTargetChar(sourceCode)) {
    // 没有需要翻译的文件直接返回
    return;
  }
  const prettierOptions = options.prettierOptions ?? {
    // 如果当前项目没有使用prettier，就使用默认配置
    semi: false,
    filepath: filename,
  };
  switch (fileType) {
    // TODO: TSX
    case FileType.JSX:
    case FileType.JS:
      return generateFormatterJS(transformJS(sourceCode), prettierOptions);
    case FileType.VUE:
      return generateSfc(transformVue(sourceCode), prettierOptions);
  }
};
