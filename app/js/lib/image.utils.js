import ColorUtils from "./color.utils";

var ImageUtils = {
  resizeImage: function(img, zoom) {
    let canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    if (zoom <= 0.4 && !img.src.endsWith('.svg')) {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      this.resample_single(canvas, img.width * zoom, img.height * zoom, true);
    } else {
      canvas.width = img.width * zoom;
      canvas.height = img.height * zoom;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    return canvas;
  },

  imageWithOutline: function(image, thickness) {
    var canvas = document.createElement('canvas');
    canvas.width = image.width + 2 * thickness;
    canvas.height = image.height + 2 * thickness;

    var ctx = canvas.getContext('2d');

    var dArr = [-1,-1, 0,-1, 1,-1, -1,0, 1,0, -1,1, 0,1, 1,1]; // offset array

    // draw images at offsets from the array scaled by thickness
    for(var i = 0; i < dArr.length; i += 2)
      ctx.drawImage(image, thickness + dArr[i] * thickness, thickness + dArr[i+1] * thickness);

    // fill with color
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#FF9100";
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // draw original image in normal mode
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(image, thickness, thickness);
    
    return canvas;
  },

  colorImage: function(image, color, background='#ffffff') {
    let colorCanvas = document.createElement('canvas');
    colorCanvas.width = image.width;
    colorCanvas.height = image.height;
    let colorCtx = colorCanvas.getContext('2d');
    colorCtx.drawImage(image, 0, 0);
    let backgroundRgb = ColorUtils.hexToRgb(background);

    var imageData = colorCtx.getImageData(0, 0, image.width, image.height),
        pixels = imageData.data;

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i],
          g = pixels[i+1],
          b = pixels[i+2];

      // turn white to transparent
      pixels[i+3] *=  1 - (r + g + b) / (255 * 3);
    }
    colorCtx.putImageData(imageData, 0, 0);

    colorCtx.globalCompositeOperation = 'source-in';
    colorCtx.fillStyle = color;
    colorCtx.fillRect(0, 0, image.width, image.height);

    let mask = document.createElement('canvas');
    mask.width = image.width;
    mask.height = image.height;
    let maskCtx = mask.getContext('2d');
    maskCtx.drawImage(image, 0, 0);

    imageData = maskCtx.getImageData(0, 0, image.width, image.height),
    pixels = imageData.data;

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i],
          g = pixels[i+1],
          b = pixels[i+2];

      // create white mask
      if (pixels[i+3] != 0) {
        pixels[i] = backgroundRgb.r;
        pixels[i+1] = backgroundRgb.g;
        pixels[i+2] = backgroundRgb.b;
      }
    }
    maskCtx.putImageData(imageData, 0, 0);

    let canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    let ctx = canvas.getContext('2d');

    ctx.drawImage(mask, 0, 0);
    ctx.drawImage(colorCanvas, 0, 0);

    return canvas;
  },

  isGrayImage: function(img) {
    
    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0 );
    
    var imageData = ctx.getImageData(0, 0, img.width, img.height),
        pixels = imageData.data;

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i],
          g = pixels[i+1],
          b = pixels[i+2];
      if( r & g & b != r) {
        return false;
      }
    }
    return true;
  },

  resample_single: function(canvas, width, height, resize_canvas) {
    var width_source = canvas.width;
    var height_source = canvas.height;
    width = Math.round(width);
    height = Math.round(height);

    var ratio_w = width_source / width;
    var ratio_h = height_source / height;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);

    var ctx = canvas.getContext("2d");
    var img = ctx.getImageData(0, 0, width_source, height_source);
    var img2 = ctx.createImageData(width, height);
    var data = img.data;
    var data2 = img2.data;

    for (var j = 0; j < height; j++) {
      for (var i = 0; i < width; i++) {
        var x2 = (i + j * width) * 4;
        var weight = 0;
        var weights = 0;
        var weights_alpha = 0;
        var gx_r = 0;
        var gx_g = 0;
        var gx_b = 0;
        var gx_a = 0;
        var center_y = (j + 0.5) * ratio_h;
        var yy_start = Math.floor(j * ratio_h);
        var yy_stop = Math.ceil((j + 1) * ratio_h);
        for (var yy = yy_start; yy < yy_stop; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy; //pre-calc part of w
          var xx_start = Math.floor(i * ratio_w);
          var xx_stop = Math.ceil((i + 1) * ratio_w);
          for (var xx = xx_start; xx < xx_stop; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);
            if (w >= 1) {
              //pixel too far
              continue;
            }
            //hermite filter
            weight = 2 * w * w * w - 3 * w * w + 1;
            var pos_x = 4 * (xx + yy * width_source);
            //alpha
            gx_a += weight * data[pos_x + 3];
            weights_alpha += weight;
            //colors
            if (data[pos_x + 3] < 255)
              weight = weight * data[pos_x + 3] / 250;
            gx_r += weight * data[pos_x];
            gx_g += weight * data[pos_x + 1];
            gx_b += weight * data[pos_x + 2];
            weights += weight;
          }
        }
        data2[x2] = gx_r / weights;
        data2[x2 + 1] = gx_g / weights;
        data2[x2 + 2] = gx_b / weights;
        data2[x2 + 3] = gx_a / weights_alpha;
      }
    }
    //clear and resize canvas
    if (resize_canvas === true) {
      canvas.width = width;
      canvas.height = height;
    } else {
      ctx.clearRect(0, 0, width_source, height_source);
    }

    //draw
    ctx.putImageData(img2, 0, 0);
  }
}

module.exports = ImageUtils;
