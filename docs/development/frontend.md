---
sidebar_position: 1
title: 前端开发指南
---

# 前端开发指南

Collei 的前端分为两个独立部分：

- **管理面板 (collei-web)**：管理员使用的后台管理 SPA，使用 React + TypeScript 构建。
- **展示主题**：面向访客的服务器状态展示页，通过主题包系统支持自定义。

本文档主要介绍**展示主题**的开发方式。管理面板（collei-web）的开发请参阅其仓库 README。

---

## 展示主题开发

### 主题文件结构

```
my-theme/
├── theme.json          # 必须 — 主题元信息
├── index.html          # 必须 — 入口页面
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
    └── logo.png
```

### theme.json

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A custom display theme for Collei.",
  "author": "Your Name",
  "link": "https://github.com/collei-monitor/collei-web"
}
```

| 字段          | 必填 | 说明     |
| ------------- | ---- | -------- |
| `name`        | ✅   | 主题名称 |
| `version`     | ✅   | 版本号   |
| `description` | ❌   | 主题描述 |
| `author`      | ❌   | 作者名称 |

### 打包与上传

```bash
cd my-theme
zip -r ../my-theme.zip .
```

通过管理面板 **系统设置 → 展示主题管理 → 上传主题** 提交 ZIP 包。

**约束条件**：

| 项目         | 要求                                 |
| ------------ | ------------------------------------ |
| ZIP 大小     | ≤ 50 MB                              |
| 必含文件     | `theme.json`、`index.html`           |
| 禁止内容     | `..` 路径、绝对路径、可执行文件      |
| API 路径前缀 | 所有数据请求必须以 `/api/v1/` 为前缀 |
| 同源约束     | 主题在同域下运行，无需处理 CORS      |

---

## 路由规则

主题被激活后，中间件按以下规则处理请求：

| 路径                           | 处理方式                              |
| ------------------------------ | ------------------------------------- |
| `/`                            | 返回主题 `index.html`                 |
| `/server/*`                    | 返回主题 `index.html`（SPA 路由回退） |
| `/css/*`, `/js/*`, `/assets/*` | 从主题目录提供静态文件                |
| `/api/*`                       | **不拦截**，正常到达后端 API          |
| `/admin`, `/login`             | **不拦截**，由管理面板处理            |

静态资源必须使用**以 `/` 开头的绝对路径**：

```html
<!-- ✅ 正确 -->
<link rel="stylesheet" href="/css/style.css" />
<script src="/js/app.js"></script>

<!-- ❌ 错误 — 相对路径在 SPA 路由下会失效 -->
<link rel="stylesheet" href="css/style.css" />
```

---

## 公开 HTTP 接口

以下接口**无需认证**，可直接在主题中调用。

### 获取站点配置

```
GET /api/v1/public/custom
```

```json
{
  "custom_headers": "<style>body { background: #000; }</style>",
  "custom_body": "<script>console.log('Hello');</script>",
  "app_name": "Collei",
  "favicon_url": "/api/v1/public/favicon"
}
```

建议在主题初始化时调用，用于设置 `document.title` 和 Favicon。

### 获取服务器负载数据

```
GET /api/v1/clients/public/servers/{uuid}/load
```

支持三种查询模式：

| 参数                       | 说明                          |
| -------------------------- | ----------------------------- |
| 不传参                     | 返回实时数据（load_now）      |
| `?range=6`                 | 过去 N 小时的数据             |
| `?start_time=X&end_time=Y` | 指定时间段（Unix 秒级时间戳） |

响应包含 `data` 数组，每条记录含 CPU、内存、磁盘、网络、进程等指标。

### 获取网络探测数据

```
GET /api/v1/clients/public/servers/{uuid}/network
```

返回按探测目标分组的网络探测结果，包含延迟和丢包率数据。查询模式同上。

---

## WebSocket 实时推送

WebSocket 是展示端实现实时面板的核心。

### 连接

```
ws://{host}/api/v1/ws
```

公开模式下无需认证，仅返回可见且已批准的服务器。若浏览器已登录管理面板，Cookie 会自动携带，返回全部服务器数据。

### 下行消息

#### `nodes` — 节点列表

首次连接时推送，包含服务器列表和分组信息：

```json
{
  "type": "nodes",
  "timestamp": 1773329404,
  "servers": [
    {
      "uuid": "fcfa824f-...",
      "name": "Server-01",
      "cpu_name": "Intel Xeon E5-2680 v4",
      "arch": "amd64",
      "os": "Ubuntu 22.04",
      "region": "CN",
      "top": 1,
      "tags": [],
      "status": 1,
      "last_online": 1773330804,
      "boot_time": 1772716405,
      "groups": [{ "id": "...", "name": "分组1", "top": 2 }],
      "billing": null
    }
  ],
  "groups": [
    { "id": "...", "name": "分组1", "top": 2, "server_uuids": ["fcfa824f-..."] }
  ]
}
```

#### `status` — 实时状态快照

每 2-3 秒推送一次，`servers` 字段为**对象**（以 UUID 为键），便于快速索引：

```json
{
  "type": "status",
  "timestamp": 1773329404,
  "servers": {
    "fcfa824f-...": {
      "name": "Server-01",
      "status": {
        "status": 1,
        "last_online": 1773329400,
        "boot_time": 1772716405
      },
      "load": {
        "cpu": 19.4,
        "ram": 25655541760,
        "ram_total": 33483395072,
        "net_in": 20410,
        "net_out": 28181,
        "tcp": 228,
        "udp": 71,
        "process": 415
      }
    }
  }
}
```

### 上行消息

```javascript
// 心跳（建议每 30 秒发送一次）
ws.send(JSON.stringify({ action: "ping" }));

// 手动请求节点列表（适用于重连后恢复数据）
ws.send(JSON.stringify({ action: "get_nodes" }));
```

---

## 数据单位与约定

| 数据                            | 单位                               |
| ------------------------------- | ---------------------------------- |
| 内存 / 磁盘 / Swap / 流量       | 字节 (bytes)                       |
| 网络速率 (`net_in` / `net_out`) | 字节/秒 (B/s)                      |
| 延迟 (`median_latency` 等)      | 毫秒 (ms)                          |
| CPU 使用率 (`cpu`)              | 百分比 (%)，如 `19.4`              |
| 丢包率 (`packet_loss`)          | `0.0` ~ `1.0`                      |
| 时间戳                          | Unix 秒级时间戳                    |
| 排序权重 (`top`)                | 数值越大越靠前                     |
| 地区代码 (`region`)             | ISO 3166-1 alpha-2 (如 `CN`, `US`) |
| 服务器状态 (`status`)           | `1` = 在线, `0` = 离线             |

---

## 推荐数据获取策略

| 页面场景   | 推荐方式                                                   |
| ---------- | ---------------------------------------------------------- |
| 服务器总览 | WebSocket `nodes` 获取列表，`status` 实时更新卡片          |
| 服务器详情 | HTTP `load` 接口获取历史图表 + WebSocket `status` 实时数据 |
| 网络探测   | HTTP `network` 接口获取历史数据，定时轮询                  |
| 站点信息   | HTTP `public/custom` 获取应用名称和 Favicon                |

---

## 接口总览

| 接口                                            | 方法 | 认证   | 说明                |
| ----------------------------------------------- | ---- | ------ | ------------------- |
| `/api/v1/public/custom`                         | GET  | 不需要 | 站点配置            |
| `/api/v1/public/favicon`                        | GET  | 不需要 | Favicon 图片        |
| `/api/v1/public/theme`                          | GET  | 不需要 | 当前主题配置        |
| `/api/v1/clients/public/servers/{uuid}/load`    | GET  | 可选   | 服务器负载数据      |
| `/api/v1/clients/public/servers/{uuid}/network` | GET  | 可选   | 网络探测数据        |
| `/api/v1/auth/me`                               | GET  | 需要   | 用户信息 + ws_token |
| `/api/v1/ws`                                    | WS   | 可选   | 实时状态推送        |
