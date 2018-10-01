var $ = require('jquery');
var _ = require('lodash');

import Asset from './asset';
import Hand from '../hands';

import Video from "../models/video";
import ImageUtils from '../lib/image.utils';
import ColorUtils from "../lib/color.utils";

export default class Scene {

  constructor(object, cache, video, onChangeCallback) {
    this.video = video;
    this.id = object.id;
    this.thumb_path = object.thumb_path;
    this.cache = cache || [];
    this.video_id = object.video_id;

    if (object.data && typeof object.data == 'string')
      object.data = JSON.parse(object.data);

    this.path = server_url + (object.type == 'template' ? '/templates/' : '/scenes/');

    this.items = object.items || (object.data && object.data.items ? object.data.items.map(item => new Asset(item, this)) : []);
    this.extraTime = object.data && object.data.extraTime;
    if (this.extraTime == undefined) this.extraTime = 500;

    this.exitAnimation = object.data && object.data.exitAnimation || 'swipe-left';

    this.animationTime = this.items.length > 0 ? _.sum(this.items.map(item => (item.animationDelay || 0) + item.animationDuration)) : 5000;
    this.animationTime += this.extraTime;

    this.order = object.order;

    this.currentData =  this.getDataString();
    this.loadedData = this.currentData;
    this.loadedThumbnailData = this.currentData;
    this.prev_thumbnail_data = this.currentData;

    this.loadedOrder = this.order;
    this.loading = onChangeCallback && (object.loading || true);

    this.chalkImage = new Image();
    this.chalkImage.src = 'images/chalk.png';

    this.history = [];
    this.requiresSave = object.requiresSave || false;

    if (onChangeCallback)
      this.onChangeCallback = onChangeCallback;

    if (this.loading)
      this.load();
    else
      this.updateStatus();
  }

  getDataString() {
    var items = this.items.map(item => _.clone(item));
    items.forEach(item => {
      delete item.paths;
      delete item.scratchPath;
      delete item.diagonalScratchPath;
      delete item.cache;
      delete item.img;
      delete item.cachedImg;
      delete item.previewCache;
      delete item.highlightImg;
      delete item.canvasZoom;
      delete item.previewZoom;
      delete item.canvasStyle;
      delete item.eraseImg;
      delete item.erasing;
      delete item.isGray;
      delete item.scene;
    });

    return JSON.stringify({
      items: items,
      extraTime: this.extraTime,
      exitAnimation: this.exitAnimation
    });
  }

  load() {
    $.get(this.path + this.id)
      .done(scene => {
        if (scene.data)
          scene.data = JSON.parse(scene.data);

        this.items = scene.data && scene.data.items ? scene.data.items : [];

        if (this.items.length > 0) {
          this.items = this.items.map(item => new Asset(item, this));
          this.loadAssetsData(this.items);
        } else {
          delete this.loading;
          this.currentData = this.getDataString();
          this.loadedData = this.currentData;
          this.loadedThumbnailData = this.currentData;
          this.prev_thumbnail_data = this.currentData;
          this.updateStatus();
        }

      })
      .fail((request, textStatus, error) => {
        if (this.onChangeCallback) this.onChangeCallback(request);
      });
  }

  loadAssetsData(assets) {
    if (assets instanceof Array) {
      this.loading = assets.length;
      var id_list = assets.map(item => item.id);

      // load data for all assets at once
      $.get(server_url + '/assets/' + JSON.stringify(id_list))
        .done((assets) => {
          _.each(assets, asset => {
            if (asset.type == 'image' && asset.data) {
              asset.data = JSON.parse(asset.data);
              for (var i = 0; i < this.items.length; i++)
                if (this.items[i].id == asset.id)
                  this.items[i].paths = asset.data.paths;
            }
          })
        });

      // preload assets source
      _.each(assets, asset => asset.preload(() => this.updateLoadingProgress(), this.cache));


    // ----------------
    // NOTE: this only happens when adding one asset to the scene
    // ----------------
    } else {
      this.loading = 1;
      var asset = assets; // semantics
      // load asset data
      $.get(server_url + '/assets/' + asset.id)
        .done((asset_data) => {
          if (asset_data.type == 'image' && asset_data.data) {
            asset_data.data = JSON.parse(asset_data.data);
            asset.paths = asset_data.data.paths;
          }
        });

      // preload asset source
      asset.preload(() => {
        if (asset.type == 'image')
          asset.zoom = _.round(Math.min(1, Math.min(this.canvasSize.width * 0.6/asset.img.width, this.canvasSize.height * 0.6/asset.img.height)), 3);
        delete this.canvasSize;
        delete this.loading;
        this.updateStatus();
      }, this.cache)

    }
  }

