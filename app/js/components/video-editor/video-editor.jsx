import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import Hand from 'hands'

import Modal from 'components/common/modal'

import HeaderBar from 'components/common/header-bar'
import SideBar from 'components/common/sidebar'
import SceneEditor from 'components/scene-editor/scene-editor'
import AssetEditor from 'components/asset-editor/asset-editor'
import VideoExporter from 'components/video-exporter/video-exporter'

import VideoTimeline from './video-timeline'
import VideoSettings from './video-settings'
import VideoControls from './video-controls'

import Video from 'models/video'

const remote = window.require('electron').remote
const ipcRenderer = window.require('electron').ipcRenderer


class VideoEditor extends React.Component {
  static propTypes = {
    video: PropTypes.object.isRequired,
    savedState: PropTypes.object,
    actionListener: PropTypes.func.isRequired,
    handleAjaxFail: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    if (props.savedState)
      this.state = this.props.savedState;
    else
      this.state = {
        initialCanvasWidth: 1152, // 60% of 1920
        initialCanvasHeight: 648,
        fullPreviewZoom: Math.min(1, $(window).width() / (1920 * 0.6) * 0.8),
        mode: 'scene',
        playing: false,
      }
  }

  componentDidMount() {
    this.mounted = true;
    if (!this.props.savedState)
      this.load();
    else {
      // link onLoadCallback so the object can pass updates to the view
      this.state.video.onLoadCallback = () => this.mounted && this.forceUpdate();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    var currentScene = this.state.video && !this.state.video.loading ? this.state.video.scenes[this.state.video.selectedScene] : null;
    return (
      <div className="flex column fill">
        <HeaderBar
          {...this.props}
          title={this.getTitle()}
          canEditTitle={this.state.mode == 'scene'}
          onTitleChange={(title) => this.handleAction({action: 'change_title', data: title})}
          hideBackButton={this.state.mode == 'asset'}/>
        <div className="container fill flex stretch no-overflow">
          { this.state.mode == 'scene' &&
            <SceneEditor
              item={currentScene}
              {...this.props}
              video={this.state.video}
              ref="sceneEditor"
              requiresSave={currentScene && this.state.video.requiresSave}
              canPreview={this.state.video && !this.state.video.loading && _.sum(this.state.video.scenes.map(scene => scene.items.length)) > 0}
              videoActionListener={this.handleAction}/>
          }
          { this.state.mode == 'asset' &&
            <AssetEditor
              item={this.state.currentAsset}
              {...this.props}
              video={this.state.video}
              videoActionListener={this.handleAction}/>
          }
          <SideBar onItemClick={this.handleClickedItem} mode="scene" {...this.props} ref="sidebar"/>
        </div>
        {
          this.state.mode == 'scene' && this.state.video && !this.state.video.loading && 
          <div>
            <VideoTimeline
              video={this.state.video}
              ref="videoTimeline"
              videoActionListener={this.handleAction}/>
            <Modal ref="previewModal" onCancel={this.stopPreview} blockInteraction={this.state.recording}>
              <canvas
                style={{background: 'white', boxShadow: '0 0 1px black'}}
                className="preview-canvas-full"
                ref="previewCanvasFull"
                width={this.state.initialCanvasWidth * this.state.fullPreviewZoom}
                height={this.state.initialCanvasHeight * this.state.fullPreviewZoom}
                onClick={this.handleAction.bind(this, 'video_playpause')}/>
              { !this.state.recording &&
                <VideoControls
                  style={{marginTop: 10, marginBottom: -10}}
                  playing={this.state.playing}
                  progress={(this.state.elapsed || 0)/ this.state.video.totalTime}
                  actionListener={this.handleAction}/>
              }
            </Modal>
            <Modal ref="exportModal" blockInteraction={true} title="Export video">
              <VideoExporter
                ref="videoExporter"
                video={this.state.video}
                onClose={this.handleVideoExporterClosed}/>
            </Modal>
            <VideoSettings ref="videoSettings" video={this.state.video} videoActionListener={this.handleAction}/>
          </div>
        }        
      </div>
    );
  }


  load = () => {
    var video = new Video(this.props.video, (errorRequest) => {
      if (!this.mounted) return;
      if (!errorRequest) {
        this.forceUpdate();
      } else
        this.props.handleAjaxFail(errorRequest, this.load);
    });
    this.setState({video: video});
  }

  save = () => {
    this.state.video.save((errorRequest) => {
      if (!errorRequest) {
        this.forceUpdate();
      } else
        this.props.handleAjaxFail(errorRequest, this.save);
    });
  }

  export = () => {
    this.refs.videoExporter.reset();
    this.refs.exportModal.show();
  }

  handleClickedItem = (item) => {
    if (item.type == 'sound') {
      //this.state.video.addMusic(item);
    } else {
      this.refs.sceneEditor.addAsset(item);
    }
  }

  promptSave = (callback) => {
    if (this.state.video && this.state.video.requiresSave) {
      confirm('It looks like there are some unsaved changes. Would you like to save now?', { confirmLabel: 'Save', abortLabel: 'Discard'})
        .then(() => {
          this.state.video.save(callback);
        })
        .fail(callback);
    } else
      if (callback) callback();
  }

  applyVideoStyle = () => {
    Hand.useSet(this.state.video.handSet, this.state.video.style, this.state.video.mode);
  }

  updateEditedAsset = (updatedAsset) => {
    this.state.video.scenes.map(scene => {
      scene.items.map(asset => {
        if (asset.id == updatedAsset.id)
          asset.updatePaths(updatedAsset.paths);
      })
    })
  }

  removeEditedAsset = (updatedAsset) => {
    this.state.video.scenes.map(scene => {
      _.remove(scene.items, (asset) => asset.id == this.state.currentAsset.id);
      scene.updateStatus();
    })
  }

  startPreview = (startAtTime, stopAtTime) => {
    if (this.state.video.sceneTransition == 'camera-panning') {
      this.state.video.clearBoardPanningElements();
    }
    this.refs.previewModal.show();
    this.setState({
      animationStartTime: startAtTime ? Date.now() - startAtTime : Date.now(),
      stopAtTime: stopAtTime,
      playing: true,
      elapsed: startAtTime
    });

    this.currentAnimation = requestAnimationFrame(this.drawPreview);
  }

  drawPreview = () => {
    var elapsed = Date.now() - this.state.animationStartTime;

    if (elapsed >= (this.state.stopAtTime || this.state.video.totalTime)) {
      this.stopPreview();
      return;
    }

    this.setState({elapsed: elapsed});

    //TODO: scrollToTime for both the current scene and the current audio (if not recording)

    this.state.video.draw(this.refs.previewCanvasFull, this.state.fullPreviewZoom, elapsed, true);
    this.state.video.music.forEach((sound, i) => {
      if (this.state.elapsed > sound.startTime && this.state.elapsed < (sound.startTime + sound.playableDuration())) {
        if (!sound.playing && sound.ready) {
          if (!sound.playing) {
            sound.playing = true;

            if (this.state.elapsed > sound.startTime)
              sound.pos = (this.state.elapsed - sound.startTime + sound.clipStart) / 1000;

            this.refs.videoTimeline.forceUpdate();

            if (!this.state.recording)
              this.refs.videoTimeline.scrollToTime(this.state.elapsed);
          }
        }
      } else {
        if (sound.playing) {
          sound.playing = false;
          this.refs.videoTimeline.forceUpdate();
        }
      }
    });

    this.startingAnimation = setTimeout(() => {
      this.currentAnimation = requestAnimationFrame(this.drawPreview);
    }, 1000 / 30);
  }

  pausePreview = () => {
    if (this.startingAnimation) clearTimeout(this.startingAnimation);
    cancelAnimationFrame(this.currentAnimation);
    delete this.currentAnimation;
    delete this.startingAnimation;
    this.setState({ playing: false })

    this.state.video.music.map(sound => {
      sound.playing = false;
    });
    this.refs.videoTimeline.forceUpdate();

    this.state.video.scenes.forEach(scene => scene.eraseCanvasCleanup());
  }

  stopPreview = () => {
    if (this.startingAnimation) clearTimeout(this.startingAnimation);
    cancelAnimationFrame(this.currentAnimation);

    delete this.currentAnimation;
    delete this.startingAnimation;
    delete this.stopAtTime;

    this.state.video.music.map(sound => {
      sound.playing = false;
      sound.resetPos();
    });

    this.setState({
      playing: false,
      elapsed: 0
    })

    this.refs.videoTimeline.forceUpdate();

    this.state.video.scenes.forEach(scene => scene.eraseCanvasCleanup());
  }

  handleVideoExporterClosed = () => {
    this.refs.exportModal.hide();
    setTimeout(() => {
      this.state.video.scenes.forEach(scene => scene.updateImageCache(this.refs.sceneEditor.state.zoom, this.state.fullPreviewZoom, this.state.video.style));
    }, 500);
  }

  currentState = () => {
    return this.state;
  }

  handleAction = (action) => {
    if (typeof action == 'object') {
      var data = action.data;
      var action = action.action;
    }
    switch (action) {
      case 'save':
        this.save();
        break;
      case 'change_title':
        this.state.video.title = data;
        this.state.video.updateStatus();
        this.forceUpdate();
        break;
      case 'show_settings':
        this.refs.videoSettings.show();
        break;
      case 'update_image_cache':
        if (this.refs.sceneEditor)
        this.state.video.scenes.forEach(scene => {
          scene.updateImageCache(this.refs.sceneEditor.state.zoom, this.refs.sceneEditor.state.fullPreviewZoom, this.state.video.style);
          scene.thumbnail = scene.getThumbnail();
        });
        break;

      // PREVIEW
      case 'preview':
        this.startPreview();
        break;
      case 'preview_scene':
        let startAtTime = _.sum(this.state.video.scenes.filter((scene, index) => index < data.index).map(scene => scene.animationTime + (scene.exitAnimation != 'none' ? 400 : 0)));
        let stopAtTime = startAtTime + this.state.video.scenes[data.index].animationTime;
        this.startPreview(startAtTime, stopAtTime);
        break;
            case 'export':
        this.export();
        break;
      case 'video_playpause':
        if (this.state.playing)
          this.pausePreview();
        else
          this.startPreview(this.state.elapsed);
        break;
      case 'video_seek':
        this.stopPreview();
        this.startPreview(Math.round(data.pos * this.state.video.totalTime));
        break;

      // ASSETS
      case 'edit_asset':
        this.setState({
          mode: 'asset',
          currentAsset: data.asset
        });
        break;
      case 'finish_editing_asset':
        if (data && data.asset)
          this.updateEditedAsset(data.asset);
        this.applyVideoStyle();
        this.setState({
          mode: 'scene',
          currentAsset: null
        });
        break;
      case 'finish_deleting_asset':
        this.removeEditedAsset();
        this.refs.sidebar.reloadActiveTab();
        this.setState({
          mode: 'scene',
          currentAsset: null
        });
        break;

      // SCENES
      case 'add_scene':
        this.state.video.addScene();
        break;
      case 'duplicate_scene':
        this.state.video.duplicateScene(data.index);
        break;
      case 'delete_scene':
        confirm('Are you sure you want to delete this scene?')
          .then(() => {
            this.state.video.deleteScene(data.index);
          })
        break;
      case 'select_scene':
        this.state.video.selectScene(data.index);
        break;
      case 'update_scenes_order':
        this.state.video.updateSceneOrder();
        break;

      // MUSIC
      case 'add_music':
        this.state.video.addMusic(data.sound, data.startTime, data.channel);
        break;
      case 'remove_music':
        this.state.video.removeMusic(data.sound);
        break;
      case 'start_recording':
        this.setState({recording: true});
        this.startPreview(data.recordAtTime);
        break;
      case 'stop_recording':
        this.stopPreview();
        this.refs.previewModal.hide();
        this.state.video.updateStatus();
        this.setState({recording: false});
        break;

      // ON CHANGE
      default:
        if (this.refs.sceneEditor) { // not unmounted
          this.state.video.scenes.forEach(scene => { delete scene.bigBoardPos });
          this.state.video.updateStatus();
          this.forceUpdate();
        }
    }
  }  

  getTitle = () => {
    if (this.state.mode == 'scene')
      return 'Edit Video: ' + ((this.state.video && this.state.video.title) || this.title);
    if (this.state.mode = 'asset')
      return 'Edit Asset: ' + this.state.currentAsset.title;
  }
}

export default VideoEditor
