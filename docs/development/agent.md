---
sidebar_position: 2
title: Agent 开发指南
---

# Agent 开发指南

Collei Agent 是部署在被监控服务器上的轻量级探针程序，负责向控制端注册自身、定期上报监控数据，并按需执行远程任务。

本文档面向 Agent 开发者，描述 Agent 与 Collei 控制端之间的通信协议和接口规范。

---

## 通信基础

| 项目 | 说明 |
| --- | --- |
| 协议 | HTTPS (推荐) / HTTP |
| 数据格式 | JSON |
| 认证方式 | 请求体携带 `token` 字段 |
| Base URL | `{COLLEI_API_URL}/api/v1/agent` |

---

## 注册流程

Collei 支持两种 Agent 注册方式：

### 自动注册（全局密钥模式）

适用于**批量部署**场景。管理员设置一个全局安装密钥后统一下发安装命令。

```bash
# 安装命令示例
install.sh --url=https://api.collei.com --reg-token=<全局安装密钥>
```

**流程**：

```
Agent                               控制端
  │                                    │
  │  POST /agent/register              │
  │  { reg_token, name, 硬件信息 }     │
  │ ──────────────────────────────────► │
  │                                    │  校验密钥
  │                                    │  生成 uuid + token
  │                                    │  创建记录 (is_approved=0)
  │  200 { uuid, token }              │
  │ ◄────────────────────────────────── │
  │                                    │
  │  保存 uuid + token 到本地配置      │
  │  等待管理员批准后开始上报           │
```

#### `POST /api/v1/agent/register`

**请求体**：

```json
{
  "reg_token": "全局安装密钥",
  "name": "my-server-01",
  "cpu_name": "Intel Xeon E5-2680 v4",
  "virtualization": "KVM",
  "arch": "amd64",
  "cpu_cores": 4,
  "os": "Ubuntu 22.04",
  "kernel_version": "5.15.0-91-generic",
  "ipv4": "203.0.113.10",
  "ipv6": "2001:db8::1",
  "mem_total": 8589934592,
  "swap_total": 2147483648,
  "disk_total": 107374182400,
  "version": "0.1.0"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reg_token` | string | ✅ | 全局安装密钥 |
| `name` | string | ✅ | 服务器显示名称（1-128 字符） |
| `cpu_name` | string | ❌ | CPU 型号 |
| `virtualization` | string | ❌ | 虚拟化类型 (KVM/LXC/...) |
| `arch` | string | ❌ | 系统架构 (amd64/arm64/...) |
| `cpu_cores` | integer | ❌ | CPU 核心数 |
| `os` | string | ❌ | 操作系统名称 |
| `kernel_version` | string | ❌ | 内核版本 |
| `ipv4` | string | ❌ | IPv4 地址 |
| `ipv6` | string | ❌ | IPv6 地址 |
| `mem_total` | integer | ❌ | 总内存 (Bytes) |
| `swap_total` | integer | ❌ | 总 Swap (Bytes) |
| `disk_total` | integer | ❌ | 总磁盘 (Bytes) |
| `version` | string | ❌ | Agent 版本号 |

