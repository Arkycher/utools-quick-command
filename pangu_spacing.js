// =====================================================
// 盘古之白 - 自动在中英文之间加空格
// 新建命令时：环境选 quickcommand，输出选【忽略输出并隐藏】
// =====================================================

// CJK 字符范围
const CJK = '\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff'
const SYMBOLS = '#@%&+$~`'

// 正则表达式
const regexCjkAlpha = new RegExp(`([${CJK}])([A-Za-z])`, 'g')
const regexAlphaCjk = new RegExp(`([A-Za-z])([${CJK}])`, 'g')
const regexCjkDigit = new RegExp(`([${CJK}])([0-9])`, 'g')
const regexDigitCjk = new RegExp(`([0-9])([${CJK}])`, 'g')
const regexCjkSymbol = new RegExp(`([${CJK}])([${SYMBOLS}])`, 'g')
const regexSymbolCjk = new RegExp(`([${SYMBOLS}])([${CJK}])`, 'g')
const regexCjkLeftBracket = new RegExp(`([${CJK}])([\\(\\[\\{])`, 'g')
const regexRightBracketCjk = new RegExp(`([\\)\\]\\}])([${CJK}])`, 'g')

function spacingText(text) {
  if (!text) return text
  return text
    .replace(regexCjkAlpha, '$1 $2')
    .replace(regexAlphaCjk, '$1 $2')
    .replace(regexCjkDigit, '$1 $2')
    .replace(regexDigitCjk, '$1 $2')
    .replace(regexCjkSymbol, '$1 $2')
    .replace(regexSymbolCjk, '$1 $2')
    .replace(regexCjkLeftBracket, '$1 $2')
    .replace(regexRightBracketCjk, '$1 $2')
}

// ========== 主逻辑 ==========
const clipText = utools.readCurrentFolderPath ? '' : (utools.getClipboardText?.() || '')
const inputText = clipText || quickcommand.enterData?.payload || ''

if (!inputText.trim()) {
  utools.showNotification('剪贴板为空')
} else {
  const result = spacingText(inputText)
  const added = result.length - inputText.length
  
  utools.copyText(result)
  
  if (added > 0) {
    utools.showNotification(`✅ 已添加 ${added} 个空格`)
  } else {
    utools.showNotification('✨ 文本已规范，无需调整')
  }
}

utools.hideMainWindow()