  updateLoadingProgress() {
    this.loadingProgress = (this.loadingProgress || 0) + 1;
    if (this.loadingProgress == this.loading) {
      delete this.loading;
      delete this.loadingProgress;

      if (this.addingAssets)
        delete this.addingAssets;
      else {
        this.currentData = this.getDataString();
        this.loadedData = this.currentData;
        this.loadedThumbnailData = this.currentData;
        this.prev_thumbnail_data = this.currentData;
      }

      this.updateStatus();
    }
  }
  updateStatus() {
    this.currentData = this.getDataString();
    this.requiresSave = !this.id || this.loadedData != this.currentData || this.loadedOrder != this.order || this.loadedThumbnailData != this.currentData;
    this.animationTime = _.sum(this.items.map(item => item.animationDelay + item.animationDuration + item.exitAnimationDuration)) || 5000;
    this.animationTime += this.extraTime;

    if (this.loadedThumbnailData != this.currentData)
      this.thumbnail = this.getThumbnail();

    // we are in the context of a canvas
    if (this.onChangeCallback)
      this.onChangeCallback();
  }

  save(callback) {
    var payload = {};

    if (this.loadedData != this.currentData)
      payload.data = this.currentData;

    if (this.loadedThumbnailData != this.currentData)
      payload.thumbnail_data = this.getThumbnailData(this.getThumbnail());

    if (this.order)
      payload.order = this.order;

    if (this.id) {
      if (payload == {})
        callback();
      else
        $.ajax({
          url: this.path + this.id,
          type: 'PUT',
          data: payload,
        })
          .done(() => {
            this.loadedData = this.currentData;
            this.loadedThumbnailData = this.currentData;
            this.loadedOrder = this.order;
            this.updateStatus();
            if (callback) callback();
            if (this.onChangeCallback) this.onChangeCallback();
          })
          .fail((request, textStatus, error) => { if (callback) callback(request) });
    } else {
      payload.video_id = this.video_id;
      $.ajax({
        url: server_url + '/scenes',
        type: 'POST',
        data: payload
      })
        .done(data => {
          this.id = data.id;
          this.thumb_path = data.thumb_path;
          this.loadedOrder = this.order;
          this.loadedData = this.currentData;
          this.loadedThumbnailData = this.currentData;
          this.updateStatus();
          if (callback) callback();
          if (this.onChangeCallback) this.onChangeCallback();
        })
        .fail((request, textStatus, error) => { if (callback) callback(request) });
    }

  }

  addAsset(item, x, y, canvasSize, callback) {
    this.canvasSize = canvasSize;

    if (!x || !y) {
      x = 0.5 + _.random(-1, 1) * 0.05;
      y = 0.5 + _.random(-1, 1) * 0.05;
    }

    if (item.type == 'template') {

      if (this.items.length == 0) {
        var data = JSON.parse(item.data);

        // replace all current items
        this.items = data.items.map(asset => new Asset(asset, this));
        this.addingAssets = true;
        this.loading = this.items.length;
        this.loadAssetsData(this.items);

        if (callback) callback(this.items);
      } else {
        confirm('Current scene is not empty.\nAdding this scene template will remove all existent content from the current scene.\n\nAre you sure you want to continue?')
          .then(() => {
            var data = JSON.parse(item.data);

            // replace all current items
            this.items = data.items.map(asset => new Asset(asset, this));
            this.addingAssets = true;
            this.loading = this.items.length;
            this.loadAssetsData(this.items);

            this.updateStatus();
            if (callback) callback(this.items);
          })
          .fail(() => {
            this.loading = false;
          })
      }
    } else {
      this.loading = 1;
      var asset = new Asset(item, this);

      asset.x = x;
      asset.y = y;

      if (asset.type == 'font' && !asset.text) {
        asset.text = 'Double click to enter text...';
        asset.animationDuration = 1000 * asset.text.length / 20;
        asset.fontSize = 40;
        
        if (this.video && this.video.handStyle == Video.HandStyleLeft) {
          asset.direction = 'rtl';
          asset.align = 'right';
        }
      }

      this.items.push(asset);
      this.loadAssetsData(asset);

      this.updateStatus();
      if (callback) callback(asset);
    }
  }
  removeAssets(items) {
    _.each(items, items => this.items = _.without(this.items, items));
    this.updateStatus();

    this.thumbnail = this.getThumbnail();
  }
  pasteAssets(items) {
    items.filter(item => item.type == 'image' || item.type == 'font')
         .forEach(item => {
           item.canvasStyle = this.cachedCanvasStyle;
           item.x += _.random(-1, 1) * 0.01;
           item.y += _.random(-1, 1) * 0.01;

           let asset = new Asset(item, this);
           asset.preload(() => {
             asset.createImageCache(item.canvasZoom, null, this.cachedCanvasStyle);
           }, this.cache);
           this.items.push(asset);
         });

    this.updateStatus();
  }
  eraseAsset(asset) {
    asset.exitAnimation = 'erase';
    asset.exitAnimationDuration = Math.min(asset.animationDuration, 3000);
  }

