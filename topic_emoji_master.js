// =====================================================
// 话题命名大师 - 自动给文本加上契合的 emoji + 盘古之白
// 新建命令时：环境选 quickcommand，输出选【忽略输出并隐藏】
// =====================================================

const API_KEY = 'b1441603-5123-4fd1-909e-4d5cd5e3d122'
const MODEL = 'gemini-3-flash-preview'

// ========== 盘古之白 ==========
const CJK = '\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff'
const SYMBOLS = '#@%&+$~`'

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
  let result = text
    .replace(regexCjkAlpha, '$1 $2')
    .replace(regexAlphaCjk, '$1 $2')
    .replace(regexCjkDigit, '$1 $2')
    .replace(regexDigitCjk, '$1 $2')
    .replace(regexCjkSymbol, '$1 $2')
    .replace(regexSymbolCjk, '$1 $2')
    .replace(regexCjkLeftBracket, '$1 $2')
    .replace(regexRightBracketCjk, '$1 $2')
  
  // 特殊处理：话题标签尾部的 # 前不加空格（如 #话题内容# 格式）
  result = result.replace(/ #$/g, '#')
  
  return result
}

// ========== 退出函数 ==========
function exitPlugin() {
  utools.hideMainWindow()
  utools.outPlugin()
}

const SYSTEM_PROMPT = `你是一个话题emoji大师，我给你一段文本，你自动增加一个契合文本内容的emoji。

规则：
- 如果文本被两个#包围（如 #话题内容#），则把emoji放在第一个#后面、文本内容前面，保留前后的#
  例如：输入 #今天天气真好# → 输出 #🌞今天天气真好#
- 如果文本没有#包围，则直接在最前面加emoji
  例如：输入 今天天气真好 → 输出 🌞今天天气真好

要求：
1. 只输出5个带emoji的结果
2. 每个结果之间用 ||| 分隔
3. 不要序号，不要解释，不要换行
4. 示例格式: #🎉结果1#|||#🎊结果2#|||#🎈结果3#|||#🎁结果4#|||#🎀结果5#

重要 - emoji选择原则：
- 5个emoji必须各不相同，避免使用相似的emoji
- 每个emoji都必须与文本内容有关联，可以是直接关联，也可以是抽象/隐喻的关联
- 避免使用万能装饰类emoji（如🎉🎊🎈🎁✨🌟💫⭐💖），除非真的与内容相关
- 鼓励从不同角度解读文本：字面意思、情感、场景、联想、比喻等
- 例如"加班"可以用：💻(工作)、🌙(夜晚)、☕(提神)、😮‍💨(疲惫)、🦉(熬夜)，都相关但角度不同`

// ========== 主逻辑 ==========
const inputText = quickcommand.enterData?.payload || ''

if (!inputText.trim()) {
  utools.showNotification('请输入或选中文本')
  exitPlugin()
} else {
  // 显示加载提示
  quickcommand.showMessageBox('正在请求 AI...', 'info')

  const https = require('https')
  const postData = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inputText }
    ],
    temperature: 0.7
  })

  const options = {
    hostname: 'aihub.gz4399.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', chunk => { data += chunk })
    res.on('end', () => {
      if (res.statusCode !== 200) {
        utools.showNotification(`请求失败 [${res.statusCode}]`)
        exitPlugin()
        return
      }
      try {
        const json = JSON.parse(data)
        const content = json.choices[0].message.content.trim()
        // 解析结果并应用盘古之白
        const items = content.split('|||').map(s => spacingText(s.trim())).filter(s => s)
        
        if (items.length > 0) {
          // 显示选择列表
          quickcommand.showSelectList(items).then(selected => {
            if (selected !== undefined && selected !== null) {
              let textToCopy = ''
              if (typeof selected === 'number') {
                textToCopy = items[selected]
              } else if (typeof selected === 'string') {
                textToCopy = selected
              } else if (selected.title) {
                textToCopy = selected.title
              } else if (selected.id !== undefined) {
                textToCopy = items[selected.id]
              } else {
                textToCopy = String(selected)
              }
              
              utools.copyText(textToCopy)
              utools.showNotification(`已复制: ${textToCopy}`)
            }
            exitPlugin()
          })
        } else {
          utools.showNotification('未获取到结果')
          exitPlugin()
        }
      } catch (e) {
        utools.showNotification(`解析失败: ${e.message}`)
        exitPlugin()
      }
    })
  })

  req.on('error', (e) => {
    utools.showNotification(`网络错误: ${e.message}`)
    exitPlugin()
  })
  req.write(postData)
  req.end()
}
