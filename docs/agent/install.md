---
sidebar_position: 1
title: 安装与卸载
description: 在被监控服务器上安装、更新和卸载 Collei Agent
---

# 安装与卸载

Collei Agent 是部署在被监控服务器上的轻量级探针程序，负责采集系统指标并上报至控制端。

支持 Linux（amd64 / arm64）和 Windows（amd64 / arm64）。

---

## Linux — 一键脚本

:::tip 推荐
脚本会自动完成下载二进制、生成配置、创建 systemd 服务的全部流程。
:::

**自动注册模式**（使用全局安装密钥）：

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | \
  bash -s -- --url https://panel.example.com --reg-token YOUR_TOKEN
```

**被动注册模式**（使用管理员下发的专属 Token）：

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | \
  bash -s -- --url https://panel.example.com --token YOUR_TOKEN
```

**完整参数示例**：

```bash
bash install.sh \
  --url https://panel.example.com \
  --reg-token YOUR_TOKEN \
  --name my-server-01 \
  --interval 3 \
  --enable-ssh \
  --setup-ca \
  --nic-blacklist "^docker,^veth,^br-"
```

### 安装参数

| 参数                   | 说明                                             | 默认值                                                           |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| `--url <URL>`          | 控制端 API 地址（**必填**）                      | —                                                                |
| `--reg-token <TOKEN>`  | 全局安装密钥（与 `--token` 二选一）              | —                                                                |
| `--token <TOKEN>`      | 专属通信 Token（与 `--reg-token` 二选一）        | —                                                                |
| `--name <NAME>`        | 服务器显示名称                                   | 系统主机名                                                       |
| `--interval <SEC>`     | 上报间隔（秒）                                   | `3`                                                              |
| `--enable-ssh`         | 启用 Web SSH 隧道                                | 关闭                                                             |
| `--setup-ca`           | 配置 SSH CA 免密登录（需 root + `--enable-ssh`） | 关闭                                                             |
| `--force`              | 强制重新注册（覆盖已有配置）                     | 关闭                                                             |
| `--no-auto-update`     | 禁用自动版本检查更新                             | 开启                                                             |
| `--proxy-download`     | 通过面板代理下载二进制（无法访问 GitHub 时使用） | 关闭                                                             |
| `--nic-whitelist <RE>` | 网卡白名单（逗号分隔正则）                       | —                                                                |
| `--nic-blacklist <RE>` | 网卡黑名单（逗号分隔正则）                       | 内置默认，详细见[配置文件](./configuration.md####内置默认黑名单) |
| `--install-dir <DIR>`  | 二进制安装目录                                   | `/usr/local/bin`                                                 |
| `--config-dir <DIR>`   | 配置文件目录                                     | `/etc/collei-agent`                                              |
| `--version <VER>`      | 指定版本号（如 `v0.1.0`）                        | `latest`                                                         |

---

## Windows — PowerShell 脚本

以**管理员身份**打开 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.ps1 -OutFile $env:TEMP\ci.ps1; & $env:TEMP\ci.ps1 -Url 'https://panel.example.com' -RegToken 'YOUR_TOKEN'; Remove-Item $env:TEMP\ci.ps1"
```

或下载 `install.ps1` 后执行：

```powershell
.\install.ps1 -Url https://panel.example.com -RegToken YOUR_TOKEN -EnableTerminal -EnableFileApi
```

### PowerShell 参数

| 参数              | 说明                                    | 默认值                                                           |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `-Url`            | 控制端 API 地址（**必填**）             | —                                                                |
| `-RegToken`       | 全局安装密钥（与 `-Token` 二选一）      | —                                                                |
| `-Token`          | 专属通信 Token（与 `-RegToken` 二选一） | —                                                                |
| `-Name`           | 服务器显示名称                          | 系统主机名                                                       |
| `-Interval`       | 上报间隔（秒）                          | `3`                                                              |
| `-EnableTerminal` | 启用 Web 终端（ConPTY）                 | 关闭                                                             |
| `-EnableFileApi`  | 启用文件管理 API                        | 关闭                                                             |
| `-Force`          | 强制重新注册                            | 关闭                                                             |
| `-NoAutoUpdate`   | 禁用自动版本检查更新                    | 开启                                                             |
| `-ProxyDownload`  | 通过面板代理下载二进制                  | 关闭                                                             |
| `-NicWhitelist`   | 网卡白名单（字符串数组，正则）          | —                                                                |
| `-NicBlacklist`   | 网卡黑名单（字符串数组，正则）          | 内置默认，详细见[配置文件](./configuration.md####内置默认黑名单) |
| `-InstallDir`     | 安装目录                                | `C:\Program Files\collei-agent`                                  |
| `-ConfigDir`      | 配置目录                                | `C:\ProgramData\collei-agent`                                    |
| `-Version`        | 指定版本号                              | `latest`                                                         |

---

## 手动安装

如果你希望完全手动控制安装过程：

1. 从 [GitHub Releases](https://github.com/collei-monitor/collei-agent/releases) 下载对应平台的二进制文件
2. 手动创建配置文件（参见 [配置文件](./configuration.md)）
3. 启动 Agent：

```bash
collei-agent run --config /path/to/agent.yaml --reg-token YOUR_TOKEN
```

---

## 更新

:::tip
一般情况下，Agent 会自动检查更新并在面板的审计日志中提示Agent已经升级的版本，或者在`远程执行`中使用下发`升级 Agent`命令的方式触发Agent更新。
:::

### Linux

```bash
# 更新到最新版本
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | \
  bash -s -- update

# 更新到指定版本
bash install.sh update --version v0.1.0

# 通过面板代理更新（无法访问 GitHub 时）
bash install.sh update --proxy-download
```

### Windows

```powershell
# 更新到最新版本
.\install.ps1 update

# 更新到指定版本
.\install.ps1 update -Version v0.1.0
```

### 自动更新

Agent 默认开启自动更新（`auto_update: true`），会定期检查新版本并自动升级。可通过以下方式禁用：

- 安装时：`--no-auto-update`（Linux）/ `-NoAutoUpdate`（Windows）
- 配置文件：设置 `auto_update: false`

---

## 卸载

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei-agent/main/install.sh | \
  bash -s -- uninstall
```

卸载脚本会自动完成：

1. 停止并移除 systemd 服务
2. 删除二进制文件
3. 删除配置目录
4. 清除 SSH CA 配置（如有）

### Windows

```powershell
.\install.ps1 uninstall
```

卸载脚本会自动完成：

1. 停止并删除 Windows 服务
2. 删除安装目录
3. 删除配置目录

---

## CLI 参数

Agent 的运行时参数（通过命令行传入，不写入配置文件）：

```bash
collei-agent run [FLAGS]
```

| 参数                  | 说明                                   | 默认值       |
| --------------------- | -------------------------------------- | ------------ |
| `--config <PATH>`     | 配置文件路径                           | 平台默认路径 |
| `--url <URL>`         | 控制端地址（覆盖配置文件）             | —            |
| `--token <TOKEN>`     | 专属 Token（覆盖配置文件）             | —            |
| `--reg-token <TOKEN>` | 全局安装密钥（仅注册时使用，不持久化） | —            |
| `--name <NAME>`       | 服务器显示名称                         | 系统主机名   |
| `--interval <SEC>`    | 上报间隔（秒）                         | `3`          |
| `--force`             | 强制重新注册                           | `false`      |
| `--no-auto-update`    | 禁用自动更新                           | `false`      |
| `-v, --verbose`       | 详细日志                               | `false`      |
| `--debug`             | 调试日志                               | `false`      |

:::tip
CLI 参数优先级高于配置文件。安装脚本生成的 systemd / Windows 服务已包含必要的 CLI 参数，通常无需手动调整。
:::

---

## 目录结构

### Linux (root)

```
/usr/local/bin/collei-agent          # 二进制文件
/etc/collei-agent/
├── agent.yaml                       # 配置文件
├── net_state.json                   # 网络计数器持久化
└── collei-ca.pub                    # CA 公钥（如已配置）
```

### Windows (管理员)

```
C:\Program Files\collei-agent\
└── collei-agent.exe                 # 二进制文件

C:\ProgramData\collei-agent\
├── agent.yaml                       # 配置文件
├── net_state.json                   # 网络计数器持久化
└── ca.pub                           # CA 公钥（如已配置）
```