**成功响应** `200 OK`：

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token": "AgBbC1d2E3f4G5h6I7j8K9..."
}
```

**错误响应**：

| 状态码 | detail | 说明 |
| --- | --- | --- |
| 401 | `Invalid registration token` | 全局密钥错误 |
| 503 | `Registration is not configured` | 未配置全局注册密钥 |

:::info
自动注册成功后 `is_approved = 0`，Agent 需等待管理员审核批准后方可上报监控数据。Agent 不保存全局安装密钥，仅保存返回的专属 `token`。
:::

---

### 被动注册（管理员下发 Token）

适用于管理员**预先创建服务器记录**后，将专属 token 分发给 Agent 的场景。

```bash
# 安装命令示例
install.sh --url=https://api.collei.com --token=<专属token>
```

#### `POST /api/v1/agent/verify`

**请求体**：

```json
{
  "token": "AgBbC1d2E3f4G5h6I7j8K9...",
  "name": "my-server-01",
  "cpu_name": "Intel Xeon E5-2680 v4",
  "arch": "amd64",
  "os": "Ubuntu 22.04"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `token` | string | ✅ | 管理员下发的专属 token |
| 其余 | — | ❌ | 同自动注册的硬件信息字段 |

**成功响应** `200 OK`：

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token": "AgBbC1d2E3f4G5h6I7j8K9...",
  "is_approved": 1
}
```

被动注册的服务器 `is_approved = 1`，无需管理员额外审核，可直接开始上报数据。

---

## 监控数据上报

Agent 注册并获批后，通过 `/agent/report` 接口持续向控制端上报数据。

### `POST /api/v1/agent/report`

**请求体**：

```json
{
  "token": "AgBbC1d2E3f4G5h6I7j8K9...",
  "cpu_name": "Intel Xeon E5-2680 v4",
  "arch": "amd64",
  "cpu_cores": 4,
  "os": "Ubuntu 22.04",
  "kernel_version": "5.15.0-91-generic",
  "ipv4": "203.0.113.10",
  "mem_total": 8589934592,
  "swap_total": 2147483648,
  "disk_total": 107374182400,
  "version": "0.1.0",
  "total_flow_out": 10737418240,
  "total_flow_in": 5368709120,
  "current_disk_io": [
    { "mount": "/", "fs": "ext4", "total": 107374182400, "used": 53687091200 }
  ],
  "current_net_io": [
    { "name": "eth0", "rx_bytes": 610662698, "tx_bytes": 115183318 }
  ],
  "load_data": {
    "cpu": 23.5,
    "ram": 4294967296,
    "ram_total": 8589934592,
    "swap": 0,
    "swap_total": 2147483648,
    "load": 1.25,
    "disk": 53687091200,
    "disk_total": 107374182400,
    "net_in": 1048576,
    "net_out": 524288,
    "tcp": 42,
    "udp": 8,
    "process": 156
  }
}
```

**关键字段说明**：

- `token`（必填）：Agent 专属通信 token
- 硬件信息字段（可选）：有变更时携带，增量更新
- `total_flow_out` / `total_flow_in`（可选）：系统开机以来累积流量
- `current_disk_io`（可选）：磁盘/分区状态快照数组
- `current_net_io`（可选）：网卡接口累计流量数组
- `load_data`（可选）：实时监控数据对象

**`load_data` 字段**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `cpu` | float | CPU 使用率 (%) |
| `ram` / `ram_total` | integer | 已用/总内存 (Bytes) |
| `swap` / `swap_total` | integer | 已用/总 Swap (Bytes) |
| `load` | float | 系统负载 (Load Average) |
| `disk` / `disk_total` | integer | 已用/总磁盘 (Bytes) |
| `net_in` / `net_out` | integer | 网络入站/出站速率 |
| `tcp` / `udp` | integer | TCP/UDP 连接数 |
| `process` | integer | 进程数 |

**成功响应** `200 OK`：

```json
{
  "uuid": "550e8400-...",
  "is_approved": 1,
  "received": true,
  "network_dispatch": null,
  "ssh_tunnel": null,
  "pending_tasks": null
}
```

**错误响应**：

| 状态码 | detail | 说明 |
| --- | --- | --- |
| 401 | `Invalid token` | token 无效 |
| 403 | `Server not approved` | 服务器未被管理员批准 |

### `/agent/verify` 与 `/agent/report` 的区别

| 特性 | `/agent/verify` | `/agent/report` |
| --- | --- | --- |
| 用途 | 首次连接验证身份 | 持续通信上报 |
| 审批检查 | 不检查，返回当前状态 | 必须 `is_approved=1` |
| 硬件信息 | 批量更新 | 增量更新 |
| 监控数据 | ❌ 不支持 | ✅ 通过 `load_data` 上报 |

---

## 远程命令执行

控制面板支持向 Agent 下发远程命令任务。Agent 通过现有的 `report` 接口拉取待执行任务。

### 任务生命周期

```
pending → sent → running → success / failed / timeout
```

- **pending**：任务已创建，等待 Agent 拉取
- **sent**：已通过 report 响应下发给 Agent
- **running**：Agent 正在执行
- **success / failed / timeout**：终态

### 任务拉取

Agent 无需额外轮询。`POST /agent/report` 的响应中已包含 `pending_tasks` 字段：

```json
{
  "pending_tasks": [
    {
      "execution_id": "exec-uuid-1",
      "task_id": "task-uuid-1",
      "type": "shell",
      "payload": "{\"command\": \"apt update -y\"}",
      "timeout_sec": 300
    }
  ]
}
```

**任务类型**：

| 类型 | 说明 | payload 格式 |
| --- | --- | --- |
| `shell` | 执行 shell 命令 | `{"command": "apt update -y"}` |
| `command` | 执行系统命令 | `{"command": "systemctl restart nginx"}` |
| `script` | 执行脚本内容 | `{"script": "#!/bin/bash\n...", "args": []}` |
| `upgrade_agent` | 升级 Agent | `{"version": "1.2.0", "url": "https://..."}` |

:::tip
`payload` 是 JSON 字符串，Agent 需要先解析后再使用。
:::

### 任务结果上报

#### `POST /api/v1/agent/tasks/report`

```json
{
  "execution_id": "exec-uuid-1",
  "status": "success",
  "exit_code": 0,
  "output": "Hit:1 http://archive.ubuntu.com...\nDone\n"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `execution_id` | string | ✅ | 执行记录 ID |
| `status` | string | ✅ | `running` / `success` / `failed` / `timeout` |
| `exit_code` | integer \| null | ❌ | 进程退出码 |
| `output` | string \| null | ❌ | 终端输出内容 |

**状态流转**：

| 当前状态 | 允许转移到 |
| --- | --- |
| `sent` | `running` / `success` / `failed` / `timeout` |
| `running` | `running` / `success` / `failed` / `timeout` |

`running → running` 允许多次上报中间输出日志。终态（`success` / `failed` / `timeout`）之后不可再变更。

---

## Agent 扩展功能

除基本的注册与数据上报外，Agent 还可支持以下功能模块。这些功能通过 `report` 响应中的控制字段触发：

### Web SSH 隧道

Agent 作为 TCP 代理在后端和本地 sshd 之间建立隧道，实现浏览器端 SSH 终端。

- 启用条件：安装时使用 `--enable-ssh` 参数
- 可选 CA 信任：`--setup-ca` 参数（需 root 权限）
- 隧道 WebSocket：`WS /api/v1/agent/ws/ssh?token=<agent_token>`
- 通过 `report` 响应中的 `ssh_tunnel.connect: true/false` 控制连接

### 文件管理 API

通过 WebSocket 隧道实现远程文件管理功能。

- 两阶段架构：前端创建 HTTP 会话 → Agent 建立 WebSocket 隧道
- Agent 文件 WebSocket：`WS /api/v1/agent/ws/files?token=<agent_token>`
- 支持操作：readdir, stat, read, write, remove, rename, mkdir, rmdir
- 大文件使用分块传输（推荐 64 KB 每块）

### SFTP 支持

SFTP 复用现有 SSH 隧道基础设施，Agent 端无需额外代码改动。

---

## Agent 主循环参考

```python
while True:
    # 1. 收集硬件信息 + 监控数据
    hw_info = collect_hardware_info()
    load_data = collect_load_data()

    # 2. 上报数据
    response = POST("/agent/report", {
        "token": saved_token,
        **hw_info,
        "load_data": load_data,
    })

    # 3. 处理响应
    if response["network_dispatch"]:
        handle_network_dispatch(response["network_dispatch"])

    if response["ssh_tunnel"]:
        handle_ssh_tunnel(response["ssh_tunnel"])

    if response["pending_tasks"]:
        for task in response["pending_tasks"]:
            execute_task_async(task)

    # 4. 等待下一个上报周期
    sleep(interval)
```

---

## 接口总览

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/agent/register` | POST | 自动注册（全局密钥） |
| `/api/v1/agent/verify` | POST | 被动注册（专属 token） |
| `/api/v1/agent/report` | POST | 数据上报 + 任务拉取 |
| `/api/v1/agent/tasks/report` | POST | 任务结果上报 |
| `/api/v1/agent/ws/ssh` | WS | SSH 隧道 |
| `/api/v1/agent/ws/files` | WS | 文件管理隧道 |
