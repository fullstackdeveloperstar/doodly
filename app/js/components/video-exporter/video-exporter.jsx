import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import '../../lib/time.utils.js'
import Video from '../../models/video.js'
import Cache from '../../cache.js'

const remote = window.require('electron').remote
const dialog = remote.dialog
const app = remote.app
const shell = remote.shell
const fs = remote.require('fs')
const rimraf = remote.require('rimraf')
const http = remote.require('https')

const child_process = window.require('child_process')

const SETTINGS = 0,

      RENDER_FRAMES = 1,

      EXPORT_FRAMES = 2,
      EXPORTING_FRAME = 3,

      ENCODE_PART = 4,
      ENCODING_PART = 5,
      CLEANUP_PART = 6,
      CLEANING_PART = 7,

      EXPORT_STILL_FRAMES = 8,
      EXPORTING_STILL_FRAMES = 9,
      ENCODE_STILL_FRAMES = 10,
      ENCODING_STILL_FRAMES = 11,

      EXPORT_AUDIO = 12,
      EXPORTING_AUDIO = 13,

      ENCODE_FULL = 14,
      ENCODING = 15,
      CLEANUP = 16,

      CLEANING = 17,
      FINISHED_WITH_ERROR = 18,

      DONE = 20,

      EDITOR_RESOLUTION_WIDTH = 1152,
      EDITOR_RESOLUTION_HEIGHT = 648,
      ASPECT_RATIO = EDITOR_RESOLUTION_WIDTH / EDITOR_RESOLUTION_HEIGHT;

const BATCH_SIZE = 30000;

class VideoExporter extends React.Component {

  state = {
    path: '',
    progress: 0,
    currentTask: SETTINGS,
    width: 854, // editor resolution 1152 x 648
    height: 480,
    zoom: 480 / EDITOR_RESOLUTION_HEIGHT,
    fps: 30,
    batchSize: getBatchSize(30, 480),
    quality: 1,
    frames: [],
    downloadedMusicFiles: 0,
    temporaryFiles: [],
    errors: [],
    isAspectRatio: true,
    isCustomResolution: false,
    canvasOffsetX: 0,
    canvasOffsetY: 0
  }

