import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Video from "../../../../models/video.js";

class ScenesTimelineItem extends Component {
  static propTypes = {
    scene: PropTypes.object.isRequired,
    selected: PropTypes.bool.isRequired,
    dragged: PropTypes.bool.isRequired,
    exitTime: PropTypes.number.isRequired,
    videoStyle: PropTypes.string.isRequired,
    onStartResizing: PropTypes.func.isRequired,
  }

  state = {
    background: null,
    mode: Video.ModeMarker
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps != this.props)
      this.load();
  }

  load = () => {
    if(this.props.scene.video) {
      this.setState({ 
        background: this.props.scene.video.background,
        mode: this.props.scene.video.mode
      });
    }
  }

  render() {
    const { scene, selected, dragged, exitTime, videoStyle, onStartResizing, ...otherProps } = this.props;
    return (
      this.state.background && 
      <div style={{
        backgroundColor: this.state.background.type == Video.BackgroundTypeColor ? this.state.background.backgroundColor : null,
        backgroundImage: this.state.background.type == Video.BackgroundTypeImage ? 'url(\'' + this.state.background.backgroundImage.src + '\')' : null,
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover'}}>
        <div
          className={'scene flex center space-around no-shrink' +
            (selected ? ' selected' : '') +
            (dragged ? ' hidden' : '') +
            ' ' + videoStyle}
          style={{
            width: (scene.animationTime + exitTime) / 1000 * 50,
            backgroundImage: 'url(\'' + (scene.thumbnail || scene.thumb_path || '') + '\')',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            mixBlendMode: this.state.mode == Video.ModeChalk ? 'screen' : null,
          }}
          {...otherProps}
          >
          <div className="resize-handle" onMouseDown={onStartResizing} draggable={false}/>
        </div>
      </div>
    );
  }
}

export default ScenesTimelineItem;