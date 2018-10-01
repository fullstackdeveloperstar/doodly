import $ from 'jquery';
import _ from 'lodash';

import Hand from '../hands';

import Scene from './scene';
import Sound from './sound';

require('../lib/string.utils.js');
import MathUtils from '../lib/math.utils.js';

const SCENE_EXIT_TIME = 500;

export default class Video {

  static ChalkboardBlackImgSrc = 'images/Chalkboard-background.jpg';
  static ChalkboardGreenImgSrc = 'images/Chalkboard-background-green.jpg';
  static BackgroundDefaultColor = '#ffffff';
  
  static BackgroundTypeImage = 'image';
  static BackgroundTypeColor = 'color';
  
  static StyleWhiteboard = 'whiteboard';
  static StyleGlassboard = 'glassboard';
  static StyleBlackboard = 'blackboard';
  static StyleGreenboard = 'greenboard';
  static StyleImageboard = 'imageboard';
  static StyleColorboard = 'colorboard';

  static ModeChalk = 'chalk';
  static ModeMarker = 'marker';

  static HandStyleRight = 'right';
  static HandStyleLeft = 'left';

  constructor(item, onLoadCallback) {

    this.background = null;
    this.backgroundPixels = null;

    this.id = item.id;
    this.user_id = item.user_id;
    this.title = item.title;
    this.path = server_url + '/videos/' + item.id;
    this.style = item.style;
    this.videoEnd = item.video_end || 'both';
    this.onLoadCallback = onLoadCallback;
    this.selectedScene = 0;
    this.scenes = item.scenes;
    this.isBackgroundImageChanged = false;

    this.eraseMode = item.erase_mode != undefined ? item.erase_mode : 'smart';
    this.sceneTransition = item.scene_transition || 'swipe-left';

    this.cache = item.cache || [];

    if (this.style == Video.StyleColorboard || this.style == Video.StyleImageboard) {
      if(item.mode) {
        this.mode = item.mode;
      } else {
        this.mode = Video.ModeMarker;
      }
    } else if(this.style == Video.StyleBlackboard || this.style == Video.StyleGreenboard) {
      this.mode = Video.ModeChalk;
    } else {
      this.mode = Video.ModeMarker;
    }

    this.handStyle = item.hand_style || Video.HandStyleRight;

    let handsForCurrentStyle = (this.style == 'whiteboard' ? Hand.sets.whiteboard : Hand.sets.blackboard);
    this.handSet = handsForCurrentStyle.length > item.hand_set ? item.hand_set : 0;

    Hand.useSet(this.handSet, this.style, this.mode);

    if (item.data && typeof item.data == 'string')
      item.data = JSON.parse(item.data);

    this.music = (item.data && item.data.music) ? item.data.music.map(audio => new Sound(audio)) : [];
    this.volumes = (item.data && item.data.volumes) || [1, 1];

    if (this.scenes)
      this.loadedData = this.currentDataString();

    this.loadedProperties = this.currentProperties();

    this.load((errorRequest) => {
      if (!errorRequest) {
        this.loadSceneData();
      } else
        this.onLoadCallback(errorRequest);
    })
  }

  static LoadBackground(video) {
    return new Promise((resolve, reject) => {
      if(video.style == 'colorboard') {
        resolve({
          type: Video.BackgroundTypeColor,
          backgroundColor: video.custom_background
        });
      } else if (video.style == 'whiteboard' || video.style == 'glassboard') {
        resolve({
          type: Video.BackgroundTypeColor,
          backgroundColor: Video.BackgroundDefaultColor
        });
      } else {
        var backgroundImage = new Image();
        if (video.style == 'imageboard') {
          backgroundImage.src = video.custom_background;
        } else if (video.style == 'blackboard') {
          backgroundImage.src = Video.ChalkboardBlackImgSrc;
        } else if (video.style == 'greenboard') {
          backgroundImage.src = Video.ChalkboardGreenImgSrc;
        }
        backgroundImage.onload = () => {
          resolve({
            type: Video.BackgroundTypeImage,
            backgroundImage: backgroundImage
          });
        };
        backgroundImage.onerror = () => {
          resolve({
            type: Video.BackgroundTypeImage,
            backgroundImage: backgroundImage
          });
        };
      }
    });
  }

