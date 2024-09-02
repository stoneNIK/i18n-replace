# i18n-replace

1、根据JSON翻译文件自动替换项目中的中文字符
2、自动生成待翻译csv文件
3、提供自动翻译功能，需要申请百度翻译的key

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
