---
sidebar_position: 1
title: Docker 部署
description: 使用 Docker Compose 一键部署 Collei
---

# Docker 部署

使用 Docker 是部署 Collei 最简单的方式！ 

## 前置条件

- Docker Engine 20.10+
- Docker Compose V2（`docker compose` 命令）

## 基础部署

```bash
# 创建工作目录
mkdir collei && cd collei

# 下载 compose 文件
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei/master/docker-compose.yml \
  -o docker-compose.yml

# 启动容器
docker compose up -d
```

首次启动时，容器会自动：

1. 复制内置 GeoIP 数据库到数据卷
2. 生成 `SECRET_KEY` 和 `CA_MASTER_KEY` 并持久化到 `/data/.secrets`
3. 执行数据库迁移
4. 创建默认管理员账号（密码输出到日志）

查看管理员密码：

```bash
docker compose logs collei | grep "密码"
```

## 自定义配置

所有自定义通过 `.env` 文件完成（与 `docker-compose.yml` 同目录），无需修改 compose 文件本身。

```bash
cat > .env <<'EOF'
# 指定镜像版本（默认 latest）
# COLLEI_VERSION=0.1.0

# 修改端口映射（默认 22333）
# COLLEI_PORT=8080

# 应用配置
# COLLEI_DEBUG=false
# COLLEI_DEFAULT_ADMIN_USERNAME=admin
# COLLEI_DEFAULT_ADMIN_PASSWORD=your-password
# COLLEI_APP_NAME=Collei
EOF
```

修改后重新创建容器：

```bash
docker compose up -d
```

## 环境变量

| 变量                                 | 默认值                                | 说明                                      |
| ------------------------------------ | ------------------------------------- | ----------------------------------------- |
| `COLLEI_VERSION`                     | `latest`                              | Docker 镜像版本（compose 变量）           |
| `COLLEI_PORT`                        | `22333`                               | 宿主机映射端口（compose 变量）            |
| `COLLEI_SECRET_KEY`                  | _自动生成_                            | JWT 签名密钥，留空则自动生成并持久化      |
| `COLLEI_CA_MASTER_KEY`               | _自动生成_                            | SSH CA 加密主密钥，留空则自动生成并持久化 |
| `COLLEI_DATABASE_URL`                | `sqlite+aiosqlite:////data/collei.db` | 数据库连接字符串                          |
| `COLLEI_DATA_DIR`                    | `/data`                               | 容器内数据目录                            |
| `COLLEI_DEBUG`                       | `false`                               | 调试模式（启用 `/docs` API 文档）         |
| `COLLEI_DEFAULT_ADMIN_USERNAME`      | `admin`                               | 初始管理员用户名，默认为 `admin`          |
| `COLLEI_DEFAULT_ADMIN_PASSWORD`      | _自动生成_                            | 初始管理员密码，留空则随机生成            |
| `COLLEI_TRUSTED_PROXIES`             | `*`                                   | 可信反代 IP，逗号分隔；`*` 信任所有       |
| `COLLEI_COOKIE_SECURE`               | `true`                                | Cookie 仅通过 HTTPS 发送                  |
| `COLLEI_COOKIE_SAMESITE`             | `lax`                                 | Cookie SameSite 策略                      |
| `COLLEI_ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                                | Token 有效期（分钟）                      |
| `COLLEI_SESSION_EXPIRE_DAYS`         | `7`                                   | 会话有效期（天）                          |
| `COLLEI_LOGIN_ATTEMPT_LIMIT`         | `10`                                  | 登录失败次数上限                          |
| `COLLEI_LOGIN_ATTEMPT_WINDOW`        | `600`                                 | 登录失败统计窗口（秒）                    |

## 数据持久化

容器使用 Docker 命名卷 `collei-data` 挂载到 `/data`，其中包含：

| 文件 / 目录    | 说明                            |
| -------------- | ------------------------------- |
| `collei.db`    | SQLite 数据库                   |
| `.secrets`     | 自动生成的密钥文件（chmod 600） |
| `*.mmdb`       | GeoIP 数据库                    |
| `themes/`      | 自定义展示页主题                |
| `ssh_ca_key.*` | SSH CA 密钥对                   |

:::tip 手动备份
只需备份整个 `collei-data` 卷即可：

```bash
docker run --rm \
  -v collei_collei-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/collei-backup.tar.gz -C /data .
```

:::

## 安全特性

Docker 部署默认启用以下安全加固：

| 特性                             | 说明                                          |
| -------------------------------- | --------------------------------------------- |
| 非 root 运行                     | 应用以 `collei` 用户（uid 1000）运行          |
| `read_only: true`                | 容器文件系统只读，仅 `/data` 卷和 `/tmp` 可写 |
| `cap_drop: ALL`                  | 丢弃所有 Linux capabilities                   |
| `cap_add: CHOWN, SETUID, SETGID` | 仅保留 chown + su-exec 降权所需最小权限       |
| `no-new-privileges`              | 阻止 suid/sgid 提权                           |

## 反向代理 {#反向代理}

生产环境强烈建议使用反向代理提供 HTTPS。

### Nginx

```nginx
upstream collei {
    server 127.0.0.1:22333;
}

server {
    listen 443 ssl http2;
    server_name monitor.example.com;

    ssl_certificate     /etc/letsencrypt/live/monitor.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.example.com/privkey.pem;

    # WebSocket（SSH 终端、实时监控）
    location ~ ^/(api/v1/ws|ws)/ {
        proxy_pass http://collei;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
    }

    # API + 前端
    location / {
        proxy_pass http://collei;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name monitor.example.com;
    return 301 https://$host$request_uri;
}
```

### Caddy

```
monitor.example.com {
    reverse_proxy localhost:22333
}
```

> Caddy 自动处理 HTTPS 证书和 WebSocket 升级，无需额外配置。

配置反向代理后，设置环境变量：

```bash
# .env
COLLEI_TRUSTED_PROXIES=127.0.0.1
COLLEI_COOKIE_SECURE=true
```

## CLI 管理工具

在容器内可以使用 `collei` CLI 进行管理操作：

```bash
# 重置管理员密码
docker compose exec collei collei passwd

# 指定用户名和密码
docker compose exec collei collei passwd --username admin --password new-password

# 关闭用户的两步验证
docker compose exec collei collei disable-2fa --username admin
```

## 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f collei

# 重启
docker compose restart

# 停止
docker compose down

# 停止并删除数据卷（⚠️ 数据将丢失）
docker compose down -v
```
