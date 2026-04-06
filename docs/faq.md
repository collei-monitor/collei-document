---
sidebar_position: 3
title: 常见问题
---

# 常见问题

Collei 提供了 `collei` 命令行管理工具，可在服务无法正常登录时通过终端直接操作数据库完成修复。

---

## 忘记密码 / 重置密码

使用 `collei passwd` 子命令重置用户密码。

### Docker 部署

```bash
# 进入docker-compose.yml所在目录，这里假设是 /root/collei
cd /root/collei

# 自动生成 12 位随机密码（推荐）
docker compose exec -u collei collei collei passwd

# 为指定用户重置密码
docker compose exec -u collei collei collei passwd --username admin

# 指定新密码
docker compose exec -u collei collei collei passwd --username admin --password MyNewPass123
```

### 裸机部署

```bash
cd /opt/collei
source .venv/bin/activate

# 自动生成随机密码
collei passwd

# 指定用户和密码
collei passwd --username admin --password MyNewPass123
```

### 参数说明

| 参数         | 说明                                                       |
| ------------ | ---------------------------------------------------------- |
| `--username` | 目标用户名。不指定时默认操作第一个用户（适用于单用户系统） |
| `--password` | 新密码。不指定时自动生成 12 位随机密码并打印到终端         |

### 示例输出

```
已为用户 'admin' 生成新密码: aB3dE5fG7hJ9
所有现有会话已失效。
```

:::tip
如果不指定 `--password`，工具会自动生成一个 12 位的安全随机密码。请务必记下终端输出的密码。
:::

---

## 关闭两步验证 (2FA)

当用户丢失 2FA 验证器无法登录时，可使用 `collei disable-2fa` 强制关闭两步验证。

### Docker 部署

```bash
# 进入docker-compose.yml所在目录，这里假设是 /root/collei
cd /root/collei

# 关闭第一个用户的 2FA
docker compose exec -u collei collei collei disable-2fa

# 关闭指定用户的 2FA
docker compose exec -u collei collei collei disable-2fa --username admin
```

### 裸机部署

```bash
cd /opt/collei
source .venv/bin/activate

collei disable-2fa --username admin
```

### 参数说明

| 参数         | 说明                                   |
| ------------ | -------------------------------------- |
| `--username` | 目标用户名。不指定时默认操作第一个用户 |

### 示例输出

```
已关闭用户 'admin' 的两步验证，所有现有会话已失效。
```

如果该用户本来就没有启用 2FA，工具会提示：

```
用户 'admin' 未启用两步验证，无需操作。
```

---

## 强制启用密码登录

当启用了 SSO/OIDC 登录并禁用了密码登录后，如果 SSO 提供商出现故障导致无法登录，可使用 `collei allow-password-login` 强制重新启用密码登录。

### Docker 部署

```bash
# 进入docker-compose.yml所在目录，这里假设是 /root/collei
cd /root/collei

# 启用密码登录
docker compose exec -u collei collei collei allow-password-login enable

# 禁用密码登录（需要先配置 SSO/OIDC）
docker compose exec -u collei collei collei allow-password-login disable
```

### 裸机部署

```bash
cd /opt/collei
source .venv/bin/activate

collei allow-password-login enable
```

### 参数说明

| 参数      | 说明                                 |
| --------- | ------------------------------------ |
| `enable`  | 允许使用用户名 + 密码方式登录        |
| `disable` | 禁止密码登录（仅保留 SSO/OIDC 登录） |

### 安全检查

执行 `disable` 操作时，工具会检查系统中是否存在已启用的 SSO/OIDC 提供商。如果没有配置任何 SSO 登录方式，操作将被拒绝：

```
错误: 无法禁用密码登录 — 没有已启用的 SSO/OIDC 提供商
请先在 Collei 设置中配置并启用至少一个 SSO/OIDC 登录方式。
```

### 示例输出

```
密码登录已启用。
注意: 若 Collei 服务正在运行，需重启以使配置在内存缓存中生效。
```

:::warning
修改密码登录配置后，需要**重启 Collei 服务**才能生效，因为该配置使用了内存缓存。

- Docker: `docker compose restart`
- 裸机 (systemd): `sudo systemctl restart collei`
  :::

---

## CLI 命令速查表

| 命令                                  | 用途         | 需要重启 |
| ------------------------------------- | ------------ | -------- |
| `collei passwd`                       | 重置用户密码 | 否       |
| `collei disable-2fa`                  | 关闭两步验证 | 否       |
| `collei allow-password-login enable`  | 启用密码登录 | **是**   |
| `collei allow-password-login disable` | 禁用密码登录 | **是**   |
