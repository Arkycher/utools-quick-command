// =====================================================
// 快捷命令插件版本 - Cursor 最近项目快速打开
// 新建命令时：环境选 quickcommand，输出选 忽略输出并隐藏
// =====================================================

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const os = require('os')

// ==================== 访问频率记录 ====================
const FREQ_DB_KEY = 'cursor_project_frequency'

// 获取访问频率记录
function getFrequencyData() {
  try {
    return utools.dbStorage.getItem(FREQ_DB_KEY) || {}
  } catch (e) {
    return {}
  }
}

// 增加项目访问次数
function increaseFrequency(projectKey) {
  try {
    const data = getFrequencyData()
    data[projectKey] = (data[projectKey] || 0) + 1
    utools.dbStorage.setItem(FREQ_DB_KEY, data)
  } catch (e) {
    // 忽略存储错误
  }
}

// 获取项目访问次数
function getFrequency(projectKey) {
  const data = getFrequencyData()
  return data[projectKey] || 0
}

// ==================== 模糊搜索 ====================
// 检查文本是否匹配所有关键词（空格分隔，需全部匹配）
function fuzzyMatch(text, query) {
  if (!query || !query.trim()) return true
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k)
  const lowerText = text.toLowerCase()
  return keywords.every(kw => lowerText.includes(kw))
}

// 过滤项目列表
function filterProjects(projects, items, query) {
  if (!query || !query.trim()) {
    return { filteredProjects: projects, filteredItems: items }
  }
  
  const filteredProjects = []
  const filteredItems = []
  
  projects.forEach((p, i) => {
    // 搜索范围：项目名 + 来源标签 + 路径
    const searchText = `${p.name} ${p.sourceTag} ${p.parsed.displayPath}`
    if (fuzzyMatch(searchText, query)) {
      filteredProjects.push(p)
      filteredItems.push(items[i])
    }
  })
  
  return { filteredProjects, filteredItems }
}

