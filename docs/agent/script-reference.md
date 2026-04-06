---
sidebar_position: 3
title: 安装脚本参考
description: install.sh 与 install.ps1 的子命令、参数及使用方式详解
---

# 安装脚本参考

Collei Agent 提供两个平台安装脚本：

- **Linux**: `install.sh`（Bash）
- **Windows**: `install.ps1`（PowerShell）

两者均支持 `install`（默认）、`update`、`uninstall`、`update-ca` 子命令。

---

## install.sh（Linux）

### 获取方式

```bash
# 方式 1：直接管道执行（推荐）
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | bash -s -- [子命令] [参数...]

# 方式 2：使用 wget
wget -O- https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | bash -s -- [子命令] [参数...]

# 方式 3：通过面板中转获取脚本
curl -fsSL 'https://panel.example.com/api/v1/agent/install-script?token=TOKEN' | bash -s -- [子命令] [参数...]

# 方式 4：下载后执行
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh -o install.sh
bash install.sh [子命令] [参数...]
```

### 子命令

| 子命令            | 说明                             |
| ----------------- | -------------------------------- |
| `install`（默认） | 安装 Agent 并注册 systemd 服务   |
| `update`          | 更新 Agent 到最新或指定版本      |
| `update-ca`       | 更新 SSH CA 公钥（密钥轮换场景） |
| `uninstall`       | 卸载 Agent 并清理所有配置        |

不指定子命令时默认为 `install`。

---

### install — 安装

下载二进制、生成 `agent.yaml`、创建并启动 systemd 服务。

```bash
bash install.sh --url https://panel.example.com --reg-token YOUR_TOKEN
```

#### 参数

**认证（必填，二选一）**：

| 参数                  | 说明                                                           |
| --------------------- | -------------------------------------------------------------- |
| `--reg-token <TOKEN>` | 全局安装密钥。Agent 启动后向控制端自动注册，需管理员审批后上线 |
| `--token <TOKEN>`     | 专属通信 Token。由管理员在面板中预创建，安装后直接上线         |

**连接（必填）**：

| 参数          | 说明                                            |
| ------------- | ----------------------------------------------- |
| `--url <URL>` | 控制端 API 地址，如 `https://panel.example.com` |

**可选参数**：

