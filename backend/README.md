# 接地环流数据监测系统后端

这是接地环流数据监测系统的后端服务，提供 API 接口供前端应用使用。

## 系统要求

- Node.js 14.x 或更高版本
- MySQL 5.7 或更高版本

## 安装

1. 安装依赖：

```bash
npm install
```

2. 创建 `.env` 文件，可以复制 `.env.example` 文件并根据需要修改：

```bash
cp .env.example .env
```

3. 初始化数据库：

```bash
npm run setup-db
```

## 运行

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## API 文档

接口文档在项目根目录下的 `ground_loop_api_doc.md` 文件中。

## 目录结构

```
backend/
├── app.js                # 主应用入口
├── package.json          # 项目依赖
├── .env                  # 环境变量（需要自行创建）
├── .env.example          # 环境变量示例
├── routes/               # 路由目录
│   └── monitor/
│       └── ground-loop.js # 接地环流数据相关路由
└── scripts/              # 脚本目录
    └── setup-db.js        # 数据库初始化脚本
```

## 数据库

数据库结构定义在项目根目录下的 `ground_loop_monitor.sql` 文件中。 