const clipBoard = {
  get: function() {
    return localStorage.clipBoard && JSON.parse(localStorage.clipBoard);
  },

  put: function(object) {
    localStorage.setItem('clipBoard', JSON.stringify(object));
  },

}

module.exports = clipBoard;
