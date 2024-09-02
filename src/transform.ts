import type { Visitor, NodePath } from "@babel/traverse";
import babelTraverse from "@babel/traverse";
import * as t from "@babel/types";
import {
  generateInterpolation,
  generateJS,
  generateSfc,
  generateTemplate,
} from "./generator";
import { ConfigOptions, FileType } from "./types";
import { parseVue, parseJS } from "./parse";
import { NodeTypes } from "@vue/compiler-core";
import consola from "consola";

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

interface Options {
  code: string;
  locales: Record<string, string>;
  filename: string;
  emptyLocalesSet: Set<string>;
}

export class Transformer {
  result: string = "";
  locales: Record<string, string> = {}; // 提取的中文键值对
  sourceCode: string;
  filename: string;
  fileType: FileType;
  importVar: string = "i18n";
  importPath: string = "";
  config: ConfigOptions;
  emptyLocalesSet: Set<string>;

  constructor(options: Options, config: ConfigOptions) {
    this.sourceCode = options.code;
    this.filename = options.filename;
    this.locales = options.locales;
    this.emptyLocalesSet = options.emptyLocalesSet;

    this.config = config;
    this.startTransform();
  }

  hasTargetChar(code: string): boolean {
    return this.config.characterReg(code);
  }

  startTransform() {
    if (!Object.values(FileType).includes(this.fileType)) {
      consola.warn(`Unsupported file type: ${this.filename}`);
      return;
    }
    if (!this.hasTargetChar(this.sourceCode)) {
      // 没有中文
      return;
    }
    switch (this.fileType) {
      case FileType.JS:
        this.result = generateJS(this.transformJS(this.sourceCode));
        break;
      case FileType.VUE:
        this.result = generateSfc(this.transformVue(this.sourceCode));
        break;
    }
  }

  transformJS(code: string, isInTemplate?: boolean) {
    const ast = parseJS(code);
    let shouldImportVar = false;

    const visitor: Visitor = {
      Program: {
        exit: (nodePath: NodePath) => {
          if (this.fileType === FileType.JS) {
            // 解析import语句
            nodePath.traverse({
              ImportDeclaration: (importPath) => {
                if (
                  importPath.node.specifiers.find(
                    (item) => item.local.name === this.importVar
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
                  [t.importDefaultSpecifier(t.identifier(this.importVar))],
                  t.stringLiteral(this.importPath)
                )
              );
            }
          }
        },
      },
      StringLiteral: {
        exit: (nodePath: NodePath) => {
          const rawValue: string = nodePath.node.extra?.rawValue;
          if (this.hasTargetChar(rawValue)) {
            const localeKey = this.extractChar(rawValue);

            if (this.fileType === FileType.JS) {
              shouldImportVar = true;
              nodePath.replaceWith(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(this.importVar),
                    t.identifier("t")
                  ),
                  [t.stringLiteral(localeKey)]
                )
              );
            } else if (this.fileType === FileType.VUE) {
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
                      t.identifier(this.importVar),
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
          if (
            nodePath.node.quasis.some((q) => this.hasTargetChar(q.value.cooked))
          ) {
            // 生成替换字符串，注意这里不需要过滤quasis里的空字符串
            const replaceStr = nodePath.node.quasis
              .map((q) => q.value.cooked)
              .join(" ");
            const localeKey = this.extractChar(replaceStr);
            const isIncludeInterpolation = !!nodePath.node.expressions?.length;
            if (this.fileType === FileType.JS) {
              shouldImportVar = true;
              if (isIncludeInterpolation) {
                nodePath.replaceWith(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(this.importVar),
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
                      t.identifier(this.importVar),
                      t.identifier("t")
                    ),
                    [t.stringLiteral(localeKey)]
                  )
                );
              }
            } else if (this.fileType === FileType.VUE) {
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
                        t.identifier(this.importVar),
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
                        t.identifier(this.importVar),
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
          if (this.hasTargetChar(nodePath.node.value)) {
            const localeKey = this.extractChar(
              nodePath.node.extra?.rawValue as string
            );

            nodePath.replaceWith(
              t.jsxExpressionContainer(
                t.callExpression(t.identifier("$t"), [
                  t.stringLiteral(localeKey),
                ])
              )
            );
          }
        },
      },
    };

    babelTraverse(ast, visitor);
    return ast;
  }

  transformTemplate(ast) {
    if (ast.props?.length) {
      ast.props = ast.props.map((prop) => {
        // vue指令
        if (
          prop.type === NodeTypes.DIRECTIVE &&
          this.hasTargetChar(prop.exp?.content)
        ) {
          const jsCode = generateInterpolation(
            this.transformJS(prop.exp?.content, true)
          );
          return createDirectiveAttr(prop.name, prop.exp?.content, jsCode);
        }
        // 普通属性
        if (
          prop.type === NodeTypes.ATTRIBUTE &&
          this.hasTargetChar(prop.value?.content)
        ) {
          const localeKey = this.extractChar(prop.value.content);
          if (localeKey) {
            return createDirectiveAttr("bind", prop.name, `$t('${localeKey}')`);
          }
        }

        return prop;
      });
    }

    if (ast.children.length) {
      ast.children = ast.children.map((child) => {
        if (
          child.type === NodeTypes.TEXT &&
          this.hasTargetChar(child.content)
        ) {
          const localeKey = this.extractChar(child.content);
          if (localeKey) {
            return createInterpolationNode(`$t('${localeKey}')`);
          }
        }

        // 插值语法，插值语法的内容包含在child.content内部，如果匹配到中文字符，则进行JS表达式解析并替换
        if (
          child.type === NodeTypes.INTERPOLATION &&
          this.hasTargetChar(child.content?.content)
        ) {
          const jsCode = generateInterpolation(
            this.transformJS(child.content?.content, true)
          );
          return createInterpolationNode(jsCode);
        }

        // 元素
        if (child.type === NodeTypes.ELEMENT) {
          return this.transformTemplate(child);
        }

        return child;
      });
    }
    return ast;
  }

  transformVue(code: string) {
    const descriptor = parseVue(code);
    let { template, script, scriptSetup } = descriptor;
    if (template?.content && this.hasTargetChar(template?.content)) {
      descriptor.template.content = generateTemplate(
        this.transformTemplate(template?.ast)
      );
    }

    if (script?.content) {
      descriptor.script.content = generateJS(this.transformJS(script.content));
    } else if (scriptSetup?.content) {
      descriptor.scriptSetup.content = generateJS(
        this.transformJS(scriptSetup.content)
      );
    }
    return descriptor;
  }

  extractChar(char: string): string {
    const locale = char.trim().replace(/(\r\n|(\n))/g, ","); // 处理多行文字的情况，替换换行符
    const existKey = Object.keys(this.locales).find(
      (c) => this.locales[c] === locale
    );
    if (existKey) {
      return existKey;
    }
    this.emptyLocalesSet.add(locale); // 用于后期输出待翻译列表
  }
}
