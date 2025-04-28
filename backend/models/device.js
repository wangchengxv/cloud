const { pool } = require('../config/database');

class Device {
  // 获取所有设备
  static async getAllDevices() {
    try {
      const [rows] = await pool.query('SELECT * FROM devices ORDER BY device_id');
      return rows;
    } catch (error) {
      console.error('获取设备列表失败:', error);
      throw error;
    }
  }

  // 根据设备ID获取设备
  static async getDeviceByDeviceId(deviceId) {
    try {
      const [rows] = await pool.query('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
      return rows[0] || null;
    } catch (error) {
      console.error(`获取设备 ${deviceId} 失败:`, error);
      throw error;
    }
  }

  // 获取设备最新监测数据
  static async getLatestMonitoringData(deviceId) {
    try {
      const [device] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
      
      if (!device.length) {
        return null;
      }
      
      const deviceIdNum = device[0].id;
      const [rows] = await pool.query(
        'SELECT * FROM monitoring_data WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1',
        [deviceIdNum]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error(`获取设备 ${deviceId} 监测数据失败:`, error);
      throw error;
    }
  }

  // 获取设备历史监测数据
  static async getHistoricalData(deviceId, limit = 24) {
    try {
      const [device] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
      
      if (!device.length) {
        return [];
      }
      
      const deviceIdNum = device[0].id;
      const [rows] = await pool.query(
        'SELECT * FROM monitoring_data WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?',
        [deviceIdNum, limit]
      );
      
      return rows;
    } catch (error) {
      console.error(`获取设备 ${deviceId} 历史数据失败:`, error);
      throw error;
    }
  }

  // 更新设备状态
  static async updateDeviceStatus(deviceId, status) {
    try {
      await pool.query(
        'UPDATE devices SET status = ? WHERE device_id = ?',
        [status, deviceId]
      );
      return true;
    } catch (error) {
      console.error(`更新设备 ${deviceId} 状态失败:`, error);
      throw error;
    }
  }

  // 添加监测数据
  static async addMonitoringData(deviceId, data) {
    try {
      const [device] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
      
      if (!device.length) {
        throw new Error(`设备 ${deviceId} 不存在`);
      }
      
      const deviceIdNum = device[0].id;
      const {
        leakStatus,
        humidityIndex,
        vibrationLevel,
        displacement,
        cablePresent,
        signalStrength,
        powerStatus,
        currentStrength
      } = data;
      
      const [result] = await pool.query(
        `INSERT INTO monitoring_data 
        (device_id, leak_status, humidity_index, vibration_level, displacement, 
         cable_present, signal_strength, power_status, current_strength) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deviceIdNum,
          leakStatus,
          humidityIndex,
          vibrationLevel,
          displacement,
          cablePresent,
          signalStrength,
          powerStatus,
          currentStrength
        ]
      );
      
      return result.insertId;
    } catch (error) {
      console.error(`添加设备 ${deviceId} 监测数据失败:`, error);
      throw error;
    }
  }

  // 获取设备告警记录
  static async getAlarmRecords(deviceId, limit = 10) {
    try {
      const [device] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
      
      if (!device.length) {
        return [];
      }
      
      const deviceIdNum = device[0].id;
      const [rows] = await pool.query(
        'SELECT * FROM alarm_records WHERE device_id = ? ORDER BY created_at DESC LIMIT ?',
        [deviceIdNum, limit]
      );
      
      return rows;
    } catch (error) {
      console.error(`获取设备 ${deviceId} 告警记录失败:`, error);
      throw error;
    }
  }

  // 添加告警记录
  static async addAlarmRecord(deviceId, alarmData) {
    try {
      const [device] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
      
      if (!device.length) {
        throw new Error(`设备 ${deviceId} 不存在`);
      }
      
      const deviceIdNum = device[0].id;
      const {
        alarmType,
        alarmLevel,
        alarmValue,
        threshold,
        description
      } = alarmData;
      
      const [result] = await pool.query(
        `INSERT INTO alarm_records 
        (device_id, alarm_type, alarm_level, alarm_value, threshold, description) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          deviceIdNum,
          alarmType,
          alarmLevel,
          alarmValue,
          threshold,
          description
        ]
      );
      
      return result.insertId;
    } catch (error) {
      console.error(`添加设备 ${deviceId} 告警记录失败:`, error);
      throw error;
    }
  }
}

module.exports = Device; 