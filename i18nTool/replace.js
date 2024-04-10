const FS = require('fs')
const PATH = require('path')
const mysKeyTranslate = require('./baiduTranslate.js')

const translateApi = mysKeyTranslate({
  appid: '', // 百度翻译的appid
  secret: '' // 百度翻译的秘钥
})

let translateObj = {}

// TODO:翻译文件目录,按情况自行修改。
const translateJson_path = PATH.resolve(__dirname, '../public/i18n/zh_CN.json')

// 获取翻译文件内容
function getTranslateJson() {
  return new Promise((resolve, reject) => {
    FS.readFile(translateJson_path, 'utf-8', function(err, data) {
      if (err) {
        console.log(err)
        reject(err)
      }
      resolve(JSON.parse(data))
    })
  })
}

// 更新翻译json文件
function updateTranslateJson() {
  return new Promise((resolve, reject) => {
    FS.writeFile(translateJson_path, JSON.stringify(translateObj, null, '\t'), function(err) {
      if (err) {
        console.log(err)
        reject(err)
      }
      resolve()
    })
  })
}

// 翻译文件中是否已有key
const containChar = char => Object.keys(translateObj).find(c => translateObj[c] === char)

// 将翻译后的文案（英文）转换为驼峰命名key
const formatTranslateKey = str => {
  // 单词间去掉空格，比如"add task" -> "addTask"
  let word = str.replace(/\s([a-zA-Z])/g, (match, char) => char.toUpperCase())
  // 手动去掉标点符号和空格，只保留英文字符作为key
  word = word.replace(/[^a-zA-Z_]/g, '')
  if (word.length > 50) {
    // 过长的key直接使用tips替代，一般都是提示语句
    word =
      'tips_' +
      Math.random()
        .toString(36)
        .slice(2)
  }
  // 首字母小写，这里不是必须，只是小驼峰更好看
  return word.charAt(0).toLowerCase() + word.slice(1)
}

const getTranslateKey = async str => {
  let result = ''
  const specialList = [
    { reg: /^请(?:输入|填入|填写)([^，]+)$/, prefix: 'pinput_' },
    { reg: /^请选择([^，]+)$/, prefix: 'psel_' }
  ]
  const specialItem = specialList.find(e => e.reg.test(str))
  if (specialItem) {
    const zhKey = specialItem.reg.exec(str)[1]
    const existKey = containChar(zhKey)
    if (existKey) {
      // 如果已经翻译过，减少一次请求
      result = formatTranslateKey(specialItem.prefix + (existKey.split('.')[1] || existKey))
    } else {
      const _translatekey = await translateApi(zhKey)
      result = formatTranslateKey(specialItem.prefix + _translatekey)
    }
  } else {
    const _key = await translateApi(str)
    result = formatTranslateKey(_key)
  }
  return result
}

//
async function calcReplaceStr(valChar, replaceFunc, path) {
  const _key = containChar(valChar)
  if (_key) {
    // 已经有对应的中文值，直接进行替换
    replaceFunc(_key)
  } else {
    let newKey = await getTranslateKey(valChar)
    const obj = PATH.parse(path)
    const temp = obj.dir.match(/pages\\([a-z]+)/)
    if (temp !== null) {
      // TODO:为每个模块添加前缀，比如pages/task中的detail -> task.detail
      // 非必须，按情况自己调整
      newKey = `${temp[1]}.${newKey}`
    }
    if (translateObj[newKey]) {
      // 考虑多个中文value对应一个key的情况
      newKey = newKey.concat('1')
    }
    translateObj[newKey] = valChar
    replaceFunc(newKey)
  }
}

async function replaceBaseFunc(str, matchArr, path) {
  let result = str
  for (let j = 0; j < matchArr.length; j++) {
    const m = matchArr[j]
    const matchList = str.match(m.reg) || []
    for (let i = 0; i < matchList.length; i++) {
      const char = matchList[i]
      const _valueChar = m.getVal(char)

      await calcReplaceStr(
        _valueChar,
        _key => {
          result = result.replace(char, () => m.replaceStr(_key, char))
        },
        path
      )
    }
  }

  return result
}

