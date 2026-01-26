# HyroxAgent 服务器部署与更新指南

## 服务器信息

- **平台**: 腾讯云轻量服务器
- **系统**: Ubuntu 22.04 + 宝塔面板
- **项目路径**: `/www/wwwroot/hyrox-agent`
- **后端端口**: 8000

---

## 一、代码更新流程

### 1. SSH 连接服务器

```bash
# 通过宝塔面板的"终端"功能，或使用 SSH 客户端连接
ssh root@<服务器IP>
```

### 2. 拉取最新代码

```bash
cd /www/wwwroot/hyrox-agent
git pull origin main
```

### 3. 安装新依赖（如有）

```bash
cd /www/wwwroot/hyrox-agent/backend
pip3 install -r requirements.txt
```

### 4. 重启后端服务

**方法 A: 通过宝塔面板**
1. 进入「软件商店」→「Python 项目管理器」
2. 找到 hyrox-agent 项目
3. 点击「重启」

**方法 B: 通过命令行**
```bash
# 查找并停止现有进程
ps aux | grep uvicorn
kill <PID>

# 重新启动
cd /www/wwwroot/hyrox-agent/backend
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/hyrox.log 2>&1 &
```

### 5. 验证服务状态

```bash
curl http://127.0.0.1:8000/health
# 应返回: {"status":"healthy","version":"1.0.0"}
```

---

## 二、临时域名配置（cpolar）

由于没有备案域名，需要使用 cpolar 提供 HTTPS 临时域名。

### 1. 启动 cpolar 隧道

```bash
# 后台运行 cpolar
nohup cpolar http 8000 > /var/log/cpolar.log 2>&1 &
```

### 2. 获取临时域名

**方法 A: 查看日志**
```bash
cat /var/log/cpolar.log | grep "https://"
```

**方法 B: 通过 API 查询**
```bash
curl http://127.0.0.1:9200/api/tunnels
```

**方法 C: 登录 cpolar 控制台**
- 网址: https://dashboard.cpolar.com
- 查看「隧道列表」中的在线隧道

### 3. 记录新域名

临时域名格式类似: `https://xxxxxxxx.r11.vip.cpolar.cn`

> ⚠️ **注意**: 免费版 cpolar 每次重启后域名会变化！

---

## 三、更新小程序配置

获取到新的临时域名后，需要更新小程序配置。

### 1. 修改配置文件

编辑文件: `miniprogram/miniprogram/services/config.js`

```javascript
const config = {
  // 开发环境 API 地址 - 更新为新的临时域名
  baseUrl: 'https://新域名.r11.vip.cpolar.cn',
  
  // API 版本前缀
  apiPrefix: '/api/v1',
  
  // 请求超时时间 (ms)
  timeout: 30000,
};
```

### 2. 本地测试

将 `baseUrl` 改为 `http://localhost:8000` 进行本地调试。

### 3. 重新编译小程序

在微信开发者工具中点击「编译」刷新。

---

## 四、微信开发者工具设置

### 必须勾选的选项

在「详情」→「本地设置」中：

- [x] 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书

> 这是使用临时域名调试的必要设置

---

## 五、常见问题

### Q1: 服务启动后访问返回 404

**原因**: 可能服务还在重载中  
**解决**: 等待几秒后重试，或检查日志 `tail -f /var/log/hyrox.log`

### Q2: cpolar 域名无法访问

**原因**: cpolar 进程已停止  
**解决**: 重新执行 `nohup cpolar http 8000 > /var/log/cpolar.log 2>&1 &`

### Q3: 小程序报网络错误

**检查项**:
1. config.js 中的 baseUrl 是否正确
2. 是否勾选了「不校验合法域名」
3. 服务器服务是否正常运行

### Q4: 微信登录失败

**检查项**:
1. AppID 和 AppSecret 是否正确配置在 `backend/app/config/settings.py`
2. 服务器是否能访问微信 API（测试: `curl https://api.weixin.qq.com`）

---

## 六、配置文件位置速查

| 配置项 | 文件路径 |
|--------|----------|
| 后端配置 | `backend/app/config/settings.py` |
| 小程序 API 地址 | `miniprogram/miniprogram/services/config.js` |
| 小程序 AppID | `miniprogram/project.config.json` |
| 数据库文件 | `data/db/hyrox.db` (本地) 或 `/www/wwwroot/hyrox-agent/data/db/hyrox.db` (服务器) |

---

## 七、一键更新脚本（可选）

可以在服务器创建更新脚本 `/www/wwwroot/update.sh`:

```bash
#!/bin/bash
cd /www/wwwroot/hyrox-agent
echo ">>> 拉取最新代码..."
git pull origin main

echo ">>> 安装依赖..."
cd backend
pip3 install -r requirements.txt

echo ">>> 重启服务..."
pkill -f "uvicorn app.main:app"
sleep 2
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/hyrox.log 2>&1 &

echo ">>> 等待服务启动..."
sleep 3

echo ">>> 检查服务状态..."
curl http://127.0.0.1:8000/health

echo ">>> 更新完成！"
```

使用方法:
```bash
chmod +x /www/wwwroot/update.sh
/www/wwwroot/update.sh
```

---

## 八、长期解决方案

为避免每次重启更换域名的麻烦，建议：

1. **购买域名并备案** - 完成后可配置固定域名
2. **升级 cpolar 付费版** - 可获得固定二级域名
3. **使用其他内网穿透服务** - 如 frp、natapp 等

---

*文档更新时间: 2026-01-26*
