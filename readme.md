# i18n-replace

## 功能
1. 根据JSON翻译文件自动替换项目中的中文字符
2. 自动生成待翻译csv文件
3. 提供自动翻译功能，需要申请百度翻译的key

因为还有些细节未想好方案，目前还未发布到npm，需要的话可以先clone到本地使用link来使用。

- [x] 动态配置i18n的函数名称
- [x] 动态读取当前工程的prettier配置进行格式化（默认值：```{semi:false}```）
- [x] 根据cpu核心数设置并发处理，不支持配置
- [ ] 替换规则支持外部再转换：formatKey（目前无法在翻译csv时获取path）
- [ ] 支持TS和TSX
- [ ] 支持更多语言(配置项：toLocales)，目前支持中文和英文两种，无法配置
- [ ] 支持vue-i18n 9.x


## 命令
#### ```gri18n replace```
根据json文件查找和替换项目源码中的中文字符。

默认会在项目根目录导出一份csv文件（i18n.csv）。可以指定不导出：```gri18n replace -n```<br/>
详情查看：```gri18n replace -h```。

#### ```gri18n translate```
将根目录的csv表格进行替换，需要配置百度翻译的appid和secret。

#### ```gri18n csv2json``` 
将根目录的csv表格进行转换成多个json文件。

后续需要手动替换项目中的i18njson文件。

设计成三个命令而不是一个命令
---
此前写过一版单命令的，一是执行时间比较久，效率不高，二是此功能是直接对源码进行更改，希望留有余地和修改的机会。

还有就是考虑到多种场景和环境，拆开会比较灵活，方便开发者进行组合或只使用部分功能，比如：
1. 项目中有多个i18n json文件，需要手动进行配置，比如把多个json文件集中到一个json文件，在配置文件中指定它的地址，进行后续的处理。
2. i18n翻译文件是js的情况，需要手动进行转换成json。后续也会考虑支持这种场景。
3. 大多时候翻译是有专门的人员来做，本工具也提供了自动化翻译的命令，但是需要配置百度翻译的appid和secret，方便一些简单的项目处理。

**所以，此工具并不是一个全自动的命令，只是对硬编码的项目支持国际化时的辅助工具。**

## 使用
针对一般项目情况，i18n是放在一个json文件中，常规流程：
1. 在项目根目录创建配置文件：gri18n.js。参数说明在下方。
2. 使用```gri18n replace```命令对项目源码进行查找替换。
3. 将导出的csv整理好发给翻译人员，如果需要自动翻译功能，执行```gri18n translate```自动将未翻译的字符翻译好并生成i18n的key。
4. 拿到翻译完的csv文件，执行```gri18n csv2json```，会在根目录生成多个json文件，手动替换到项目中的i18n json目录。

#### 配置文件参数
- appid

tranlate命令必填。百度翻译的appid

- secret

tranlate命令必填。百度翻译的secret

- jsonUrl

replace命令必填。执行replace命令前需要指定当前的文件json地址，遇到对应的项会直接替换源码

- isTargetCode

replace命令必填。匹配项目中要替换的文字，以下是中文：
```(code) => /[\u{4E00}-\u{9FFF}]/gmu.test(code)```

- pattern

replace命令必填。需要对哪些文件执行替换，例如：
```"./src/*.{vue,js,ts,tsx}"```

- ignore

replace命令选填。需要忽略的内容，例如：```["node_modules"]```

- importPath

replace命令必填。js文件和script执行自动导入，默认：```@/i18n```

- formatKey【function】（暂不支持）

replace命令选填。对翻译的字段进行序列化，例如：
```
import path from "path";
function (key, filePath) {
  // 为pages目录下每个文件夹分组命名，比如page/user下的都命名成 user.xxx
  const obj = path.parse(filePath);
  const temp = obj.dir.match(/pages\\([a-z]+)/);
  return !temp ? key : `${temp[1]}.${newKey}`;
},
```

- toLocales 【array】（暂不支持）

tranlate命令选填。默认只翻译当前语言和英文，可配置多种语言。例如：```["en", "zh", "de"]```。

语种代码参考：https://fanyi-api.baidu.com/doc/21


## 单元测试
目前只在test目录下放一些简单的单元测试，后续会补充更多用例。

## 注意事项
- 建议<font color="#f30">node版本 >= 16</font>
- 不支持vue-i18n 9.x
- 替换后请手动检查下结果，如果有覆盖不到或出错，请提issue或联系我shitoubean@163.com。

## 执行替换的内容
- sfc中的templeate、script(包括setup)
- js/ts文件中的变量、参数

## 会忽略的内容
- 代码注释
- console.log
