var Operations = {
  boxesForGauss: function(sigma, n)  // standard deviation, number of boxes
  {
      var wIdeal = Math.sqrt((12*sigma*sigma/n)+1);  // Ideal averaging filter width
      var wl = Math.floor(wIdeal);  if(wl%2==0) wl--;
      var wu = wl+2;

      var mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4);
      var m = Math.round(mIdeal);

      var sizes = [];  for(var i=0; i<n; i++) sizes.push(i<m?wl:wu);
      return sizes;
  },
  gaussBlur: function(scl, tcl, w, h, r) {
      var bxs = this.boxesForGauss(r, 3);
      this.boxBlur (scl, tcl, w, h, (bxs[0]-1)/2);
      this.boxBlur (tcl, scl, w, h, (bxs[1]-1)/2);
      this.boxBlur (scl, tcl, w, h, (bxs[2]-1)/2);
  },
  boxBlur: function(scl, tcl, w, h, r) {
      for(var i=0; i<scl.length; i++) tcl[i] = scl[i];
      this.boxBlurH(tcl, scl, w, h, r);
      this.boxBlurT(scl, tcl, w, h, r);
  },
  boxBlurH: function(scl, tcl, w, h, r) {
      var iarr = 1 / (r+r+1);
      for(var i=0; i<h; i++) {
          var ti = i*w, li = ti, ri = ti+r;
          var fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
          for(var j=0; j<r; j++) val += scl[ti+j];
          for(var j=0  ; j<=r ; j++) { val += scl[ri++] - fv       ;   tcl[ti++] = Math.round(val*iarr); }
          for(var j=r+1; j<w-r; j++) { val += scl[ri++] - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
          for(var j=w-r; j<w  ; j++) { val += lv        - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
      }
  },
  boxBlurT: function(scl, tcl, w, h, r) {
      var iarr = 1 / (r+r+1);
      for(var i=0; i<w; i++) {
          var ti = i, li = ti, ri = ti+r*w;
          var fv = scl[ti], lv = scl[ti+w*(h-1)], val = (r+1)*fv;
          for(var j=0; j<r; j++) val += scl[ti+j*w];
          for(var j=0  ; j<=r ; j++) { val += scl[ri] - fv     ;  tcl[ti] = Math.round(val*iarr);  ri+=w; ti+=w; }
          for(var j=r+1; j<h-r; j++) { val += scl[ri] - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ri+=w; ti+=w; }
          for(var j=h-r; j<h  ; j++) { val += lv      - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ti+=w; }
      }
  },
};

var ImageEffects = {
  GaussianBlur: function(canvas, radius) {
    var ctx = canvas.getContext('2d');

    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var r = [], g = [], b = [], a = [];
    for (var i = 0; i<imgData.data.length; i++) {
      if (i%4 == 0) r.push(imgData.data[i]);
      if (i%4 == 1) g.push(imgData.data[i]);
      if (i%4 == 2) b.push(imgData.data[i]);
      if (i%4 == 3) a.push(imgData.data[i]);
    };

    var or = [], og = [], ob = [], oa = [];
    Operations.gaussBlur(r, or, canvas.width, canvas.height, radius);
    Operations.gaussBlur(g, og, canvas.width, canvas.height, radius);
    Operations.gaussBlur(b, ob, canvas.width, canvas.height, radius);
    Operations.gaussBlur(a, oa, canvas.width, canvas.height, radius);

    var outImgData = ctx.createImageData(canvas.width, canvas.height);
    for (var i = 0; i<imgData.data.length; i+=4) {
      outImgData.data[i]   = or[i/4];
      outImgData.data[i+1] = og[i/4];
      outImgData.data[i+2] = ob[i/4];
      outImgData.data[i+3] = oa[i/4];
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(outImgData, 0, 0);

  }
};


module.exports = ImageEffects;
