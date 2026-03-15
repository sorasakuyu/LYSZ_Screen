const { getCache } = require('../../../../../cache');

export default function handler(req, res) {
  // 验证API_KEY
  const apiKey = req.headers['api_key'];
  if (apiKey !== '7ff913a997ea42d5bd3bd8d1840aa0e5') {
    return res.status(401).json({
      code: '401',
      message: 'Unauthorized'
    });
  }
  
  // 获取缓存的天气预警数据
  const weatherAlertData = getCache('weatherAlert');
  
  if (weatherAlertData) {
    res.status(200).json(weatherAlertData);
  } else {
    res.status(503).json({
      code: '503',
      message: 'No data available, please try again later'
    });
  }
}
