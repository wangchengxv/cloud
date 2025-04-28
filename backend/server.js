const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection } = require('./config/database');

// 导入路由
const deviceRoutes = require('./routes/devices');
const systemRoutes = require('./routes/system');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 路由
app.use('/api/devices', deviceRoutes);
app.use('/api/system', systemRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({ 
    message: '电缆通道密封与智能化在线监测系统API',
    version: '1.0.0',
    endpoints: {
      devices: '/api/devices',
      system: '/api/system'
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('无法连接到数据库，服务器启动失败');
      process.exit(1);
    }
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer(); 