/**
 * 接地环流数据监测系统路由
 */
const express = require('express');
const mysql = require('mysql2/promise');
const moment = require('moment');
const router = express.Router();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ground_loop_monitor'
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

/**
 * 获取实时数据
 * GET /api/monitor/ground-loop/current
 */
router.get('/current', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // 获取最新一条数据
    const [currentData] = await connection.query(
      'SELECT current_value, status, recorded_at FROM ground_loop_data ORDER BY recorded_at DESC LIMIT 1'
    );
    
    // 获取统计数据
    const [stats] = await connection.query(
      'SELECT MAX(current_value) as max_value, MIN(current_value) as min_value, AVG(current_value) as avg_value ' +
      'FROM ground_loop_data WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    
    connection.release();
    
    // 格式化响应数据
    const result = {
      currentValue: currentData.length > 0 ? currentData[0].current_value.toFixed(2) : '0.00',
      maxValue: stats[0].max_value ? stats[0].max_value.toFixed(2) : '0.00',
      minValue: stats[0].min_value ? stats[0].min_value.toFixed(2) : '0.00',
      avgValue: stats[0].avg_value ? stats[0].avg_value.toFixed(2) : '0.00',
      systemStatus: currentData.length > 0 ? currentData[0].status : 'normal',
      lastUpdateTime: currentData.length > 0 ? moment(currentData[0].recorded_at).format('YYYY-MM-DD HH:mm:ss') : '--'
    };
    
    res.json({
      code: 200,
      data: result,
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching current data:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取历史数据
 * GET /api/monitor/ground-loop/history
 */
router.get('/history', async (req, res) => {
  try {
    const { startTime, endTime, limit = 100 } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Start time and end time are required'
      });
    }
    
    const connection = await pool.getConnection();
    
    // 获取指定时间范围内的数据
    const [historyData] = await connection.query(
      'SELECT current_value, recorded_at FROM ground_loop_data ' +
      'WHERE recorded_at BETWEEN ? AND ? ORDER BY recorded_at ASC LIMIT ?',
      [startTime, endTime, parseInt(limit)]
    );
    
    // 获取统计数据
    const [stats] = await connection.query(
      'SELECT MAX(current_value) as max_value, MIN(current_value) as min_value, AVG(current_value) as avg_value ' +
      'FROM ground_loop_data WHERE recorded_at BETWEEN ? AND ?',
      [startTime, endTime]
    );
    
    connection.release();
    
    // 格式化响应数据
    const times = historyData.map(item => moment(item.recorded_at).format('HH:mm:ss'));
    const values = historyData.map(item => parseFloat(item.current_value).toFixed(2));
    
    res.json({
      code: 200,
      data: {
        times,
        values,
        statistics: {
          maxValue: stats[0].max_value ? stats[0].max_value.toFixed(2) : '0.00',
          minValue: stats[0].min_value ? stats[0].min_value.toFixed(2) : '0.00',
          avgValue: stats[0].avg_value ? stats[0].avg_value.toFixed(2) : '0.00'
        }
      },
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching history data:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取系统配置
 * GET /api/monitor/ground-loop/config
 */
router.get('/config', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [config] = await connection.query(
      'SELECT warning_threshold, danger_threshold, data_retention_days, update_interval FROM ground_loop_config LIMIT 1'
    );
    
    connection.release();
    
    if (config.length === 0) {
      return res.status(404).json({
        code: 404,
        data: null,
        message: 'Configuration not found'
      });
    }
    
    res.json({
      code: 200,
      data: {
        warningThreshold: parseFloat(config[0].warning_threshold),
        dangerThreshold: parseFloat(config[0].danger_threshold),
        dataRetentionDays: config[0].data_retention_days,
        updateInterval: config[0].update_interval
      },
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 更新系统配置
 * PUT /api/monitor/ground-loop/config
 */
router.put('/config', async (req, res) => {
  try {
    const { warningThreshold, dangerThreshold, dataRetentionDays, updateInterval } = req.body;
    
    if (warningThreshold === undefined || dangerThreshold === undefined || 
        dataRetentionDays === undefined || updateInterval === undefined) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Missing required parameters'
      });
    }
    
    const connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE ground_loop_config SET warning_threshold = ?, danger_threshold = ?, ' +
      'data_retention_days = ?, update_interval = ?',
      [warningThreshold, dangerThreshold, dataRetentionDays, updateInterval]
    );
    
    connection.release();
    
    res.json({
      code: 200,
      data: null,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 添加模拟数据
 * POST /api/monitor/ground-loop/simulate
 */
router.post('/simulate', async (req, res) => {
  try {
    const { currentValue } = req.body;
    
    if (currentValue === undefined) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Current value is required'
      });
    }
    
    const connection = await pool.getConnection();
    
    // 获取配置数据
    const [config] = await connection.query(
      'SELECT warning_threshold, danger_threshold FROM ground_loop_config LIMIT 1'
    );
    
    // 确定状态
    let status = 'normal';
    if (currentValue >= config[0].danger_threshold) {
      status = 'danger';
    } else if (currentValue >= config[0].warning_threshold) {
      status = 'warning';
    }
    
    // 插入数据
    const [result] = await connection.query(
      'INSERT INTO ground_loop_data (current_value, status) VALUES (?, ?)',
      [currentValue, status]
    );
    
    // 清理过期数据
    await connection.query(
      'DELETE FROM ground_loop_data WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [config[0].data_retention_days]
    );
    
    connection.release();
    
    res.json({
      code: 200,
      data: {
        id: result.insertId,
        currentValue: parseFloat(currentValue).toFixed(2),
        status,
        recordedAt: moment().toISOString()
      },
      message: 'Data point added successfully'
    });
  } catch (error) {
    console.error('Error adding simulate data:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 