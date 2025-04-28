const { pool } = require('../config/database');

class Device {
  // 获取所有设备
  static async getAllDevices() {
    try {
      const [rows] = await pool.query(`
        SELECT d.*, ds.status, ds.water_leak, ds.vibration_level, ds.displacement, 
               ds.cable_present, ds.power_status, ds.last_update
        FROM devices d
        LEFT JOIN device_status ds ON d.device_id = ds.device_id
        ORDER BY d.device_id
      `);
      return rows;
    } catch (error) {
      console.error('获取设备列表失败:', error);
      throw error;
    }
  }

  // 获取单个设备详情
  static async getDeviceById(deviceId) {
    try {
      // 获取设备基本信息
      const [deviceRows] = await pool.query(
        'SELECT * FROM devices WHERE device_id = ?',
        [deviceId]
      );
      
      if (deviceRows.length === 0) {
        return null;
      }
      
      const device = deviceRows[0];
      
      // 获取设备状态
      const [statusRows] = await pool.query(
        'SELECT * FROM device_status WHERE device_id = ?',
        [deviceId]
      );
      
      if (statusRows.length > 0) {
        device.status = statusRows[0];
      }
      
      // 获取漏水监测详情
      const [waterLeakRows] = await pool.query(
        'SELECT * FROM water_leak_details WHERE device_id = ? ORDER BY detected_at DESC LIMIT 1',
        [deviceId]
      );
      
      if (waterLeakRows.length > 0) {
        device.waterLeakInfo = waterLeakRows[0];
      }
      
      // 获取震动检测详情
      const [vibrationRows] = await pool.query(
        'SELECT * FROM vibration_details WHERE device_id = ? ORDER BY detected_at DESC LIMIT 1',
        [deviceId]
      );
      
      if (vibrationRows.length > 0) {
        device.vibrationInfo = vibrationRows[0];
      }
      
      // 获取位移检测详情
      const [displacementRows] = await pool.query(
        'SELECT * FROM displacement_details WHERE device_id = ? ORDER BY detected_at DESC LIMIT 1',
        [deviceId]
      );
      
      if (displacementRows.length > 0) {
        device.displacementInfo = displacementRows[0];
      }
      
      // 获取电缆存在详情
      const [cableRows] = await pool.query(
        'SELECT * FROM cable_details WHERE device_id = ? ORDER BY last_check DESC LIMIT 1',
        [deviceId]
      );
      
      if (cableRows.length > 0) {
        device.cableInfo = cableRows[0];
      }
      
      // 获取通电状态详情
      const [powerRows] = await pool.query(
        'SELECT * FROM power_details WHERE device_id = ? ORDER BY last_check DESC LIMIT 1',
        [deviceId]
      );
      
      if (powerRows.length > 0) {
        device.powerInfo = powerRows[0];
      }
      
      return device;
    } catch (error) {
      console.error('获取设备详情失败:', error);
      throw error;
    }
  }

