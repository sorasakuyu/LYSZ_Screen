// 内存缓存，用于暂存天气数据
const cache = {
  weatherAlert: null,
  weatherNow: null,
  lastUpdated: {
    weatherAlert: null,
    weatherNow: null
  }
};

// 设置缓存数据
exports.setCache = (key, data) => {
  cache[key] = data;
  cache.lastUpdated[key] = new Date();
};

// 获取缓存数据
exports.getCache = (key) => {
  return cache[key];
};

// 获取最后更新时间
exports.getLastUpdated = (key) => {
  return cache.lastUpdated[key];
};