// Cursor storage.json 路径 (根据操作系统)
function getStoragePath() {
  const platform = os.platform()
  const homeDir = os.homedir()
  
  if (platform === 'win32') {
    // Windows 环境
    const appData = path.join(homeDir, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor', 'User', 'globalStorage', 'storage.json')
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json')
  } else {
    // Linux - 检查是否在 WSL 环境
    const wslPath = '/mnt/c/Users'
    if (fs.existsSync(wslPath)) {
      // WSL 环境，查找 Windows 用户目录
      const users = fs.readdirSync(wslPath).filter(u => !u.startsWith('.') && u !== 'Public' && u !== 'Default')
      for (const user of users) {
        const storagePath = path.join(wslPath, user, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json')
        if (fs.existsSync(storagePath)) {
          return storagePath
        }
      }
    }
    // 原生 Linux
    return path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json')
  }
}

// 解析 URI 路径，返回详细信息
function parseUri(uri) {
  try {
    const decoded = decodeURIComponent(uri)
    
    // 处理 vscode-remote://wsl+xxx/path 格式
    if (decoded.startsWith('vscode-remote://wsl')) {
      const match = decoded.match(/vscode-remote:\/\/wsl\+([^/]+)(\/.+)/)
      if (match) {
        return {
          type: 'wsl',
          distro: match[1],  // 如 ubuntu-24.04
          path: match[2],
          displayPath: match[2]
        }
      }
      // 备用匹配
      const fallback = decoded.match(/vscode-remote:\/\/wsl[^/]*(\/.+)/)
      return {
        type: 'wsl',
        distro: 'unknown',
        path: fallback ? fallback[1] : decoded,
        displayPath: fallback ? fallback[1] : decoded
      }
    }
    
    // 处理 vscode-remote://ssh-remote+xxx/path 格式  
    if (decoded.startsWith('vscode-remote://ssh-remote')) {
      const match = decoded.match(/vscode-remote:\/\/ssh-remote\+([^/]+)(\/.+)/)
      if (match) {
        return {
          type: 'ssh',
          host: match[1],
          path: match[2],
          displayPath: match[2]
        }
      }
      return {
        type: 'ssh',
        host: 'unknown',
        path: decoded,
        displayPath: decoded
      }
    }
    
    // 处理 file:///path 格式
    if (decoded.startsWith('file:///')) {
      let filePath = decoded.replace('file:///', '')
      // Windows 路径处理
      if (filePath.match(/^[a-zA-Z]%3A/) || filePath.match(/^[a-zA-Z]:/)) {
        filePath = filePath.replace('%3A', ':')
      } else {
        filePath = '/' + filePath
      }
      return {
        type: 'local',
        path: filePath,
        displayPath: filePath
      }
    }
    
    return {
      type: 'unknown',
      path: decoded,
      displayPath: decoded
    }
  } catch (e) {
    return {
      type: 'unknown',
      path: uri,
      displayPath: uri
    }
  }
}

// 获取项目显示名称
function getProjectName(projectPath) {
  // 移除 .code-workspace 后缀
  const cleanPath = projectPath.replace(/\.code-workspace$/, '')
  // 获取最后一段作为名称
  const parts = cleanPath.split('/').filter(p => p)
  return parts[parts.length - 1] || cleanPath
}

// 获取来源标签 (带 emoji)
function getSourceTag(parsed) {
  switch (parsed.type) {
    case 'wsl':
      return `🐧 WSL:${parsed.distro}`
    case 'ssh':
      return `🌐 SSH:${parsed.host}`
    case 'local':
      return '💻 本地'
    default:
      return '❓ 未知'
  }
}

// 读取并解析最近项目
function getRecentProjects() {
  const storagePath = getStoragePath()
  
  if (!fs.existsSync(storagePath)) {
    return { error: `找不到 Cursor 配置文件: ${storagePath}` }
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'))
    const projects = new Map() // 用 Map 去重
    
    // 从 profileAssociations.workspaces 获取
    if (data.profileAssociations?.workspaces) {
      Object.keys(data.profileAssociations.workspaces).forEach(uri => {
        const parsed = parseUri(uri)
        const name = getProjectName(parsed.displayPath)
        const key = `${parsed.type}:${parsed.displayPath}`
        if (!projects.has(key)) {
          projects.set(key, { 
            uri, 
            parsed,
            name,
            sourceTag: getSourceTag(parsed)
          })
        }
      })
    }
    
    // 从 windowsState.openedWindows 获取当前打开的窗口
    if (data.windowsState?.openedWindows) {
      data.windowsState.openedWindows.forEach(win => {
        const uri = win.folder || win.workspaceIdentifier?.configURIPath
        if (uri) {
          const parsed = parseUri(uri)
          const name = getProjectName(parsed.displayPath)
          const key = `${parsed.type}:${parsed.displayPath}`
          if (!projects.has(key)) {
            projects.set(key, { 
              uri, 
              parsed,
              name,
              sourceTag: getSourceTag(parsed)
            })
          }
        }
      })
    }
    
    // 从 lastActiveWindow 获取
    if (data.windowsState?.lastActiveWindow) {
      const win = data.windowsState.lastActiveWindow
      const uri = win.folder || win.workspaceIdentifier?.configURIPath
      if (uri) {
        const parsed = parseUri(uri)
        const name = getProjectName(parsed.displayPath)
        const key = `${parsed.type}:${parsed.displayPath}`
        if (!projects.has(key)) {
          projects.set(key, { 
            uri, 
            parsed,
            name,
            sourceTag: getSourceTag(parsed)
          })
        }
      }
    }
    
    // 转为数组并添加频率信息
    let projectList = Array.from(projects.values()).map(p => {
      const key = `${p.parsed.type}:${p.parsed.displayPath}`
      return {
        ...p,
        key,
        frequency: getFrequency(key)
      }
    })
    
    // 按访问频率降序排序
    projectList.sort((a, b) => b.frequency - a.frequency)
    
    return { projects: projectList }
  } catch (e) {
    return { error: `解析配置文件失败: ${e.message}` }
  }
}

// 打开项目
function openProject(project) {
  const { uri, parsed, key } = project
  let cmd = ''
  
  // 增加访问次数
  if (key) {
    increaseFrequency(key)
  }
  
  // Cursor 可执行文件路径 (新版本)
  const cursorExe = '"C:\\Program Files\\cursor\\Cursor.exe"'
  
  // 根据类型构建命令
  switch (parsed.type) {
    case 'wsl':
      cmd = `${cursorExe} --remote wsl+${parsed.distro} "${parsed.path}"`
      break
    case 'ssh':
      cmd = `${cursorExe} --remote ssh-remote+${parsed.host} "${parsed.path}"`
      break
    case 'local':
      cmd = `${cursorExe} "${parsed.path}"`
      break
    default:
      cmd = `${cursorExe} "${parsed.path}"`
  }
  
  if (cmd) {
    exec(cmd, (error) => {
      if (error) {
        utools.showNotification(`打开失败: ${error.message}`)
      } else {
        utools.hideMainWindow()
      }
    })
  }
}

// 主逻辑
const result = getRecentProjects()

if (result.error) {
  quickcommand.showMessageBox(result.error, 'error')
} else {
  const projects = result.projects
  
  if (projects.length === 0) {
    quickcommand.showMessageBox('没有找到最近打开的项目', 'info')
  } else {
    // 构建列表项: 名称 | [来源标签] + 路径
    const items = projects.map((p, idx) => ({
      title: `${p.name} ｜ ${p.sourceTag}`,
      description: p.parsed.displayPath,
      idx
    }))
    
    quickcommand.showSelectList(items, {
      placeholder: '搜索 Cursor 最近项目...',
      optionType: 'json'
    }).then(selected => {
      if (selected === undefined || selected === null) return
      
      let projectIdx = -1
      
      if (selected.idx !== undefined) {
        projectIdx = selected.idx
      } else if (typeof selected === 'number') {
        projectIdx = selected
      } else if (selected.id !== undefined) {
        projectIdx = selected.id
      } else if (selected.title) {
        const found = items.find(item => item.title === selected.title)
        if (found) projectIdx = found.idx
      }
      
      if (projectIdx >= 0 && projectIdx < projects.length) {
        const project = projects[projectIdx]
        openProject(project)
        utools.showNotification(`正在打开: ${project.name}`)
      }
    })
  }
}
