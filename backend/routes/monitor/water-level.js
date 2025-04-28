const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'water_monitoring',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * 获取水位监测站点列表
 * GET /api/water-level/stations
 */
router.get('/stations', async (req, res) => {
  try {
    // 这里使用模拟数据，实际项目中应连接数据库
    const stations = [
      { id: 'station1', name: '站点1号', region: 'north', latitude: 39.904989, longitude: 116.405285 },
      { id: 'station2', name: '站点2号', region: 'south', latitude: 39.894989, longitude: 116.415285 },
      { id: 'station3', name: '站点3号', region: 'east', latitude: 39.914989, longitude: 116.425285 },
      { id: 'station4', name: '站点4号', region: 'west', latitude: 39.924989, longitude: 116.395285 },
      { id: 'station5', name: '站点5号', region: 'north', latitude: 39.934989, longitude: 116.385285 }
    ];
    
    res.json({
      code: 200,
      data: stations,
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取水位监测站点详情
 * GET /api/water-level/stations/:id
 */
router.get('/stations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 这里使用模拟数据，实际项目中应连接数据库
    const stationDetails = {
      id,
      name: `站点${id.replace('station', '')}号`,
      region: 'north',
      latitude: 39.904989,
      longitude: 116.405285,
      warningLevel: 4.5,
      dangerLevel: 5.2,
      currentWaterLevel: 3.75,
      currentFlow: 38.6,
      rainfall: 12.5,
      deviceStatus: 0,
      installDate: '2023-01-15',
      lastMaintenance: '2023-06-20'
    };
    
    res.json({
      code: 200,
      data: stationDetails,
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching station details:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取实时水位数据
 * GET /api/water-level/realtime
 */
router.get('/realtime', async (req, res) => {
  try {
    const { stationId } = req.query;
    
    if (!stationId) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Station ID is required'
      });
    }
    
    // 这里使用模拟数据，实际项目中应连接数据库
    const realtimeData = {
      stationId,
      stationName: `站点${stationId.replace('station', '')}号`,
      waterLevel: (Math.random() * 1 + 3.5).toFixed(2),
      flow: (Math.random() * 10 + 35).toFixed(1),
      rainfall: (Math.random() * 5 + 10).toFixed(1),
      waterLevelChange: '+0.15',
      waterLevelTrend: 'up',
      warningLevel: 4.5,
      dangerLevel: 5.2,
      deviceStatus: 0,
      updateTime: new Date().toISOString()
    };
    
    res.json({
      code: 200,
      data: realtimeData,
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取历史水位数据
 * GET /api/water-level/history
 */
router.get('/history', async (req, res) => {
  try {
    const { stationId, timeRange = 'today', startTime, endTime } = req.query;
    
    if (!stationId) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Station ID is required'
      });
    }
    
    // 生成模拟历史数据
    const now = new Date();
    const historyData = [];
    let dataPoints = 24; // 默认24小时
    
    if (timeRange === 'week') {
      dataPoints = 7 * 24; // 一周的小时数
    } else if (timeRange === 'month') {
      dataPoints = 30 * 24; // 一个月的小时数
    }
    
    // 简化为每小时一个数据点
    for (let i = 0; i < dataPoints; i++) {
      const time = new Date(now.getTime() - (dataPoints - i) * 60 * 60 * 1000);
      const waterLevel = (Math.random() * 1 + 3.5).toFixed(2);
      const flow = (Math.random() * 10 + 35).toFixed(1);
      
      historyData.push({
        time: time.toISOString(),
        waterLevel: parseFloat(waterLevel),
        flow: parseFloat(flow)
      });
    }
    
    res.json({
      code: 200,
      data: historyData,
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
 * 获取水位预警信息
 * GET /api/water-level/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { stationId, limit = 10 } = req.query;
    
    // 这里使用模拟数据，实际项目中应连接数据库
    const alerts = [
      {
        id: 1,
        stationId: 'station1',
        type: '水位预警',
        level: 'warning',
        content: '站点1号水位已达警戒水位 4.50m',
        time: '2023-07-15 14:30:25',
        handled: 0
      },
      {
        id: 2,
        stationId: 'station1',
        type: '水位上涨',
        level: 'info',
        content: '站点1号水位30分钟内上涨 15cm',
        time: '2023-07-15 14:00:00',
        handled: 0
      }
    ];
    
    // 如果指定了站点ID，筛选该站点的告警
    const filteredAlerts = stationId 
      ? alerts.filter(a => a.stationId === stationId)
      : alerts;
    
    res.json({
      code: 200,
      data: filteredAlerts.slice(0, limit),
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

/**
 * 获取水位监测设备状态
 * GET /api/water-level/device-status
 */
router.get('/device-status', async (req, res) => {
  try {
    const { stationId } = req.query;
    
    if (!stationId) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Station ID is required'
      });
    }
    
    // 这里使用模拟数据，实际项目中应连接数据库
    const deviceStatus = {
      stationId,
      status: 0, // 0: 正常, 1: 异常
      batteryLevel: 85,
      signalStrength: 4,
      lastHeartbeat: new Date().toISOString(),
      uptime: '15天8小时',
      nextMaintenance: '2023-12-15'
    };
    
    res.json({
      code: 200,
      data: deviceStatus,
      message: 'success'
    });
  } catch (error) {
    console.error('Error fetching device status:', error);
    res.status(500).json({
      code: 500,
      data: null,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 