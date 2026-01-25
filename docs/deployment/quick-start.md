# HyroxAgent 快速启动手册

> 日常启动服务的速查手册，详细说明请参考 [v2.0-local-dev-guide.md](./v2.0-local-dev-guide.md)

## 服务端口

| 服务 | 端口 | 地址 |
|------|------|------|
| 后端 API | 8000 | http://localhost:8000 |
| 前端应用 | 5173 | http://localhost:5173 |
| API 文档 | 8000 | http://localhost:8000/docs |

---

## 一键启动（推荐）

### Windows PowerShell

**启动后端**（终端 1）：
```powershell
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动前端**（终端 2）：
```powershell
cd frontend
npm run dev
```

### macOS / Linux

**启动后端**（终端 1）：
```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动前端**（终端 2）：
```bash
cd frontend
npm run dev
```

---

## 首次安装依赖

### 后端
```bash
cd backend
pip install -r requirements.txt
```

### 前端
```bash
cd frontend
npm install
```

---

## 目录结构速览

```
HyroxAgent/
├── backend/          ← 后端 (FastAPI, Python)
│   └── app/main.py   ← 入口文件
├── frontend/         ← 前端 (React + Vite) ⚠️ 注意是根目录，不是 hyrox-demo
│   └── src/
├── data/db/          ← SQLite 数据库
└── docs/             ← 文档
```

> ⚠️ **注意**：前端项目在 `frontend/` 根目录，**不是** `frontend/hyrox-demo/`

---

## 常见问题

### Q: 后端报 ModuleNotFoundError
```bash
# 确保使用正确的 Python 版本运行
python -m uvicorn app.main:app --reload --port 8000
```

### Q: 端口被占用
```bash
# 后端换端口
python -m uvicorn app.main:app --reload --port 8001

# 前端在 vite.config.ts 中修改 server.port
```

### Q: 前端启动了错误的项目
确保在 `frontend/` 目录下运行 `npm run dev`，而不是 `frontend/hyrox-demo/`

---

## 验证服务

1. 后端健康检查：http://localhost:8000/health
2. API 文档：http://localhost:8000/docs
3. 前端应用：http://localhost:5173

---

*最后更新：2026-01-25*
