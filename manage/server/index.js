import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, initDatabase } from './db.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'kaguya-secret-key-2026';

app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'token无效' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }
  next();
};

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  try {
    console.log('登录请求:', username)
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      console.log('用户不存在:', username)
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('密码错误:', username)
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('登录成功:', username)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('登录错误:', err.message)
    res.status(500).json({ success: false, message: '服务器错误: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('获取用户列表错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  if (!['super_admin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ success: false, message: '角色无效' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, hashedPassword, role]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    console.error('创建用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: '用户名不能为空' });
  }

  if (role && !['super_admin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ success: false, message: '角色无效' });
  }

  try {
    let updateQuery = 'UPDATE users SET username = $1';
    const params = [username];
    let paramIndex = 2;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, password = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    if (role) {
      updateQuery += `, role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, username, role, created_at`;
    params.push(id);

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    console.error('更新用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: '只有超级管理员可以删除用户' });
  }

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: '不能删除自己' });
  }

  try {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.put('/api/users/:id/password', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (parseInt(id) !== req.user.id) {
    return res.status(403).json({ success: false, message: '只能修改自己的密码' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '请提供当前密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '新密码长度至少6位' });
  }

  try {
    const result = await query('SELECT password FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '当前密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalUsers: 1248,
    activeUsers: 892,
    newUsers: 156,
    revenue: 45680,
    orders: 324,
    growth: 12.5
  });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  });
});