  load(callback) {
    this.loading = true;
    $.get(this.path)
      .done(video => {
        
        Video.LoadBackground(video).then((background) => {
          this.background = background;
          
          this.scenes = video.scenes.map((scene, i) => {
            scene.order = i + 1;
            return new Scene(scene, this.cache, this);
          });
          callback();
        });
      })
      .fail((request, statusText, error) => callback(request));
  }

  loadSceneData() {
    var item_ids = _.uniq(_.flatten(this.scenes.map(scene => scene.items.map(item => item.id))));
    if (item_ids.length > 0) {
      $.get(server_url + '/assets/' + JSON.stringify(item_ids))
        .done(assets => {

          this.loading_items = _.flatten(this.scenes.map(scene => scene.items));

          _.each(assets, asset => {
            if (asset.type == 'image' && asset.data) {
              asset.data = JSON.parse(asset.data);
              for (var i = 0; i < this.loading_items.length; i++) {
                var item = this.loading_items[i];
                if (item.id == asset.id)
                  item.paths = asset.data.paths;
              }
            }
          })

          this.loading_items = this.loading_items.length;
          _.each(this.scenes, scene => {
            scene.loading = scene.items.length;
            for (var i = 0; i < scene.items.length; i++) {
              scene.items[i].preload(() => {
                scene.updateLoadingProgress();
                this.loading_items--;
                if (this.loading_items == 0) {
                  delete this.loading_items;
                  this.loadedScenes = JSON.stringify(this.scenes.map(scene => scene.loadedData || JSON.stringify([])));
                  this.updateStatus();
                  this.onLoadCallback();
                }
              }, scene.cache);
            }
          })
          this.loadedData = this.currentDataString();
          delete this.loading;
          this.onLoadCallback();
        })
        .fail((request, statusText, error) => this.onLoadCallback(request));
    } else {
      delete this.loading;
      this.loadedScenes = JSON.stringify(this.scenes.map(scene => scene.loadedData || JSON.stringify([])));
      this.loadedData = this.currentDataString();
      this.updateStatus();
      this.onLoadCallback();
    }
  }

  save(callback) {
    this.saveCallback = callback;
    $('.toast').html('Saving...').fadeIn(500, () => {

      let scenesToSave = this.scenes.filter(scene => scene.requiresSave);
      let soundsToUpload = this.music.filter(sound => sound.path.startsWith('blob'));
      this.saving = scenesToSave.length + soundsToUpload.length;
      this.toSave = this.saving;

      scenesToSave.forEach(scene => {
        scene.save((errorRequest) => {
          if (!errorRequest) {
            this.saving--;
            this.updateSaving();
          } else {
            console.log(errorRequest);
            delete this.saving;
            delete this.deleting;
            delete this.savingMetadata;
            this.updateStatus();
            $('.toast').hide();
            alert('We have encountered a problem while trying to save the video. Please try saving again!');
            if (this.saveCallback) this.saveCallback(errorRequest);
          }
        });
      })

      soundsToUpload.forEach(sound => {
        sound.save(this, (errorRequest) => {
          if (!errorRequest) {
            this.saving--;
            this.updateSaving();
          } else {
            console.log(errorRequest);
            delete this.saving;
            delete this.deleting;
            delete this.savingMetadata;
            this.updateStatus();
            $('.toast').hide();
            alert('We have encountered a problem while trying to save the video. Please try saving again!');
            if (this.saveCallback) this.saveCallback(errorRequest);            
          }
        })
      })

      if (this.deletedScenes) {
        this.deletedScenes = this.deletedScenes.filter(scene => !!scene.id);
        this.deleting = this.deletedScenes.length;
        this.toDelete = this.deleting;
        this.deletedScenes.forEach(scene => {
          $.ajax({
            url: scene.path + scene.id,
            method: 'DELETE'
          })
            .always(() => {
              this.deleting--;
              this.updateSaving();
            });
        });
      }

      if (this.toSave == 0 && !this.deletedScenes)
        this.saveMetadata();

    });
  }

