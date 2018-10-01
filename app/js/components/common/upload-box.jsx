import React from 'react'
import $ from 'jquery'
import _ from 'lodash'

import DropZone from 'react-dropzone'

import Cache from '../../cache.js'
import Modal from './modal.jsx'

class UploadBox extends React.Component {

  state = {
    categories: [],
    selectedFile: null,
    submitEnabled: false,
  }

  componentDidMount() {
    if (this.categoriesEnabled()) {
      this.loadCategories();
    }
  }

  componentWillUnmount() {
    if (this.request) this.request.abort();
  }

  categoriesEnabled() {
    return ['Text'].indexOf(this.props.scope) == -1 && this.props.inManager;
  }

  loadCategories = () => {
    var categories = Cache.get('categories', this.props.scope);
    if (categories) {
      this.setState({categories: categories});
    } else
      this.request = $.get(server_url + '/categories/' + this.props.scope + '/subcategories')
       .done((data) => {
         this.setState({categories: data});
         Cache.putSub('categories', this.props.scope, data);
       })
       .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.loadCategories));
  }

  handleFakeBrowseFiles = (e) => {
    this.refs.dropzone.open();
    e.preventDefault();
  }

  show = () => {
    this.refs.addModal.show();
  }

  cancel = (e) => {
    this.refs.addModal.cancel();
    if (e) {
      e.preventDefault();
    }
  }

  reset = (e) => {
    this.setState({selectedFile: null});
    this.refs.title.value = '';
    if (this.categoriesEnabled())
      this.refs.categorySelect.value = '';
    if (e) e.preventDefault();
  }

  checkForm = () => {
    if (!this.state.selectedFile) {
      alert('Please select a file that you want to upload first.');
      return false;
    }
    var missing = '';
    if (!this.refs.title.value) {
      missing += '- asset title\n';
    }
    if (this.categoriesEnabled() && this.refs.categorySelect.value == "") {
      missing += '- asset category\n';
    }
    if (missing != '') {
      alert('Some required fields have not been filled in:\n' + missing);
      return false;
    }
    return true;
  }

  handleFiles = (files) => {
    var scope = _(this.props.scope).singularize().toLower();
    var fileType = this.getFileType(files[0]);
    // make sure we're not uploading trash
    if ((scope == 'character' || scope == 'prop') && fileType != 'image') {
      alert('The uploaded file is not an image.');
      return;
    }

    if ((scope == 'character' || scope == 'prop') && fileType == 'image') {
      let img = new Image();
      img.onload = () => {
        if (img.width > 1920 || img.height > 1080) {
          alert('The uploaded image is too big.<br>Maximum allowed image size is 1920 x 1080.');
          this.setState({selectedFile: null});
        }
      }
      img.src = files[0].path;
    }

    if (scope == 'sound' && fileType != 'sound') {
      alert('The uploaded file is not an audio file.');
      return;
    }
    if (scope == 'sound' && files[0].type != 'audio/mp3') {
      alert(`The ${files[0].type} format is not supported.`);
      return;
    }

    if (scope == 'text' && fileType != 'font') {
      alert('The uploaded file is not a font file.');
      return;
    }

    this.setState({selectedFile: files[0]});

    // compute audio duration
    if (fileType == 'sound') {
      var audio = document.createElement('audio');
      audio.oncanplaythrough = (e) => {
        this.setState({audioDuration: Math.round(e.currentTarget.duration * 1000)})
      };
      var objectUrl = URL.createObjectURL(files[0]);
      audio.src = objectUrl;
    } else
      this.setState({audioDuration: null});
  }

  getFileType = (file) => {
    if (_.startsWith(file.type, 'image'))
      return 'image';

    if (_.startsWith(file.type, 'audio'))
      return 'sound';

    if (file.type == '' || file.type.includes('font'))
      return 'font';

    return '';
  }

  upload = () => {
    if (this.checkForm()) {
      var formData = new FormData();
      formData.append('asset_src', this.state.selectedFile);

      if (this.categoriesEnabled())
        formData.append('categ_id', this.refs.categorySelect.value);

      var fileType = this.getFileType(this.state.selectedFile)
      formData.append('type', fileType);

      formData.append('title', this.refs.title.value);

      if (fileType == 'sound' && this.state.audioDuration)
        formData.append('data', JSON.stringify({duration: this.state.audioDuration}));

      if (!this.props.inManager) {
        formData.append('user_id', this.props.user.id);
        formData.append('parent_categ', this.props.scope);
      } else {
        formData.append('is_pro', this.refs.isPro.checked ? 1 : 0);
        formData.append('user_id', 1);
      }

      this.refs.addModal.hide();
      $('.toast').html('Uploading file to the server...').fadeIn(500);
      $.ajax({
        url: server_url + '/assets',
        method: 'POST',
        data: formData,
        contentType: false,
        processData: false
      }).done((data) => {
        this.props.onUploadCompleted(data);
        $('.toast').fadeOut();
      })
      .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.upload));
    }
  }

  render() {
    var assetName = _(this.props.scope).singularize().toLower();
    if (assetName == 'text') {
      assetName = 'font';
    }

    var categoriesHTML;
    if (this.categoriesEnabled()) {
        categoriesHTML = <div className="row">
                        </div>
    }

    return (
      <Modal title={'Add new ' + assetName} ref="addModal" className="upload-box">
        <DropZone className="row drop-area" activeClassName="row drop-area over" rejectClassName="row drop-area rejected"  multiple={false} ref="dropzone" disableClick={true} onDrop={this.handleFiles}>
          { this.state.selectedFile ?
            <div>
              { _.startsWith(this.state.selectedFile.type, 'image') &&
                <img src={this.state.selectedFile.preview} className="preview"/>
              }
              { _.startsWith(this.state.selectedFile.type, 'audio') &&
                <audio controls className="preview">
                  <source src={this.state.selectedFile.preview}/>
                </audio>
              }
              <label>{this.state.selectedFile.name}</label>
              <button className="btn" onClick={this.reset}>Choose another</button>
            </div>
            :
            <div>
              <label htmlFor="asset_src">Drop your {assetName} here or select a file.</label>
              <button className="btn default" onClick={this.handleFakeBrowseFiles}>Browse files</button>
            </div>
          }
        </DropZone>
        <div className="row">
          <label htmlFor="title">Enter a title:</label>
          <input ref="title" type="text" name="title" placeholder={this.state.selectedFile ? '' : 'Please select a file first'}/>
        </div>
        { this.categoriesEnabled() &&
          <div className="row">
            <label htmlFor="categ_id">Pick a category for the new {assetName}:</label>
            <div className="pretty-select ">
              <select name="categ_id" ref="categorySelect" disabled={this.state.selectedFile ? '' : 'disabled'}>
                <option value="" key="0" disabled>{this.state.selectedFile ? 'Select category' : 'Please select a file first'}</option>
                {this.state.categories.map(function(category){
                  return (
                    <option value={category.id} key={category.id}>{category.name}</option>
                  )
                })}
              </select>
            </div>
          </div>
        }
        <div className="footer flex center space-between">
          <div>
            { this.props.inManager &&
              <div style={{color: '#ff6600', fontWeight: 'bold'}}><input type="checkbox" name="is_pro" ref="isPro"/> PRO</div>
            }
          </div>
          <div>
            <a href="#" className="gray" onClick={this.cancel}>cancel</a>&nbsp;&nbsp;&nbsp;
            <button className="btn success" onClick={this.upload}>Continue &raquo;</button>
          </div>
        </div>
      </Modal>
    );
  }

}

export default UploadBox
