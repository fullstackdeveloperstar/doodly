import React from 'react'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import _ from 'lodash'

class VolumeControl extends React.Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
    segments: PropTypes.number.isRequired,
    onVolumeChange: PropTypes.func.isRequired
  }

  static defaultProps = {
    width: 50,
    height: 100,
    volume: 1,
    segments: 5
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    var {
      width,
      height,
      volume,
      segments
    } = this.props

    width = width || $(this).width();
    height = height || $(this).height();

    return (
      <div
        className="volume-control flex column space-between"
        style={{width: width, height: height  }}
        onMouseDown={this.handleMouseDown}
      >
        {[...Array(segments).keys()].map(i => (
          <div
            key={i}
            style={{ width: (1 - i / segments) * 100 + '%', height: Math.floor((height - segments + 1) / segments)}}/>
        ))}
        <div className="active flex column space-between" style={{clip: 'rect(' + Math.round((1 - volume) * height) + 'px, ' + width + 'px, ' + height + 'px, 0px)'}}>
          {[...Array(segments).keys()].map(i => (
            <div
              key={i}
              style={{ width: (1 - i / segments) * 100 + '%', height: Math.floor((height - segments + 1) / segments)}}/>
          ))}
        </div>
        <span className="value">{_.round(volume * 100, 2)}%</span>
      </div>
    )
  }

  handleMouseDown = (e) => {
    this.mouseIsDown = true;

    let target = ReactDOM.findDOMNode(this);
    let y = _.clamp(e.clientY - $(target).offset().top, 0, $(target).height());
    let volume = _.round(1 - y / $(target).height(), 2);

    this.props.onVolumeChange(volume);
  }

  handleMouseUp = () => {
    this.mouseIsDown = false;
  }

  handleMouseMove = (e) => {
    if (!this.mouseIsDown) return;
    let target = ReactDOM.findDOMNode(this);
    let y = _.clamp(e.clientY - $(target).offset().top, 0, $(target).height());
    let volume = _.round(1 - y / $(target).height(), 2);

    this.props.onVolumeChange(volume);
  }

  handleKeyDown = (e) => {
    var volume = parseFloat(this.props.volume);
    switch (e.keyCode) {
      case 38: // arrow up
        volume = Math.min(volume + 0.05, 1);
        this.props.onVolumeChange(_.round((Math.round(volume * 20) / 20), 2));
        break;
      case 40: // arrow down
        volume = Math.max(volume - 0.05, 0);
        this.props.onVolumeChange(_.round((Math.round(volume * 20) / 20), 2));
        break;
      default:
        // nothing
    }
  }
}

export default VolumeControl
