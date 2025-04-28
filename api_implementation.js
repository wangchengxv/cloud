// Example backend implementation using Node.js and Express with MySQL
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const router = express.Router();

// Create connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'monitoring_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get system overview data for dashboard
router.get('/system-overview', async (req, res) => {
  try {
    // Using stored procedure
    const [rows] = await pool.execute('CALL get_system_overview()');
    
    if (rows && rows[0] && rows[0].length > 0) {
      // Format the lastCheckTime
      const data = rows[0][0];
      if (data.lastCheckTime) {
        data.lastCheckTime = new Date(data.lastCheckTime).toLocaleString('zh-CN');
      }
      
      res.json(data);
    } else {
      // When no data found, return null to let frontend handle "no data" display
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching system overview:', error);
    res.status(500).json({ message: 'Failed to fetch system overview data' });
  }
});

// Alternative implementation using the view
router.get('/system-overview-alt', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM dashboard_overview');
    
    if (rows && rows.length > 0) {
      // Format the lastCheckTime
      const data = rows[0];
      if (data.lastCheckTime) {
        data.lastCheckTime = new Date(data.lastCheckTime).toLocaleString('zh-CN');
      }
      
      res.json(data);
    } else {
      // When no data found, return null to let frontend handle "no data" display
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching system overview:', error);
    res.status(500).json({ message: 'Failed to fetch system overview data' });
  }
});

// Get detailed device list
router.get('/devices', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM alerts a WHERE a.device_id = d.id AND a.status IN ('未处理', '已确认')) as alert_count
      FROM monitoring_devices d
      ORDER BY d.status = '异常' DESC, d.device_code
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Failed to fetch device data' });
  }
});

// Get active alerts
router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, d.device_name, d.device_code, d.location 
      FROM alerts a
      JOIN monitoring_devices d ON a.device_id = d.id
      WHERE a.status IN ('未处理', '已确认')
      ORDER BY a.alert_level DESC, a.occurred_at DESC
    `);
    
    // Format dates
    rows.forEach(alert => {
      alert.occurred_at = new Date(alert.occurred_at).toLocaleString('zh-CN');
    });
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alert data' });
  }
});

// Refresh system status (simulate checking the system)
router.post('/refresh-system', async (req, res) => {
  try {
    await pool.execute('INSERT INTO system_status (status, last_check_time) VALUES (?, NOW())', 
                      ['正常']);
    
    res.json({ success: true, message: '系统状态已更新' });
  } catch (error) {
    console.error('Error refreshing system status:', error);
    res.status(500).json({ message: 'Failed to refresh system status' });
  }
});

module.exports = router;

// Example usage in an Express app:
/*
const express = require('express');
const app = express();
const monitoringRoutes = require('./routes/monitoring');

app.use(cors());
app.use(express.json());
app.use('/api/monitor', monitoringRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/ 