const { getCache } = require('../../../../cache');

export default function handler(req, res) {
  // 验证API_KEY
  const apiKey = req.headers['api_key'];
  if (apiKey !== '7ff913a997ea42d5bd3bd8d1840aa0e5') {
    return res.status(401).json({
      code: '401',
      message: 'Unauthorized'
    });
  }
  
  // 获取缓存的天气数据
  const weatherData = getCache('weatherNow');
  
  if (weatherData) {
    res.status(200).json(weatherData);
  } else {
    res.status(503).json({
      code: '503',
      message: 'No data available, please try again later'
    });
  }
}
