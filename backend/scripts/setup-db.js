/**
 * 数据库初始化脚本
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password'
};

// 数据库名
const DB_NAME = process.env.DB_NAME || 'ground_loop_monitor';

// SQL 文件路径
const SQL_FILE_PATH = path.join(__dirname, '../../ground_loop_monitor.sql');

async function setupDatabase() {
  let connection;
  
  try {
    console.log('正在连接到 MySQL 服务器...');
    connection = await mysql.createConnection(dbConfig);
    
    // 创建数据库（如果不存在）
    console.log(`正在创建数据库 ${DB_NAME}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    
    // 使用数据库
    console.log(`正在使用数据库 ${DB_NAME}...`);
    await connection.query(`USE ${DB_NAME}`);
    
    // 读取 SQL 文件
    console.log('正在读取 SQL 文件...');
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf8');
    
    // 拆分 SQL 语句
    const sqlStatements = sqlContent
      .replace(/--.*$/gm, '') // 删除注释
      .split(';')
      .filter(statement => statement.trim() !== '');
    
    // 执行 SQL 语句
    console.log('正在执行 SQL 语句...');
    for (const statement of sqlStatements) {
      await connection.query(statement);
    }
    
    console.log('数据库初始化完成！');
    
    // 添加一些示例数据
    console.log('正在添加示例数据...');
    await addSampleData(connection);
    
    console.log('示例数据添加完成！');
  } catch (error) {
    console.error('初始化数据库时出错:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function addSampleData(connection) {
  // 获取当前时间
  const now = new Date();
  
  // 在过去的一小时内生成 20 个随机数据点
  const dataPoints = [];
  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(now.getTime() - (20 - i) * 3 * 60 * 1000); // 每 3 分钟一个数据点
    const currentValue = (Math.random() * 4.5 + 0.5).toFixed(2); // 0.5 到 5.0 之间的随机数
    
    // 确定状态
    let status = 'normal';
    if (currentValue >= 4.0) {
      status = 'danger';
    } else if (currentValue >= 3.0) {
      status = 'warning';
    }
    
    dataPoints.push([currentValue, status, timestamp]);
  }
  
  // 插入数据
  await connection.query(
    'INSERT INTO ground_loop_data (current_value, status, recorded_at) VALUES ?',
    [dataPoints]
  );
}

// 执行数据库设置
setupDatabase(); 