  componentDidMount() {
    this.reset();
    if (this.props.video)
      this.setState({
        path: (Cache.get('video_path') || app.getPath('videos')) + '/' + this.props.video.toFilename()
      })
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps) {
      this.reset();
      if (this.props.video)
        this.setState({
          path: (Cache.get('video_path') || app.getPath('videos')) + '/' + this.props.video.toFilename()
        })
    }
  }

  render() {
    if (this.state.startTime) {
      var elapsedTime = Date.now() - this.state.startTime,
          estimatedTime = 0;
      if (this.state.currentTask == DONE) {
        estimatedTime = 'Finished in ' + (Date.now() - this.state.startTime).toHHMMSS();
      } else if (this.state.progress < 0.1 && elapsedTime < 30000)
        estimatedTime = 'Estimating time remaining...';
      else {
        estimatedTime = Math.round(elapsedTime / this.state.progress - elapsedTime);
        estimatedTime = estimatedTime.toAproxTime() + ' left...';
      }
    }
    return (
      <div className="export" ref="export">
        { this.state.currentTask == SETTINGS ?
          <div>
            <label>Destination:</label>
            <div className="flex center">
              <input type="text" disabled value={this.state.path}/>&nbsp;&nbsp;
              <button className="btn default" onClick={this.changePath}>Change</button>
            </div>
            <label>Settings:</label>
            <div className="settings flex space-between">
              <div>
                <div>
                  <label>Resolution</label>
                  <div className="pretty-select">
                    <select ref="resolution" onChange={this.changeResolution}>
                      <option value="360">&nbsp;&nbsp;360p&nbsp;&nbsp;-&nbsp;&nbsp;(640x360)</option>
                      <option value="480">&nbsp;&nbsp;480p&nbsp;&nbsp;-&nbsp;&nbsp;(854x480)</option>
                      <option value="720">&nbsp;&nbsp;720p&nbsp;&nbsp;-&nbsp;&nbsp;(1280x720)</option>
                      <option value="1080">1080p&nbsp;&nbsp;-&nbsp;&nbsp;(1920x1080)</option>
                      <option value="0">Custom</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="pt-12">
                    <label>Width</label>
                    <input type="text" 
                      value={this.state.width} 
                      disabled={!this.state.isCustomResolution} 
                      onChange={this.handleChangeWidth} />
                  </div>
                  <div className="pt-12">
                    <label>Height</label>
                    <input type="text" 
                      value={this.state.height} 
                      disabled={!this.state.isCustomResolution} 
                      onChange={this.handleChangeHeight} />
                  </div>
                  <div className="pt-12">
                    <input type="checkbox" 
                      disabled={!this.state.isCustomResolution} 
                      checked={this.state.isAspectRatio} 
                      onChange={this.handleChangeAspectRatio} />
                    <span> Constrain aspect ratio</span>
                  </div>
                </div>
              </div>
              <div>
                <label>FPS</label>
                <div className="pretty-select">
                  <select ref="fps" onChange={this.changeFPS}>
                    <option value="24">24</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="48">48</option>
                    <option value="50">50</option>
                    <option value="60">60</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Quality</label>
                <div className="pretty-select">
                  <select ref="quality" onChange={this.changeQuality}>
                    <option value="0.62">Low (62%)</option>
                    <option value="0.76">Medium (76%)</option>
                    <option value="0.86">High (86%)</option>
                    <option value="1">Maximum (100%)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="text-right">
              <a href="javascript:;" onClick={this.cancel}>Cancel</a>&nbsp;&nbsp;&nbsp;
              <button className="btn success" onClick={this.start}>Continue</button>
            </div>
          </div>
          :
          <div>
            <label>{this.getProgressLabel()}</label>
            <div className="progress_wrapper">
              <div className="flex center space-between">
                <div className="progress_bar">
                  <div className="progress" style={{width: (this.state.progress * 100) + '%'}}/>
                </div>
                {Math.round(this.state.progress * 100) + '%'}
              </div>
              <span className="estimated">{estimatedTime}</span>
            </div>
              { this.state.currentTask == DONE ?
                <div className="text-right">
                  <a href="javascript:;" onClick={this.cancel}>Close</a>&nbsp;&nbsp;&nbsp;
                  <button className="btn success" onClick={this.showFile}>Show exported file</button>
                </div>
                :
                <div className="text-right">
                  <button className="btn destroy" onClick={this.cancel}>Cancel</button>
                </div>
              }

          </div>
        }
      </div>
    );
  }

  reset = () => {
    this.setState({
      progress: 0,
      elapsed: 0,
      buildPos: 0,
      frames: [],
      currentTask: SETTINGS,
      encodedParts: [],
      temporaryFiles: [],
      temporaryPartFiles: [],
      downloadedMusicFiles: 0,
    });

    requestAnimationFrame(() => {
      if (this.refs.resolution) {
        if(this.state.isCustomResolution) {
          this.refs.resolution.value = 0;
        } else {
          this.refs.resolution.value = this.state.height;
        }
        this.refs.fps.value = this.state.fps;
        this.refs.quality.value = this.state.quality;
      }
    })
  }

  changePath = () => {
    dialog.showSaveDialog({
      title: 'Export',
      defaultPath: this.state.path,
      filters: [{ name: 'Movies (mp4)', extensions: ['mp4'] }],
    }, path => {
      if (!path) return;
      let slash = path.indexOf('/') != -1 ? '/' : '\\';
      Cache.put('video_path', path.replace(path.substring(path.lastIndexOf(slash)), ''));
      this.setState({
        path: path
      })
    });
  }

  changeResolution = (e) => {
    var height = parseInt(e.target.value);

    if(height == 0) {   // Custom resolution
      this.setState({
        isCustomResolution: true
      });
    } else {
      this.setState({
        isCustomResolution: false,
        isAspectRatio: true
      });
      
      var width = 2 * Math.round(height * ASPECT_RATIO / 2); // always divisible by 2
      this.updateResolution(width, height);
    }
  }

  changeFPS = (e) => {
    this.setState({
      fps: e.target.value,
      batchSize: getBatchSize(e.target.value, this.state.height),
    })
  }

  changeQuality = (e) => {
    this.setState({
      quality: e.target.value
    })
  }

  handleChangeAspectRatio = (e) => {
    this.setState({
      isAspectRatio: e.target.checked
    });
  }

  handleChangeWidth = (e) => {
    var width = e.target.value;
    var height = this.state.isAspectRatio?2 * Math.round(width / ASPECT_RATIO / 2):this.state.height;
    
    this.updateResolution(width, height);
  }

  handleChangeHeight = (e) => {
    var height = e.target.value;
    var width = this.state.isAspectRatio?2 * Math.round(height * ASPECT_RATIO / 2):this.state.width;
    
    this.updateResolution(width, height);
  }

  updateResolution = (width, height) => {
    var zoom, canvasOffsetX, canvasOffsetY;
    var ratio = width / height;
    if(ratio >= ASPECT_RATIO) {
      zoom = height / EDITOR_RESOLUTION_HEIGHT;
      canvasOffsetX = Math.round((width - zoom * EDITOR_RESOLUTION_WIDTH) / 2);
      canvasOffsetY = 0;
    } else {
      zoom = width / EDITOR_RESOLUTION_WIDTH;
      canvasOffsetY = Math.round((height - zoom * EDITOR_RESOLUTION_HEIGHT) / 2);
      canvasOffsetX = 0;
    }

    this.setState({
      width: width,
      height: height,
      zoom: zoom,
      canvasOffsetX: canvasOffsetX,
      canvasOffsetY: canvasOffsetY,
      batchSize: getBatchSize(this.state.fps, height),
    });
  }

  start = () => {
    
    // validate resolution
    if(this.state.width <= 0 || this.state.height <= 0) {
      alert('Resolution size should be greater than 0!');
      return;
    } else if(this.state.width > 4096 || this.state.height > 4096) {
      alert('Resolution size should be smaller than 4096!');
      return;
    } 

    // clean previously existing files
    var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly';
    rimraf(tempPath, [], () => {});

    // download audio files async

    this.setState({
      currentTask: RENDER_FRAMES,
      startTime: Date.now(),
      taskStartTime: Date.now(),
      framesCount: 0,
      progressRenderQ: _.round(0.50 * (1 + this.state.zoom) / 2, 2),
      progressEncodeQ: _.round(0.14 * (1 + this.state.zoom) / 2, 2),
    });

    requestAnimationFrame(this.export);
  }

  export = () => {
    var startTime = Date.now();
    if (this.pendingAnimation) clearTimeout(this.pendingAnimation);
    if (this.animation) cancelAnimationFrame(this.animation);

    let needsToEncodeStillFrames = this.props.video.totalTime > this.props.video.animationTime;
    let stillFramesTime = this.props.video.totalTime - this.props.video.animationTime;

    var scaleRatio = this.state.height / EDITOR_RESOLUTION_HEIGHT; // editor height
    var encodingStillTime = needsToEncodeStillFrames ? (stillFramesTime / this.props.video.totalTime) * 0.79 * 0.4 : 0,
        renderTime = 0.79 - encodingStillTime;

    var currentBatchSize = Math.min(this.state.batchSize, this.props.video.animationTime - this.state.encodedParts.length * this.state.batchSize);
    var batches = this.props.video.animationTime / this.state.batchSize;
    var batchQ = renderTime / batches;
    var currentBatchQ = batchQ * currentBatchSize / this.state.batchSize;
    var batchFrames = Math.round(currentBatchSize / 1000 * this.state.fps);

    var encodedPartsProgress = this.state.encodedParts.length > batches ? renderTime : this.state.encodedParts.length * batchQ;
    var currentPartProgress = (this.state.currentTask >= RENDER_FRAMES && this.state.currentTask < CLEANUP_PART) ?
                                (this.state.currentTask < ENCODING_PART ? (this.state.elapsed - this.state.encodedParts.length * this.state.batchSize) / currentBatchSize * 0.82 : 0.82) +
                                (this.state.currentTask == ENCODING_PART ? this.state.buildPos / currentBatchSize * 0.18 : 0)
                              :
                                0;

    let encodingStillProgress = this.state.currentTask >= EXPORT_STILL_FRAMES ?
                                  this.state.currentTask <= ENCODING_STILL_FRAMES ? this.state.buildPos / stillFramesTime : 1
                                :
                                  0;

    var audioProgress = this.props.video.music.length > 0 ? this.state.downloadedMusicFiles / this.props.video.music.length : 1;

    var encodingProgress = this.state.currentTask > ENCODING ? 1 : (this.state.currentTask == ENCODING ? ((this.state.buildPos || 0) / this.props.video.totalTime) : 0);

    var progress =  this.state.currentTask == DONE ? 1 : encodedPartsProgress + currentPartProgress * currentBatchQ + encodingStillProgress * encodingStillTime + audioProgress * 0.03 + encodingProgress * 0.179;

    // console.log(progress);
    // console.log({
    //   progress: _.round(progress, 2),
    //   part: _.round(currentPartProgress, 2),
    //   still: _.round(encodingStillProgress, 2),
    //   audio: _.round(audioProgress, 2),
    //   encoding: _.round(encodingProgress, 2)
    // });

    this.setState({
      progress: Math.max(this.state.progress, _.round(progress, 4)),
      buildPos: 0
    })

    switch (this.state.currentTask) {
      case RENDER_FRAMES:
        this.renderFrame();
        break;
      case EXPORT_FRAMES:
        this.exportTemporaryFrames();
        break;
      case ENCODE_PART:
        this.setState({buildPos: 0});
        this.encodePart();
        break;
      case EXPORT_STILL_FRAMES:
        this.exportStillFrames();
        break;
      case ENCODE_STILL_FRAMES:
        this.encodeStillFrames();
        break;
      case EXPORT_AUDIO:
        this.exportAudio();
        break;
      case ENCODE_FULL:
        this.setState({buildPos: 0});
        this.encode();
        break;
      case CLEANUP_PART:
        this.cleanupPart();
        break;
      case CLEANUP:
        this.cleanup();
        break;
      case DONE:
        return;
      default:
        break;
    }

    if (Math.round(this.state.elapsed) % Math.round(2000) < Math.floor(1000 / this.state.fps) && this.props.video.mode == Video.ModeChalk)
      this.pendingAnimation = setTimeout(() => { this.animation = requestAnimationFrame(this.export); }, 30);
    else
      this.animation = requestAnimationFrame(this.export);

    // console.log('Time spent in the loop:' + (Date.now() - startTime));
  }

  cancel = () => {
    if (this.pendingAnimation) clearTimeout(this.pendingAnimation);
    if (this.animation) cancelAnimationFrame(this.animation);
    if (this.props.onClose)
      this.props.onClose();
  }

  renderFrame = () => {
    this.setState({startEncodeTime: Date.now()});

    var frameTime = 1000 / this.state.fps;
    var elapsed = this.state.elapsed ? this.state.elapsed + frameTime : frameTime;

    if (elapsed > this.props.video.animationTime ) elapsed = this.props.video.animationTime;

    // if we're just starting
    // recreate image cache for the temporary canvas
    // based on the calculated zoom of canvas size relative to the 60% of FULL HD initial canvas size
    if (elapsed == frameTime)
      this.props.video.scenes.forEach(scene => scene.updateImageCache(this.state.zoom, this.state.zoom, this.props.video.style));

    var canvas = document.createElement('canvas');
    canvas.width = this.state.width;
    canvas.height = this.state.height;
    
    this.props.video.draw(canvas, this.state.zoom, elapsed, false, this.state.fps, this.state.canvasOffsetX, this.state.canvasOffsetY);
    this.setState({encodedTime: Date.now()});

    var frameData = canvas.toDataURL('image/jpeg', this.state.quality).replace(/^data:image\/\w+;base64,/, '');
    this.state.frames.push(frameData);

    this.setState({
      elapsed: elapsed,
      framesCount: this.state.framesCount + 1,
    });

    var exportingBatchTime = Math.round(5000 * 30/this.state.fps * 480/this.state.height);

    if (this.state.elapsed >= this.props.video.animationTime ||
      (Math.round(this.state.elapsed) % exportingBatchTime) < Math.floor(1000 / this.state.fps) ||
      (Math.round(this.state.elapsed) % this.state.batchSize) < Math.floor(1000 / this.state.fps)) {

      this.setState({
        encoder: null,
        currentTask: EXPORT_FRAMES,
      });
      this.exportableFilesCount = this.state.frames.length;
      // console.log(Date.now() - this.state.startTime);
    }
  }

  exportTemporaryFrames = () => {
    this.setState({currentTask: EXPORTING_FRAME});
    if (this.state.frames.length > 0) {
      var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
      try {
        fs.accessSync(tempPath);
      } catch (e) {
        fs.mkdirSync(tempPath);
      }

      var exportedSoFar = this.state.temporaryPartFiles.length;
      this.state.frames.forEach((frame, index) => {
        var fileIndex = (exportedSoFar + index) + '';
        var fileName = tempPath + ('0000000' + fileIndex).slice(fileIndex.length) + '.jpg';

        fs.writeFile(fileName, frame, 'base64', err => {
          if (err)
            console.log(err);
          else {
            this.state.temporaryPartFiles.push(fileName);
            if (this.exportableFilesCount <= 1) {
              if (this.state.elapsed >= this.props.video.animationTime || (Math.round(this.state.elapsed) % this.state.batchSize) < Math.floor(1000 / this.state.fps)) {
                console.log('finished rendering ' + (this.state.framesCount - Math.round(this.state.encodedParts.length * this.state.batchSize / 1000 * this.state.fps)) + ' frames, ' + (Date.now() - this.state.taskStartTime));
                this.setState({
                  currentTask: ENCODE_PART,
                  taskStartTime: Date.now(),
                  frames: [],
                });
              } else {
                this.setState({
                  currentTask: RENDER_FRAMES,
                  frames: [],
                });
              }
            } else
              this.exportableFilesCount--; // console.log(this.exportableFilesCount);
          }
        });
      });
    }
  }

  encodePart = () => {
    if (this.state.currentTask != ENCODING_PART) {
      var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
      var settings = ['-framerate', this.state.fps, '-i', tempPath + '%07d.jpg', '-y', tempPath + this.state.encodedParts.length + '.mp4'];

      var ffmpeg = child_process.spawn(ffmpeg_path, settings);
      ffmpeg.stdout.on('data', (data) => {
        // console.log(`stdout: ${data}`);
        this.updateEncodingStatus(data.toString());
      });

      ffmpeg.stderr.on('data', data => {
        // console.log(`stderr: ${data}`);
        this.updateEncodingStatus(data.toString());
      });

      ffmpeg.on('close', code => {
        // this.setState({currentTask: CLEANUP});
        console.log('finished encoding part ' + this.state.encodedParts.length + ', ' + (Date.now() - this.state.taskStartTime));
        this.setState({taskStartTime: Date.now()})
        this.state.temporaryFiles.push(tempPath + this.state.encodedParts.length + '.mp4');
        this.state.encodedParts.push(tempPath + this.state.encodedParts.length + '.mp4');
        this.setState({currentTask: CLEANUP_PART});
      })

      this.setState({currentTask: ENCODING_PART});
    }
  }

  exportStillFrames = () => {
    this.setState({currentTask: EXPORTING_STILL_FRAMES});

    let canvas = document.createElement('canvas');
    canvas.width = this.state.width;
    canvas.height = this.state.height;
    
    this.props.video.draw(canvas, this.state.zoom, this.state.elapsed + 1000 / this.state.fps, false, this.state.fps, this.state.canvasOffsetX, this.state.canvasOffsetY);
    let frame = canvas.toDataURL('image/jpeg', this.state.quality).replace(/^data:image\/\w+;base64,/, '');

    var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
    try {
      fs.accessSync(tempPath);
    } catch (e) {
      fs.mkdirSync(tempPath);
    }

    let fileName = tempPath + '0000000.jpg';
    fs.writeFile(fileName, frame, 'base64', err => {
      if (err)
        console.log(err);
      else
        this.setState({currentTask: ENCODE_STILL_FRAMES});
    });
  }

  encodeStillFrames = () => {
    console.log('encoding still frames');
    var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
    var settings = [
      '-loop', 1,
      '-i', tempPath + '0000000.jpg',
      '-t', Math.round((this.props.video.totalTime - this.props.video.animationTime)/1000),
      '-r', this.state.fps,
      '-pix_fmt', 'yuv420p',
      '-y', tempPath + this.state.encodedParts.length + '.mp4'];

      // console.log(settings);

    var ffmpeg = child_process.spawn(ffmpeg_path, settings);
    ffmpeg.stdout.on('data', (data) => {
      // console.log(`stdout: ${data}`);
      this.updateEncodingStatus(data.toString());
    });

    ffmpeg.stderr.on('data', data => {
      // console.log(`stderr: ${data}`);
      this.updateEncodingStatus(data.toString());
    });

    ffmpeg.on('close', code => {
      console.log('finished encoding part ' + this.state.encodedParts.length + ', ' + (Date.now() - this.state.taskStartTime));
      this.state.temporaryFiles.push(tempPath + this.state.encodedParts.length + '.mp4');
      this.state.encodedParts.push(tempPath + this.state.encodedParts.length + '.mp4');

      // cleanup 0000000.jpg

      this.setState({
        currentTask: EXPORT_AUDIO,
        taskStartTime: Date.now()
      })
    })

    this.setState({currentTask: ENCODING_STILL_FRAMES});
  }

  exportAudio = () => {
    this.setState({currentTask: EXPORTING_AUDIO});

    var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
    try {
      fs.accessSync(tempPath);
    } catch (e) {
      fs.mkdirSync(tempPath);
    }

    console.log('got to export audio: ' + this.state.downloadedMusicFiles);
    this.downloadedMusicFiles = this.state.downloadedMusicFiles;

    var audio = this.props.video.music.filter(sound => sound.startTime < this.props.video.totalTime);
    audio.sort((a, b) => {
      if (a.channel < b.channel)
        return -1;
      else if (a.channel > b.channel)
        return 1;
      else
        return a.startTime < b.startTime ? -1 : (a.startTime > b.startTime ? 1 : 0);
    });
    if (this.downloadedMusicFiles < audio.length) {
      // save music files
      console.log('downloading music files');
      audio.forEach((sound, index) => {
        var time = Date.now();
        var ws = fs.createWriteStream(tempPath + index + '.mp3');
        var req = http.get(sound.path, response => {
          response.on('end', () => {
            ws.end();
            this.state.temporaryFiles.push(tempPath + index + '.mp3');

            this.downloadedMusicFiles++;
            console.log(this.downloadedMusicFiles, audio.length);

            this.setState({downloadedMusicFiles: this.downloadedMusicFiles});

            if (this.downloadedMusicFiles >= audio.length)
              this.setState({currentTask: ENCODE_FULL});
          });
          response.pipe(ws);
        });
      });
    } else {
      this.setState({currentTask: ENCODE_FULL});
    }
  }

  encode = () => {
    if (this.state.currentTask != ENCODING) {
      var tempPath = app.getPath('temp'); tempPath += (tempPath.endsWith('/')?'':'/') + 'Doodly/';
      var settings = [];

      // get exportable audio and order by channel, startTime
      var audio = this.props.video.music.filter(sound => sound.startTime < this.props.video.totalTime);
      audio.sort((a, b) => {
        if (a.channel < b.channel)
          return -1;
        else if (a.channel > b.channel)
          return 1;
        else
          return a.startTime < b.startTime ? -1 : (a.startTime > b.startTime ? 1 : 0);
      });

      // add all the video inputs
      for (var i=0; i < this.state.encodedParts.length; i++)
        settings.push('-i', tempPath + i + '.mp4');

      // add audio inputs
      for (var i=0; i < audio.length; i++) {
        if (audio[i].clipStart > 0)
          settings.push('-ss', (audio[i].clipStart / 1000).toFixed(2));

        if (audio[i].playableDuration() < audio[i].duration)
          settings.push('-t', (audio[i].playableDuration() / 1000).toFixed(2));

        settings.push('-i', tempPath + i + '.mp3');
      }

      var filter = '';

      // concat videos
      for (var i=0; i < this.state.encodedParts.length; i++)
        filter += '[' + i + ']';
      filter += 'concat=n=' + this.state.encodedParts.length + ':v=1:a=0[v]';

      if (audio.length > 0) {
        if (filter != '') filter += ';';

        var prevStartTime = 0, currentChannel = 0, totalAudios = 0, totalChannels = 1;

        // create silence fragments before and between audio segments
        for (var i=0; i< audio.length; i++) {
          if (audio[i].channel != currentChannel) {
            currentChannel = audio[i].channel;
            prevStartTime = 0;
          }

          if (audio[i].startTime - prevStartTime > 10)
            filter += 'aevalsrc=0:d=' + ((audio[i].startTime - prevStartTime) / 1000).toFixed(2) + ':c=FL|FR[s' + i + '];';
          prevStartTime = audio[i].startTime + audio[i].playableDuration();
        }

        // NOTE: IF we ever add more than 2 channels one should expect that
        // any of those channels can be empty
        // currently only scaled to 2 channels
        prevStartTime = 0; currentChannel = audio[0].channel;
        let effects = '';
        for (var i=0; i < audio.length; i++) {

          if (audio[i].effects.length > 0) {
            audio[i].effects.forEach(effect => {
              if (effect.type == 'fadeIn') {
                let effectStartTime = (audio[i].startTime / 1000).toFixed(2);
                let effectDuration = (effect.duration / 1000).toFixed(2);
                let effectEndTime = ((audio[i].startTime + effect.duration) / 1000).toFixed(2);
                effects += ',afade=enable=\'between(t,' + effectStartTime + ',' + effectEndTime + ')\':t=in:st=' + effectStartTime + ':d=' + effectDuration;
              } else 
              if (effect.type == 'fadeOut') {
                let effectStartTime = ((audio[i].startTime + audio[i].playableDuration() - effect.duration) / 1000).toFixed(2)
                let effectDuration = (effect.duration / 1000).toFixed(2);
                let effectEndTime = ((audio[i].startTime + audio[i].playableDuration()) / 1000).toFixed(2);
                effects += ',afade=enable=\'between(t,' + effectStartTime + ',' + effectEndTime + ')\':t=out:st=' + effectStartTime + ':d=' + (effect.duration / 1000).toFixed(2);
              }
            });
          }

          if (audio[i].channel != currentChannel && totalAudios > 0) {
            filter +=
              'concat=n=' + totalAudios + ':v=0:a=1,' +                               // concat audios
              'apad,' +                                                               // pad with empty audio after
              'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,' + // format audio
              'volume=' + this.props.video.volumes[currentChannel] +                  // set volume
              effects +                                                               // audio effects
              '[c' + currentChannel + '];';

            prevStartTime = 0;
            totalAudios = 0;
            effects = '';
            currentChannel = audio[i].channel;
            totalChannels++;
          }

          if (audio[i].startTime - prevStartTime > 10) {
            filter += '[s' + i  + ']';
            totalAudios++;
          }

          // add the audio segment itself
          filter += '[' + (i + this.state.encodedParts.length) + ']'
          totalAudios++;

          prevStartTime = audio[i].startTime + audio[i].playableDuration();
        }

        // concat the last channel
        filter +=
        'concat=n=' + totalAudios + ':v=0:a=1,' +                               // concat audios
        'apad,' +                                                               // pad with empty audio after
        'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,' + // format audio
        'volume=' + this.props.video.volumes[currentChannel] +                  // set volume
        effects +                                                               // audio effects
        '[' + (totalChannels > 1 ? ('c' + currentChannel) : 'a') + ']';

        // merge channels if needed
        if (totalChannels > 1) {
          filter += ';';

          var FL = 'FL';
          var FR = 'FR';
          var audios = '';
          for (var i = 0; i < totalChannels; i++) {
            // filter += '[c' + i + ']aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=' + this.props.video.volumes[i] + '[a' + i + '];';
            // audios += '[a' + i + ']';
            filter += '[c' + i + ']';
            FL += (i==0?'<':'+') + 'c' + (i*2);
            FR += (i==0?'<':'+') + 'c' + (i*2 + 1);
          }

          filter += 'amerge=inputs=' + totalChannels + '[a]';//',pan=stereo:' + FL + ':' + FR + '[a]';
        }
      }

      if (filter != '')
        settings.push('-filter_complex', filter, '-ac', '2');

      // output video
      settings.push('-map', '[v]');

      // output audio if we have it
      if (audio.length > 0)
        settings.push('-map', '[a]');

      settings.push('-t', Math.round(this.props.video.totalTime / 1000));

      settings.push('-pix_fmt', 'yuv420p', '-y', this.state.path);

      console.log(settings.join(' '));

      var ffmpeg = child_process.spawn(ffmpeg_path, settings);
      ffmpeg.stdout.on('data', (data) => {
        // console.log(`stdout: ${data}`);
        this.updateEncodingStatus(data.toString());
      });

      ffmpeg.stderr.on('data', data => {
        // console.log(`stderr: ${data}`);
        if (data.includes('Error') && !data.includes('Error while decoding stream'))
          this.state.errors.push(data.toString());

        this.updateEncodingStatus(data.toString());
      });

      ffmpeg.on('close', code => {
        console.log('Finished in: ' + (Date.now() - this.state.startTime).toHHMMSS());
        this.setState({currentTask: CLEANUP});
      })

      this.setState({currentTask: ENCODING});
    }
  }

  updateEncodingStatus = (data) => {
    var frameStart = data.indexOf('frame=');
    if (frameStart != -1) {
      var frameEnd = data.indexOf('fps', frameStart);
      var frame = Number(data.substring(frameStart + 6, frameEnd-1));
      this.setState({buildPos: frame / this.state.fps * 1000});
    }
  }

  cleanupPart = () => {
    this.setState({currentTask: CLEANING_PART});
    if (this.state.temporaryPartFiles.length > 0) {
      var files = this.state.temporaryPartFiles.splice(0, 100);
      this.setState({toRemove: files.length});

      files.forEach(file => {
        fs.unlink(file, err => {
          if (err)
            console.log(err);
          else {
            var toRemove = this.state.toRemove - 1;
            this.setState({
              toRemove: toRemove,
              currentTask: toRemove > 0 ? CLEANING_PART: CLEANUP_PART
            });
          }
        })
      });
    } else {
      console.log('finished cleaning up after part ' + (Date.now() - this.state.taskStartTime));
      this.setState({taskStartTime: Date.now()});

      if (this.state.elapsed < this.props.video.totalTime) {
        if (this.state.elapsed < this.props.video.animationTime)
          this.setState({currentTask: RENDER_FRAMES});
        else
          this.setState({currentTask: EXPORT_STILL_FRAMES});
      } else
        this.setState({currentTask: EXPORT_AUDIO}); // should export audio
    }
  }

  cleanup = () => {
    this.setState({currentTask: CLEANING});
    if (this.state.temporaryFiles.length > 0) {
      var files = this.state.temporaryFiles.splice(0, 100);
      this.setState({toRemove: files.length});

      files.forEach(file => {
        fs.unlink(file, err => {
          if (err)
            console.log(err);
          else {
            var toRemove = this.state.toRemove - 1;
            this.setState({
              toRemove: toRemove,
              currentTask: toRemove > 0 ? CLEANING: CLEANUP
            });
          }
        })
      });
    } else {
      if (this.state.errors.length > 0) {
        console.log(this.state.errors);
        this.setState({
          currentTask: FINISHED_WITH_ERROR,
          errors: []
        });
        alert('There has been an error exporting the video. Please contact our support team.');
      } else
        this.setState({currentTask: DONE});
    }
  }

  getProgressLabel = () => {
    if (this.state.currentTask >= RENDER_FRAMES && this.state.currentTask < ENCODE_PART)
      return 'Progress: rendering scenes...';
    if (this.state.currentTask >= ENCODE_PART && this.state.currentTask <= CLEANING_PART)
      return 'Progress: encoding rendered frames...';
    if (this.state.currentTask >= EXPORT_STILL_FRAMES && this.state.currentTask <= ENCODING_STILL_FRAMES)
      return 'Progress: encoding still frames...';
    if (this.state.currentTask >= EXPORT_AUDIO && this.state.currentTask <= EXPORTING_AUDIO)
      return 'Progress: preparing audio...';
    if (this.state.currentTask >= ENCODE_FULL && this.state.currentTask <= ENCODING)
      return 'Progress: encoding video...';
    if (this.state.currentTask == CLEANUP || this.state.currentTask == CLEANING)
      return 'Progress: cleaning up...';
    if (this.state.currentTask == FINISHED_WITH_ERROR)
      return 'Progress: error exporting video...';
    return 'Progress: done';
  }

  showFile = () => {
    shell.showItemInFolder(this.state.path);
  }
}

function getBatchSize(fps, resolutionHeight) {
  return Math.round(BATCH_SIZE * 30 / fps * (EDITOR_RESOLUTION_HEIGHT / resolutionHeight));
}

function convertUint8ArrayToBinaryString(u8Array) {
	var i, len = u8Array.length, b_str = "";
	for (i=0; i<len; i++) {
		b_str += String.fromCharCode(u8Array[i]);
	}
	return b_str;
}

export default VideoExporter