  draw(canvas, canvasZoom, hoverTarget, isPreview, canvasStyle, final = false, applyEffects = true) {
    this.cachedMainZoom = canvasZoom;
    this.cachedCanvasStyle = canvasStyle;

    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';

    this.items.forEach(asset => asset.draw(canvas, canvasZoom, asset == hoverTarget, isPreview, canvasStyle));

    if (final) {
      let exitAnimationItems = this.items.filter(item => item.exitAnimation != 'none');
      exitAnimationItems.forEach(asset => asset.drawExit(canvas, canvasZoom, isPreview, canvasStyle));
    }

    if (applyEffects) {
      if (this.getVideoMode() == Video.ModeChalk)
          this.applyChalkboardEffect(canvas);
    }
  }
  drawPartial(canvas, canvasZoom, elapsed, isPreview, canvasStyle, fps = 15, eraseMode) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';

    let sceneItemDrawingDuration = this.items.map(item => item.animationDelay + item.animationDuration).reduce((a,b) => a+b, 0);

    // draw enter animations
    if (elapsed <= 1000 / fps)
      this.eraseCanvasCleanup();

    var accountedFor = 0;
    var erasing = false;
    var handInfo = null;

    for (var i = 0; i < this.items.length; i++) {
      var asset = this.items[i];
      if ((elapsed - accountedFor) >= (asset.animationDelay + asset.animationDuration)) {
        accountedFor += asset.animationDelay + asset.animationDuration;
        asset.draw(canvas, canvasZoom, false, isPreview, canvasStyle);

        if (i >= this.currentlyDrawing) {
          this.eraseCanvasCleanup();
        }

      } else {
        if (elapsed - accountedFor > asset.animationDelay) {
          if (eraseMode != 'off' && asset.type == 'image' && this.currentlyDrawing == undefined) {
            this.currentlyDrawing = i;
            this.eraseCanvasIfNotEmpty(canvas, canvasZoom, isPreview, canvasStyle);
          }

          let ctx = canvas.getContext('2d');
          var progress = 0;
          let erasingTime = this.erasingRequired ? Math.max(600, Math.min(1500, asset.animationDuration * 0.4)) : 0;
          var animationDuration = asset.animationDuration - erasingTime;
          let relativeElapsed = elapsed - accountedFor - asset.animationDelay;

          if (relativeElapsed > 0) {
            if (relativeElapsed <= erasingTime) {
              if (this.erasingRequired) {
                this.erasingCanvasAsset.animationDuration = erasingTime;
                handInfo = this.erasingCanvasAsset.drawPartial(canvas, canvasZoom, relativeElapsed / erasingTime, false, canvasStyle);
                erasing = true;
              }
            } else {
              if (this.erasingRequired)
                this.erasingCanvasAsset.draw(canvas, canvasZoom, false, false, canvasStyle);

              progress = (relativeElapsed - erasingTime) / animationDuration;
              handInfo = asset.drawPartial(canvas, canvasZoom, progress, isPreview, canvasStyle);
            }
          }
        }
        break;
      }
    }

    // draw exit animations
    if (elapsed > sceneItemDrawingDuration) {
      var accountedFor = 0;
      let exitAnimationItems = this.items.filter(item => item.exitAnimation != 'none');
      for (var i=0; i < exitAnimationItems.length; i++) {

        let asset = exitAnimationItems[i];
        let relativeElapsed = elapsed - sceneItemDrawingDuration - accountedFor;

        if (relativeElapsed > asset.exitAnimationDuration) {
          asset.drawExit(canvas, canvasZoom, isPreview, canvasStyle);
          accountedFor += asset.exitAnimationDuration;
        } else {
          erasing = true;
          let progress = relativeElapsed / asset.exitAnimationDuration;
          handInfo = asset.drawExitPartial(canvas, canvasZoom, progress, isPreview, canvasStyle);
          break;
        }
      }
    }

