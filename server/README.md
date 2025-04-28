# 电缆通道密封与智能化在线监测系统后端服务

这是电缆通道密封与智能化在线监测系统的后端服务，提供API接口支持前端应用。

## 功能特点

- 设备状态监控
- 系统概况统计
- 告警管理
- 系统配置管理

## 技术栈

- Node.js
- Express
- MySQL

## 安装与运行

### 前提条件

- Node.js (>=14.0.0)
- MySQL (>=5.7)

### 安装步骤

1. 克隆仓库

```bash
git clone <repository-url>
cd cable-monitoring-server
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制 `.env.example` 文件为 `.env`，并根据实际情况修改配置：

```bash
cp .env.example .env
```

4. 创建数据库

使用 `database/schema.sql` 文件创建数据库和表：

```bash
mysql -u root -p < database/schema.sql
```

5. 启动服务

开发环境：

```bash
npm run dev
```

生产环境：

```bash
npm start
```

## API文档

### 系统概况

- `GET /api/system-overview` - 获取系统概况

### 设备管理

- `GET /api/devices` - 获取所有设备
- `GET /api/devices/:deviceId` - 获取单个设备详情
- `PUT /api/devices/:deviceId/status` - 更新设备状态

### 告警管理

- `GET /api/alerts` - 获取告警列表
- `PUT /api/alerts/:alertId` - 更新告警状态

### 系统配置

- `GET /api/config` - 获取系统配置
- `PUT /api/config/:configKey` - 更新系统配置

## 项目结构

```
server/
├── app.js                 # 应用入口
├── config/                # 配置文件
│   └── database.js        # 数据库配置
├── models/                # 数据模型
│   └── device.js          # 设备模型
├── routes/                # 路由
│   └── api.js             # API路由
├── database/              # 数据库脚本
│   └── schema.sql         # 数据库结构
├── .env.example           # 环境变量示例
├── package.json           # 项目依赖
└── README.md              # 项目说明
```

## 许可证

ISC 