  saveMetadata() {
    this.savingMetadata = true;
    
    var params = {
      title: this.title,
      style: this.style,
      hand_set: this.handSet,
      hand_style: this.handStyle,
      video_end: this.videoEnd,
      erase_mode: this.eraseMode,
      scene_transition: this.sceneTransition,
      data: this.currentDataString()
    };

    // background
    if (this.style == Video.StyleColorboard) {
      params.background = this.background.backgroundColor;
    } else if (this.style == Video.StyleImageboard) {
      if(this.isBackgroundImageChanged) {
        params.background = this.background.backgroundImage.src;
      }
    } else {
      params.background = null;
    }

    // mode
    if (this.style == Video.StyleColorboard || this.style == Video.StyleImageboard) {
      params.mode = this.mode;
    } else {
      params.mode = null;
    }

    $.ajax({
      url: this.path,
      method: 'PUT',
      data: params
    }).done(video => {
      delete this.savingMetadata;
      this.loadedProperties = this.currentProperties();
      this.finishedSaving();
    }).fail((errorRequest, statusText, error) => {
      if (this.saveCallback) this.saveCallback(errorRequest);
    })
  }

  updateSaving() {
    if (this.saving || this.deleting) {
      $('.toast').html('Saving... ' + Math.round(
        (
          (this.toDelete ? (this.toDelete - this.deleting) : 0) +
          (this.toSave ? (this.toSave - this.saving) : 0)
        ) /
        ((this.toDelete || 0) + (this.toSave || 0) )
        * 100
      ) + '%');
    } else {
      this.saveMetadata();
    }
  }

  finishedSaving() {
    if (this.saving > 0) return;
    if (this.deleting > 0) return;
    if (this.savingMetadata) return;

    this.loadedData = this.currentDataString();
    this.loadedScenes = JSON.stringify(this.scenes.map(scene => scene.loadedData || JSON.stringify([])));
    this.updateStatus();
    if (this.saveCallback) {
      this.saveCallback();
      delete this.saveCallback;
    }

    $('.toast').html('Saved successfully').show();
    setTimeout(() => { $('.toast').fadeOut(500) }, 2000);
  }

  toFilename() {
    let fileName = this.title
      .replaceAll(' ', '_')
      .replaceAll('/', '.')
      .replaceAll('\\', '.')

    return fileName + '.mp4';
  }

  currentDataString() {
    this.musicTime = _.max(this.music.map(audio => audio.startTime + audio.playableDuration())) || 0;
    this.animationTime = _.sum(this.scenes.map((scene, i) =>
      (scene.animationTime || 5000) +
      (scene.exitAnimation != 'none' ? SCENE_EXIT_TIME : 0)
    )) - SCENE_EXIT_TIME; // last frame can't have exit animation

    this.musicTime = Math.ceil(this.musicTime / 1000) * 1000;
    this.animationTime = Math.ceil(this.animationTime / 1000) * 1000;

    this.totalTime = this.videoEnd == 'both' ? Math.max(this.musicTime, this.animationTime) : this.animationTime;

    return JSON.stringify({
      scenes: this.scenes.length,
      length: Math.round(this.videoEnd == 'both' ? Math.max(this.animationTime, this.musicTime) : this.animationTime),
      music: this.music.map(sound => sound.exportable()),
      volumes: this.volumes
    });
  }

  currentProperties() {
    return JSON.stringify({
      title: this.title,
      style: this.style,
      handSet: this.handSet,
      videoEnd: this.videoEnd,
      sceneTransition: this.sceneTransition,
      eraseMode: this.eraseMode
    });
  }

  updateStatus() {
    let currentData = this.currentDataString();
    let currentScenes = JSON.stringify(this.scenes.map(scene => scene.currentData));
    let currentProperties = this.currentProperties();

    this.requiresSave = this.loadedScenes != currentScenes || this.loadedData != currentData || this.loadedProperties != currentProperties;
  }

