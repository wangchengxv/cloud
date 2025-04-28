/**
 * 接地环流数据监测系统后端主应用
 */
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cable_monitoring_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 验证JWT中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '访问令牌无效或已过期' });
    }
    
    req.user = user;
    next();
  });
};

// 记录操作日志
const logOperation = async (userId, operationType, operationDetail, ipAddress) => {
  try {
    await pool.query(
      'INSERT INTO operation_logs (user_id, operation_type, operation_detail, ip_address) VALUES (?, ?, ?, ?)',
      [userId, operationType, operationDetail, ipAddress]
    );
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
};

// 引入路由
const systemRouter = require('./routes/system');
const devicesRouter = require('./routes/devices');
const tableDataRouter = require('./routes/tableData');
const groundLoopRoutes = require('./routes/monitor/ground-loop');
const waterLevelRoutes = require('./routes/monitor/water-level');

// 注册路由
app.use('/api/system', systemRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/example', tableDataRouter);
app.use('/api/monitor/ground-loop', groundLoopRoutes);
app.use('/api/water-level', waterLevelRoutes);

// 路由

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证请求参数
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }
    
    // 查询用户
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    const user = users[0];
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    // 更新最后登录时间
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // 记录操作日志
    await logOperation(user.id, '用户登录', `用户 ${username} 登录系统`, req.ip);
    
    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败', error: error.message });
  }
});

// 获取系统概况
app.get('/api/system/overview', authenticateToken, async (req, res) => {
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
    
    res.json({
      success: true,
      data: {
        systemStatus,
        totalDevices,
        abnormalDevices,
        leakAlerts: leakAlerts[0].count,
        vibrationAlerts: vibrationAlerts[0].count,
        displacementAlerts: displacementAlerts[0].count,
        lastCheckTime: lastCheck[0].last_check || new Date()
      }
    });
  } catch (error) {
    console.error('获取系统概况失败:', error);
    res.status(500).json({ success: false, message: '获取系统概况失败', error: error.message });
  }
});

// 获取所有设备
app.get('/api/devices', authenticateToken, async (req, res) => {
  try {
    const [devices] = await pool.query('SELECT * FROM devices ORDER BY device_id');
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    res.status(500).json({ success: false, message: '获取设备列表失败', error: error.message });
  }
});

// 获取设备详情
app.get('/api/devices/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const [devices] = await pool.query('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    
    if (devices.length === 0) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }
    
    const device = devices[0];
    
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('获取设备详情失败:', error);
    res.status(500).json({ success: false, message: '获取设备详情失败', error: error.message });
  }
});

// 获取设备监测数据
app.get('/api/devices/:deviceId/monitoring', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const [devices] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
    
    if (devices.length === 0) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }
    
    const deviceIdNum = devices[0].id;
    
    const [rows] = await pool.query(
      'SELECT * FROM monitoring_data WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [deviceIdNum]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 没有监测数据` });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('获取设备监测数据失败:', error);
    res.status(500).json({ success: false, message: '获取设备监测数据失败', error: error.message });
  }
});

// 获取设备历史监测数据
app.get('/api/devices/:deviceId/monitoring/history', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 24 } = req.query;
    
    const [devices] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
    
    if (devices.length === 0) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }
    
    const deviceIdNum = devices[0].id;
    
    const [rows] = await pool.query(
      'SELECT * FROM monitoring_data WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?',
      [deviceIdNum, parseInt(limit)]
    );
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取设备历史监测数据失败:', error);
    res.status(500).json({ success: false, message: '获取设备历史监测数据失败', error: error.message });
  }
});

