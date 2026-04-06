---
sidebar_position: 2
title: 配置文件
description: agent.yaml 完整字段说明与配置热重载
---

# 配置文件

Agent 使用 YAML 格式配置文件 `agent.yaml`。安装脚本会自动生成，也可以手动创建或修改。

## 默认路径

| 平台 | 路径 |
|------|------|
| Linux (root) | `/etc/collei-agent/agent.yaml` |
| Linux (用户) | `~/.config/collei-agent/agent.yaml` |
| Windows (服务) | `C:\ProgramData\collei-agent\agent.yaml` |
| Windows (用户) | `%APPDATA%\collei-agent\agent.yaml` |

## 完整配置示例

```yaml
# ========== 基础配置（必填） ==========
server_url: https://panel.example.com

# 认证凭据（注册成功后由 Agent 自动写入，通常无需手动填写）
# uuid: 550e8400-e29b-41d4-a716-446655440000
# token: AgBbC1d2E3f4G5h6I7j8K9...

# ========== 网络采集 ==========
# 指定用于速率计算的主网卡（留空使用系统汇总）
# network_interface: eth0

# 网卡过滤（留空使用内置默认黑名单）
# nic_filter:
#   whitelist:            # 白名单模式：仅采集匹配的网卡
#     - "^eth"
#     - "^ens"
#   blacklist:            # 黑名单模式：过滤匹配的网卡
#     - "^docker"
#     - "^veth"
#     - "^br-"

# ========== SSH 隧道 ==========
# ssh:
#   enabled: true
#   port: 22              # sshd 监听端口
#   ca_configured: false  # 是否已配置 CA 免密登录

# ========== Web 终端（ConPTY，仅 Windows） ==========
# terminal:
#   enabled: true
#   default_shell: powershell.exe

# ========== 文件管理 API ==========
# file_api:
#   enabled: true

# ========== 远程任务执行 ==========
# tasks:
#   enabled: true         # 默认跟随 ssh.enabled
#   explicit: true        # 设为 true 表示此值为显式配置

# ========== CA 公钥路径 ==========
# ca_public_key_path: /etc/ssh/collei-ca.pub

# ========== 自动更新 ==========
auto_update: true
```

---

## 字段说明

### 基础字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `server_url` | string | ✅ | — | 控制端 API 地址，如 `https://panel.example.com` |
| `uuid` | string | — | — | 服务器唯一标识，注册成功后自动写入，**不要手动修改** |
| `token` | string | — | — | 通信凭据，注册成功后自动写入，**不要手动修改** |
| `auto_update` | bool | — | `true` | 是否启用自动版本检查更新 |

:::warning
`uuid` 和 `token` 由 Agent 注册时自动获取并写入配置文件。手动修改可能导致 Agent 无法正常通信。
:::

### 网络采集

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `network_interface` | string | 空 | 指定用于速率计算（`net_in`/`net_out`）的网卡名称。留空时使用系统汇总值 |
| `nic_filter.whitelist` | string[] | 空 | 网卡白名单，支持正则。**设置后仅采集匹配的网卡**，忽略黑名单 |
| `nic_filter.blacklist` | string[] | 空 | 网卡黑名单，支持正则。过滤匹配的网卡 |

**过滤优先级**：白名单 > 自定义黑名单 > 内置默认黑名单

#### 内置默认黑名单

白名单和黑名单均留空时，以下规则自动生效：

| 正则 | 匹配对象 |
|------|----------|
| `^docker\d*$` | Docker 守护进程网桥 |
| `^veth` | Docker/容器 veth 对 |
| `^br-` | Docker 自定义网桥 |
| `^cni\d*$` | CNI 插件接口 |
| `^flannel` | Flannel 覆盖网络 |
| `^cali` | Calico 网络策略 |
| `^weave` | Weave 网络 |
| `^kube-` | Kubernetes 网桥 |
| `^vxlan` | VXLAN 覆盖网络 |
| `^tunl\d*$` | IP-in-IP 隧道 |
| `^dummy` | Dummy 接口 |
| `^virbr` | libvirt/KVM 虚拟网桥 |
| `^lxc` | LXC 容器接口 |
| `^lxd` | LXD 容器接口 |
| `^podman` | Podman 容器接口 |

#### 示例：仅采集物理网卡

```yaml
nic_filter:
  whitelist:
    - "^eth"
    - "^ens"
    - "^enp"
```

#### 示例：在默认基础上额外过滤 WireGuard 和 Tailscale

```yaml
nic_filter:
  blacklist:
    - "^docker"
    - "^veth"
    - "^br-"
    - "^wg"
    - "^tailscale"
```

:::info
设置自定义黑名单会**完全替代**内置默认黑名单，请确保将需要过滤的虚拟网卡都列入。
:::

### SSH 隧道

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ssh.enabled` | bool | `false` | 是否启用 Web SSH 隧道功能 |
| `ssh.port` | int | `22` | 目标服务器的 sshd 监听端口 |
| `ssh.ca_configured` | bool | `false` | 是否已配置 SSH CA 免密登录 |

### Web 终端

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `terminal.enabled` | bool | `false` | 是否启用 Web 终端（ConPTY 直连），Windows 下即使未配置也会自动启用 |
| `terminal.default_shell` | string | 空 | 默认 Shell 程序路径，留空使用系统默认 |

### 文件管理 API

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `file_api.enabled` | bool | `false` | 是否启用 Web 文件管理 API，Windows 下即使未配置也会自动启用 |

### 远程任务执行

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tasks.enabled` | bool | — | 是否启用远程任务执行。未显式配置时默认跟随 `ssh.enabled` |
| `tasks.explicit` | bool | `false` | 标记 `tasks.enabled` 是否为用户显式设置 |

### CA 公钥

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ca_public_key_path` | string | 见下方 | SSH CA 公钥文件路径，用于终端和文件 API 的签名验证 |

默认路径：
- Linux: `/etc/ssh/collei-ca.pub`
- Windows: `<配置目录>\ca.pub`

---

## 配置热重载

Agent 支持在**不重启**的情况下重新加载配置文件。

### 自动重载

Agent 启动后会监听 `agent.yaml` 文件变更。直接编辑并保存配置文件即可，Agent 会在 500ms 内自动检测并应用变更。

:::info 可热重载的字段
仅以下字段支持热重载，其余字段（如 `server_url`、`token`）修改后需要重启 Agent。

- `network_interface`
- `nic_filter.whitelist` / `nic_filter.blacklist`
- `auto_update`
:::

### 手动触发（Linux）

除了自动文件监听外，Linux 下还可以通过信号手动触发：

```bash
# 方式 1：systemctl reload
systemctl reload collei-agent

# 方式 2：发送 SIGHUP 信号
kill -HUP $(pidof collei-agent)
```

---

## 常见问题

### 修改了配置文件但没有生效

- **可热重载字段**（`network_interface`、`nic_filter`、`auto_update`）：保存文件后自动生效
- **其他字段**：需要重启 Agent（`systemctl restart collei-agent`）

### Docker/K8s 环境中看到大量虚拟网卡

Agent 默认会过滤常见的虚拟网卡。如果仍有遗漏，可以配置自定义黑名单或使用白名单模式仅采集物理网卡。
