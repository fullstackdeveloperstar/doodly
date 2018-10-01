import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'

import Sound from '../../models/sound.js'

import WaveSurfer from 'react-wavesurfer'
import AssetDetails from '../common/asset-details.jsx'

class AudioPreview extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired
  }

  state = {
    loading: true,
    playing: false,

  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps)
      this.load();
  }

  render() {
    return (
      <div className="fill flex center space-around" style={{position: 'relative'}}>
        <div style={{width: 600, height: 300}} onClick={this.togglePlay}>
          {
            this.state.sound &&
            <WaveSurfer
              audioFile={this.state.sound.path}
              playing={this.state.playing}
              onReady={this.handleWaveSurferReady}
              options={{
                waveColor: '#aaaaaa',
                progressColor: '#db4f36',
                height: 350,
                barWidth: 3,
                cursorWidth: 0,
                interact: false,
                maxCanvasWidth: Math.round(this.state.sound.duration / 1000 * 50)
              }}/>
          }
        </div>
        <div style={{
            position: 'absolute',
            top: 10,
            right: 10
          }}>
          <button className="btn default" onClick={this.showSettings}>Settings</button>
          &nbsp;&nbsp;&nbsp;
          <button className="btn destroy" onClick={this.delete}>Delete</button>
        </div>
        <AssetDetails ref="assetDetails" assetActionListener={this.handleAction} {...this.props}/>
      </div>
    );
  }

  load = () => {
    var sound = new Sound(this.props.item);
    this.setState({
      sound: sound,
      loading: true
    });
  }

  delete = () => {
    confirm('Are you sure you want to delete this audio? This action is not reversible.\nThe audio will no longer be available outside the videos that already use it.')
      .then(() => {
        $('.toast').html('Deleting audio...').fadeIn(500);
        $.ajax({
          url: server_url + '/assets/' + this.props.item.id,
          type: 'PUT',
          data: {status: 'inactive'},
        })
          .done((data) => {
            this.setState({published: false})
            this.props.item.status = 'inactive';
            if (this.props.item.onStatusChange) {
              this.props.item.onStatusChange();
            }
          })
          .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.delete))
          .always(() => { $('.toast').fadeOut(); } );
      })
  }

  handleWaveSurferReady = () => {
    this.setState({loading: false});
  }

  togglePlay = () => {
    this.setState({playing: !this.state.playing});
  }

  showSettings = () => {
    this.refs.assetDetails.show();
  }

  handleAction = (action) => {
    switch (action) {
      case 'save_details':
        this.saveAssetDetails();
        break;
      default:
        break;
    }
  }

  saveAssetDetails = () => {
    $('.toast').html('Saving audio details...').fadeIn(500);
    $.ajax({
      url: server_url + '/assets/' + this.props.item.id,
      type: 'PUT',
      data: {
        title: this.props.item.title,
        categ_id: this.props.item.categ_id,
        is_pro: this.props.item.is_pro ? 1 : 0
      },
    })
      .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.updateAssetTitle))
      .always(() => { $('.toast').fadeOut(); } );

    if (this.props.item.onStatusChange)
      this.props.item.onStatusChange();
  }

}

export default AudioPreview
