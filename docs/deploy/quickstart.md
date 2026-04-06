---
sidebar_position: 1
slug: /
title: 快速安装
description: 在几分钟内部署 Collei 服务器监控
---

# 快速安装

本页提供最精简的部署步骤，帮助你在几分钟内启动 Collei。如需详细说明，请参阅对应的专题文档。

## 系统要求

| 项目     | 最低要求                   |
| -------- | -------------------------- |
| 内存     | 512 MB                     |
| 磁盘     | 200 MB 可用空间            |
| 网络     | 能访问 GitHub / Docker Hub |

## 方式一：Docker（推荐）

> 适用于已安装 Docker 和 Docker Compose 的服务器。

```bash
# 创建目录
mkdir collei && cd collei

# 下载 compose 文件
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei/master/docker-compose.yml \
  -o docker-compose.yml

# 启动
docker compose up -d
```

查看管理员密码：

```bash
docker compose logs collei | grep "密码"
```

访问 `http://<服务器IP>:22333` 即可使用。

> 详细配置请参阅 [Docker 部署](deploy/docker)。

## 方式二：裸机部署

> 适用于使用 systemd 的 Linux 发行版（Ubuntu、Debian、CentOS、RHEL 等）。

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei/master/deploy.sh \
  -o deploy.sh
sudo bash deploy.sh
```

脚本将自动完成所有步骤（安装依赖 → 拉取代码 → 创建虚拟环境 → 下载前端 → 配置 systemd），部署完成后会打印访问地址和管理员密码。

> 详细配置请参阅 [裸机安装](deploy/bare-metal)。

## 首次登录

1. 打开浏览器访问 `http://<服务器IP>:22333`
2. 使用管理员账号登录：
   - 用户名：`admin`（默认）
   - 密码：部署日志中显示的密码
3. **登录后请立即修改默认密码**

## 更进一步

- [Docker 部署](deploy/docker) — 自定义端口、版本、环境变量
- [裸机安装](deploy/bare-metal) — 自定义安装目录、数据目录
- [手动编译](deploy/build) — 从源码构建 Docker 镜像
- [更新](deploy/upgrade) — 升级到新版本
