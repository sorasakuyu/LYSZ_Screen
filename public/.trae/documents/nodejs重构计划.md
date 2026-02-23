# BigScreen 前端展示系统 Node.js 重构计划

## 📋 项目目标

将前端展示系统重构为 Node.js 架构，并实现一机一码功能：
- 所有 API 请求自动携带设备机器码参数 `?device=机器码`
- **绝对不改变 UI、排版、模块大小**

---

## 🏗️ 重构架构

```
e:\lysz\BigScreen\public\
├── css/                    # ✅ 保持不变
├── font/                   # ✅ 保持不变
├── img/                    # ✅ 保持不变
├── js/                     # 🔄 需要修改（添加机器码）
│   ├── device.js           # 🆕 新增：机器码生成模块
│   ├── api.js              # 🆕 新增：统一API请求封装
│   ├── time.js             # 🔄 修改：使用统一API
│   ├── weather.js          # 🔄 修改：使用统一API
│   ├── weather-alert.js    # 🔄 修改：使用统一API
│   ├── renmin.js           # 🔄 修改：使用统一API
│   ├── news.js             # 🔄 修改：使用统一API
│   ├── days.js             # 🔄 修改：使用统一API
│   ├── notice.js           # 🔄 修改：使用统一API
│   └── picture.js          # 🔄 修改：使用统一API
├── *.html                  # 🔄 修改：引入新JS模块
└── package.json            # 🆕 新增：Node.js配置
```

---

## 📝 详细任务清单

### 第一阶段：创建核心模块

#### 1. 创建 `js/device.js` - 机器码生成模块

```javascript
// 功能：
// - 生成唯一设备机器码
// - 基于浏览器指纹（canvas、webgl、屏幕分辨率、时区等）
// - 持久化存储到 localStorage
// - 提供 getDeviceCode() 方法
```

**机器码生成策略：**
- Canvas 指纹
- WebGL 渲染器信息
- 屏幕分辨率 + 色深
- 时区偏移
- 语言设置
- User Agent 哈希
- 使用 FNV-1a 哈希生成 16 位机器码

#### 2. 创建 `js/api.js` - 统一 API 请求封装

```javascript
// 功能：
// - 自动获取并附加 device 参数
// - 统一的超时处理
// - 统一的错误处理
// - 提供 request(url, options) 方法
```

---

### 第二阶段：修改现有 JS 模块

#### 3. 修改 `js/time.js`
- ✅ 无需修改（不请求后端API）

#### 4. 修改 `js/weather.js`
- 当前：直接请求和风天气 API
- 修改：保持不变（外部API，不需要device参数）

#### 5. 修改 `js/weather-alert.js`
- 当前：直接请求和风天气 API
- 修改：保持不变（外部API，不需要device参数）

#### 6. 修改 `js/renmin.js`
- 当前：`fetch('http://localhost:9000/renmin/')`
- 修改：`fetch('http://localhost:9000/renmin/?device=' + getDeviceCode())`

#### 7. 修改 `js/news.js`
- 当前：`fetch('http://localhost:4399/v2/60s')`
- 修改：保持不变（外部API，不需要device参数）

#### 8. 修改 `js/days.js`
- 当前：`fetch('http://localhost:9000/days/')`
- 修改：`fetch('http://localhost:9000/days/?device=' + getDeviceCode())`

#### 9. 修改 `js/notice.js`
- 当前：`fetch('http://localhost:9000/notice/')`
- 修改：`fetch('http://localhost:9000/notice/?device=' + getDeviceCode())`

#### 10. 修改 `js/picture.js`
- 当前：`fetch('http://localhost:9000/picture/')`
- 修改：`fetch('http://localhost:9000/picture/?device=' + getDeviceCode())`

---

### 第三阶段：修改 HTML 文件

#### 11. 修改所有 HTML 文件的 script 引入顺序

在每个 HTML 的 `<head>` 或 `<body>` 中，确保引入顺序：

```html
<!-- 机器码模块必须最先加载 -->
<script src="js/device.js"></script>
<!-- API封装模块 -->
<script src="js/api.js"></script>
<!-- 其他业务模块 -->
<script src="js/time.js"></script>
<!-- ... -->
```