    if (this.getVideoMode() == Video.ModeChalk)
        this.applyChalkboardEffect(canvas);

    if (handInfo) {
      let retVal = { handInfo };
      if (erasing) {
        retVal = {
          ...retVal,
          erasing,
          useFinger: eraseMode == 'finger' || (eraseMode == 'smart' && this.erasedWidth * this.erasedHeight <= canvas.width * canvas.height * 0.03)
        }
      }
      return retVal;
    }
  }

  drawExitAnimation(canvas, canvasZoom, progress, isPreview, canvasStyle) {

    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = canvas.height;
    this.draw(tmpCanvas, canvasZoom, null, isPreview, canvasStyle);

    let alpha = (this.getVideoMode() == Video.ModeChalk) ? 0.04 : 0.06;

    let ctx = canvas.getContext('2d');
    switch (this.exitAnimation) {
      case 'swipe-left':
        for (var i = 30; i > 0 ; i--) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(tmpCanvas, -progress * canvas.width + i * 5 * canvasZoom, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tmpCanvas, -progress * canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        return true;

      case 'swipe-right':
        for (var i = 30; i > 0 ; i--) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(tmpCanvas, progress * canvas.width - i * 5 * canvasZoom, 0, canvas.width, canvas.height);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tmpCanvas, progress * canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        return true;

      case 'swipe-up':
        for (var i = 30; i > 0 ; i--) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(tmpCanvas, 0, -progress * canvas.height + i * 5 * canvasZoom, canvas.width, canvas.height);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tmpCanvas, 0, -progress * canvas.height, canvas.width, canvas.height);
        ctx.restore();

        return true;

      case 'swipe-down':
        for (var i = 30; i > 0 ; i--) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(tmpCanvas, 0, progress * canvas.height - i * 5 * canvasZoom, canvas.width, canvas.height);
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tmpCanvas, 0, progress * canvas.height, canvas.width, canvas.height);
        ctx.restore();

        return true;

      default:
        return false;
    }
  }

  eraseCanvasIfNotEmpty(canvas, canvasZoom, isPreview, canvasStyle) {

    var erasingPixels = null;
    if(this.video) {
      if(this.video.backgroundPixels && 
        (canvasStyle == Video.StyleColorboard || canvasStyle == Video.StyleImageboard) && 
        this.getVideoMode() == Video.ModeMarker) {
        erasingPixels = this.video.backgroundPixels;
      }
    }
    
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    var tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    tempCtx.globalCompositeOperation = 'destination-in';
    this.items[this.currentlyDrawing].draw(tempCanvas, canvasZoom, false, isPreview, canvasStyle);

    var minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    var imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    var pixels = imageData.data;
    var found = false;

    if(erasingPixels) {
      for (var i = 0; i < pixels.length; i += 4) {
        var r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3],
            x = (i/4)%canvas.width, y = Math.ceil(i/4/canvas.width);

        if (a > 0) {
          pixels[i] = erasingPixels[i];
          pixels[i+1] = erasingPixels[i+1];
          pixels[i+2] = erasingPixels[i+2];
          pixels[i+3] = erasingPixels[i+3];
  
          found = true;
  
          minX = Math.min(x, minX);
          minY = Math.min(y, minY);
          maxX = Math.max(x, maxX);
          maxY = Math.max(y, maxY);
        } else {
          pixels[i+3] = 0; // make everything that's not intersecting transparent
        }
      }
    } else {
      for (var i = 0; i < pixels.length; i += 4) {
        var r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3],
            x = (i/4)%canvas.width, y = Math.ceil(i/4/canvas.width);
  
        if (a > 0 && (r < 255 || g < 255 || b < 255)) {

          pixels[i] = 255;
          pixels[i+1] = 255;
          pixels[i+2] = 255;
          pixels[i+3] = 255;

          found = true;
  
          minX = Math.min(x, minX);
          minY = Math.min(y, minY);
          maxX = Math.max(x, maxX);
          maxY = Math.max(y, maxY);
        } else {
          pixels[i+3] = 0; // make everything that's not intersecting transparent
        }
      }
    }

    let erasedWidth = maxX - minX;
    let erasedHeight = maxY - minY;

    if (found && ((erasedWidth >= 10 * canvasZoom) || (erasedHeight >= 10 * canvasZoom))) { // there's something meaninful to erase
      this.erasingRequired = true;
      tempCtx.putImageData(imageData, 0, 0);
      this.erasingCanvasAsset = new Asset({
        type: 'image',
        path: tempCanvas.toDataURL(),
        thumb_path: '',
        zoom: 1 / canvasZoom,
        erasing: true
      }, this);

      this.erasedWidth = erasedWidth;
      this.erasedHeight = erasedHeight;

      if (isPreview)
        this.erasingCanvasAsset.previewCache = tempCanvas;
      else
        this.erasingCanvasAsset.cachedImg = tempCanvas;

      this.erasingCanvasAsset.preload();

    } else {
      this.erasingRequired = false;
    }
  }
  eraseCanvasCleanup() {
    delete this.currentlyDrawing;
    delete this.erasingRequired;
    delete this.erasingCanvasAsset;
    delete this.erasedWidth;
    delete this.erasedHeight;
  }

  updateImageCache(mainZoom, previewZoom, canvasStyle) {
    this.cachedMainZoom = mainZoom;
    this.cachedCanvasStyle = canvasStyle;
    _.each(this.items, asset => asset.createImageCache(mainZoom, previewZoom, canvasStyle));
  }

  getThumbnailData(thumbnail_data) {
    return thumbnail_data.replace(/^data:image\/(png|jpeg);base64,/, '');
  }
  getThumbnail() {
    if (this.prev_thumbnail_data != this.currentData) {
      this.prev_thumbnail_data = this.currentData;

      let canvasStyle = this.cachedCanvasStyle;
      let canvas = document.createElement('canvas');
      let first_image = this.items.filter(item => item.type == 'image')[0];
      if (first_image) {
        let zoom = first_image.cachedImg ? _.round(first_image.cachedImg.width / first_image.img.width / first_image.zoom, 2) : 1;
        canvas.width = 1152 * zoom;
        canvas.height = 648 * zoom;

        this.draw(canvas, zoom, null, false, canvasStyle);

        ImageUtils.resample_single(canvas, 320, 180, true);
      } else {
        canvas.width = 320;
        canvas.height = 180;

        this.draw(canvas, 320 / 1152, null, false, canvasStyle);
      }

      return canvas.toDataURL('image/png');
    } else {
      return this.thumbnail;
    }
  }

  resizeBy(seconds) {
    this.updateStatus();
    this.items.forEach(item => {
      item.animationDelay = Math.max(0, item.animationDelay + (item.animationDelay || 0) / (this.animationTime - this.extraTime) * seconds);
      item.animationDuration = Math.max(0, item.animationDuration + item.animationDuration / (this.animationTime - this.extraTime) * seconds);
    });
    this.updateStatus();
  }

  applyChalkboardEffect(canvas) {
    var ctx = canvas.getContext('2d');
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
        pixels = imageData.data;

    for (var i = 0; i < pixels.length; i += 4) {
      var r = pixels[i],
          g = pixels[i+1],
          b = pixels[i+2],
          a = pixels[i+3];

      // invert colors
      pixels[i] = 255 - r;
      pixels[i+1] = 255 - g;
      pixels[i+2] = 255 - b;
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.chalkImage, 0, 0);
  }

  getVideoBackgroundColor() {
    return (this.video && this.video.background.backgroundColor) || Video.BackgroundDefaultColor;
  }

  getVideoMode() {
    return (this.video && this.video.mode) || Video.ModeMarker;
  }
}

function createChalkImage() {
  var canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  var ctx = canvas.getContext('2d');
  var time = Date.now();
  for (var i = 0; i < 200000; i++) {
    var x = Math.random() * 1920;
    var y = Math.random() * 1080;
    ctx.beginPath();
    ctx.strokeStyle="rgba(255, 255, 255, " + (Math.random() * 0.8)  + ")";
    ctx.strokeSize = Math.random() * 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 2 + 1, y)
    ctx.stroke();
  }
  console.log(Date.now() - time);

  ctx.globalCompositeOperation = 'source-out';
  ctx.fillStyle = 'fff';
  ctx.fillRect(0,0, 1920, 1080);

  var img = new Image();
  img.src = canvas.toDataURL('image/png');

  return img;
}
