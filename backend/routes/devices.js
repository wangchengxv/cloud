const express = require('express');
const router = express.Router();
const Device = require('../models/device');
const System = require('../models/system');

// 获取所有设备
router.get('/', async (req, res) => {
  try {
    const devices = await Device.getAllDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    res.status(500).json({ success: false, message: '获取设备列表失败', error: error.message });
  }
});

// 获取设备详情
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }
    
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('获取设备详情失败:', error);
    res.status(500).json({ success: false, message: '获取设备详情失败', error: error.message });
  }
});

// 获取设备监测数据
router.get('/:deviceId/monitoring', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit } = req.query;
    
    const latestData = await Device.getLatestMonitoringData(deviceId);
    
    if (!latestData) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 没有监测数据` });
    }
    
    res.json({ success: true, data: latestData });
  } catch (error) {
    console.error('获取设备监测数据失败:', error);
    res.status(500).json({ success: false, message: '获取设备监测数据失败', error: error.message });
  }
});

// 获取设备历史数据
router.get('/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 24 } = req.query;
    
    const historyData = await Device.getHistoricalData(deviceId, parseInt(limit));
    
    res.json({ success: true, data: historyData });
  } catch (error) {
    console.error('获取设备历史数据失败:', error);
    res.status(500).json({ success: false, message: '获取设备历史数据失败', error: error.message });
  }
});

// 获取设备告警记录
router.get('/:deviceId/alarms', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 10 } = req.query;
    
    const alarms = await Device.getAlarmRecords(deviceId, parseInt(limit));
    
    res.json({ success: true, data: alarms });
  } catch (error) {
    console.error('获取设备告警记录失败:', error);
    res.status(500).json({ success: false, message: '获取设备告警记录失败', error: error.message });
  }
});

// 更新设备状态
router.put('/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;
    
    if (!status || !['正常', '警告', '异常'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态值' });
    }
    
    await Device.updateDeviceStatus(deviceId, status);
    
    res.json({ success: true, message: `设备 ${deviceId} 状态已更新为 ${status}` });
  } catch (error) {
    console.error('更新设备状态失败:', error);
    res.status(500).json({ success: false, message: '更新设备状态失败', error: error.message });
  }
});

// 添加监测数据
router.post('/:deviceId/monitoring', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = req.body;
    
    // 验证数据
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: '无效的监测数据' });
    }
    
    // 添加监测数据
    const id = await Device.addMonitoringData(deviceId, data);
    
    // 检查是否需要生成告警
    const config = await System.getSystemConfig();
    const alarms = [];
    
    // 检查漏水状态
    if (data.leakStatus) {
      alarms.push({
        alarmType: '漏水',
        alarmLevel: '警告',
        alarmValue: '检测到漏水',
        threshold: `${config.humidity_threshold}%`,
        description: `设备 ${deviceId} 检测到漏水，湿度指数: ${data.humidityIndex}%`
      });
    }
    
    // 检查震动级别
    if (data.vibrationLevel > parseInt(config.vibration_threshold)) {
      alarms.push({
        alarmType: '震动',
        alarmLevel: '警告',
        alarmValue: `${data.vibrationLevel}Hz`,
        threshold: `${config.vibration_threshold}Hz`,
        description: `设备 ${deviceId} 震动级别超过阈值，当前: ${data.vibrationLevel}Hz`
      });
    }
    
    // 检查位移
    if (data.displacement > parseFloat(config.displacement_threshold)) {
      alarms.push({
        alarmType: '位移',
        alarmLevel: '警告',
        alarmValue: `${data.displacement}mm`,
        threshold: `${config.displacement_threshold}mm`,
        description: `设备 ${deviceId} 位移超过阈值，当前: ${data.displacement}mm`
      });
    }
    
    // 检查电缆存在
    if (!data.cablePresent) {
      alarms.push({
        alarmType: '电缆缺失',
        alarmLevel: '警告',
        alarmValue: '未检测到电缆',
        threshold: '信号强度 > 50%',
        description: `设备 ${deviceId} 未检测到电缆，信号强度: ${data.signalStrength}%`
      });
    }
    
    // 检查通电状态
    if (!data.powerStatus) {
      alarms.push({
        alarmType: '断电',
        alarmLevel: '警告',
        alarmValue: '未供电',
        threshold: '电流强度 > 30%',
        description: `设备 ${deviceId} 未供电，电流强度: ${data.currentStrength}%`
      });
    }
    
    // 添加告警记录
    for (const alarm of alarms) {
      await Device.addAlarmRecord(deviceId, alarm);
    }
    
    // 更新设备状态
    if (alarms.length > 0) {
      await Device.updateDeviceStatus(deviceId, '警告');
    } else {
      await Device.updateDeviceStatus(deviceId, '正常');
    }
    
    res.json({ 
      success: true, 
      message: '监测数据已添加', 
      data: { id, alarms: alarms.length > 0 ? alarms : null } 
    });
  } catch (error) {
    console.error('添加监测数据失败:', error);
    res.status(500).json({ success: false, message: '添加监测数据失败', error: error.message });
  }
});

// 测试设备告警
router.post('/:deviceId/test-alarm', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { alarmType } = req.body;
    
    if (!alarmType || !['漏水', '震动', '位移', '电缆缺失', '断电'].includes(alarmType)) {
      return res.status(400).json({ success: false, message: '无效的告警类型' });
    }
    
    const config = await System.getSystemConfig();
    let alarmData;
    
    switch (alarmType) {
      case '漏水':
        alarmData = {
          alarmType: '漏水',
          alarmLevel: '警告',
          alarmValue: '检测到漏水',
          threshold: `${config.humidity_threshold}%`,
          description: `设备 ${deviceId} 测试告警: 检测到漏水`
        };
        break;
      case '震动':
        alarmData = {
          alarmType: '震动',
          alarmLevel: '警告',
          alarmValue: '35Hz',
          threshold: `${config.vibration_threshold}Hz`,
          description: `设备 ${deviceId} 测试告警: 震动级别超过阈值`
        };
        break;
      case '位移':
        alarmData = {
          alarmType: '位移',
          alarmLevel: '警告',
          alarmValue: '12mm',
          threshold: `${config.displacement_threshold}mm`,
          description: `设备 ${deviceId} 测试告警: 位移超过阈值`
        };
        break;
      case '电缆缺失':
        alarmData = {
          alarmType: '电缆缺失',
          alarmLevel: '警告',
          alarmValue: '未检测到电缆',
          threshold: '信号强度 > 50%',
          description: `设备 ${deviceId} 测试告警: 未检测到电缆`
        };
        break;
      case '断电':
        alarmData = {
          alarmType: '断电',
          alarmLevel: '警告',
          alarmValue: '未供电',
          threshold: '电流强度 > 30%',
          description: `设备 ${deviceId} 测试告警: 未供电`
        };
        break;
    }
    
    const id = await Device.addAlarmRecord(deviceId, alarmData);
    await Device.updateDeviceStatus(deviceId, '警告');
    
    res.json({ 
      success: true, 
      message: `设备 ${deviceId} 测试告警已触发`, 
      data: { id, alarm: alarmData } 
    });
  } catch (error) {
    console.error('触发测试告警失败:', error);
    res.status(500).json({ success: false, message: '触发测试告警失败', error: error.message });
  }
});

module.exports = router; 