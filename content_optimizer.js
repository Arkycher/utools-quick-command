// =====================================================
// 内容优化大师 - 快捷命令插件版本
// 新建命令时：环境选 quickcommand，输出选【显示html】
// =====================================================

const https = require('https')

const API_KEY = 'b1441603-5123-4fd1-909e-4d5cd5e3d122'
const MODEL = 'gpt-5.1'

const SYSTEM_PROMPT = `你是一个内容优化专家，帮助用户润色文字，让表达更专业、更有说服力。

优化原则：
1. 保持原意不变，提升表达质量
2. 用词精准，避免空洞的套话和官腔
3. 句式自然流畅，像真人写的，不要有AI腔
4. 逻辑清晰，重点突出
5. 去掉多余的修饰词和废话
6. 适当使用具体数据或例子（如果原文有的话）

禁止：
- 不要用"赋能"、"抓手"、"闭环"、"颗粒度"这类互联网黑话
- 不要用"首先...其次...最后..."这种死板结构
- 不要加"总之"、"综上所述"这种总结语
- 不要过度使用形容词堆砌
- 不要用"作为...我们..."这种官方开头

输出要求：
1. 提供3个不同风格的优化版本
2. 每个版本用 ||| 分隔
3. 版本1：简洁精炼版（删繁就简，字数减少20-30%）
4. 版本2：专业增强版（更正式但不死板）
5. 版本3：口语自然版（像聊天一样自然）
6. 直接输出优化后的内容，不要标注版本名称，不要解释`

// ==================== 获取输入内容 ====================
let inputText = ''

if (quickcommand.enterData) {
  if (quickcommand.enterData.payload) {
    inputText = quickcommand.enterData.payload
  } else if (quickcommand.enterData.text) {
    inputText = quickcommand.enterData.text
  }
}

// 转义HTML特殊字符
const escapeHtml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 生成结果 HTML
function getResultHtml(originalText, items) {
  const cardData = [
    { icon: '📝', title: '简洁精炼版', badge: '精简', color: '#22c55e' },
    { icon: '💼', title: '专业增强版', badge: '正式', color: '#3b82f6' },
    { icon: '💬', title: '口语自然版', badge: '自然', color: '#f59e0b' }
  ]
  
  let cardsHtml = ''
  items.forEach((text, index) => {
    const card = cardData[index] || { icon: '✨', title: `版本${index+1}`, badge: '', color: '#8b5cf6' }
    const textId = `text_${index}`
    cardsHtml += `
      <div class="card">
        <div class="card-header">
          <span class="card-icon">${card.icon}</span>
          <span class="card-title">${card.title}</span>
          <span class="card-badge" style="background: ${card.color}22; color: ${card.color}">${card.badge}</span>
          <button class="copy-btn" onclick="copyText('${textId}', this)">复制</button>
        </div>
        <div class="card-content" id="${textId}">${escapeHtml(text)}</div>
      </div>
    `
  })
  
  return `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 16px; background: #f5f5f5; }
  
  .original {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .original-label { font-size: 11px; color: #999; margin-bottom: 6px; }
  .original-text {
    color: #666;
    line-height: 1.6;
    max-height: 80px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .card-header {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }
  .card-icon { font-size: 16px; margin-right: 8px; }
  .card-title { font-size: 13px; font-weight: 600; color: #333; }
  .card-badge {
    margin-left: 8px;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
  }
  .copy-btn {
    margin-left: auto;
    background: #2196F3;
    color: #fff;
    border: none;
    padding: 5px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .copy-btn:hover { background: #1976D2; }
  .copy-btn.copied { background: #4CAF50; }
  
  .card-content {
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.8;
    color: #333;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .toast {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: #333;
    color: #fff;
    padding: 8px 20px;
    border-radius: 4px;
    font-size: 13px;
    transition: transform 0.3s;
    z-index: 999;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
</style>

<div class="original">
  <div class="original-label">📄 原文</div>
  <div class="original-text">${escapeHtml(originalText)}</div>
</div>

${cardsHtml}

<div class="toast" id="toast">✓ 已复制</div>

<script>
function copyText(id, btn) {
  const text = document.getElementById(id).innerText;
  utools.copyText(text);
  
  btn.textContent = '已复制';
  btn.classList.add('copied');
  
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
  
  setTimeout(() => {
    btn.textContent = '复制';
    btn.classList.remove('copied');
  }, 2000);
}
</script>`
}

// ==================== 主逻辑 ====================
if (!inputText || !inputText.trim()) {
  quickcommand.showMessageBox('请先选中要优化的文本，再触发此命令', 'info')
} else {
  // 使用 Promise 处理异步请求
  new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: inputText.trim() }
      ],
      temperature: 0.8
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

    quickcommand.showMessageBox('正在优化内容...', 'info')

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`请求失败 [${res.statusCode}]`))
          return
        }
        try {
          const json = JSON.parse(data)
          const content = json.choices[0].message.content.trim()
          const items = content.split('|||').map(s => s.trim()).filter(s => s)
          
          if (items.length > 0) {
            resolve(items)
          } else {
            reject(new Error('未获取到优化结果'))
          }
        } catch (e) {
          reject(new Error(`解析失败: ${e.message}`))
        }
      })
    })

    req.on('error', (e) => reject(new Error(`网络错误: ${e.message}`)))
    req.write(postData)
    req.end()
  }).then(items => {
    // 输出 HTML
    console.log(getResultHtml(inputText.trim(), items))
  }).catch(err => {
    quickcommand.showMessageBox(err.message, 'error')
  })
}
