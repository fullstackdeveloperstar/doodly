import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'

class VideoControls extends React.Component {
  static propTypes = {
    playing: PropTypes.bool.isRequired,
    progress: PropTypes.number.isRequired,
    actionListener: PropTypes.func.isRequired
  }

  render () {
    return (
      <div className="video-controls flex space-between center" style={this.props.style}>
        <button className="btn clear" onClick={this.handlePlayPause}>
          <i className={'control fa fa-lg fa-' + (this.props.playing ? 'pause' : 'play')}/>
        </button>
        <div className="progress-bar fill" ref="videoPlaybackBar" onClick={this.handleSeek}>
          <div className="progress" style={{width: (this.props.progress * 100) + '%'}}/>
        </div>
      </div>
    )
  }

  handlePlayPause = (e) => {
    this.props.actionListener && this.props.actionListener('video_playpause');
  }
  handleSeek = (e) => {
    var pos = (e.clientX - $(e.target).offset().left) / $(this.refs.videoPlaybackBar).width();
    this.props.actionListener && this.props.actionListener({action: 'video_seek', data: { pos: pos }});
  }
}

export default VideoControls
