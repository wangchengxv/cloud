const express = require('express');
const router = express.Router();
const TableData = require('../models/tableData');

// 获取表格数据
router.get('/table-data', async (req, res) => {
  try {
    let data;
    
    try {
      // 尝试从真实数据库表获取数据
      data = await TableData.getTableData();
    } catch (error) {
      console.warn('从真实表获取数据失败，使用模拟数据:', error);
      // 如果真实表不存在或查询失败，使用模拟数据
      data = await TableData.getMockTableData();
    }
    
    res.json({
      code: 0,
      message: 'success',
      data: data
    });
  } catch (error) {
    console.error('获取表格数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取表格数据失败',
      error: error.message
    });
  }
});

module.exports = router; 