  addScene(callback) {
    this.scenes.push(new Scene({
      thumb_path: null,
      video_id: this.id,
      order: _.max(this.scenes.map(scene => scene.order)) + 1,
      requiresSave: true,
    }, this.cache, this));
    this.selectedScene = this.scenes.length - 1;
    this.updateStatus();
    this.onLoadCallback();
  }

  duplicateScene(index) {
    let scene = this.scenes[index];

    let newScene = new Scene({
      thumb_path: scene.thumb_path,
      video_id: this.id,
      items: _.cloneDeep(scene.items)
    }, this.cache, this);

    newScene.thumbnail = scene.thumbnail;

    // removed erased assets
    newScene.items = newScene.items.filter(asset => asset.exitAnimation != 'erase');

    newScene.items.map(asset => {
      asset.entryAnimation = 'draw';
      asset.animationDuration = 0;
      asset.animationDelay = 0;
      asset.preload(null, this.cache);
    });

    delete newScene.loadedData;

    this.scenes[index].exitAnimation = 'none';

    this.scenes.splice(index + 1, 0, newScene);
    this.updateSceneOrder();

    this.selectedScene = index + 1;
    this.updateStatus();
    this.onLoadCallback();
  }

  selectScene(index) {
    this.selectedScene = index;
    this.onLoadCallback();
  }

  deleteScene(index) {
    var deleted_scene = this.scenes.splice(index, 1)[0];
    if (this.scenes.length == 0)
      this.addScene();

    this.updateSceneOrder();

    if (this.selectedScene == index)
      this.selectedScene = Math.min(index, this.scenes.length - 1);

    this.updateStatus();
    this.onLoadCallback();

    if (!this.deletedScenes) this.deletedScenes = [];
    this.deletedScenes.push(deleted_scene);
  }

  updateSceneOrder() {
    this.scenes.map((scene, i) => {
      scene.order = i + 1;
      scene.updateStatus();
    });
    this.updateStatus();
  }

  addMusic(item, startTime, channel) {
    $('.toast').html('Adding audio...').fadeIn(500);
    var sound = new Sound(item, this.onLoadCallback);
    sound.startTime = startTime >= 0 ? startTime : (this.music.length > 0 ? _.max(this.music.map(sound => sound.startTime + sound.playableDuration())) : 0) ;
    sound.channel = channel >= 0 ? channel : 0;
    this.music.push(sound);
    this.updateStatus();
  }

  removeMusic(sound) {
    let index = this.music.indexOf(sound);

    if (index >= 0)
      this.music.splice(index, 1);

    this.updateStatus();
    this.onLoadCallback();
  }

  correctMusicPosition() {
    this.music = _.sortBy(this.music, 'startTime');
    let music = this.music.filter(audio => audio.channel == 0);
    let voice = this.music.filter(audio => audio.channel == 1);

    for (var i = 0; i < music.length - 1; i++)
      if (music[i+1].startTime < (music[i].startTime + music[i].duration))
        music[i+1].startTime = music[i].startTime + music[i].duration;

    for (var i = 0; i < voice.length - 1; i++)
      if (voice[i+1].startTime < (voice[i].startTime + voice[i].duration))
        voice[i+1].startTime = voice[i].startTime + voice[i].duration;

    this.music = [...music, ...voice];
    this.music = _.sortBy(this.music, 'startTime');
  }