  // 更新设备状态
  static async updateDeviceStatus(deviceId, statusData) {
    try {
      const { 
        status, waterLeak, vibrationLevel, displacement, 
        cablePresent, powerStatus 
      } = statusData;
      
      // 检查设备状态记录是否存在
      const [existingRows] = await pool.query(
        'SELECT id FROM device_status WHERE device_id = ?',
        [deviceId]
      );
      
      if (existingRows.length > 0) {
        // 更新现有记录
        await pool.query(`
          UPDATE device_status 
          SET status = ?, water_leak = ?, vibration_level = ?, 
              displacement = ?, cable_present = ?, power_status = ?, 
              last_update = CURRENT_TIMESTAMP
          WHERE device_id = ?
        `, [status, waterLeak, vibrationLevel, displacement, cablePresent, powerStatus, deviceId]);
      } else {
        // 创建新记录
        await pool.query(`
          INSERT INTO device_status 
          (device_id, status, water_leak, vibration_level, displacement, cable_present, power_status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [deviceId, status, waterLeak, vibrationLevel, displacement, cablePresent, powerStatus]);
      }
      
      // 检查是否需要创建告警
      await this.checkAndCreateAlerts(deviceId, statusData);
      
      return true;
    } catch (error) {
      console.error('更新设备状态失败:', error);
      throw error;
    }
  }

  // 检查并创建告警
  static async checkAndCreateAlerts(deviceId, statusData) {
    try {
      const { 
        waterLeak, vibrationLevel, displacement, 
        cablePresent, powerStatus 
      } = statusData;
      
      // 获取系统配置
      const [configRows] = await pool.query('SELECT * FROM system_config');
      const config = {};
      configRows.forEach(row => {
        config[row.config_key] = parseFloat(row.config_value);
      });
      
      // 检查漏水告警
      if (waterLeak) {
        await this.createAlert(deviceId, '漏水', '严重', '检测到漏水情况');
      }
      
      // 检查震动告警
      if (vibrationLevel > config.vibration_threshold) {
        await this.createAlert(
          deviceId, 
          '震动', 
          vibrationLevel > config.vibration_threshold * 1.5 ? '严重' : '警告',
          `震动强度 ${vibrationLevel}Hz 超过阈值 ${config.vibration_threshold}Hz`
        );
      }
      
      // 检查位移告警
      if (displacement > config.displacement_threshold) {
        await this.createAlert(
          deviceId, 
          '位移', 
          displacement > config.displacement_threshold * 1.5 ? '严重' : '警告',
          `位移量 ${displacement}mm 超过阈值 ${config.displacement_threshold}mm`
        );
      }
      
      // 检查电缆缺失告警
      if (!cablePresent) {
        await this.createAlert(deviceId, '电缆缺失', '严重', '未检测到电缆存在');
      }
      
      // 检查断电告警
      if (!powerStatus) {
        await this.createAlert(deviceId, '断电', '严重', '设备未通电');
      }
      
      return true;
    } catch (error) {
      console.error('检查告警失败:', error);
      throw error;
    }
  }

  // 创建告警
  static async createAlert(deviceId, alertType, alertLevel, description) {
    try {
      // 检查是否已有相同类型的未处理告警
      const [existingRows] = await pool.query(`
        SELECT id FROM alerts 
        WHERE device_id = ? AND alert_type = ? AND status != '已处理'
      `, [deviceId, alertType]);
      
      if (existingRows.length === 0) {
        // 创建新告警
        await pool.query(`
          INSERT INTO alerts (device_id, alert_type, alert_level, description)
          VALUES (?, ?, ?, ?)
        `, [deviceId, alertType, alertLevel, description]);
      }
      
      return true;
    } catch (error) {
      console.error('创建告警失败:', error);
      throw error;
    }
  }

  // 获取系统概况
  static async getSystemOverview() {
    try {
      // 获取设备总数
      const [deviceCountRows] = await pool.query('SELECT COUNT(*) as total FROM devices');
      const totalDevices = deviceCountRows[0].total;
      
      // 获取异常设备数
      const [abnormalCountRows] = await pool.query(`
        SELECT COUNT(*) as abnormal 
        FROM device_status 
        WHERE status != '正常'
      `);
      const abnormalDevices = abnormalCountRows[0].abnormal;
      
      // 获取漏水告警数
      const [leakAlertRows] = await pool.query(`
        SELECT COUNT(*) as leak 
        FROM device_status 
        WHERE water_leak = TRUE
      `);
      const leakAlerts = leakAlertRows[0].leak;
      
      // 获取震动告警数
      const [vibrationAlertRows] = await pool.query(`
        SELECT COUNT(*) as vibration 
        FROM device_status 
        WHERE vibration_level > (
          SELECT CAST(config_value AS DECIMAL) 
          FROM system_config 
          WHERE config_key = 'vibration_threshold'
        )
      `);
      const vibrationAlerts = vibrationAlertRows[0].vibration;
      
      // 获取位移告警数
      const [displacementAlertRows] = await pool.query(`
        SELECT COUNT(*) as displacement 
        FROM device_status 
        WHERE displacement > (
          SELECT CAST(config_value AS DECIMAL) 
          FROM system_config 
          WHERE config_key = 'displacement_threshold'
        )
      `);
      const displacementAlerts = displacementAlertRows[0].displacement;
      
      // 获取系统状态
      let systemStatus = '正常';
      if (abnormalDevices > totalDevices / 2) {
        systemStatus = '异常';
      } else if (abnormalDevices > 0) {
        systemStatus = '警告';
      }
      
      return {
        systemStatus,
        totalDevices,
        abnormalDevices,
        leakAlerts,
        vibrationAlerts,
        displacementAlerts,
        lastCheckTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取系统概况失败:', error);
      throw error;
    }
  }
}

module.exports = Device; 