import type { ParseResult } from "@babel/parser";
import babelGenerator from "@babel/generator";
import type { SFCDescriptor } from "@vue/compiler-sfc";
import type {
  ElementNode,
  TemplateChildNode,
  AttributeNode,
  DirectiveNode,
  RootNode,
} from "@vue/compiler-core";
import type { File, Expression } from "@babel/types";
import prettier from "prettier";

function generateElementAttr(attrs: Array<AttributeNode | DirectiveNode>) {
  return attrs.map((attr) => attr.loc.source).join(" ");
}

export type ParseAst = ParseResult<File> | ParseResult<Expression>;
/**
 * 生成template内部JS表达式
 * 字符串需要使用单引号
 * 函数调用末尾的分号需要移除
 */
export function generateInterpolation(ast: ParseAst) {
  // that's a hack, because @babel/generator will give a semi after a callexpression
  return babelGenerator(ast, {
    compact: false,
    jsescOption: {
      quotes: "single",
    },
  }).code.replace(/;/gm, "");
}

/**
 * 生成script内部的JS
 */
export function generateJS(ast: ParseAst) {
  return babelGenerator(ast).code;
}

export async function generateFormatterJS(
  ast: ParseAst,
  prettierOptions: prettier.Options
) {
  return prettier.format(babelGenerator(ast).code, prettierOptions);
}

/**
 * 组合template，script，style
 */
export function generateSfc(
  descriptor: SFCDescriptor,
  prettierOptions: prettier.Options
) {
  let result = "";

  const { template, script, scriptSetup, styles, customBlocks } = descriptor;
  [template, script, scriptSetup, ...styles, ...customBlocks].forEach(
    (block) => {
      if (block?.type) {
        result += `<${block.type}${Object.entries(block.attrs).reduce(
          (attrCode, [attrName, attrValue]) => {
            if (attrValue === true) {
              attrCode += ` ${attrName}`;
            } else {
              attrCode += ` ${attrName}="${attrValue}"`;
            }

            return attrCode;
          },
          " "
        )}>${block.content}</${block.type}>`;
      }
    }
  );

  return prettier.format(result, prettierOptions);
}

function generateElement(node: ElementNode, children: string) {
  let attributes = "";

  if (node.props.length) {
    attributes = ` ${generateElementAttr(node.props)}`;
  }

  if (node.tag) {
    // 自关闭标签：https://html.spec.whatwg.org/multipage/syntax.html#void-elements
    const selfClosingTags = [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ];

    if (node.isSelfClosing || selfClosingTags.includes(node.tag)) {
      return `<${node.tag}${attributes} />`;
    }

    return `<${node.tag}${attributes}>${children}</${node.tag}>`;
  }

  return children;
}

export function generateTemplate(
  templateAst: ElementNode | TemplateChildNode | RootNode,
  children = ""
): string {
  // @ts-expect-error 类型“InterpolationNode”上不存在属性“children”。
  if (templateAst?.children?.length) {
    // @ts-expect-error 类型“InterpolationNode”上不存在属性“children”
    children = templateAst.children.reduce(
      (result, child) => result + generateTemplate(child),
      ""
    );
  }

  // 元素节点
  if (templateAst.type === 1) {
    return generateElement(templateAst, children);
  }

  // 根节点
  if (templateAst.type === 0) {
    return children;
  }

  return templateAst.loc.source;
}