  draw(canvas, canvasZoom, elapsed, isPreview, fps = 15, canvasOffsetX = 0, canvasOffsetY = 0) {
    var time = Date.now();

    // prepare for camera panning
    if (this.sceneTransition == 'camera-panning') {
      if (!this.boardFrameWidth || !this.boardFrameHeight) this.prepareForBoardPanning(canvas);
    }

    // init current frame
    var frame = document.createElement('canvas');
    frame.width = canvas.width - 2 * canvasOffsetX;
    frame.height = canvas.height - 2 * canvasOffsetY;
    var frameCtx = frame.getContext('2d');

    // init background
    let background = document.createElement('canvas');
    background.width = frame.width;
    background.height = frame.height;
    let backgroundCtx = background.getContext('2d');

    // init hand layer
    let handLayer = document.createElement('canvas');
    handLayer.width = canvas.width;
    handLayer.height = canvas.height;

    // video background
    let videoBack = document.createElement('canvas');
    videoBack.width = frame.width;
    videoBack.height = frame.height;
    let videoBackCtx = videoBack.getContext('2d');

    if(this.background) {
      if(this.background.type == Video.BackgroundTypeImage) {
        videoBackCtx.drawImage(this.background.backgroundImage, 0, 0, frame.width, frame.height);
      } else {
        videoBackCtx.fillStyle = this.background.backgroundColor;
        videoBackCtx.fillRect(0, 0, frame.width, frame.height);
      }
    } else {
      videoBackCtx.fillStyle = Video.BackgroundDefaultColor;
      videoBackCtx.fillRect(0, 0, frame.width, frame.height);
    }
    this.backgroundPixels = videoBackCtx.getImageData(0, 0, frame.width, frame.height).data;


    let operation = 'draw-scene';
    let sceneInfo;

    // go through scenes to find the scene that needs drawing currently
    let accountedFor = 0;
    let scene, sceneElapsed, exitProgress;
    let dX, dY;
    let i;
    for (i = 0; i < this.scenes.length; i++) {
      let isLastScene = (i == this.scenes.length - 1);
      scene = this.scenes[i];
      let sceneExitTime = (!isLastScene && scene.exitAnimation != 'none' ? SCENE_EXIT_TIME : 0);

      sceneElapsed = elapsed - accountedFor;

      // skip already drawn frames
      if (sceneElapsed > scene.animationTime + sceneExitTime) {
        accountedFor += scene.animationTime + sceneExitTime;
      } else {

        // draw exit animations
        if (sceneElapsed >= scene.animationTime && sceneExitTime) {
          operation = 'draw-exit-animations';
          exitProgress = (sceneElapsed - scene.animationTime) / sceneExitTime;
          if (this.sceneTransition == 'camera-panning' && i < (this.scenes.length - 1)) {
            let nextPos = this.getBoardPositionForFrame(i+1, canvasZoom, isPreview);
            let startPos = this.getBoardPositionForFrame(i, canvasZoom, isPreview);

            dX = nextPos.x - startPos.x;
            dY = nextPos.y - startPos.y;

            this.boardFramePos.x = startPos.x + exitProgress * dX;
            this.boardFramePos.y = startPos.y + exitProgress * dY;
          }
        } else

        // draw scene extra Time still frame
        if (sceneElapsed > scene.animationTime - scene.extraTime) {
          operation = 'draw-scene';
        } else

        // draw frame
        if (sceneElapsed <= scene.animationTime - scene.extraTime) {
          operation = 'draw-scene-partial';
        }

        // drawn something to skip the rest
        break;
      }
    }

    // draw the board on the current frame, with offsets
    if (this.sceneTransition == 'camera-panning') {
      let frameIndex = (operation == 'draw-scene-partial' || operation == 'draw-scene') ? i : i + 1;
      if (!this.boardFramePos)
        this.boardFramePos = this.getBoardPositionForFrame(i, canvasZoom, isPreview);
      let x = this.boardFramePos.x;
      let y = this.boardFramePos.y;
      let cropWidth = frame.width;
      let cropHeight = frame.height;
      this.drawBoard(background, canvasZoom, isPreview, frameIndex);
    }

    switch (operation) {
      case 'draw-exit-animations':
        if (this.sceneTransition != 'camera-panning')
          scene.drawExitAnimation(frame, canvasZoom, exitProgress, isPreview, this.style);
        else {
          backgroundCtx.save();
          backgroundCtx.globalAlpha = 0.08;
          if (dX || dY)
          for (let j = 0; j < 8; j++) {
            let x = this.boardFramePos.x - dX * 0.005 * j;
            let y = this.boardFramePos.y - dY * 0.005 * j;
            let cropWidth = frame.width;
            let cropHeight = frame.height;
            this.drawBoard(background, canvasZoom, isPreview, i, x, y);
          }
          backgroundCtx.restore();
        }
        break;
      case 'draw-scene-partial':
        sceneInfo = scene.drawPartial(frame, canvasZoom, sceneElapsed, isPreview, this.style, fps, Hand.currentSet && Hand.currentSet.erasers.length > 0 ? this.eraseMode : 'off');
        this.boardFramePos = this.getBoardPositionForFrame(i, canvasZoom, isPreview);
        break;
      default: // draw-scene
        scene.draw(frame, canvasZoom, null, isPreview, this.style, true /* final including exit animations */);
        break;
    }

    if (sceneInfo) {
      if (sceneInfo.erasing) {
        Hand.drawEraser(handLayer, canvasOffsetX + sceneInfo.handInfo.x, canvasOffsetY + sceneInfo.handInfo.y, sceneInfo.useFinger);
      }
      else
        this.prevHand = Hand.draw(handLayer, canvasOffsetX + sceneInfo.handInfo.x, canvasOffsetY + sceneInfo.handInfo.y, sceneInfo.handInfo.angle, this.prevHand, fps, this.handStyle);
    }

    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(videoBack, canvasOffsetX, canvasOffsetY);
    
    if (this.style == Video.StyleGlassboard)
      ctx.drawImage(handLayer, 0, 0);

    if (this.style == Video.StyleGlassboard) {
      ctx.globalCompositeOperation = 'multiply';
    } else {
      if(this.mode == Video.ModeChalk) {
        ctx.globalCompositeOperation = 'screen';
      }
    }

    ctx.drawImage(background, canvasOffsetX, canvasOffsetY, frame.width, frame.height);
    ctx.drawImage(frame, canvasOffsetX, canvasOffsetY, frame.width, frame.height);

    ctx.globalCompositeOperation = 'source-over';

    if (this.style != Video.StyleGlassboard)
      ctx.drawImage(handLayer, 0, 0);

    // console.log(`Drawn scene completely in ${Date.now() - time}`);
  }

