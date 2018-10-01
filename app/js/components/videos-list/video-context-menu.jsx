import React from 'react'
import PropTypes from 'prop-types'
import ContextMenu, { MenuItem } from '../common/context-menu.jsx'

class VideoContextMenu extends React.Component {
  static propTypes = {
    actionListener: PropTypes.func.isRequired
  }

  state = {
    videoId: -1
  };

  render() {
    let { videoId, ...props } = this.state;
    return (
      <ContextMenu ref="menu" {...props}>
        <MenuItem title="Duplicate Video" onClick={this.duplicateVideo}/>
      </ContextMenu>
    )
  }

  show = (videoId, event) => {
    this.setState({
      videoId: videoId,
      x: event.clientX - 10,
      y: event.clientY - 10,
    })
    this.refs.menu.show();
  }

  duplicateVideo = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'duplicate_video',
      data: {
        videoId: this.state.videoId
      }
    })
  }

}

export default VideoContextMenu
