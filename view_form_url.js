// =====================================================
// ViewForm URL 生成器 - 生成带 accessToken 的表单查看链接
// 新建命令时：环境选 quickcommand，输出选【忽略输出并隐藏】
// 输入格式：applyID [staffID]，staffID 可选，默认为 S6399
// =====================================================

const crypto = require('crypto')

// 配置
const DEFAULT_STAFF_ID = 'S6399'
const VIEW_FORM_URL = 'https://in2.4399om.com/customworkflow/?r=form/viewForm'

// SHA1 哈希函数
function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex')
}

// 生成 accessToken
function generateAccessToken(staffID, applyID) {
  // 1. SHA1(staffID + applyID)
  const step1 = sha1(staffID + applyID)
  // 2. 拼接 "viewform"
  const step2 = step1 + 'viewform'
  // 3. 再次 SHA1
  return sha1(step2)
}

// ========== 主逻辑 ==========
const inputText = quickcommand.enterData?.payload || ''

// 正则匹配 applyID（纯数字）和可选的 staffID
const applyIdMatch = inputText.match(/\b(\d{5,10})\b/)
const staffIdMatch = inputText.match(/\b([A-Za-z]\d+)\b/)

const applyID = applyIdMatch ? applyIdMatch[1] : ''
let staffID = staffIdMatch ? staffIdMatch[1] : DEFAULT_STAFF_ID

if (!applyID) {
  utools.showNotification('❌ 未找到有效的 applyID（5-10位数字）')
  utools.hideMainWindow()
} else {
  // staffID 转大写
  staffID = staffID.toUpperCase()
  
  // 生成 accessToken
  const accessToken = generateAccessToken(staffID, applyID)
  
  // 构建完整 URL
  const fullUrl = `${VIEW_FORM_URL}&applyID=${applyID}&accessToken=${accessToken}`
  
  // 在浏览器中打开
  utools.shellOpenExternal(fullUrl)
  utools.showNotification(`✅ 已打开表单: ${applyID}`)
  utools.hideMainWindow()
}

