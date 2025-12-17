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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f5f5f5; }
  
  @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
  
  .container { padding: 12px; min-height: 500px; }
  
  /* Tab 样式 */
  .tabs { display: flex; border-bottom: 2px solid #e5e5e5; margin-bottom: 12px; }
  .tab {
    padding: 10px 16px;
    font-size: 13px;
    color: #666;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tab:hover { color: #333; }
  .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 600; }
  .tab .badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 500;
  }
  
  /* 对比区域 */
  .compare-container { display: flex; gap: 12px; }
  .compare-side {
    flex: 1;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .compare-header {
    padding: 10px 14px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .compare-title { font-size: 13px; font-weight: 600; color: #333; }
  .compare-stats { font-size: 11px; color: #888; }
  .compare-stats .change { margin-left: 6px; font-weight: 600; }
  .compare-stats .change.decrease { color: #22c55e; }
  .compare-stats .change.increase { color: #f59e0b; }
  .compare-content {
    padding: 14px;
    font-size: 14px;
    line-height: 1.8;
    color: #333;
    flex: 1;
    overflow-y: auto;
    max-height: 350px;
  }
  
  /* 差异高亮 */
  .diff-add { background: #dcfce7; color: #166534; padding: 1px 2px; border-radius: 2px; }
  .diff-del { background: #fee2e2; color: #991b1b; text-decoration: line-through; padding: 1px 2px; border-radius: 2px; }
  
  /* 复制按钮 */
  .copy-btn {
    background: #3b82f6;
    color: #fff;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .copy-btn:hover { background: #2563eb; }
  .copy-btn.copied { background: #22c55e; }
  
  /* Loading */
  .loading {
    text-align: center;
    padding: 60px 20px;
  }
  .loading-dots {
    display: inline-flex;
    gap: 6px;
    margin-bottom: 16px;
  }
  .loading-dots span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: bounce 1s infinite;
  }
  .loading-dots span:nth-child(1) { background: #f59e0b; }
  .loading-dots span:nth-child(2) { background: #3b82f6; animation-delay: 0.1s; }
  .loading-dots span:nth-child(3) { background: #22c55e; animation-delay: 0.2s; }
  .loading-text { color: #666; font-size: 14px; }
  .loading-hint { color: #999; font-size: 12px; margin-top: 8px; }
  
  .error { color: #ef4444; text-align: center; padding: 40px; font-size: 14px; }
  .results { display: none; }
</style>

<div class="container">
  <div id="loading" class="loading">
    <div class="loading-dots"><span></span><span></span><span></span></div>
    <div class="loading-text">✨ AI 正在优化内容...</div>
    <div class="loading-hint">请稍候，大约需要几秒钟</div>
  </div>
  
  <div id="results" class="results">
    <div class="tabs" id="tabs"></div>
    <div class="compare-container">
      <div class="compare-side">
        <div class="compare-header">
          <span class="compare-title">📄 原文</span>
          <span class="compare-stats" id="originalStats"></span>
        </div>
        <div class="compare-content" id="originalContent"></div>
      </div>
      <div class="compare-side">
        <div class="compare-header">
          <span class="compare-title" id="optimizedTitle">✨ 优化版本</span>
          <span class="compare-stats" id="optimizedStats"></span>
          <button class="copy-btn" id="copyBtn" onclick="copyCurrentVersion()">复制</button>
        </div>
        <div class="compare-content" id="optimizedContent"></div>
      </div>
    </div>
  </div>
  
  <div id="error" class="error" style="display:none;"></div>
</div>

<script>
const API_KEY = '${API_KEY}';
const MODEL = '${MODEL}';
const SYSTEM_PROMPT = \`${escapeForJs(SYSTEM_PROMPT)}\`;
const originalText = \`${escapeForJs(inputText.trim())}\`;

const tabs = [
  { icon: '📝', title: '简洁精炼版', color: '#22c55e' },
  { icon: '💼', title: '专业增强版', color: '#3b82f6' },
  { icon: '💬', title: '口语自然版', color: '#f59e0b' }
];

let versions = [];
let currentTab = 0;

// ========== 差异对比算法 (词级别 LCS) ==========
function computeDiff(oldText, newText) {
  // 分词：中文按字，英文按单词
  const tokenize = (text) => {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const char = text[i];
      if (/[a-zA-Z]/.test(char)) {
        // 英文单词
        let word = '';
        while (i < text.length && /[a-zA-Z]/.test(text[i])) {
          word += text[i++];
        }
        tokens.push(word);
      } else if (/\\s/.test(char)) {
        // 空白符
        tokens.push(char);
        i++;
      } else {
        // 中文字符或标点
        tokens.push(char);
        i++;
      }
    }
    return tokens;
  };
  
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  
  // 计算 LCS（最长公共子序列）
  const m = oldTokens.length, n = newTokens.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i-1] === newTokens[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  // 回溯找出 LCS
  const lcsSet = new Set();
  let i = m, j = n;
  const lcsPositionsOld = new Set();
  const lcsPositionsNew = new Set();
  
  while (i > 0 && j > 0) {
    if (oldTokens[i-1] === newTokens[j-1]) {
      lcsPositionsOld.add(i-1);
      lcsPositionsNew.add(j-1);
      i--; j--;
    } else if (dp[i-1][j] > dp[i][j-1]) {
      i--;
    } else {
      j--;
    }
  }
  
  // 生成带标记的 HTML
  let originalHtml = '';
  for (let k = 0; k < oldTokens.length; k++) {
    const token = escapeHtml(oldTokens[k]);
    if (lcsPositionsOld.has(k)) {
      originalHtml += token;
    } else {
      originalHtml += '<span class="diff-del">' + token + '</span>';
    }
  }
  
  let optimizedHtml = '';
  for (let k = 0; k < newTokens.length; k++) {
    const token = escapeHtml(newTokens[k]);
    if (lcsPositionsNew.has(k)) {
      optimizedHtml += token;
    } else {
      optimizedHtml += '<span class="diff-add">' + token + '</span>';
    }
  }
  
  return { 
    original: originalHtml.replace(/\\n/g, '<br>'), 
    optimized: optimizedHtml.replace(/\\n/g, '<br>') 
  };
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');
}

function countChars(text) {
  // 只统计中文字符和英文单词
  const chinese = (text.match(/[\\u4e00-\\u9fa5]/g) || []).length;
  const english = (text.match(/[a-zA-Z]+/g) || []).length;
  return chinese + english;
}

// ========== UI 更新 ==========
function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = '';
  
  tabs.forEach((tab, index) => {
    const div = document.createElement('div');
    div.className = 'tab' + (index === currentTab ? ' active' : '');
    div.innerHTML = tab.icon + ' ' + tab.title;
    div.onclick = () => switchTab(index);
    tabsEl.appendChild(div);
  });
}

function switchTab(index) {
  currentTab = index;
  renderTabs();
  updateCompareView();
}

function updateCompareView() {
  const version = versions[currentTab];
  if (!version) return;
  
  const originalCount = countChars(originalText);
  const optimizedCount = countChars(version);
  const change = ((optimizedCount - originalCount) / originalCount * 100).toFixed(0);
  const changeClass = change < 0 ? 'decrease' : 'increase';
  const changeText = change < 0 ? change + '%' : '+' + change + '%';
  
  document.getElementById('originalStats').textContent = originalCount + ' 字';
  document.getElementById('optimizedStats').innerHTML = 
    optimizedCount + ' 字<span class="change ' + changeClass + '">' + changeText + '</span>';
  
  document.getElementById('optimizedTitle').textContent = tabs[currentTab].icon + ' ' + tabs[currentTab].title;
  
  // 计算差异
  const diff = computeDiff(originalText, version);
  document.getElementById('originalContent').innerHTML = diff.original;
  document.getElementById('optimizedContent').innerHTML = diff.optimized;
  
  // 重置复制按钮
  const copyBtn = document.getElementById('copyBtn');
  copyBtn.textContent = '复制';
  copyBtn.classList.remove('copied');
}

function copyCurrentVersion() {
  const text = versions[currentTab];
  if (typeof utools !== 'undefined') {
    utools.copyText(text);
    utools.showNotification('已复制: ' + tabs[currentTab].title);
  }
  const btn = document.getElementById('copyBtn');
  btn.textContent = '已复制';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1500);
}

function showResults(items) {
  versions = items;
  document.getElementById('loading').style.display = 'none';
  document.getElementById('results').style.display = 'block';
  renderTabs();
  updateCompareView();
}

function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error').textContent = '❌ ' + msg;
}

// ========== 发起请求 ==========
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
      { role: 'user', content: originalText }
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