// 添加监测数据
app.post('/api/devices/:deviceId/monitoring', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const data = req.body;
    
    // 验证数据
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: '无效的监测数据' });
    }
    
    // 获取设备ID
    const [devices] = await pool.query('SELECT id FROM devices WHERE device_id = ?', [deviceId]);
    
    if (devices.length === 0) {
      return res.status(404).json({ success: false, message: `设备 ${deviceId} 不存在` });
    }
    
    const deviceIdNum = devices[0].id;
    
    // 获取系统配置
    const [configRows] = await pool.query('SELECT * FROM system_config');
    const config = {};
    
    configRows.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    
    // 添加监测数据
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
    
    // 检查是否需要生成告警并更新设备状态
    let deviceStatus = '正常';
    const alarms = [];
    
    // 检查漏水状态
    if (leakStatus) {
      alarms.push({
        deviceId: deviceIdNum,
        alarmType: '漏水',
        alarmLevel: '警告',
        alarmValue: '检测到漏水',
        threshold: `${config.humidity_threshold}%`,
        description: `设备 ${deviceId} 检测到漏水，湿度指数: ${humidityIndex}%`
      });
      deviceStatus = '警告';
    }
    
    // 检查震动级别
    if (vibrationLevel > parseInt(config.vibration_threshold)) {
      alarms.push({
        deviceId: deviceIdNum,
        alarmType: '震动',
        alarmLevel: '警告',
        alarmValue: `${vibrationLevel}Hz`,
        threshold: `${config.vibration_threshold}Hz`,
        description: `设备 ${deviceId} 震动级别超过阈值，当前: ${vibrationLevel}Hz`
      });
      deviceStatus = '警告';
    }
    
    // 检查位移
    if (displacement > parseFloat(config.displacement_threshold)) {
      alarms.push({
        deviceId: deviceIdNum,
        alarmType: '位移',
        alarmLevel: '警告',
        alarmValue: `${displacement}mm`,
        threshold: `${config.displacement_threshold}mm`,
        description: `设备 ${deviceId} 位移超过阈值，当前: ${displacement}mm`
      });
      deviceStatus = '警告';
    }
    
    // 检查电缆存在状态
    if (!cablePresent) {
      alarms.push({
        deviceId: deviceIdNum,
        alarmType: '电缆缺失',
        alarmLevel: '严重',
        alarmValue: '电缆不存在',
        threshold: '应存在',
        description: `设备 ${deviceId} 检测不到电缆存在`
      });
      deviceStatus = '异常';
    }
    
    // 检查通电状态
    if (!powerStatus) {
      alarms.push({
        deviceId: deviceIdNum,
        alarmType: '断电',
        alarmLevel: '严重',
        alarmValue: '未通电',
        threshold: '应通电',
        description: `设备 ${deviceId} 监测到电缆未通电`
      });
      deviceStatus = '异常';
    }
    
    // 更新设备状态
    await pool.query('UPDATE devices SET status = ? WHERE id = ?', [deviceStatus, deviceIdNum]);
    
    // 记录告警
    for (const alarm of alarms) {
      await pool.query(
        `INSERT INTO alarm_records 
        (device_id, alarm_type, alarm_level, alarm_value, threshold, description) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          alarm.deviceId,
          alarm.alarmType,
          alarm.alarmLevel,
          alarm.alarmValue,
          alarm.threshold,
          alarm.description
        ]
      );
    }
    
    // 记录操作日志
    await logOperation(
      req.user.id,
      '添加监测数据',
      `用户 ${req.user.username} 为设备 ${deviceId} 添加了监测数据`,
      req.ip
    );
    
    res.json({
      success: true,
      message: '监测数据添加成功',
      data: {
        id: result.insertId,
        alarms,
        deviceStatus
      }
    });
  } catch (error) {
    console.error('添加监测数据失败:', error);
    res.status(500).json({ success: false, message: '添加监测数据失败', error: error.message });
  }
});

// 获取告警记录
app.get('/api/alarms', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT ar.*, d.device_id FROM alarm_records ar JOIN devices d ON ar.device_id = d.id';
    const params = [];
    
    if (status) {
      query += ' WHERE ar.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ar.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取告警记录失败:', error);
    res.status(500).json({ success: false, message: '获取告警记录失败', error: error.message });
  }
});

// 更新告警状态
app.put('/api/alarms/:alarmId', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { status } = req.body;
    
    if (!status || !['未处理', '已处理', '已忽略'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的告警状态' });
    }
    
    const [alarm] = await pool.query('SELECT * FROM alarm_records WHERE id = ?', [alarmId]);
    
    if (alarm.length === 0) {
      return res.status(404).json({ success: false, message: `告警记录 ${alarmId} 不存在` });
    }
    
    await pool.query(
      'UPDATE alarm_records SET status = ?, processed_at = NOW(), processed_by = ? WHERE id = ?',
      [status, req.user.username, alarmId]
    );
    
    // 记录操作日志
    await logOperation(
      req.user.id,
      '更新告警状态',
      `用户 ${req.user.username} 将告警记录 ${alarmId} 状态更新为 ${status}`,
      req.ip
    );
    
    res.json({ success: true, message: '告警状态更新成功' });
  } catch (error) {
    console.error('更新告警状态失败:', error);
    res.status(500).json({ success: false, message: '更新告警状态失败', error: error.message });
  }
});

// 获取系统配置
app.get('/api/system/config', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_config');
    
    const config = {};
    rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({ success: false, message: '获取系统配置失败', error: error.message });
  }
});

// 更新系统配置
app.put('/api/system/config', authenticateToken, async (req, res) => {
  try {
    const config = req.body;
    
    // 验证数据
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, message: '无效的配置数据' });
    }
    
    // 验证用户权限
    if (req.user.role !== '管理员') {
      return res.status(403).json({ success: false, message: '没有权限执行此操作' });
    }
    
    for (const [key, value] of Object.entries(config)) {
      await pool.query(
        'UPDATE system_config SET config_value = ? WHERE config_key = ?',
        [value, key]
      );
    }
    
    // 记录操作日志
    await logOperation(
      req.user.id,
      '更新系统配置',
      `用户 ${req.user.username} 更新了系统配置`,
      req.ip
    );
    
    res.json({ success: true, message: '系统配置更新成功' });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ success: false, message: '更新系统配置失败', error: error.message });
  }
});

// 获取用户列表
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // 验证用户权限
    if (req.user.role !== '管理员') {
      return res.status(403).json({ success: false, message: '没有权限执行此操作' });
    }
    
    const [users] = await pool.query('SELECT id, username, name, role, email, phone, last_login, created_at FROM users');
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败', error: error.message });
  }
});

// 创建新用户
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    // 验证用户权限
    if (req.user.role !== '管理员') {
      return res.status(403).json({ success: false, message: '没有权限执行此操作' });
    }
    
    const { username, password, name, role, email, phone } = req.body;
    
    // 验证请求参数
    if (!username || !password || !name || !role) {
      return res.status(400).json({ success: false, message: '用户名、密码、姓名和角色不能为空' });
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password, name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role, email, phone]
    );
    
    // 记录操作日志
    await logOperation(
      req.user.id,
      '创建用户',
      `用户 ${req.user.username} 创建了新用户 ${username}`,
      req.ip
    );
    
    res.json({
      success: true,
      message: '用户创建成功',
      data: {
        id: result.insertId,
        username,
        name,
        role,
        email,
        phone
      }
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ success: false, message: '创建用户失败', error: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    data: null,
    message: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 