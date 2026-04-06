---
sidebar_position: 4
title: 更新
description: 将 Collei 升级到新版本
---

# 更新

本页介绍如何将 Collei 升级到新版本。Docker 和裸机两种部署方式各有对应的升级流程。

## Docker 升级

### 升级到最新版

```bash
cd collei

# 拉取最新镜像
docker compose pull

# 重新创建容器
docker compose up -d
```

数据保存在 Docker 卷中，容器重建后自动保留。容器启动时会自动执行数据库迁移。

### 升级到指定版本

通过 `.env` 文件指定目标版本：

```bash
# 设置版本号
echo "COLLEI_VERSION=0.2.0" >> .env

# 重新创建容器
docker compose up -d
```

### 回滚

如果新版本出现问题，可以退回旧版本：

```bash
# 修改 .env 中的版本号为旧版本
echo "COLLEI_VERSION=0.1.0" >> .env
docker compose up -d
```

:::warning
回滚不会自动回退数据库迁移。如果新版本的迁移包含不兼容的 schema 变更，需要手动从备份恢复数据库。
:::

### 查看当前版本

```bash
# 查看镜像版本
docker compose images

# 查看容器日志中的启动信息
docker compose logs collei | head -20
```

## 裸机升级

### 一键升级脚本

```bash
curl -fsSL https://raw.githubusercontent.com/collei-monitor/collei/master/upgrade.sh \
  -o upgrade.sh
sudo bash upgrade.sh
```

脚本自动执行以下步骤：

1. **备份数据库** — 在数据目录生成带时间戳的 `.bak` 文件
2. **拉取最新后端代码** — `git pull --ff-only`
3. **更新 Python 依赖** — `uv pip install .`
4. **更新前端** — 下载最新前端发布包
5. **数据库迁移 + 重启服务** — `alembic upgrade head` + `systemctl restart collei`

升级完成后输出：

```
════════════════════════════════════════════════════
  Collei 升级完成！
════════════════════════════════════════════════════

  后端:  abc1234 → def5678
  前端:  v0.2.0
  备份:  /var/lib/collei/collei.db.bak.20260405120000
```

### 自定义参数

```bash
sudo bash upgrade.sh \
  --install-dir /opt/collei \
  --data-dir /var/lib/collei \
  --frontend-version v0.2.0
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--install-dir` | `/opt/collei` | 安装目录 |
| `--data-dir` | `/var/lib/collei` | 数据目录 |
| `--frontend-version` | `latest` | 前端版本号 |
| `--skip-restart` | — | 跳过服务重启 |

### 手动升级

如果不使用升级脚本，可以手动执行：

```bash
# 1. 备份数据库
cp /var/lib/collei/collei.db /var/lib/collei/collei.db.bak

# 2. 拉取最新代码
cd /opt/collei
git pull --ff-only

# 3. 更新依赖
uv pip install .

# 4. 更新前端（替换 VERSION 为实际版本号）
VERSION=v0.2.0
rm -rf frontend/dist
mkdir -p frontend/dist
curl -fsSL "https://github.com/collei-monitor/collei-web/releases/download/${VERSION}/collei-web-${VERSION}.tar.gz" \
  | tar xz -C frontend/dist

# 5. 数据库迁移
set -a; . .env; set +a
.venv/bin/alembic upgrade head

# 6. 重启服务
sudo systemctl restart collei
```

## 备份与恢复

### 备份

#### Docker

```bash
# 导出数据卷
docker run --rm \
  -v collei_collei-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/collei-backup.tar.gz -C /data .
```

#### 裸机

```bash
# 备份数据目录
sudo cp /var/lib/collei/collei.db /var/lib/collei/collei.db.bak.$(date +%Y%m%d%H%M%S)

# 或完整备份
sudo tar czf collei-data-backup.tar.gz -C /var/lib/collei .
```

### 恢复

Collei 支持自动恢复机制。将备份文件放入数据目录的 `.restore` 子目录并创建标记文件即可。

#### Docker

```bash
# 停止容器
docker compose down

# 进入数据卷（找到挂载点）
MOUNT=$(docker volume inspect collei_collei-data -f '{{.Mountpoint}}')

# 创建恢复目录并放入文件
sudo mkdir -p "$MOUNT/.restore"
sudo cp your-backup/collei.db "$MOUNT/.restore/"
sudo cp your-backup/.secrets "$MOUNT/.restore/"
sudo touch "$MOUNT/.restore-pending"

# 启动容器（自动执行恢复）
docker compose up -d
```

#### 裸机

```bash
# 停止服务
sudo systemctl stop collei

# 创建恢复目录
sudo mkdir -p /var/lib/collei/.restore
sudo cp your-backup/collei.db /var/lib/collei/.restore/
sudo cp your-backup/.secrets /var/lib/collei/.restore/
sudo touch /var/lib/collei/.restore-pending

# 启动服务（自动执行恢复）
sudo systemctl start collei
```

恢复流程会自动：
1. 备份当前数据到 `.pre-restore-backup`
2. 用恢复目录中的文件覆盖现有文件
3. 重新加载密钥
4. 清理恢复暂存文件
5. 执行数据库迁移

## 常见问题

### 升级后无法启动

检查日志：

```bash
# Docker
docker compose logs collei

# 裸机
sudo journalctl -u collei -n 50 --no-pager
```

常见原因：

- **数据库迁移失败** — 从备份恢复后重试
- **依赖版本冲突** — 重新安装依赖：`uv pip install --reinstall .`
- **前端下载失败** — 检查网络连接，或手动指定前端版本

### 升级后密码失效

升级不会重置密码。如果无法登录，使用 CLI 重置：

```bash
# Docker
docker compose exec collei collei passwd

# 裸机
cd /opt/collei && .venv/bin/collei passwd
```
