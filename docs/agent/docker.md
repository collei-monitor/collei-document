---
sidebar_position: 4
title: Docker 部署 Agent
description: 使用 Docker 容器化部署 Collei Agent
---

# Docker 部署 Agent

对于不希望在宿主机直接运行二进制的用户，Collei 提供 Docker 容器化部署方式。容器以最小权限运行，通过只读挂载宿主机 `/proc`、`/sys` 采集真实主机指标。

:::caution 功能限制
Docker 模式下，Web SSH、终端直连、文件管理和自动升级功能不可用。如需这些功能，请使用[脚本安装](./install.md)。
:::

## 功能对比

| 功能                 | 脚本安装 | Docker |
| -------------------- | -------- | ------ |
| 系统指标采集         | ✅       | ✅     |
| 网络探测（ICMP/TCP） | ✅       | ✅     |
| Web SSH 隧道         | ✅       | ❌     |
| 终端直连             | ✅       | ❌     |
| 文件管理             | ✅       | ❌     |
| 远程任务执行         | ✅       | ❌     |
| 自动升级             | ✅       | ❌     |

---

## 快速开始

### 1. 创建 docker-compose.yml

```yaml
services:
  collei-agent:
    image: ghcr.io/collei-monitor/collei-agent:latest
    container_name: collei-agent
    restart: unless-stopped
    network_mode: host
    pid: host
    read_only: true
    cap_add:
      - NET_RAW
    tmpfs:
      - /tmp
    volumes:
      - collei-config:/etc/collei-agent
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc/os-release:/host/etc/os-release:ro
    environment:
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - HOST_ETC=/host/etc
      - COLLEI_URL=${COLLEI_URL}
      - COLLEI_REG_TOKEN=${COLLEI_REG_TOKEN:-}
      - COLLEI_TOKEN=${COLLEI_TOKEN:-}

volumes:
  collei-config:
```

### 2. 配置环境变量

在同目录创建 `.env` 文件：

```env
COLLEI_URL=https://your-panel.example.com
COLLEI_REG_TOKEN=your_registration_token
```

或使用被动注册模式：

```env
COLLEI_URL=https://your-panel.example.com
COLLEI_TOKEN=your_server_token
```

:::info
`COLLEI_REG_TOKEN` 和 `COLLEI_TOKEN` 二选一，不能同时提供。
:::

### 3. 启动

```bash
docker compose up -d
```

### 4. 验证

```bash
docker compose logs -f
```

正常启动后应看到注册和上报日志。在控制端面板中也能看到新注册的服务器`上线`或处于`待审批`状态。

---

## 环境变量

| 变量               | 必填   | 说明                             |
| ------------------ | ------ | -------------------------------- |
| `COLLEI_URL`       | 是     | 控制端 API 地址                  |
| `COLLEI_REG_TOKEN` | 二选一 | 全局安装密钥（自动注册模式）     |
| `COLLEI_TOKEN`     | 二选一 | 服务器专属 Token（被动注册模式） |
| `COLLEI_NAME`      | 否     | 服务器显示名称                   |

---

## 自定义参数

通过 `command` 覆盖默认参数：

```yaml
services:
  collei-agent:
    image: ghcr.io/collei-monitor/collei-agent:latest
    # highlight-next-line
    command: ["--interval", "5"]
    # ... 其余配置不变
```

:::tip
推荐通过环境变量配置（`COLLEI_URL`、`COLLEI_REG_TOKEN`、`COLLEI_NAME`），无需使用 `command` 覆盖。
:::

支持的参数与 CLI 一致，详见 [CLI 参数](./install.md#cli-参数)。

---

## 升级

Docker 模式下自动升级已禁用，通过拉取新镜像升级：

```bash
docker compose pull
docker compose up -d
```

已注册的 UUID 和 Token 存储在 `collei-config` 持久化卷中，重建容器不会丢失注册信息。

:::tip
如果后端下发了升级任务，Agent 会自动拒绝并上报 "Running in container"。这是预期行为。
:::

---

## 本地构建

如果需要从源码构建镜像：

```bash
git clone https://github.com/collei-monitor/collei-agent.git
cd collei-agent

# 构建
docker build -t collei-agent:latest .

# 指定版本号
docker build --build-arg VERSION=v1.0.0 -t collei-agent:v1.0.0 .
```

然后将 `docker-compose.yml` 中的 `image` 替换为 `build: .`。

---

## 配置解释

| 配置项                            | 用途                                               |
| --------------------------------- | -------------------------------------------------- |
| `network_mode: host`              | 共享宿主机网络命名空间，获取真实网卡列表和流量数据 |
| `pid: host`                       | 共享宿主机 PID 命名空间，使进程数统计反映宿主机    |
| `read_only: true`                 | 容器文件系统只读，仅 `/tmp` 和配置卷可写           |
| `cap_add: [NET_RAW]`              | 允许发送 ICMP 报文（网络探测所需）                 |
| `HOST_PROC`/`HOST_SYS`/`HOST_ETC` | 让 gopsutil 读取宿主机的 `/proc`、`/sys`、`/etc`   |

---

## 安全说明

- **非 root 运行** — 容器内进程以 uid 10001 运行
- **只读文件系统** — `read_only: true`，防止容器内文件被篡改
- **只读宿主机挂载** — `/proc`、`/sys`、`/etc/os-release` 均以 `:ro` 挂载
- **最小权限** — 仅添加 `NET_RAW`，不使用 `privileged`
- **无交互功能** — SSH/终端/文件管理均禁用，容器不具备操控宿主机的能力

---

## 故障排查

### 注册失败

```bash
docker compose logs collei-agent | grep -i "register\|verify\|error"
```

检查 `COLLEI_URL` 是否可达、Token 是否正确、DNS 是否正常。

### 指标不准确

确认宿主机目录挂载和环境变量：

```bash
docker exec collei-agent env | grep HOST_
# 应输出: HOST_PROC=/host/proc  HOST_SYS=/host/sys  HOST_ETC=/host/etc
```

### ICMP 探测失败

确认 `NET_RAW` 权限已添加：

```bash
docker inspect collei-agent --format '{{.HostConfig.CapAdd}}'
# 应输出: [NET_RAW]
```

### 调试模式

```yaml
services:
  collei-agent:
    command: ["--debug"]
```
