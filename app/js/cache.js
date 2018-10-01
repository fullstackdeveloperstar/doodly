var Cache = {
  get: function(key, subkey) {
    var cache = JSON.parse(localStorage.cache || '{}');
    if (subkey) {
      if (!cache[key]) return false;
      return cache[key][subkey];
    } else
      return cache[key];
  },

  put: function(key, object) {
    var cache = JSON.parse(localStorage.cache || '{}');
    cache[key] = object;

    localStorage.setItem('cache', JSON.stringify(cache));
  },

  putSub: function(key, subkey, object) {
    var cache = JSON.parse(localStorage.cache || '{}');
    var subcache = cache[key] || {};
    subcache[subkey] = object;
    cache[key] = subcache;
    localStorage.setItem('cache', JSON.stringify(cache));
  },

  remove: function(key) {
    let cache = JSON.parse(localStorage.cache || '{}');
    delete cache[key];
    
    localStorage.setItem('cache', JSON.stringify(cache));
  }
}

module.exports = Cache;
