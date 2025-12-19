// =====================================================
// 话题命名大师 - 自动给文本加上契合的 emoji
// 新建命令时：环境选 quickcommand，输出选【忽略输出并隐藏】
// =====================================================

const API_KEY = 'b1441603-5123-4fd1-909e-4d5cd5e3d122'
const MODEL = 'gpt-4.1-mini'

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
4. 示例格式: #🎉结果1#|||#🎊结果2#|||#🎈结果3#|||#🎁结果4#|||#🎀结果5#`

// ========== 主逻辑 ==========
const inputText = quickcommand.enterData?.payload || ''

if (!inputText.trim()) {
  quickcommand.showMessageBox('请输入或选中文本', 'error')
  utools.hideMainWindow()
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
        quickcommand.showMessageBox(`请求失败 [${res.statusCode}]`, 'error')
        utools.hideMainWindow()
        return
      }
      try {
        const json = JSON.parse(data)
        const content = json.choices[0].message.content.trim()
        const items = content.split('|||').map(s => s.trim()).filter(s => s)
        
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
            utools.hideMainWindow()
          })
        } else {
          quickcommand.showMessageBox('未获取到结果', 'error')
          utools.hideMainWindow()
        }
      } catch (e) {
        quickcommand.showMessageBox(`解析失败: ${e.message}`, 'error')
        utools.hideMainWindow()
      }
    })
  })

  req.on('error', (e) => {
    quickcommand.showMessageBox(`网络错误: ${e.message}`, 'error')
    utools.hideMainWindow()
  })
  req.write(postData)
  req.end()
}
