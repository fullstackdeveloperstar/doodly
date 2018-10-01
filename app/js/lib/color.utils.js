var ColorUtils = {
  hexToRgb: function(hex) {
    var hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16) || 0;
    var g = parseInt(hex.substring(2, 4), 16) || 0;
    var b = parseInt(hex.substring(4, 6), 16) || 0;
    
    return {r, g, b}
  },

  rgbToHex: function(rgb) {
    var hex = '#';
    hex += rgb.r.toString(16).padStart(2, '0');
    hex += rgb.g.toString(16).padStart(2, '0');
    hex += rgb.b.toString(16).padStart(2, '0');
    
    return hex;
  }
}

module.exports = ColorUtils;
