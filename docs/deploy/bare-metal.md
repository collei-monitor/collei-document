---
sidebar_position: 2
title: 裸机安装
description: 在 Linux 服务器上直接部署 Collei，使用 systemd 管理服务
---

# 裸机安装

直接在 Linux 服务器上部署 Collei，使用 systemd 管理服务。部署脚本基于 [UV](https://docs.astral.sh/uv/) 作为 Python 包管理器，自动完成所有配置。

## 前置条件

| 项目 | 要求 |
|------|------|
| 操作系统 | 使用 systemd 的 Linux 发行版（Ubuntu 20+、Debian 11+、CentOS 8+、RHEL 8+ 等） |
| 权限 | root（脚本需安装系统包和创建 systemd 服务） |
| 网络 | 可访问 GitHub（拉取代码和前端发布包） |

> 脚本会自动安装 `git`、`curl` 和 `UV`，无需手动准备。

## 一键部署

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei/master/deploy.sh \
  -o deploy.sh
sudo bash deploy.sh
```

脚本会依次执行以下步骤：

1. **检测系统环境** — 识别架构、发行版和包管理器
2. **安装 UV** — Python 包管理器
3. **克隆后端代码** — 从 GitHub 拉取到安装目录
4. **创建虚拟环境** — 使用 Python 3.12，安装所有依赖
5. **下载前端** — 从 GitHub Releases 下载预构建前端
6. **配置数据目录与密钥** — 生成 `SECRET_KEY`、`CA_MASTER_KEY`，复制 GeoIP 数据
7. **数据库迁移** — 执行 `alembic upgrade head`
8. **配置 systemd 服务** — 创建、启用并启动 `collei.service`

部署完成后，脚本会打印：

```
════════════════════════════════════════════════════
  Collei 部署完成！
════════════════════════════════════════════════════

  访问地址:   http://<服务器IP>:22333
  安装目录:   /opt/collei
  数据目录:   /var/lib/collei
  密钥文件:   /var/lib/collei/.secrets
  配置文件:   /opt/collei/.env
```

## 自定义参数

```bash
sudo bash deploy.sh \
  --install-dir /opt/collei \
  --data-dir /var/lib/collei \
  --port 22333 \
  --frontend-version v0.0.1
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--install-dir` | `/opt/collei` | 应用安装目录（后端代码 + 虚拟环境） |
| `--data-dir` | `/var/lib/collei` | 数据持久化目录（数据库、密钥、GeoIP） |
| `--port` | `22333` | HTTP 监听端口 |
| `--frontend-version` | `latest` | 前端版本号（如 `v0.0.1`） |
| `--skip-systemd` | — | 跳过 systemd 服务配置 |

## 目录结构

部署完成后的文件布局：

```
/opt/collei/                  # 安装目录（--install-dir）
├── .env                      # 环境变量配置文件
├── .venv/                    # Python 虚拟环境
├── main.py                   # 应用入口
├── app/                      # 后端源码
├── alembic/                  # 数据库迁移
├── frontend/dist/            # 前端构建产物
└── data/                     # 内置数据文件

/var/lib/collei/              # 数据目录（--data-dir）
├── collei.db                 # SQLite 数据库
├── .secrets                  # 密钥文件（chmod 600）
├── *.mmdb                    # GeoIP 数据库
├── themes/                   # 自定义主题
└── ssh_ca_key.*              # SSH CA 密钥对
```

## 环境变量

配置文件位于 `<install-dir>/.env`，所有变量以 `COLLEI_` 为前缀：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COLLEI_SECRET_KEY` | *自动生成* | JWT 签名密钥 |
| `COLLEI_CA_MASTER_KEY` | *自动生成* | SSH CA 加密主密钥 |
| `COLLEI_DATABASE_URL` | `sqlite+aiosqlite:///<data-dir>/collei.db` | 数据库连接字符串 |
| `COLLEI_DATA_DIR` | `<data-dir>` | 数据目录路径 |
| `COLLEI_DEBUG` | `false` | 调试模式 |
| `COLLEI_DEFAULT_ADMIN_USERNAME` | `admin` | 初始管理员用户名 |
| `COLLEI_DEFAULT_ADMIN_PASSWORD` | *自动生成* | 初始管理员密码 |
| `COLLEI_COOKIE_SECURE` | `false` | Cookie 是否仅通过 HTTPS 发送 |
| `COLLEI_TRUSTED_PROXIES` | `127.0.0.1` | 可信反代 IP |
| `COLLEI_ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token 有效期（分钟） |
| `COLLEI_SESSION_EXPIRE_DAYS` | `7` | 会话有效期（天） |

:::info
修改 `.env` 后需重启服务：`sudo systemctl restart collei`
:::

## systemd 服务

脚本自动创建 `/etc/systemd/system/collei.service`，内容如下：

```ini
[Unit]
Description=Collei Server Monitor
After=network.target

[Service]
Type=exec
WorkingDirectory=/opt/collei
EnvironmentFile=/opt/collei/.env
ExecStart=/opt/collei/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 22333 --workers 1
Restart=always
RestartSec=5

# 安全加固
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/collei
ReadWritePaths=/opt/collei
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

常用管理命令：

```bash
# 查看状态
sudo systemctl status collei

# 启动 / 停止 / 重启
sudo systemctl start collei
sudo systemctl stop collei
sudo systemctl restart collei

# 查看日志
sudo journalctl -u collei -f

# 查看最近 100 行日志
sudo journalctl -u collei -n 100 --no-pager

# 开机自启（部署脚本已自动启用）
sudo systemctl enable collei
```

## CLI 管理工具

激活虚拟环境后可使用 `collei` CLI：

```bash
cd /opt/collei

# 重置管理员密码（自动生成新密码）
.venv/bin/collei passwd

# 指定用户名和密码
.venv/bin/collei passwd --username admin --password new-password

# 关闭用户的两步验证
.venv/bin/collei disable-2fa --username admin
```

## 反向代理

裸机部署同样建议配置反向代理以启用 HTTPS，配置方式与 Docker 部署一致，请参阅 [Docker 部署 — 反向代理](docker#反向代理)。

配置完成后更新环境变量：

```bash
# 编辑 /opt/collei/.env
COLLEI_TRUSTED_PROXIES=127.0.0.1
COLLEI_COOKIE_SECURE=true
```

然后重启服务：

```bash
sudo systemctl restart collei
```

## 手动部署（不使用脚本）

如果你希望完全手动执行部署，以下是逐步操作：

```bash
# 1. 安装 UV
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# 2. 克隆代码
git clone --depth 1 https://github.com/collei-monitor/collei.git /opt/collei
cd /opt/collei

# 3. 创建虚拟环境并安装依赖
uv venv --python 3.12
uv pip install .

# 4. 下载前端（替换 VERSION 为实际版本号）
VERSION=latest
mkdir -p frontend/dist
curl -fsSL "https://github.com/collei-monitor/collei-web/releases/download/${VERSION}/collei-web-${VERSION}.tar.gz" \
  | tar xz -C frontend/dist

# 5. 创建数据目录
mkdir -p /var/lib/collei
cp data/*.mmdb /var/lib/collei/

# 6. 生成密钥和 .env
SECRET_KEY=$(.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))")
CA_KEY=$(.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(32))")

cat > .env <<EOF
COLLEI_SECRET_KEY=${SECRET_KEY}
COLLEI_CA_MASTER_KEY=${CA_KEY}
COLLEI_DATABASE_URL=sqlite+aiosqlite:////var/lib/collei/collei.db
COLLEI_DATA_DIR=/var/lib/collei
COLLEI_DEFAULT_ADMIN_USERNAME=admin
COLLEI_DEFAULT_ADMIN_PASSWORD=change-me
COLLEI_COOKIE_SECURE=false
EOF
chmod 600 .env

# 7. 数据库迁移
set -a; . .env; set +a
.venv/bin/alembic upgrade head

# 8. 启动
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 22333
```
