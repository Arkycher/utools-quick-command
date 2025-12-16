// =====================================================
// 快捷命令插件版本 - Cursor 最近项目快速打开
// 新建命令时：环境选 quickcommand，输出选 忽略输出且不隐藏
// =====================================================

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const os = require('os')

// Cursor 可执行文件路径 (新版本)
const CURSOR_EXE = '"C:\\Program Files\\cursor\\Cursor.exe"'

// ==================== 访问频率记录 ====================
const FREQ_DB_KEY = 'cursor_project_frequency'

function getFrequencyData() {
  try {
    return utools.dbStorage.getItem(FREQ_DB_KEY) || {}
  } catch (e) {
    return {}
  }
}

function increaseFrequency(projectKey) {
  try {
    const data = getFrequencyData()
    data[projectKey] = (data[projectKey] || 0) + 1
    utools.dbStorage.setItem(FREQ_DB_KEY, data)
  } catch (e) {}
}

function getFrequency(projectKey) {
  try {
    const data = getFrequencyData()
    return data[projectKey] || 0
  } catch (e) {
    return 0
  }
}

// ==================== 路径解析 ====================
function getStoragePath() {
  const platform = os.platform()
  const homeDir = os.homedir()
  
  if (platform === 'win32') {
    const appData = path.join(homeDir, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor', 'User', 'globalStorage', 'storage.json')
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json')
  } else {
    const wslPath = '/mnt/c/Users'
    if (fs.existsSync(wslPath)) {
      const users = fs.readdirSync(wslPath).filter(u => !u.startsWith('.') && u !== 'Public' && u !== 'Default')
      for (const user of users) {
        const storagePath = path.join(wslPath, user, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json')
        if (fs.existsSync(storagePath)) return storagePath
      }
    }
    return path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json')
  }
}

function parseUri(uri) {
  try {
    const decoded = decodeURIComponent(uri)
    
    if (decoded.startsWith('vscode-remote://wsl')) {
      const match = decoded.match(/vscode-remote:\/\/wsl\+([^/]+)(\/.+)/)
      if (match) return { type: 'wsl', distro: match[1], path: match[2], displayPath: match[2] }
      const fallback = decoded.match(/vscode-remote:\/\/wsl[^/]*(\/.+)/)
      return { type: 'wsl', distro: 'unknown', path: fallback?.[1] || decoded, displayPath: fallback?.[1] || decoded }
    }
    
    if (decoded.startsWith('vscode-remote://ssh-remote')) {
      const match = decoded.match(/vscode-remote:\/\/ssh-remote\+([^/]+)(\/.+)/)
      if (match) return { type: 'ssh', host: match[1], path: match[2], displayPath: match[2] }
      return { type: 'ssh', host: 'unknown', path: decoded, displayPath: decoded }
    }
    
    if (decoded.startsWith('file:///')) {
      let filePath = decoded.replace('file:///', '')
      if (filePath.match(/^[a-zA-Z]%3A/) || filePath.match(/^[a-zA-Z]:/)) {
        filePath = filePath.replace('%3A', ':')
      } else {
        filePath = '/' + filePath
      }
      return { type: 'local', path: filePath, displayPath: filePath }
    }
    
    return { type: 'unknown', path: decoded, displayPath: decoded }
  } catch (e) {
    return { type: 'unknown', path: uri, displayPath: uri }
  }
}

function getProjectName(projectPath) {
  const cleanPath = projectPath.replace(/\.code-workspace$/, '')
  const parts = cleanPath.split('/').filter(p => p)
  return parts[parts.length - 1] || cleanPath
}

function getSourceTag(parsed) {
  switch (parsed.type) {
    case 'wsl': return `🐧 WSL:${parsed.distro}`
    case 'ssh': return `🌐 SSH:${parsed.host}`
    case 'local': return '💻 本地'
    default: return '❓ 未知'
  }
}

// ==================== 读取项目 ====================

// 获取去重用的 key（同一目录的文件夹和 .code-workspace 算同一个）
function getDedupeKey(parsed) {
  let p = parsed.displayPath
  // 移除末尾的 .code-workspace 文件名
  if (p.endsWith('.code-workspace')) {
    p = p.replace(/\/[^/]+\.code-workspace$/, '')
  }
  // 移除末尾斜杠
  p = p.replace(/\/$/, '')
  return `${parsed.type}:${p}`
}

function getRecentProjects() {
  const storagePath = getStoragePath()
  
  if (!fs.existsSync(storagePath)) {
    return { error: `找不到配置文件: ${storagePath}` }
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))
    const projects = new Map()
    const recentOrder = [] // 记录最近打开顺序
    
    // 辅助函数：添加项目
    const addProject = (uri, priority = 0) => {
      const parsed = parseUri(uri)
      const name = getProjectName(parsed.displayPath)
      const dedupeKey = getDedupeKey(parsed)
      const isWorkspace = parsed.displayPath.endsWith('.code-workspace')
      
      if (projects.has(dedupeKey)) {
        const existing = projects.get(dedupeKey)
        // 更新优先级（取更高的）
        if (priority > existing.priority) {
          existing.priority = priority
        }
        // 如果新的是 workspace，替换路径
        if (isWorkspace && !existing.parsed.displayPath.endsWith('.code-workspace')) {
          existing.uri = uri
          existing.parsed = parsed
        }
      } else {
        projects.set(dedupeKey, { uri, parsed, name, key: dedupeKey, sourceTag: getSourceTag(parsed), priority })
      }
    }
    
    // 1. 最后活跃窗口 - 最高优先级
    if (data.windowsState?.lastActiveWindow) {
      const win = data.windowsState.lastActiveWindow
      const uri = win.folder || win.workspaceIdentifier?.configURIPath
      if (uri) addProject(uri, 1000)
    }
    
    // 2. 当前打开的窗口 - 次高优先级
    if (data.windowsState?.openedWindows) {
      data.windowsState.openedWindows.forEach((win, idx) => {
        const uri = win.folder || win.workspaceIdentifier?.configURIPath
        if (uri) addProject(uri, 900 - idx)
      })
    }
    
    // 3. 历史工作区 - 按对象键顺序（通常是最近的在后面）
    if (data.profileAssociations?.workspaces) {
      const keys = Object.keys(data.profileAssociations.workspaces)
      keys.forEach((uri, idx) => {
        // 越后面的越新，给更高优先级
        addProject(uri, idx)
      })
    }
    
    // 转为数组并按优先级降序排序
    let projectList = Array.from(projects.values())
    projectList.sort((a, b) => b.priority - a.priority)
    
    return { projects: projectList }
  } catch (e) {
    return { error: `解析失败: ${e.message}` }
  }
}