| 参数                   | 说明                                                                                        | 默认值                   |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| `--name <NAME>`        | 服务器在面板中的显示名称                                                                    | 系统主机名               |
| `--interval <SEC>`     | 数据上报间隔（秒）                                                                          | `2`                      |
| `--enable-ssh`         | 启用 Web SSH 隧道功能                                                                       | 关闭                     |
| `--setup-ca`           | 配置 SSH CA 免密登录。需要 root 权限且必须同时指定 `--enable-ssh`                           | 关闭                     |
| `--force`              | 强制重新注册，覆盖已有的 `uuid` / `token`                                                   | 关闭                     |
| `--no-auto-update`     | 禁用自动版本检查更新                                                                        | 关闭（默认开启自动更新） |
| `--proxy-download`     | 通过面板代理端点下载二进制，适用于目标机器无法直连 GitHub 的场景                            | 关闭                     |
| `--nic-whitelist <RE>` | 网卡白名单，逗号分隔正则表达式。设置后仅采集匹配的网卡                                      | 空                       |
| `--nic-blacklist <RE>` | 网卡黑名单，逗号分隔正则表达式。留空使用[内置默认黑名单](./configuration.md#内置默认黑名单) | 空                       |
| `--install-dir <DIR>`  | 二进制文件安装目录                                                                          | `/usr/local/bin`         |
| `--config-dir <DIR>`   | 配置文件存放目录                                                                            | `/etc/collei-agent`      |
| `--version <VER>`      | 指定安装版本号（如 `v0.1.0`）                                                               | `latest`                 |

#### 示例

**最简安装**（自动注册）：

```bash
bash install.sh --url https://panel.example.com --reg-token YOUR_TOKEN
```

**完整功能安装**：

```bash
bash install.sh \
  --url https://panel.example.com \
  --reg-token YOUR_TOKEN \
  --name prod-web-01 \
  --interval 3 \
  --enable-ssh \
  --setup-ca \
  --nic-blacklist "^docker,^veth,^br-,^wg,^tailscale"
```

**被动注册**（使用预创建的 Token）：

```bash
bash install.sh --url https://panel.example.com --token SERVER_SPECIFIC_TOKEN
```

**无法访问 GitHub 时通过面板代理下载**：

```bash
bash install.sh \
  --url https://panel.example.com \
  --reg-token YOUR_TOKEN \
  --proxy-download
```

**自定义安装路径**：

```bash
bash install.sh \
  --url https://panel.example.com \
  --reg-token YOUR_TOKEN \
  --install-dir /opt/collei/bin \
  --config-dir /opt/collei/etc
```

#### 安装流程

脚本执行的完整步骤：

1. 检测系统架构（amd64 / arm64）
2. 下载对应平台的二进制文件到安装目录
3. 如果指定了 `--reg-token`，调用控制端 API 注册并获取 `uuid` + `token`
4. 生成 `agent.yaml` 配置文件
5. 如果指定了 `--setup-ca`，从控制端获取 CA 公钥并配置 sshd
6. 创建 systemd 服务单元文件并启用开机自启
7. 启动 Agent 服务

---

### update — 更新

将已安装的 Agent 更新到最新或指定版本。不改变现有配置。

```bash
bash install.sh update
```

#### 参数

| 参数                  | 说明                                       | 默认值   |
| --------------------- | ------------------------------------------ | -------- |
| `--version <VER>`     | 指定目标版本号                             | `latest` |
| `--install-dir <DIR>` | 二进制安装目录（未改过安装路径则无需指定） | 自动检测 |
| `--proxy-download`    | 通过面板代理下载                           | 关闭     |

#### 示例

```bash
# 更新到最新版本
bash install.sh update

# 更新到指定版本
bash install.sh update --version v0.2.0

# 通过面板代理更新
bash install.sh update --proxy-download
```

#### 更新流程

1. 检测当前已安装的版本
2. 从 GitHub（或面板代理）获取目标版本
3. 如果目标版本与当前版本相同则跳过
4. 下载新版本二进制到临时目录
5. 停止服务 → 替换二进制 → 重启服务

---

### update-ca — 更新 CA 公钥

在 SSH CA 密钥轮换时使用，从控制端拉取最新的 CA 公钥并更新本地 sshd 配置。

:::info
需要 root 权限。仅在已配置 SSH CA（`--setup-ca`）的服务器上使用。
:::

```bash
bash install.sh update-ca
```

#### 参数

| 参数              | 说明                   | 默认值   |
| ----------------- | ---------------------- | -------- |
| `--config <PATH>` | 指定 `agent.yaml` 路径 | 自动检测 |

#### 更新流程

1. 读取 `agent.yaml` 中的 `server_url`
2. 同步系统时钟（CA 证书验证依赖准确时钟）
3. 从控制端获取当前 CA 公钥和过渡期旧公钥
4. 写入 `/etc/ssh/collei-ca.pub`（过渡期会同时写入新旧公钥）
5. 校验 sshd 配置
6. 重载 sshd 服务

---

### uninstall — 卸载

完全移除 Agent 及其所有配置。

```bash
bash install.sh uninstall
```

#### 参数

| 参数                  | 说明           | 默认值   |
| --------------------- | -------------- | -------- |
| `--install-dir <DIR>` | 二进制安装目录 | 自动检测 |
| `--config-dir <DIR>`  | 配置文件目录   | 自动检测 |

#### 卸载流程

1. 停止并禁用 systemd 服务
2. 删除服务单元文件
3. 删除二进制文件
4. 删除配置目录（包含 `agent.yaml`、`net_state.json` 等）
5. 清除 sshd 中的 CA 配置片段（如有）
6. 重载 sshd 服务（如有改动）

---

### 通用参数

| 参数           | 说明         |
| -------------- | ------------ |
| `-h`, `--help` | 显示帮助信息 |

---

## install.ps1（Windows）

### 获取方式

以 **管理员身份** 打开 PowerShell：

```powershell
# 方式 1：一键远程执行
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.ps1 -OutFile $env:TEMP\ci.ps1; & $env:TEMP\ci.ps1 -Url 'https://panel.example.com' -RegToken 'YOUR_TOKEN'; Remove-Item $env:TEMP\ci.ps1"

# 方式 2：下载后执行
Invoke-WebRequest -Uri https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.ps1 -OutFile install.ps1
.\install.ps1 [子命令] [参数...]
```

:::info 权限说明

- **管理员模式**：自动注册为 Windows 服务（开机自启、故障自恢复），安装到 `Program Files`
- **普通用户模式**：安装到用户目录，不注册服务，需要手动启动
  :::

### 子命令

| 子命令            | 说明                             |
| ----------------- | -------------------------------- |
| `install`（默认） | 安装 Agent 并注册为 Windows 服务 |
| `update`          | 更新 Agent 到最新或指定版本      |
| `update-ca`       | 更新 SSH CA 公钥（密钥轮换场景） |
| `uninstall`       | 卸载 Agent 并清理配置            |

不指定子命令时默认为 `install`。

---

### install — 安装

```powershell
.\install.ps1 -Url https://panel.example.com -RegToken YOUR_TOKEN
```

#### 参数

**认证（必填，二选一）**：

| 参数                | 说明                                                           |
| ------------------- | -------------------------------------------------------------- |
| `-RegToken <TOKEN>` | 全局安装密钥。Agent 启动后向控制端自动注册，需管理员审批后上线 |
| `-Token <TOKEN>`    | 专属通信 Token。由管理员在面板中预创建，安装后直接上线         |

**连接（必填）**：

| 参数         | 说明                                            |
| ------------ | ----------------------------------------------- |
| `-Url <URL>` | 控制端 API 地址，如 `https://panel.example.com` |

**可选参数**：

| 参数                   | 说明                                      | 默认值                                                                           |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `-Name <NAME>`         | 服务器在面板中的显示名称                  | 系统主机名                                                                       |
| `-Interval <SEC>`      | 数据上报间隔（秒）                        | `3`                                                                              |
| `-EnableTerminal`      | 启用 Web 终端（ConPTY 直连）              | 关闭                                                                             |
| `-EnableFileApi`       | 启用 Web 文件管理 API                     | 关闭                                                                             |
| `-Force`               | 强制重新注册，覆盖已有的 `uuid` / `token` | 关闭                                                                             |
| `-NoAutoUpdate`        | 禁用自动版本检查更新                      | 关闭（默认开启自动更新）                                                         |
| `-ProxyDownload`       | 通过面板代理端点下载二进制                | 关闭                                                                             |
| `-NicWhitelist <RE[]>` | 网卡白名单（字符串数组，正则表达式）      | 空                                                                               |
| `-NicBlacklist <RE[]>` | 网卡黑名单（字符串数组，正则表达式）      | [内置默认黑名单](./configuration.md#内置默认黑名单)                              |
| `-InstallDir <DIR>`    | 二进制文件安装目录                        | 管理员: `C:\Program Files\collei-agent`；普通用户: `%LOCALAPPDATA%\collei-agent` |
| `-ConfigDir <DIR>`     | 配置文件存放目录                          | 管理员: `C:\ProgramData\collei-agent`；普通用户: `%APPDATA%\collei-agent`        |
| `-Version <VER>`       | 指定安装版本号（如 `v0.1.0`）             | `latest`                                                                         |

#### 示例

**最简安装**：

```powershell
.\install.ps1 -Url https://panel.example.com -RegToken YOUR_TOKEN
```

**完整功能安装**：

```powershell
.\install.ps1 `
  -Url https://panel.example.com `
  -RegToken YOUR_TOKEN `
  -Name "prod-web-01" `
  -Interval 3 `
  -EnableTerminal `
  -EnableFileApi `
  -NicBlacklist @("^vEthernet", "^Hyper-V", "^docker")
```

**被动注册**：

```powershell
.\install.ps1 -Url https://panel.example.com -Token SERVER_SPECIFIC_TOKEN
```

**通过面板代理下载**：

```powershell
.\install.ps1 -Url https://panel.example.com -RegToken YOUR_TOKEN -ProxyDownload
```

#### 安装流程

1. 检测系统架构（amd64 / arm64）
2. 下载对应平台的 `.exe` 文件到安装目录
3. 如果指定了 `-RegToken`，调用控制端 API 注册并获取 `uuid` + `token`
4. 生成 `agent.yaml` 配置文件
5. 添加安装目录到系统 PATH
6. 管理员模式下：注册 Windows 服务（自动启动、故障重启）并启动

---

### update — 更新

```powershell
.\install.ps1 update
```

#### 参数

| 参数                | 说明             | 默认值   |
| ------------------- | ---------------- | -------- |
| `-Version <VER>`    | 指定目标版本号   | `latest` |
| `-InstallDir <DIR>` | 二进制安装目录   | 自动检测 |
| `-ProxyDownload`    | 通过面板代理下载 | 关闭     |

#### 示例

```powershell
# 更新到最新版本
.\install.ps1 update

# 更新到指定版本
.\install.ps1 update -Version v0.2.0
```

---

### update-ca — 更新 CA 公钥

在 SSH CA 密钥轮换时使用，从控制端拉取最新的 CA 公钥并更新本地文件。

:::info
需要管理员权限。
:::

```powershell
.\install.ps1 update-ca
```

#### 参数

| 参数                 | 说明                   | 默认值   |
| -------------------- | ---------------------- | -------- |
| `-ConfigFile <PATH>` | 指定 `agent.yaml` 路径 | 自动检测 |

#### 示例

```powershell
# 自动检测配置文件路径
.\install.ps1 update-ca

# 手动指定配置文件
.\install.ps1 update-ca -ConfigFile "D:\custom\agent.yaml"
```

#### 更新流程

1. 读取 `agent.yaml` 中的 `server_url`
2. 从控制端获取当前 CA 公钥和过渡期旧公钥
3. 写入 `<配置目录>\ca.pub`（过渡期会同时写入新旧公钥）

---

### uninstall — 卸载

```powershell
.\install.ps1 uninstall
```

#### 参数

| 参数                | 说明           | 默认值   |
| ------------------- | -------------- | -------- |
| `-InstallDir <DIR>` | 二进制安装目录 | 自动检测 |
| `-ConfigDir <DIR>`  | 配置文件目录   | 自动检测 |

#### 卸载流程

1. 停止并删除 Windows 服务
2. 删除安装目录（包含二进制文件）
3. 删除配置目录（包含 `agent.yaml` 等）

---

## Linux 与 Windows 参数对照

| 功能         | Linux (`install.sh`) | Windows (`install.ps1`)       |
| ------------ | -------------------- | ----------------------------- |
| 控制端地址   | `--url`              | `-Url`                        |
| 全局密钥     | `--reg-token`        | `-RegToken`                   |
| 专属 Token   | `--token`            | `-Token`                      |
| 显示名称     | `--name`             | `-Name`                       |
| 上报间隔     | `--interval`         | `-Interval`                   |
| SSH 隧道     | `--enable-ssh`       | —（Windows 使用 ConPTY 终端） |
| SSH CA       | `--setup-ca`         | —                             |
| Web 终端     | —（通过 SSH）        | `-EnableTerminal`             |
| 文件 API     | —（跟随 SSH）        | `-EnableFileApi`              |
| 强制注册     | `--force`            | `-Force`                      |
| 禁用自动更新 | `--no-auto-update`   | `-NoAutoUpdate`               |
| 面板代理     | `--proxy-download`   | `-ProxyDownload`              |
| 网卡白名单   | `--nic-whitelist`    | `-NicWhitelist`               |
| 网卡黑名单   | `--nic-blacklist`    | `-NicBlacklist`               |
| 安装目录     | `--install-dir`      | `-InstallDir`                 |
| 配置目录     | `--config-dir`       | `-ConfigDir`                  |
| 指定版本     | `--version`          | `-Version`                    |
| CA 更新      | `update-ca` 子命令   | `update-ca` 子命令            |
| 帮助         | `-h` / `--help`      | `Get-Help .\install.ps1`      |

:::tip NIC 过滤参数格式差异

- **Linux**：逗号分隔的字符串，如 `--nic-blacklist "^docker,^veth,^br-"`
- **Windows**：PowerShell 字符串数组，如 `-NicBlacklist @("^docker", "^veth", "^br-")`
  :::

---

## 下载策略

脚本默认从 GitHub Releases 直接下载 Agent 二进制文件。

当目标服务器无法访问 GitHub 时，可以通过 `--proxy-download`（Linux）/ `-ProxyDownload`（Windows）启用面板代理下载：

```
目标服务器 → 控制端面板 → GitHub Releases → 控制端面板 → 目标服务器
```

面板代理端点: `GET /api/v1/agent/download?token=TOKEN&url=ENCODED_GITHUB_URL`

:::info
使用面板代理下载时，`--url` / `-Url` 参数指向的面板必须能够访问 GitHub。
:::
