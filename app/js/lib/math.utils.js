var MathUtils = {
  pointInsideRectangle: function(rx, ry, rw, rh, angle, x, y) {
    var angleRad = (angle || 0) * Math.PI / 180;
    var dx = x - rx;
    var dy = y - ry;

    // distance between point and centre of rectangle.
    var h1 = Math.sqrt(dx * dx + dy * dy);

    var currA = Math.atan2(dy, dx);

    // angle of point rotated by the rectangle amount around the centre of rectangle.
    var newA = currA - angleRad;

    // x2 and y2 are the new positions of the point when rotated to offset the rectangles orientation.
    var x2 = Math.cos(newA) * h1 + 0.5 * rw;
    var y2 = Math.sin(newA) * h1 + 0.5 * rh;

    if (x2 >= 0 && x2 <= rw && y2 >= 0 && y2 <= rh)
      return {x: x2, y: y2};
    return null;
  },

  rotatedRectanglePoint: function(rx, ry, rw, rh, angle, x, y) {
    var angleRad = (angle || 0) * Math.PI / 180;
    var dx = x - rx;
    var dy = y - ry;

    // distance between point and centre of rectangle.
    var h1 = Math.sqrt(dx * dx + dy * dy);

    var currA = Math.atan2(dy, dx);

    // angle of point rotated by the rectangle amount around the centre of rectangle.
    var newA = currA + angleRad;

    // x2 and y2 are the new positions of the point when rotated to offset the rectangles orientation.
    var x2 = Math.cos(newA) * h1 + 0.5 * rw;
    var y2 = Math.sin(newA) * h1 + 0.5 * rh;

    return {x: x2, y: y2};
  },

  round: function(number, decimals) {
    return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals)
  },

  pointOnSpiral: function(startX, startY, spacing, iterations, aspectRatio = 1) {
    let step = 0.5;
    let turns = 0;
    let angle = step * iterations;
    let x = Math.round(startX + (turns + spacing * aspectRatio * angle) * Math.cos(angle));
    let y = Math.round(startY + (turns + spacing * angle) * Math.sin(angle));

    return {x, y}
  },
}

module.exports = MathUtils;
