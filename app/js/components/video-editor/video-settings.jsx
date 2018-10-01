import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import Hand from 'hands'
import Video from '../../models/video.js'
import Modal from 'components/common/modal'
import CropperModal from '../common/cropper-modal'
import ColorPicker from '../common/color-picker.jsx';
import DropZone from 'react-dropzone'

class VideoSettings extends React.Component {
  static propTypes = {
    video: PropTypes.object.isRequired,
    videoActionListener: PropTypes.func.isRequired
  }

  state = {
    style: Video.StyleWhiteboard,
    mode: Video.ModeMarker,
    whiteboardHandSet: 0,
    blackboardHandSet: 0,
    greenboardHandSet: 0,
    glassboardHandSet: 0,
    customChalkHandSet: 0,
    customMarkerHandSet: 0,
    backgroundColor: '#008000',
    backgroundImageFile: null,
    backgroundImageData: null
  }

  componentDidMount() {
    this.update();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps)
      this.update();
  }

  render() {
    let hands = Hand.sets.whiteboard;
    let currentHandSet = this.state.whiteboardHandSet;

    if (this.state.style == Video.StyleBlackboard) {
      hands = Hand.sets.blackboard;
      currentHandSet = this.state.blackboardHandSet;
    } else
    if (this.state.style == Video.StyleGreenboard) {
      hands = Hand.sets.greenboard;
      currentHandSet = this.state.greenboardHandSet;
    } else
    if (this.state.style == Video.StyleGlassboard) {
      hands = Hand.sets.glassboard;
      currentHandSet = this.state.glassboardHandSet;
    } else
    if (this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard) {
      if(this.state.mode == Video.ModeChalk) {
        hands = Hand.sets.custom.chalk;
        currentHandSet = this.state.customChalkHandSet;
      } else {
        hands = Hand.sets.custom.marker;
        currentHandSet = this.state.customMarkerHandSet;
      }
    }

    let hasEraser = currentHandSet != -1 && currentHandSet < hands.length && hands[currentHandSet].erasers.length > 0;

    return (
      <div>
        <Modal ref="modal" className="video-settings" title="Video Settings">
          <div className="group">
            <label>Style:</label>
            <div className="flex center space-between">
              <div className={'style-wrapper' + (this.state.style == 'whiteboard' ? ' selected' : '')} onClick={this.setStyle.bind(this, 'whiteboard')}>
                <div className="style" style={{background: 'white', border: '1px solid #ccc'}}>
                  {
                    this.state.whiteboardHandSet != -1 &&
                    <img 
                      className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                      src={Hand.sets.whiteboard[this.state.whiteboardHandSet].angles[0].src} />
                  }

                </div>
                <i className={'fa fa-angle-' + (this.state.style == 'whiteboard' ? 'down' : 'up')}/>
                Whiteboard
              </div>
              <div className={'style-wrapper' + (this.state.style == 'blackboard' || this.state.style == 'greenboard' ? ' selected' : '')} onClick={this.setStyle.bind(this, this.state.currentChalkboardStyle)}>
                <div className="style" style={{background: this.state.currentChalkboardStyle == 'greenboard' ? '#2f5848' : '#333'}}>
                  {
                    this.state.currentChalkboardStyle == 'blackboard' && this.state.blackboardHandSet != -1 &&
                    <img 
                      className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                      src={Hand.sets.blackboard[this.state.blackboardHandSet].angles[0].src} />
                  }
                  {
                    this.state.currentChalkboardStyle == 'greenboard' && this.state.greenboardHandSet != -1 &&
                    <img 
                      className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                      src={Hand.sets.greenboard[this.state.greenboardHandSet].angles[0].src} />
                  }
                  <div className="options flex column">
                    <div
                      className={'option' + (this.state.currentChalkboardStyle == 'blackboard' ? ' selected' : '')}
                      style={{background: '#333'}}
                      onClick={this.setStyle.bind(this, 'blackboard')}/>
                    <div
                      className={'option' + (this.state.currentChalkboardStyle == 'greenboard' ? ' selected' : '')}
                      style={{background: '#2f5848'}}
                      onClick={this.setStyle.bind(this, 'greenboard')}/>
                  </div>
                </div>
                <i className={'fa fa-angle-' + (this.state.style == 'blackboard' || this.state.style == 'greenboard' ? 'down' : 'up')}/>
                Chalkboard
              </div>
              <div className={'style-wrapper glassboard' +  (this.state.style == 'glassboard' ? ' selected' : '')} onClick={this.setStyle.bind(this, 'glassboard')}>
                <div className="style" style={{background: 'white', border: '1px solid #ccc'}}>
                  {
                    this.state.glassboardHandSet != -1 && this.state.glassboardHandSet < Hand.sets.glassboard.length &&
                      <img 
                        className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                        src={Hand.sets.glassboard[this.state.glassboardHandSet].angles[0].src} />
                  }
                </div>
                <i className={'fa fa-angle-' + (this.state.style == 'glassboard' ? 'down' : 'up')}/>
                Glassboard
              </div>
              <div className={'style-wrapper' +  (this.state.style == 'colorboard' || this.state.style == 'imageboard' ? ' selected' : '')} onClick={this.setStyle.bind(this, this.state.currentCustomboardStyle)}>
                {
                  this.state.currentCustomboardStyle == 'colorboard' && 
                    <div className="style" style={{
                      border: '1px solid #ccc',
                      backgroundColor: this.state.backgroundColor}}>
                      {
                        this.state.mode == 'chalk' && this.state.customChalkHandSet != -1 &&
                          <img 
                            className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                            src={Hand.sets.custom.chalk[this.state.customChalkHandSet].angles[0].src} />
                      }
                      {
                        this.state.mode == 'marker' && this.state.customMarkerHandSet != -1 &&
                          <img 
                            className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                            src={Hand.sets.custom.marker[this.state.customMarkerHandSet].angles[0].src} />
                      }
                    </div>
                }
                {
                  this.state.currentCustomboardStyle == 'imageboard' && 
                    <div className="style" style={{
                      border: '1px solid #ccc',
                      backgroundRepeat: 'no-repeat', 
                      backgroundSize: '100% 100%', 
                      backgroundPosition: 'center center',
                      backgroundColor: 'white', 
                      backgroundImage: this.state.backgroundImageData ? `url(${this.state.backgroundImageData})` : 'none'}}>
                      {
                        this.state.mode == 'chalk' && this.state.customChalkHandSet != -1 &&
                          <img 
                            className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                            src={Hand.sets.custom.chalk[this.state.customChalkHandSet].angles[0].src} />
                      }
                      {
                        this.state.mode == 'marker' && this.state.customMarkerHandSet != -1 &&
                          <img 
                            className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                            src={Hand.sets.custom.marker[this.state.customMarkerHandSet].angles[0].src} />
                      }
                    </div>
                }
                <i className={'fa fa-angle-' + (this.state.style == 'colorboard' || this.state.style == 'imageboard' ? 'down' : 'up')}/>
                Custom
              </div>
            </div>
            <div className={'hands flex center ' + this.state.style }>
              {
                hands.map((set, index) => {
                  let is_selected = (currentHandSet == index);
                  return (
                    <div
                      style={{
                        backgroundRepeat: 'no-repeat', 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center center',
                        backgroundColor: this.state.style == 'colorboard' ? this.state.backgroundColor : null,
                        backgroundImage: this.state.style == 'imageboard' ? `url(${this.state.backgroundImageData})` : null,
                      }}
                      className={'hand-wrapper no-shrink' + (is_selected ? ' selected' : '')}
                      key={index}
                      onClick={this.selectHand.bind(this, index)}>
                      <div 
                        className={ this.state.handStyle == Video.HandStyleLeft ? 'flip-h' : '' } 
                        style={{
                          backgroundImage: 'url(\''+set.angles[0].src+'\')',
                          backgroundPosition: 'center',
                          backgroundSize: 'auto 100%',
                          backgroundRepeat: 'no-repeat',
                          height: '100%',
                        }} />
                    </div>
                  )
                })
              }
              <div
                style={{
                  backgroundRepeat: 'no-repeat', 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center center',
                  backgroundColor: this.state.style == 'colorboard' ? this.state.backgroundColor : null,
                  backgroundImage: this.state.style == 'imageboard' ? `url(${this.state.backgroundImageData})` : null,
                }}
                className={'hand-wrapper no-shrink' + ( currentHandSet == -1 ? ' selected' : '' )}
                key={hands.length}
                onClick={this.selectHand.bind(this, -1)}>
                <div className="flex center space-around no-hand">NO<br/>HAND</div>
              </div>
              <div key={hands.length + 1} style={{width: 20}} className="no-shrink">&nbsp;</div>
            </div>
          </div>
          <div className="group flex center space-between">
            <div className="flex center" style={{visibility:(this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard)?'visible':'hidden'}}>
              <div className="pretty-select">
                <select ref="customMode" onChange={this.handleChangeCustomMode}>
                  <option value={Video.ModeMarker}>Marker</option>
                  <option value={Video.ModeChalk}>Chalk</option>
                </select>
              </div>&nbsp;&nbsp;
              <div className="pretty-select">
                <select ref="customStyle" onChange={this.handleChangeCustomStyle}>
                  <option value={Video.StyleColorboard}>Custom Color</option>
                  <option value={Video.StyleImageboard}>Custom Image</option>
                </select>
              </div>&nbsp;&nbsp;
              <div style={{display:this.state.style == Video.StyleColorboard?'block':'none'}}>
                <ColorPicker 
                  color={this.state.backgroundColor} 
                  resetColor="#008000" 
                  onChange={this.handleColorChange}/>
              </div>
              <div style={{display:this.state.style == Video.StyleImageboard?'block':'none'}}>
                <DropZone multiple={false} ref="dropzone" disableClick={true} onDrop={this.handleFiles} style={{visibility:'hidden'}}></DropZone>
                <button className="btn default" onClick={this.handleFakeBrowseFiles}>Browse file</button>&nbsp;&nbsp;
                {
                  this.state.backgroundImageFile && 
                    <div style={{display:'inline'}}>
                      <span>{this.state.backgroundImageFile.name}</span>
                      <button className="btn clear xs" onClick={this.openCropperModal.bind(this, this.state.backgroundImageFile)}>
                        <i className="fa fa-crop" style={{color: '#993333'}}/>
                      </button>
                    </div>
                }
              </div>
            </div>
            <div className="pretty-select">
              <select ref="handStyle" onChange={this.handleChangeHandStyle}>
                <option value={Video.HandStyleRight}>Right-Handed</option>
                <option value={Video.HandStyleLeft}>Left-Handed</option>
              </select>
            </div>
          </div>
          <div className="group">
            <label>Title:</label>
            <input type="text" ref="title" placeholder="No title" />
          </div>
          <div className="group">
            <label>Settings:</label>
            <div className="settings flex space-between">
              <div className="flex column" style={{marginRight: '3%'}}>
                <span>Video ends when:</span>
                <div className="pretty-select">
                  <select ref="videoEnd" onChange={this.changeVideoEnd}>
                    <option value="both">both the animation and audio end</option>
                    <option value="animation">animation ends</option>
                  </select>
                </div>
              </div>
              <div className="flex column" style={{marginRight: '3%'}}>
                <span>Scene transition:</span>
                <div className="pretty-select">
                  <select ref="sceneTransition" onChange={this.changeSceneTransition}>
                    <option value="swipe-left">Swipe left</option>
                    <option value="swipe-right">Swipe right</option>
                    <option value="swipe-up">Swipe up</option>
                    <option value="swipe-down">Swipe down</option>
                    <option value="swipe-mixed">Swipe mixed</option>
                    <option value="camera-panning">Camera panning</option>
                  </select>
                </div>
              </div>
              <div className={'flex column' + (!hasEraser ? ' disabled' : '')} style={{flexShrink: 0}}>
                <span>Erase mode:</span>
                <div className="pretty-select">
                  <select ref="eraseMode" disabled={!hasEraser} onChange={this.changeEraseMode}>
                    <option value="smart">Smart Mode</option>
                    <option value="finger">With Finger</option>
                    <option value="eraser">With Eraser</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                {
                  !hasEraser &&
                  <span className="note">&nbsp;(Unavailable)</span>
                }
              </div>
            </div>
          </div>
          <div className="group">
            <div className="text-right">
              <a href="javascript:;" onClick={this.cancel}>Cancel</a>&nbsp;&nbsp;&nbsp;
              <button className="btn lg success" onClick={this.save}>Apply</button>
            </div>
          </div>
        </Modal>
        <CropperModal ref="cropper" onCrop={this.handleCrop} />
      </div>
    );
  }

  update = () => {
    if (this.props.video) {
      
      this.refs.title.value = this.props.video.title;
      this.refs.videoEnd.value = this.props.video.videoEnd;
      this.refs.eraseMode.value = this.props.video.eraseMode;
      this.refs.sceneTransition.value = this.props.video.sceneTransition;
      this.refs.customStyle.value = (this.props.video.style == Video.StyleColorboard || this.props.video.style == Video.StyleImageboard) ? this.props.video.style : Video.StyleColorboard;
      this.refs.customMode.value = (this.props.video.style == Video.StyleColorboard || this.props.video.style == Video.StyleImageboard) ? this.props.video.mode : Video.ModeMarker;
      this.refs.handStyle.value = this.props.video.handStyle;

      let whiteboardHandSet = this.props.video.style == 'whiteboard' ? (this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_whiteboard_set) : Hand.sets.default_whiteboard_set;
      let blackboardHandSet = this.props.video.style == 'blackboard' ? (this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_blackboard_set) : Hand.sets.default_blackboard_set;
      let greenboardHandSet = this.props.video.style == 'greenboard' ? (this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_greenboard_set) : Hand.sets.default_greenboard_set;
      let glassboardHandSet = this.props.video.style == 'glassboard' ? (this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_glassboard_set) : Hand.sets.default_glassboard_set;

      let customChalkHandSet = Hand.sets.default_custom_chalk_set;
      let customMarkerHandSet = Hand.sets.default_custom_marker_set;
      if(this.props.video.style == Video.StyleImageboard || this.props.video.style == Video.StyleColorboard) {
        if(this.props.video.mode == Video.ModeChalk) {
          customChalkHandSet = this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_custom_chalk_set;
        } else {
          customMarkerHandSet = this.props.video.handSet != undefined ? this.props.video.handSet : Hand.sets.default_custom_marker_set;
        }
      }

      this.setState({
        style: this.props.video.style,
        mode: this.props.video.mode,
        currentChalkboardStyle: (this.props.video.style == 'blackboard' || this.props.video.style == 'greenboard') ? this.props.video.style : 'blackboard',
        currentCustomboardStyle: (this.props.video.style == 'colorboard' || this.props.video.style == 'imageboard') ? this.props.video.style : 'colorboard',
        videoEnd: this.props.video.videoEnd,
        eraseMode: this.props.video.eraseMode,
        sceneTransition: this.props.video.sceneTransition,
        handStyle: this.props.video.handStyle,
        whiteboardHandSet: whiteboardHandSet,
        blackboardHandSet: blackboardHandSet,
        greenboardHandSet: greenboardHandSet,
        glassboardHandSet: glassboardHandSet,
        customChalkHandSet: customChalkHandSet,
        customMarkerHandSet: customMarkerHandSet,
        backgroundColor: this.props.video.style == 'colorboard' ? this.props.video.background.backgroundColor : this.state.backgroundColor,
        backgroundImageData: this.props.video.style == 'imageboard' ? this.props.video.background.backgroundImage.src : this.state.backgroundImageData,
       });
    }
  }



  show = () => {
    this.update();
    this.refs.modal.show();
  }

  cancel = () => {
    this.refs.modal.hide();
  }

  changeVideoEnd = () => {
    this.setState({videoEnd: this.refs.videoEnd.value})
  }

  changeSceneTransition = () => {
    this.setState({sceneTransition: this.refs.sceneTransition.value})
  }

  changeEraseMode = () => {
    this.setState({eraseMode: this.refs.eraseMode.value})
  }

  setStyle = (style, event) => {
    event.stopPropagation();
    this.setState({
      style: style,
      currentChalkboardStyle: (style == 'blackboard' || style == 'greenboard') ? style : this.state.currentChalkboardStyle,
      currentCustomboardStyle: (style == 'colorboard' || style == 'imageboard') ? style : this.state.currentCustomboardStyle,
    });
  }

  handleColorChange = (color) => {
    this.setState({backgroundColor: color});
  }

  handleFakeBrowseFiles = (e) => {
    this.refs.dropzone.open();
    e.preventDefault();
  }

  handleFiles = (files) => {
    if(files) {
      var file = files[0];
      if(!_.startsWith(file.type, 'image')) {
        alert('The uploaded file is not an image.');
        return;
      }
  
      let img = new Image();
      img.onload = () => {
        if (img.width > 1920 || img.height > 1080) {
          alert('The uploaded image is too big.<br>Maximum allowed image size is 1920 x 1080.');
          return;
        }
        this.openCropperModal(file);
      }
      img.src = file.path;
    }
  }

  handleChangeCustomStyle = (e) => {
    var style = e.target.value;
    this.setStyle(style, e);
  }

  handleChangeCustomMode = (e) => {
    var mode = e.target.value;
    this.setState({
      mode: mode
    });
  }

  handleChangeHandStyle = (e) => {
    var handStyle = e.target.value;
    this.setState({
      handStyle: handStyle
    });
  }

  handleCrop = (data) => {
    this.setState({
      backgroundImageFile: data.inputFile,
      backgroundImageData: data.outputData
    });
  }

  openCropperModal = (file) => {
    this.refs.cropper.open(file);
  }

  showHandsModal = () => {
    this.refs.hands_modal.show();
  }

  selectHand = (index) => {
    switch (this.state.style) {
      case 'blackboard':
        this.setState({blackboardHandSet: index});
        break;
      case 'greenboard':
        this.setState({greenboardHandSet: index});
        break;
      case 'glassboard':
        this.setState({glassboardHandSet: index});
        break;
      case 'imageboard':
      case 'colorboard':
        if (this.state.mode == Video.ModeChalk) {
          this.setState({customChalkHandSet: index});
        } else {
          this.setState({customMarkerHandSet: index});
        }
        break;
      default:
        this.setState({whiteboardHandSet: index});
    }
  }

  save = () => {

    if(this.state.style == 'imageboard' && !this.state.backgroundImageData) {
      alert('Please choose a image.');
      return;
    }
    if(this.state.style == 'imageboard' && this.state.backgroundImageFile) {
      this.props.video.isBackgroundImageChanged = true;
    }

    let hands = Hand.sets.whiteboard;
    let currentHandSet = this.state.whiteboardHandSet;

    if (this.state.style == 'blackboard') {
      hands = Hand.sets.blackboard;
      currentHandSet = this.state.blackboardHandSet;
    } else
    if (this.state.style == 'greenboard') {
      hands = Hand.sets.blackboard;
      currentHandSet = this.state.greenboardHandSet;
    } else
    if (this.state.style == 'glassboard') {
      hands = Hand.sets.glassboard;
      currentHandSet = this.state.glassboardHandSet;
    } else
    if (this.state.style == 'colorboard' || this.state.style == 'imageboard') {
      if(this.state.mode == Video.ModeChalk) {
        hands = Hand.sets.custom.chalk;
        currentHandSet = this.state.customChalkHandSet;
      } else {
        hands = Hand.sets.custom.marker;
        currentHandSet = this.state.customMarkerHandSet;
      }
    }

    let hasEraser = currentHandSet != -1 && currentHandSet < hands.length && hands[currentHandSet].erasers.length > 0;

    this.refs.modal.hide();
    $('.toast').html('Applying settings...').fadeIn(500);

    this.props.video.title = this.refs.title.value;
    this.props.video.style = this.state.style;
    this.props.video.handSet = currentHandSet;
    this.props.video.videoEnd = this.state.videoEnd;
    this.props.video.handStyle = this.state.handStyle;

    // background
    if (this.state.style == 'colorboard') {
      this.props.video.background = {
        type: Video.BackgroundTypeColor,
        backgroundColor: this.state.backgroundColor
      };
    } else if (this.state.style == 'whiteboard' || this.state.style == 'glassboard') {
      this.props.video.background = {
        type: Video.BackgroundTypeColor,
        backgroundColor: Video.BackgroundDefaultColor
      };
    } else {
      var backgroundImage = new Image();
      if (this.state.style == 'imageboard') {
        backgroundImage.src = this.state.backgroundImageData;
      } else if (this.state.style == 'blackboard') {
        backgroundImage.src = Video.ChalkboardBlackImgSrc;
      } else if (this.state.style == 'greenboard') {
        backgroundImage.src = Video.ChalkboardGreenImgSrc;
      }
      this.props.video.background = {
        type: Video.BackgroundTypeImage,
        backgroundImage: backgroundImage
      };
    }

    // mode
    if(this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard) {
      this.props.video.mode = this.state.mode;
    } else if(this.state.style == Video.StyleBlackboard || this.state.style == Video.StyleGreenboard) {
      this.props.video.mode = Video.ModeChalk;
    } else {
      this.props.video.mode = Video.ModeMarker;
    }

    this.props.video.sceneTransition = this.state.sceneTransition;
    this.props.video.scenes.filter(scene => scene.exitAnimation != 'none').forEach(scene => {
      if (this.state.sceneTransition == 'swipe-mixed') {
        let transitions = ['swipe-left', 'swipe-right', 'swipe-up', 'swipe-down'];
        scene.exitAnimation = transitions[Math.floor(Math.random() * transitions.length)];
      } else {
        scene.exitAnimation = this.state.sceneTransition;
      }
    })

    if (hasEraser)
      this.props.video.eraseMode = this.state.eraseMode;

    setTimeout(() => {
      if (this.props.videoActionListener) {
        // update image cache
        this.props.videoActionListener({ action: 'update_image_cache' });

        // force thumbnail update
        this.props.video.scenes.forEach(scene => {
          delete scene.loadedThumbnailData;
          delete scene.prev_thumbnail_data;
          scene.updateStatus();
        })

        // trigger video update
        this.props.videoActionListener({ action: 'change' });
      }

      Hand.useSet(this.props.video.handSet, this.props.video.style, this.props.video.mode, () => {
        $('.toast').html('Settings applied successfully');
        setTimeout(() => { $('.toast').fadeOut(500) }, 2000);
      });
    }, 500);
  }

}

export default VideoSettings