// ==================== 打开项目 ====================
function openProject(project) {
  const { parsed, key } = project
  
  // 增加访问次数
  if (key) increaseFrequency(key)
  
  let cmd = ''
  switch (parsed.type) {
    case 'wsl':
      cmd = `${CURSOR_EXE} --remote wsl+${parsed.distro} "${parsed.path}"`
      break
    case 'ssh':
      cmd = `${CURSOR_EXE} --remote ssh-remote+${parsed.host} "${parsed.path}"`
      break
    case 'local':
      cmd = `${CURSOR_EXE} "${parsed.path}"`
      break
    default:
      cmd = `${CURSOR_EXE} "${parsed.path}"`
  }
  
  exec(cmd, (error) => {
    if (error) utools.showNotification(`打开失败: ${error.message}`)
  })
  
  // 退出插件，恢复正常 uTools 状态
  utools.outPlugin()
}

// ==================== 主逻辑 ====================
const result = getRecentProjects()

if (result.error) {
  quickcommand.showMessageBox(result.error, 'error')
} else if (result.projects.length === 0) {
  quickcommand.showMessageBox('没有找到最近打开的项目', 'info')
} else {
  const projects = result.projects
  
  // 构建列表项：标题 + 路径描述
  // 把路径关键词也加到标题，这样搜索时能匹配到
  const items = projects.map((p, idx) => ({
    title: `${p.name} ｜ ${p.sourceTag}`,
    description: p.parsed.displayPath,
    // 搜索用的隐藏字段：包含路径便于匹配
    searchText: `${p.name} ${p.sourceTag} ${p.parsed.displayPath}`,
    idx
  }))
  
  quickcommand.showSelectList(items, {
    placeholder: '搜索项目 (按频率排序)',
    optionType: 'json'
  }).then(selected => {
    if (selected === undefined || selected === null) return
    
    let idx = -1
    if (selected.idx !== undefined) {
      idx = selected.idx
    } else if (typeof selected === 'number') {
      idx = selected
    } else if (selected.id !== undefined) {
      idx = selected.id
    }
    
    if (idx >= 0 && idx < projects.length) {
      openProject(projects[idx])
    }
  })
}