  // BOARD PANNING
  prepareForBoardPanning(canvas) {
    this.boardFrameWidth = Math.round(this.scenes.length * canvas.width * 2/3);
    this.boardFrameHeight = Math.round(this.boardFrameWidth / 1.77); // 16/9
    this.boardLastDrawnFrame = -1;
  }
  clearBoardPanningElements() {
    // console.log('Clear board panning elements');
    delete this.boardFrameWidth;
    delete this.boardFrameHeight;
    delete this.boadFramePos;
  }

  drawBoard(canvas, canvasZoom, isPreview, currentFrame, frameX, frameY, zoomModifier = 1, applyEffects) {
    if (currentFrame == 0) return;

    let ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';

    let x = Math.round((frameX || this.boardFramePos.x) * zoomModifier);
    let y = Math.round((frameY || this.boardFramePos.y) * zoomModifier); //console.log(x, y);

    for (let i = 0; i < currentFrame; i++) {
      let scene = this.scenes[i];

      if (!scene.bigBoardPos)
        this.getBoardPositionForFrame(i, canvasZoom, isPreview);

      let sceneX = Math.round(scene.bigBoardPos.x * zoomModifier);
      let sceneY = Math.round(scene.bigBoardPos.y * zoomModifier);
      let sceneWidth = Math.round(1920 * 0.6 * canvasZoom * zoomModifier);
      let sceneHeight = Math.round(1080 * 0.6 * canvasZoom * zoomModifier);

      if (!((x > sceneX + sceneWidth) || (x + canvas.width < sceneX) || (y > sceneY + sceneHeight) || (y + canvas.height < sceneY))) {
        let frame = this.rasterizeFrame(i, canvasZoom, isPreview, applyEffects);

        ctx.drawImage(frame, sceneX - x, sceneY - y, sceneWidth, sceneHeight);
        // console.log(`Drawing board at ${x}, ${y}: frame ${i} - pos: ${sceneX - x}, ${sceneY - y} - size: ${sceneWidth}x${sceneHeight}`);
      }
    }
  }

