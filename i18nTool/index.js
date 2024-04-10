const FS = require('fs')
const PATH = require('path')

const { getReplaceFile } = require('./replace.js')

//读取文件，并且替换文件中指定的字符串
let toReplaceFile = function(filePath, replaceFunc) {
  FS.readFile(filePath, 'utf-8', function(err, data) {
    if (err) {
      console.log('read file error!')
      return err
    }
    let str = data.toString()
    replaceFunc(str, filePath)
      .then(res => {
        console.log('转换成功：', filePath)
        FS.writeFile(filePath, res, function(err) {
          if (err) return err
        })
      })
      .catch(e => {
        console.log('出现错误：', e)
      })
  })
}

const ENTRY_URL = PATH.resolve(__dirname, '../src/pages')
const FILE_REG = /\.vue|\.js$/
const EXCLUDE_FILES = ['src\\assets\\', 'src\\styles', 'src\\plugins', 'src\\pageConfig.js', 'src\\views\\Menu.vue']

function validFile(name, fullPath) {
  const isExclude = EXCLUDE_FILES.findIndex(m => fullPath.includes(m)) >= 0
  return !isExclude && FILE_REG.test(name)
}

function readFileList(dir) {
  const files = FS.readdirSync(dir)
  files.forEach(item => {
    const fullPath = PATH.join(dir, item)
    const stat = FS.statSync(fullPath)
    if (stat.isDirectory()) {
      readFileList(PATH.join(dir, item))
    } else {
      validFile(item, fullPath) && toReplaceFile(fullPath, getReplaceFile)
    }
  })
}

readFileList(ENTRY_URL)
