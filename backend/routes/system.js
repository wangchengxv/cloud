const express = require('express');
const router = express.Router();
const System = require('../models/system');

// 获取系统概况
router.get('/overview', async (req, res) => {
  try {
    const overview = await System.getSystemOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('获取系统概况失败:', error);
    res.status(500).json({ success: false, message: '获取系统概况失败', error: error.message });
  }
});

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const config = await System.getSystemConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, message: '获取系统配置失败', error: error.message });
  }
});

// 更新系统配置
router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!value) {
      return res.status(400).json({ success: false, message: '配置值不能为空' });
    }
    
    await System.updateSystemConfig(key, value);
    
    res.json({ success: true, message: `配置 ${key} 已更新为 ${value}` });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ success: false, message: '更新系统配置失败', error: error.message });
  }
});

// 获取所有设备状态
router.get('/devices/status', async (req, res) => {
  try {
    const devicesStatus = await System.getAllDevicesStatus();
    res.json({ success: true, data: devicesStatus });
  } catch (error) {
    console.error('获取所有设备状态失败:', error);
    res.status(500).json({ success: false, message: '获取所有设备状态失败', error: error.message });
  }
});

// 获取最近告警
router.get('/alarms/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const alarms = await System.getRecentAlarms(parseInt(limit));
    res.json({ success: true, data: alarms });
  } catch (error) {
    console.error('获取最近告警失败:', error);
    res.status(500).json({ success: false, message: '获取最近告警失败', error: error.message });
  }
});

module.exports = router; 