  getBoardPositionForFrame(frameIndex, canvasZoom, isPreview) {
    let time = new Date();

    let scene = this.scenes[frameIndex];
    let prevScene = this.scenes[Math.max(frameIndex - 1, 0)];

    if (frameIndex > 0 && !prevScene.bigBoardPos) {
      this.getBoardPositionForFrame(frameIndex - 1, canvasZoom, isPreview);
    }

    let iterations = frameIndex > 0 ? Math.max(0, prevScene.bigBoardPos.iterations - 15 : 0) : 0;
    let iterations_start = iterations;
    let zoomModifier = 0.4;

    let centerX = this.boardFrameWidth / 2;
    let centerY = this.boardFrameHeight / 2;

    let frameWidth = 1920 * 0.6 * canvasZoom;
    let frameHeight = 1080 * 0.6 * canvasZoom;

    let x = centerX - frameWidth / 2;
    let y = centerY - frameHeight / 2;

    if (frameIndex > 0) {

      let scene = this.scenes[frameIndex];

      if (!scene.bigBoardPos) {

        if (prevScene.exitAnimation == 'none') {
          x = prevScene.bigBoardPos.x;
          y = prevScene.bigBoardPos.y;
          iterations = prevScene.bigBoardPos.iterations
        } else {
          let frame = this.rasterizeFrame(frameIndex, canvasZoom, isPreview, false, false);

          let cachedFrame = document.createElement('canvas');
          cachedFrame.width = Math.round(frame.width * zoomModifier);
          cachedFrame.height = Math.round(frame.height * zoomModifier);
          let cachedFrameCtx = cachedFrame.getContext('2d');
          cachedFrameCtx.drawImage(frame, 0, 0, cachedFrame.width, cachedFrame.height);
          cachedFrameCtx.rect(cachedFrame.width * 0.2, cachedFrame.height * 0.2, cachedFrame.width * 0.6, cachedFrame.height * 0.6);
          cachedFrameCtx.stroke();

          while (true) {
            let pos = MathUtils.pointOnSpiral(centerX, centerY, 30 * canvasZoom, iterations, 16/9);

            x = pos.x - frame.width / 2;
            y = pos.y - frame.height / 2;

            let intersectionCanvas = document.createElement('canvas');
            intersectionCanvas.width = cachedFrame.width;
            intersectionCanvas.height = cachedFrame.height;

            this.drawBoard(intersectionCanvas, canvasZoom, isPreview, frameIndex, x, y, zoomModifier, false, false);

            let intersectionCtx = intersectionCanvas.getContext('2d');
            intersectionCtx.globalCompositeOperation = 'destination-in';
            intersectionCtx.drawImage(cachedFrame, 0, 0);

            let emptyCanvas = document.createElement('canvas');
            emptyCanvas.width = intersectionCanvas.width;
            emptyCanvas.height = intersectionCanvas.height;

            if (emptyCanvas.toDataURL() == intersectionCanvas.toDataURL())
              break;

            iterations++;
          }
        }
      } else {
        x = scene.bigBoardPos.x;
        y = scene.bigBoardPos.y;
        iterations = scene.bigBoardPos.iterations;
      }

    }

    scene.bigBoardPos = {
      x, y, iterations
    }

    // console.log(`Found position for scene ${frameIndex}, ${Date.now() - time}ms: ${scene.bigBoardPos.x}, ${scene.bigBoardPos.y}`);
    return {
      x: scene.bigBoardPos.x,
      y: scene.bigBoardPos.y,
    }

  }

  rasterizeFrame(frameIndex, canvasZoom, isPreview = false, applyEffects = true, final = true) {
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1920 * 0.6 * canvasZoom;
    tempCanvas.height = 1080 * 0.6 * canvasZoom;
    this.scenes[frameIndex].draw(tempCanvas, canvasZoom, null, isPreview, this.style, final /* final including exit animations */, applyEffects)

    return tempCanvas;
  }

}
