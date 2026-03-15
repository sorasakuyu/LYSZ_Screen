const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API配置
const API_KEY = '7ff913a997ea42d5bd3bd8d1840aa0e5';
const BASE_URL = 'https://ny4up3enmw.re.qweatherapi.com';

// 创建数据存储目录
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchWeatherData() {
  try {
    console.log('Fetching weather alert data...');
    // 获取天气预警数据
    const alertResponse = await axios.get(`${BASE_URL}/weatheralert/v1/current/35.05280/118.34733`, {
      headers: {
        'API_KEY': API_KEY
      },
      compress: true
    });
    
    console.log('Fetching weather now data...');
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
    
    // 保存数据到JSON文件
    fs.writeFileSync(
      path.join(dataDir, 'weather-alert.json'),
      JSON.stringify(alertResponse.data, null, 2)
    );
    
    fs.writeFileSync(
      path.join(dataDir, 'weather-now.json'),
      JSON.stringify(weatherResponse.data, null, 2)
    );
    
    console.log('Weather data fetched and saved successfully');
  } catch (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }
}

fetchWeatherData();