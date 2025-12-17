// =====================================================
// 内容优化大师 - 快捷命令插件版本
// 新建命令时：环境选 quickcommand，输出选【显示html】
// =====================================================

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

// 获取输入
let inputText = ''
if (quickcommand.enterData) {
  inputText = quickcommand.enterData.payload || quickcommand.enterData.text || ''
}

// 转义
const escapeForJs = (str) => {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
}

if (!inputText || !inputText.trim()) {
  quickcommand.showMessageBox('请先选中要优化的文本，再触发此命令', 'info')
} else {
  const html = `
<style>
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
</style>

<div style="padding:12px;min-height:500px;">
  <div style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:10px;margin-bottom:12px;">
    <div style="font-size:11px;color:#888;margin-bottom:4px;">📄 原文</div>
    <div id="originalText" style="font-size:13px;color:#666;line-height:1.5;"></div>
  </div>
  
  <div id="loading" style="text-align:center;padding:40px 20px;">
    <div style="display:inline-flex;gap:6px;margin-bottom:16px;">
      <div style="width:12px;height:12px;background:#f59e0b;border-radius:50%;animation:bounce 1s infinite;"></div>
      <div style="width:12px;height:12px;background:#3b82f6;border-radius:50%;animation:bounce 1s infinite 0.1s;"></div>
      <div style="width:12px;height:12px;background:#22c55e;border-radius:50%;animation:bounce 1s infinite 0.2s;"></div>
    </div>
    <div style="color:#666;font-size:14px;">✨ AI 正在优化内容...</div>
    <div style="color:#999;font-size:12px;margin-top:8px;">请稍候，大约需要几秒钟</div>
  </div>
  
  <div id="results" style="display:none;"></div>
  <div id="error" style="display:none;color:#ef4444;text-align:center;padding:30px;font-size:14px;"></div>
</div>

<script>
const API_KEY = '${API_KEY}';
const MODEL = '${MODEL}';
const SYSTEM_PROMPT = \`${escapeForJs(SYSTEM_PROMPT)}\`;
const inputText = \`${escapeForJs(inputText.trim())}\`;

document.getElementById('originalText').textContent = inputText;

const cards = [
  { icon: '📝', title: '简洁精炼版', color: '#22c55e' },
  { icon: '💼', title: '专业增强版', color: '#3b82f6' },
  { icon: '💬', title: '口语自然版', color: '#f59e0b' }
];

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');
}

function copyText(text, btn) {
  if (typeof utools !== 'undefined') {
    utools.copyText(text);
    utools.showNotification('已复制');
  }
  btn.textContent = '已复制';
  btn.style.background = '#22c55e';
  setTimeout(() => { btn.textContent = '复制'; btn.style.background = cards[0].color; }, 1500);
}

function showResults(items) {
  document.getElementById('loading').style.display = 'none';
  const container = document.getElementById('results');
  container.style.display = 'block';
  
  items.forEach((text, i) => {
    const c = cards[i] || { icon: '✨', title: '版本'+(i+1), color: '#8b5cf6' };
    const div = document.createElement('div');
    div.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;overflow:hidden;';
    
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;padding:8px 12px;background:#f5f5f5;border-bottom:1px solid #eee;';
    header.innerHTML = '<span style="margin-right:6px;">' + c.icon + '</span><b style="color:#333;font-size:13px;">' + c.title + '</b>';
    
    const btn = document.createElement('button');
    btn.textContent = '复制';
    btn.style.cssText = 'margin-left:auto;background:' + c.color + ';color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:12px;cursor:pointer;';
    btn.onclick = function() { copyText(text, this); };
    header.appendChild(btn);
    
    const content = document.createElement('div');
    content.style.cssText = 'padding:12px;font-size:14px;line-height:1.7;color:#333;';
    content.innerHTML = escapeHtml(text);
    
    div.appendChild(header);
    div.appendChild(content);
    container.appendChild(div);
  });
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = '❌ ' + msg;
}

// 发起请求
fetch('https://aihub.gz4399.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + API_KEY
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inputText }
    ],
    temperature: 0.8
  })
})
.then(res => {
  if (!res.ok) throw new Error('请求失败 [' + res.status + ']');
  return res.json();
})
.then(data => {
  const content = data.choices[0].message.content.trim();
  const items = content.split('|||').map(s => s.trim()).filter(s => s);
  if (items.length > 0) {
    showResults(items);
  } else {
    showError('未获取到优化结果');
  }
})
.catch(err => showError(err.message));
</script>
`
  console.log(html)
}
