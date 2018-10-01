import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import Hand from '../../hands.js'
import Video from '../../models/video.js'
import Modal from '../common/modal.jsx'
import CropperModal from '../common/cropper-modal'
import ColorPicker from '../common/color-picker.jsx';
import DropZone from 'react-dropzone'

class CreateVideoPopup extends React.Component {
  static propTypes = {
    onVideoCreated: PropTypes.func.isRequired
  }

  state = {
    style: Video.StyleWhiteboard,
    mode: Video.ModeMarker,
    currentChalkboardStyle: Video.StyleBlackboard,
    currentCustomboardStyle: Video.StyleColorboard,
    color: '#008000',
    backgroundImageFile: null,
    backgroundImageData: null
  }

  render() {
    return (
      <div>
        <Modal ref="modal" className="video-settings" title="Create new video">
          <div className="group">
            <label>Style:</label>
            <div className="flex center space-between">
              <div className={'style-wrapper' + (this.state.style == Video.StyleWhiteboard ? ' selected' : '')} onClick={this.setStyle.bind(this, Video.StyleWhiteboard)}>
                <div className="style" style={{background: 'white', border: '1px solid #ccc'}}/>
                Whiteboard
              </div>
              <div className={'style-wrapper' + (this.state.style == Video.StyleBlackboard || this.state.style == Video.StyleGreenboard ? ' selected' : '')} onClick={this.setStyle.bind(this, this.state.currentChalkboardStyle)}>
                <div className="style" style={{background: this.state.currentChalkboardStyle == Video.StyleGreenboard ? '#2f5848' : '#333'}}>
                  <div className="options flex column">
                    <div
                      className={'option' + (this.state.currentChalkboardStyle == Video.StyleBlackboard ? ' selected' : '')}
                      style={{background: '#333'}}
                      onClick={this.setStyle.bind(this, Video.StyleBlackboard)}/>
                    <div
                      className={'option' + (this.state.currentChalkboardStyle == Video.StyleGreenboard ? ' selected' : '')}
                      style={{background: '#2f5848'}}
                      onClick={this.setStyle.bind(this, Video.StyleGreenboard)}/>
                  </div>
                </div>
                Chalkboard
              </div>
              <div className={'style-wrapper glassboard' +  (this.state.style == Video.StyleGlassboard ? ' selected' : '')} onClick={this.setStyle.bind(this, Video.StyleGlassboard)}>
                <div className="style" style={{background: 'white', border: '1px solid #ccc'}}/>
                Glassboard
              </div>
              <div className={'style-wrapper' +  (this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard ? ' selected' : '')} onClick={this.setStyle.bind(this, this.state.currentCustomboardStyle)}>
                {
                  this.state.currentCustomboardStyle == Video.StyleColorboard &&
                    <div className="style" style={{
                      border: '1px solid #ccc', 
                      backgroundColor: this.state.color}} />
                }
                {
                  this.state.currentCustomboardStyle == Video.StyleImageboard &&
                    <div className="style" style={{
                      border: '1px solid #ccc', 
                      backgroundRepeat: 'no-repeat', 
                      backgroundSize: '100% 100%', 
                      backgroundPosition: 'center center',
                      backgroundColor: 'white',
                      backgroundImage: this.state.backgroundImageData?`url(${this.state.backgroundImageData})`:'none'}}/>
                }
                Custom
              </div>
            </div>
            <div className="group pl-16" style={{visibility:(this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard)?'visible':'hidden'}}>
              <div className="flex center">
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
                    color={this.state.color} 
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
            </div>
          </div>
          <div className="group">
            <label>Title:</label>
            <input type="text" ref="title" placeholder="No title" />
          </div>
          <div className="group">
            <div className="text-right">
              <a href="javascript:;" onClick={this.cancel}>Cancel</a>&nbsp;&nbsp;&nbsp;
              <button className="btn lg success" onClick={this.createNewVideo}>Create</button>
            </div>
          </div>
        </Modal>
        <CropperModal ref="cropper" onCrop={this.handleCrop} />
      </div>  
    );
  }

  show = () => {
    this.refs.modal.show();
  }

  setStyle = (style, event) => {
    event.stopPropagation();
    this.setState({
      style: style,
      currentChalkboardStyle: (style == Video.StyleBlackboard || style == Video.StyleGreenboard) ? style : this.state.currentChalkboardStyle,
      currentCustomboardStyle: (style == Video.StyleColorboard || style == Video.StyleImageboard) ? style : this.state.currentCustomboardStyle,
    });
  }

  cancel = () => {
    this.refs.modal.hide()
  }

  createNewVideo = () => {

    if(this.state.style == 'imageboard' && !this.state.backgroundImageFile) {
      alert('Please choose a image.');
      return;
    }

    this.refs.modal.hide();
    $('.toast').html('Creating new video...').fadeIn(500);

    var formData = new FormData();
    formData.append('title', this.refs.title.value || 'No title');
    formData.append('style', this.state.style);

    // hand_set
    var hand_set = 0;
    if (this.state.style == Video.StyleWhiteboard) {
      hand_set = Hand.sets.default_whiteboard_set;
    } else if (this.state.style == Video.StyleBlackboard) {
      hand_set = Hand.sets.default_greenboard_set;
    } else if (this.state.style == Video.StyleGreenboard) {
      hand_set = Hand.sets.default_glassboard_set;
    } else if (this.state.style == Video.StyleGlassboard) {
      hand_set = Hand.sets.default_glassboard_set;
    } else if (this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard) {
      if (this.state.mode == Video.ModeChalk) {
        hand_set = Hand.sets.default_custom_chalk_set;
      } else {
        hand_set = Hand.sets.default_custom_marker_set;
      }
    } 
    formData.append('hand_set', hand_set);
    
    // mode
    if (this.state.style == Video.StyleColorboard || this.state.style == Video.StyleImageboard) {
      formData.append('mode', this.state.mode);
    }
    
    // background
    if (this.state.style == Video.StyleColorboard) {
      formData.append('background', this.state.color);
    } else if (this.state.style == Video.StyleImageboard) {
      formData.append('background', this.state.backgroundImageData);
    }

    $.ajax({
      url: server_url + '/videos',
      method: 'POST',
      data: formData,
      contentType: false,
      processData: false
    }).done((video) => {
      this.props.onVideoCreated(video);
    }).fail((request, textStatus, error) => 
      this.props.handleAjaxFail(request, this.createNewVideo)
    ).always(() => {
      $('.toast').fadeOut();
    });
  }

  handleColorChange = (color) => {
    this.setState({color: color});
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

  handleCrop = (data) => {
    this.setState({
      backgroundImageFile: data.inputFile,
      backgroundImageData: data.outputData
    });
  }

  openCropperModal = (file) => {
    this.refs.cropper.open(file);
  }

}

export default CreateVideoPopup
