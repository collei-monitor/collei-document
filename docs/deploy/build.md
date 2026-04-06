---
sidebar_position: 3
title: 手动编译
description: 从源码构建 Collei Docker 镜像
---

# 手动编译

从源码构建 Collei Docker 镜像，适用于需要修改代码或自定义构建的场景。

## 前置条件

- Git
- Docker Engine 20.10+（支持 BuildKit）
- Docker Compose V2

## 克隆源码

```bash
git clone https://github.com/collei-monitor/collei.git
cd collei
```

## 本地构建 Docker 镜像

项目提供了专用的 `docker-compose.build.yml` 用于本地构建：

```bash
docker compose -f docker-compose.build.yml up -d --build
```

这将执行以下流程：

1. **builder 阶段** — 基于 `python:3.12-alpine`
   - 创建 Python 虚拟环境
   - 安装所有 Python 依赖
   - 复制后端源码并安装
   - 从 GitHub Releases 下载预构建前端

2. **runtime 阶段** — 最小化生产镜像
   - 仅复制虚拟环境和前端产物
   - 安装运行时系统依赖（`su-exec`、`libstdc++`）
   - 创建非 root 用户 `collei`（uid 1000）
   - 预编译 Python 字节码

构建完成后，本地镜像标记为 `collei:local`。

### 指定前端版本

```bash
FRONTEND_VERSION=v0.1.0 docker compose -f docker-compose.build.yml up -d --build
```

或通过 `--build-arg`：

```bash
docker build --build-arg FRONTEND_VERSION=v0.1.0 -t collei:local .
```

默认使用 `latest`（自动获取最新 Release）。

## 单独构建镜像

如果只需构建镜像而不立即启动：

```bash
docker build -t collei:local .
```

构建完成后，可配合标准 `docker-compose.yml` 使用：

```yaml
# 修改 docker-compose.yml 中的 image 为本地镜像
# image: collei:local
```

```bash
docker compose up -d
```

## Dockerfile 解析

项目使用多阶段构建（multi-stage build），最终镜像不包含构建工具链：

```
python:3.12-alpine (builder)
  ├── 创建 /opt/venv 虚拟环境
  ├── pip install 依赖
  ├── 复制源码 + pip install 项目
  ├── curl 下载前端 tarball
  └── 清理 pip / __pycache__

python:3.12-alpine (runtime)
  ├── COPY --from=builder /opt/venv     ← 虚拟环境
  ├── COPY --from=builder frontend/dist ← 前端资源
  ├── COPY 后端源码
  ├── adduser collei (uid 1000)
  ├── compileall 预编译 .pyc
  └── ENTRYPOINT entrypoint.sh
```

### 入口脚本 (entrypoint.sh)

容器启动时 `entrypoint.sh` 以 root 执行：

1. 夺回数据卷所有权
2. 复制内置数据文件（GeoIP 等）
3. 密钥自动生成 / 持久化（`/data/.secrets`）
4. 检测并执行备份恢复（如有 `.restore-pending` 标记）
5. 执行数据库迁移（`alembic upgrade head`）
6. 修正数据卷权限，通过 `su-exec` 降权为 `collei` 用户启动 uvicorn

## 开发模式

开发时推荐直接使用虚拟环境运行，无需每次构建镜像：

```bash
# 安装依赖（含开发工具）
pip install -e ".[dev]"

# 配置环境变量
export COLLEI_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
export COLLEI_DEBUG=true

# 数据库迁移
alembic upgrade head

# 启动开发服务器（热重载）
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

API 文档（仅 `COLLEI_DEBUG=true` 时可用）：
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## 交叉编译（多架构）

如需构建多架构镜像（如在 amd64 上构建 arm64）：

```bash
# 创建 buildx 构建器（首次）
docker buildx create --name collei-builder --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg FRONTEND_VERSION=latest \
  -t your-registry/collei:latest \
  --push .
```

## 镜像体积优化

当前构建已包含以下优化：

- Alpine 基础镜像（~5 MB）
- 多阶段构建，不包含编译工具链
- 预编译 Python 字节码后清理 `__pycache__`
- 卸载 pip / setuptools（运行时不需要）
- 无 pip 缓存