// 替换vue文件中template标签中的中文
async function replaceVueTemplate(str, path) {
  return replaceBaseFunc(
    str,
    [
      {
        // 匹配：> 包含中文 <
        reg: />\s?([^<>'"`]*[\u4e00-\u9fa5]+[^<>'"`]*)\s?</g, // 必要
        getVal: char => {
          const _char = char.replace(/\n|\r/g, '')
          if (/{{.+}}/.test(char)) {
            // 包含变量的时候
            let res = _char.replace(
              /{{\s*([\w\.]+)\s*}}/g,
              (m, p1) => '{' + p1.replace(/\.(\w)/, (m, p) => p.toUpperCase()) + '}'
            )
            return />\s*(.+)\s*</.exec(res)[1].trim()
          }
          return />\s*(.+)\s*</.exec(_char)[1].trim()
        },
        replaceStr: (key, char) => {
          const _char = char.replace(/\n|\r/g, '')
          if (/{{.+}}/.test(_char)) {
            // 包含变量的时候
            let obj = {}
            _char.match(/{{\s*[\w\.]+\s*}}/g).forEach(e => {
              const _key = /{{\s*([\w\.]+)\s*}}/.exec(e)[1]
              obj[_key.replace(/\.(\w)/, (m, p1) => p1.toUpperCase())] = _key
            })
            const varStr = Object.keys(obj)
              .map(e => e + ':' + obj[e])
              .join()
            return _char.replace(/>\s*(.+)\s*</, `>{{ $t('${key}', {${varStr}}) }}<`)
          } else {
            return _char.replace(/>\s*(.+)\s*</, `>{{ $t('${key}') }}<`)
          }
        }
      },
      {
        // 匹配：title="中文"、placeholder="中文"
        reg: /(\S+)="([^"]*[\u4e00-\u9fa5]+\w*)"/g, // 必要
        getVal: char => char.split('"')[1],
        replaceStr: (key, char) => char.replace(/(\w+)=".+"/, (match, p1) => `:${p1}="$t('${key}')"`) // 必要
      },
      {
        // 匹配剩余情况："包含中文"、`包含中文`、'包含中文'
        reg: /(['"`])\w*[\u4e00-\u9fa5]+\w*\1/g, // 必要
        getVal: char => char.slice(1, -1),
        replaceStr: (key, char) => `$t('${key}')` // 必要
      }
    ],
    path
  )
}

// 替换vue文件中script标签中的中文
async function replaceVueJs(str, path) {
  return replaceBaseFunc(
    str,
    [
      {
        // 匹配剩余情况："包含中文"、`包含中文`、'包含中文'
        reg: /(['"`])\s?(.*[^\x00-\xff]+.*)\s?\1/g, // 必要
        getVal: char => char.slice(1, -1),
        replaceStr: (key, char) => `this.$t('${key}')` // 必要
      }
    ],
    path
  )
}

// 得到文件字符串后进行替换整理翻译key
function replaceVueFile(str, path) {
  if (!str.length) {
    return Promise.resolve('')
  }
  let result = str
  return new Promise(async (resolve, reject) => {
    try {
      // 1、vue template字符串转换
      const templateArr = str.match(/<template>[\s\S]+<\/template>/)
      // 默认template只有一个
      const templateNewStr = await replaceVueTemplate(templateArr[0], path)
      result = result.replace(templateArr[0], templateNewStr)

      // 1、vue js字符串转换
      const jsArr = str.match(/<script>[\s\S]+<\/script>/)
      const jsNewStr = await replaceVueJs(jsArr[0], path)
      result = result.replace(jsArr[0], jsNewStr)

      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}

// js文件
async function replaceJsFile(str, path) {
  let res = await replaceBaseFunc(
    str,
    [
      {
        // 匹配剩余情况："包含中文"、`包含中文`、'包含中文'
        reg: /(['"`])\s?(.*[^\x00-\xff]+.*)\s?\1/g, // 必要
        getVal: char => char.slice(1, -1),
        replaceStr: (key, char) => `i18n.t('${key}')` // 必要
      }
    ],
    path
  )
  // TODO:自动导入i18n,按情况自行修改。
  const i18nImportStatement = `import i18n from '@/plugins/i18n'`
  if (res.indexOf('i18n.t') > 0 && res.indexOf(i18nImportStatement) === -1) {
    res = i18nImportStatement + `\r\n` + res
  }
  return res
}

// jsx文件组件
function replaceJsxFile(str, path) {
  return Promise.resolve(str)
}

// 转换文件替换文件
async function getReplaceFile(str, path) {
  translateObj = await getTranslateJson()
  let result = ''
  if (/\.vue$/.test(path)) {
    result = await replaceVueFile(str, path)
  }
  if (/\.js$/.test(path)) {
    result = await replaceJsFile(str, path)
  }
  if (/\.jsx$/.test(path)) {
    result = await replaceJsxFile(str, path)
  }
  await updateTranslateJson()
  return result
}

module.exports = {
  replaceJsFile,
  replaceVueFile,
  getReplaceFile
}
