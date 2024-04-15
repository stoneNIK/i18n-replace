# vue工程自动替换国际化

适用于未做国际化的vue工程代码

自动替换代码中的中文（不包括注释）为$t，包括sfc-template、script，js文件。暂不支持jsx。

目前只能输出一个中文翻译json文件，后续做成配置，输出多个json文件。

暂时还没有test目录，不能直接运行，需要先阅读代码。

待优化！
待完善！
待重构！



## 已知问题

#### 缺少JSX的支持
#### 缺少vue文件script中render函数的支持

#### template

- `{{selectContentName}} 发布预览`替换为了`{{$t('control.selectContentNamePublishPreview', {selectContentName:selectContent.name})}}`

#### vue-js

- `当前未选择可用于${box.title}的资源`,直接全量替换翻译了。

- `["星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']`,直接全量替换，匹配了第一个引号和最后一个引号

- `if (type === 'pre' && !this.playLoop && index === 0) return this.$message.info('已到播放列表顶部')``->`if (type === this.$t('control.tips_419v6h2rgf1'))`

- `orgData: { regionName: '全部区域', regionIndexCode: '' },`->`orgData: { regionName: this.$t('control.allRegionsRegionIndexCode') },`

- `{type: '', title: '全部'}`->`{ type: this.$t('control.titleAll') }`

- `return this.listenType === 'text' ? '语音合成' : '音频文件'`->`return this.listenType === this.$t('control.textVoiceSynthesisAudioFiles')`

- `array.join('，')`，只有中文逗号也会翻译。