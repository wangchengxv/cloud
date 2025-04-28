const { pool } = require('../config/database');

class TableData {
  // 获取表格数据
  static async getTableData() {
    try {
      // 实际项目中应该从数据库中查询数据
      // 这里使用示例数据展示
      const [rows] = await pool.query(`
        SELECT 
          column_a AS columnA,
          column_b AS columnB,
          column_c AS columnC,
          column_d AS columnD
        FROM table_data
      `);
      
      return rows;
    } catch (error) {
      console.error('获取表格数据失败:', error);
      throw error;
    }
  }

  // 返回模拟数据（当数据库表不存在时使用）
  static async getMockTableData() {
    try {
      // 创建临时表并插入数据
      await pool.query(`
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_table_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          column_a VARCHAR(255),
          column_b VARCHAR(255),
          column_c VARCHAR(255),
          column_d VARCHAR(255)
        )
      `);
      
      // 清空临时表
      await pool.query('DELETE FROM temp_table_data');
      
      // 插入模拟数据
      await pool.query(`
        INSERT INTO temp_table_data (column_a, column_b, column_c, column_d) VALUES
        ('数据A1', '数据B1', '数据C1', '数据D1'),
        ('数据A2', '数据B2', '数据C2', '数据D2'),
        ('数据A3', '数据B3', '数据C3', '数据D3'),
        ('数据A4', '数据B4', '数据C4', '数据D4')
      `);
      
      // 查询数据
      const [rows] = await pool.query(`
        SELECT 
          column_a AS columnA,
          column_b AS columnB,
          column_c AS columnC,
          column_d AS columnD
        FROM temp_table_data
      `);
      
      return rows;
    } catch (error) {
      console.error('获取模拟表格数据失败:', error);
      throw error;
    }
  }
}

module.exports = TableData; 