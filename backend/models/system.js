const { pool } = require('../config/database');

class System {
  // 获取系统配置
  static async getSystemConfig() {
    try {
      const [rows] = await pool.query('SELECT * FROM system_config');
      
      // 转换为键值对对象
      const config = {};
      rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });
      
      return config;
    } catch (error) {
      console.error('获取系统配置失败:', error);
      throw error;
    }
  }

  // 更新系统配置
  static async updateSystemConfig(key, value) {
    try {
      await pool.query(
        'UPDATE system_config SET config_value = ? WHERE config_key = ?',
        [value, key]
      );
      return true;
    } catch (error) {
      console.error(`更新系统配置 ${key} 失败:`, error);
      throw error;
    }
  }

  // 获取系统概况
  static async getSystemOverview() {
    try {
      // 获取设备总数
      const [deviceCount] = await pool.query('SELECT COUNT(*) as count FROM devices');
      const totalDevices = deviceCount[0].count;
      
      // 获取异常设备数
      const [abnormalCount] = await pool.query(
        'SELECT COUNT(*) as count FROM devices WHERE status IN ("警告", "异常")'
      );
      const abnormalDevices = abnormalCount[0].count;
      
      // 获取各类告警数量
      const [leakAlerts] = await pool.query(
        'SELECT COUNT(*) as count FROM alarm_records WHERE alarm_type = "漏水" AND status = "未处理"'
      );
      
      const [vibrationAlerts] = await pool.query(
        'SELECT COUNT(*) as count FROM alarm_records WHERE alarm_type = "震动" AND status = "未处理"'
      );
      
      const [displacementAlerts] = await pool.query(
        'SELECT COUNT(*) as count FROM alarm_records WHERE alarm_type = "位移" AND status = "未处理"'
      );
      
      // 获取系统状态
      let systemStatus = '正常';
      if (abnormalDevices > 1) {
        systemStatus = '异常';
      } else if (abnormalDevices > 0 || leakAlerts[0].count > 0 || vibrationAlerts[0].count > 0 || displacementAlerts[0].count > 0) {
        systemStatus = '警告';
      }
      
      // 获取最后检查时间
      const [lastCheck] = await pool.query(
        'SELECT MAX(recorded_at) as last_check FROM monitoring_data'
      );
      
      return {
        systemStatus,
        totalDevices,
        abnormalDevices,
        leakAlerts: leakAlerts[0].count,
        vibrationAlerts: vibrationAlerts[0].count,
        displacementAlerts: displacementAlerts[0].count,
        lastCheckTime: lastCheck[0].last_check || new Date()
      };
    } catch (error) {
      console.error('获取系统概况失败:', error);
      throw error;
    }
  }

  // 获取所有设备的最新状态
  static async getAllDevicesStatus() {
    try {
      const [devices] = await pool.query('SELECT device_id, status FROM devices');
      
      const result = [];
      for (const device of devices) {
        const [latestData] = await pool.query(
          'SELECT * FROM monitoring_data WHERE device_id = (SELECT id FROM devices WHERE device_id = ?) ORDER BY recorded_at DESC LIMIT 1',
          [device.device_id]
        );
        
        result.push({
          deviceId: device.device_id,
          status: device.status,
          data: latestData[0] || null
        });
      }
      
      return result;
    } catch (error) {
      console.error('获取所有设备状态失败:', error);
      throw error;
    }
  }

  // 获取最近的告警记录
  static async getRecentAlarms(limit = 10) {
    try {
      const [rows] = await pool.query(
        `SELECT ar.*, d.device_id 
         FROM alarm_records ar 
         JOIN devices d ON ar.device_id = d.id 
         ORDER BY ar.created_at DESC 
         LIMIT ?`,
        [limit]
      );
      
      return rows;
    } catch (error) {
      console.error('获取最近告警记录失败:', error);
      throw error;
    }
  }
}

module.exports = System; 