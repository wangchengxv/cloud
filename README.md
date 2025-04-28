## 项目结构

项目分为前端和后端两部分：

- `src/` - 前端Vue.js应用
- `server/` - 后端Node.js服务
- `database/` - 数据库脚本

## 功能特点

- 实时设备状态监控
- 系统概况统计
- 设备详情查看
- 告警管理
- 系统配置管理

## 技术栈

### 前端

- Vue.js
- Element Plus
- Axios

### 后端

- Node.js
- Express
- MySQL

## 安装与运行

### 前端

1. 安装依赖

```bash
npm install
```

2. 开发环境运行

```bash
npm run dev
```

3. 生产环境构建

```bash
npm run build
```

### 后端

1. 进入后端目录

```bash
cd server
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


