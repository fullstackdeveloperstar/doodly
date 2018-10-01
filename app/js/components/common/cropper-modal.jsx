import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'

import Modal from '../common/modal.jsx'
import Cropper from 'react-cropper'
import DropZone from 'react-dropzone'

class CropprModal extends React.Component {
  static propTypes = {
    onCrop: PropTypes.func.isRequired
  }

  state = {
    inputFile: null,
    outputData: null
  }

  render() {
    return (
      <Modal ref="modal" className="cropper">
        <div className="pt-16 pb-16">
          <DropZone multiple={false} ref="dropzone" disableClick={true} onDrop={this.handleFiles} style={{height: 480, width: 854}}>
            <Cropper
              ref='cropper'
              src={this.state.inputFile && this.state.inputFile.path}
              style={{height: '100%', width: '100%'}}
              dragMode='move'
              aspectRatio={1.7777}
              guides={true}
              crop={this.onCrop.bind(this)} />
          </DropZone>
        </div>
        <div className="group">
          <div className="flex center space-between">
            <button className="btn default" onClick={this.handleFakeBrowseFiles}>Choose another image</button>
            <button className="btn success" onClick={this.handleCrop}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  open = (file) => {
    this.setState({
      inputFile: file
    });
    this.refs.modal.show();
  }

  cancel = () => {
    this.refs.modal.hide()
  }

  onCrop = (e) => {
    const dataUrl = this.refs.cropper.getCroppedCanvas().toDataURL();
    this.setState({
      outputData: dataUrl
    });
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
          this.setState({selectedFile: null});
        }
      }
      img.src = file.path;
      this.setState({inputFile: file});
    } else {
      this.setState({inputFile: null});
    }
  }

  handleCrop = () => {
    this.refs.modal.hide();
    this.props.onCrop({
      inputFile: this.state.inputFile,
      outputData: this.state.outputData
    });
  }
}

export default CropprModal
