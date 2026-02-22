import pkg from 'pg'
const { Pool } = pkg
import bcrypt from 'bcryptjs'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'auth',
  user: 'postgres',
  password: 'xx090202'
})

pool.on('error', (err) => {
  console.error('数据库连接错误:', err)
})

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  console.log('executed query', { text: text.substring(0, 50), duration, rows: res.rowCount })
  return res
}

export async function initDatabase() {
  try {
    console.log('正在连接数据库...')
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ 数据库表已就绪')

    const result = await query('SELECT COUNT(*) FROM users WHERE username = $1', ['admin'])
    if (parseInt(result.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'super_admin']
      )
      console.log('✅ 已创建默认超级管理员: admin / admin123')
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await query(
        'UPDATE users SET password = $1, role = $2 WHERE username = $3',
        [hashedPassword, 'super_admin', 'admin']
      )
      console.log('✅ 已重置管理员密码: admin / admin123')
    }
  } catch (err) {
    console.error('数据库初始化失败:', err.message)
    console.error('请检查数据库连接配置：')
    console.error('  主机: localhost:5432')
    console.error('  数据库: auth')
    console.error('  用户: postgres')
  }
}

export default pool
