const express = require('express');
const router = express.Router();
const Device = require('../models/device');

// 获取系统概况
router.get('/system-overview', async (req, res) => {
  try {
    const overview = await Device.getSystemOverview();
    res.json(overview);
  } catch (error) {
    console.error('获取系统概况失败:', error);
    res.status(500).json({ error: '获取系统概况失败' });
  }
});

// 获取所有设备
router.get('/devices', async (req, res) => {
  try {
    const devices = await Device.getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('获取设备列表失败:', error);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 获取单个设备详情
router.get('/devices/:deviceId', async (req, res) => {
  try {
    const device = await Device.getDeviceById(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json(device);
  } catch (error) {
    console.error('获取设备详情失败:', error);
    res.status(500).json({ error: '获取设备详情失败' });
  }
});

// 更新设备状态
router.put('/devices/:deviceId/status', async (req, res) => {
  try {
    const { 
      status, waterLeak, vibrationLevel, displacement, 
      cablePresent, powerStatus 
    } = req.body;
    
    // 验证必要字段
    if (status === undefined || waterLeak === undefined || 
        vibrationLevel === undefined || displacement === undefined || 
        cablePresent === undefined || powerStatus === undefined) {
      return res.status(400).json({ error: '缺少必要字段' });
    }
    
    await Device.updateDeviceStatus(req.params.deviceId, {
      status,
      waterLeak,
      vibrationLevel,
      displacement,
      cablePresent,
      powerStatus
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新设备状态失败:', error);
    res.status(500).json({ error: '更新设备状态失败' });
  }
});

// 获取告警列表
router.get('/alerts', async (req, res) => {
  try {
    const { status, deviceId } = req.query;
    let query = 'SELECT * FROM alerts';
    const params = [];
    
    if (status || deviceId) {
      query += ' WHERE';
      
      if (status) {
        query += ' status = ?';
        params.push(status);
      }
      
      if (deviceId) {
        if (status) query += ' AND';
        query += ' device_id = ?';
        params.push(deviceId);
      }
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await Device.pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('获取告警列表失败:', error);
    res.status(500).json({ error: '获取告警列表失败' });
  }
});

// 更新告警状态
router.put('/alerts/:alertId', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: '缺少状态字段' });
    }
    
    await Device.pool.query(
      'UPDATE alerts SET status = ? WHERE id = ?',
      [status, req.params.alertId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新告警状态失败:', error);
    res.status(500).json({ error: '更新告警状态失败' });
  }
});

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const [rows] = await Device.pool.query('SELECT * FROM system_config');
    res.json(rows);
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ error: '获取系统配置失败' });
  }
});

// 更新系统配置
router.put('/config/:configKey', async (req, res) => {
  try {
    const { configValue } = req.body;
    
    if (configValue === undefined) {
      return res.status(400).json({ error: '缺少配置值字段' });
    }
    
    await Device.pool.query(
      'UPDATE system_config SET config_value = ? WHERE config_key = ?',
      [configValue, req.params.configKey]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ error: '更新系统配置失败' });
  }
});

module.exports = router; 