需要修改的 HTML 文件：
- `default.html`
- `notice.html`
- `video.html`
- `picture.html`
- `notice_check.html`
- `index.html`

---

## 🔧 技术实现细节

### device.js 实现方案

```javascript
(function() {
    'use strict';
    
    const DEVICE_KEY = 'kaguya_device_code';
    
    // Canvas 指纹
    function getCanvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Kaguya-BigScreen', 2, 2);
        return canvas.toDataURL();
    }
    
    // WebGL 信息
    function getWebGLInfo() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return '';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? 
            gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    }
    
    // FNV-1a 哈希
    function fnv1aHash(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 16777619) >>> 0;
        }
        return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }
    
    // 生成机器码
    function generateDeviceCode() {
        const components = [
            getCanvasFingerprint(),
            getWebGLInfo(),
            screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.language,
            navigator.userAgent
        ];
        const combined = components.join('|');
        const hash1 = fnv1aHash(combined);
        const hash2 = fnv1aHash(combined + hash1);
        return hash1 + hash2; // 16位机器码
    }
    
    // 获取或创建机器码
    window.getDeviceCode = function() {
        let code = localStorage.getItem(DEVICE_KEY);
        if (!code) {
            code = generateDeviceCode();
            localStorage.setItem(DEVICE_KEY, code);
        }
        return code;
    };
})();
```

### api.js 实现方案

```javascript
(function() {
    'use strict';
    
    const API_BASE = 'http://localhost:9000';
    
    // 统一请求方法
    window.apiRequest = function(endpoint, options = {}) {
        const device = window.getDeviceCode();
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_BASE}${endpoint}${separator}device=${device}`;
        
        const defaults = {
            cache: 'no-store',
            signal: options.timeout ? 
                AbortSignal.timeout(options.timeout) : undefined
        };
        
        return fetch(url, { ...defaults, ...options });
    };
    
    // 便捷方法
    window.apiGet = function(endpoint, timeout = 8000) {
        return window.apiRequest(endpoint, { timeout });
    };
})();
```

---

## 📊 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `js/device.js` | 🆕 新建 | 机器码生成模块 |
| `js/api.js` | 🆕 新建 | 统一API请求封装 |
| `js/renmin.js` | 🔄 修改 | 使用 apiRequest |
| `js/days.js` | 🔄 修改 | 使用 apiRequest |
| `js/notice.js` | 🔄 修改 | 使用 apiRequest |
| `js/picture.js` | 🔄 修改 | 使用 apiRequest |
| `js/time.js` | ✅ 不变 | 无后端请求 |
| `js/weather.js` | ✅ 不变 | 外部API |
| `js/weather-alert.js` | ✅ 不变 | 外部API |
| `js/news.js` | ✅ 不变 | 外部API |
| `default.html` | 🔄 修改 | 引入新JS |
| `notice.html` | 🔄 修改 | 引入新JS |
| `video.html` | 🔄 修改 | 引入新JS |
| `picture.html` | 🔄 修改 | 引入新JS |
| `notice_check.html` | 🔄 修改 | 引入新JS |
| `index.html` | 🔄 修改 | 引入新JS |
| `css/*` | ✅ 不变 | UI样式保持不变 |

---

## ⚠️ 重要约束

1. **UI 绝对不变**：所有 CSS 文件不做任何修改
2. **排版不变**：HTML 结构保持不变，只添加 script 引入
3. **模块大小不变**：所有尺寸相关的 CSS 保持原样
4. **向后兼容**：后端 API 需要支持 device 参数（后端已有此功能）

---

## 🚀 执行顺序

1. 创建 `js/device.js`
2. 创建 `js/api.js`
3. 修改 `js/renmin.js`
4. 修改 `js/days.js`
5. 修改 `js/notice.js`
6. 修改 `js/picture.js`
7. 修改 `default.html`
8. 修改 `notice.html`
9. 修改 `video.html`
10. 修改 `picture.html`
11. 修改 `notice_check.html`
12. 修改 `index.html`
