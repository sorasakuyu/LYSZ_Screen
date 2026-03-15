const axios = require('axios');
const { setCache } = require('../../cache');

// API配置
const API_KEY = '7ff913a997ea42d5bd3bd8d1840aa0e5';
const BASE_URL = 'https://ny4up3enmw.re.qweatherapi.com';

export default async function handler(req, res) {
  try {
    // 获取天气预警数据
    const alertResponse = await axios.get(`${BASE_URL}/weatheralert/v1/current/35.05280/118.34733`, {
      headers: {
        'API_KEY': API_KEY
      },
      compress: true
    });
    
    // 获取东营天气数据
    const weatherResponse = await axios.get(`${BASE_URL}/v7/weather/now`, {
      params: {
        location: '101120911'
      },
      headers: {
        'API_KEY': API_KEY
      },
      compress: true
    });
    
    // 缓存数据
    setCache('weatherAlert', alertResponse.data);
    setCache('weatherNow', weatherResponse.data);
    
    res.status(200).json({
      success: true,
      message: 'Data fetched and cached successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error.message
    });
  }
}
