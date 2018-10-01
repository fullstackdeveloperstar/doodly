import React, { Component } from 'react'
import PropTypes from 'prop-types'
import AudioRecorder from 'components/common/audio-recorder/audio-recorder'

class AudioRecorderItem extends Component {
  static propTypes = {
    startTime: PropTypes.number.isRequired,
    duration: PropTypes.number.isRequired,
    maxAllowedDuration: PropTypes.number,
    dragged: PropTypes.bool,
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,
    onStartRecording: PropTypes.func,
    onStopRecording: PropTypes.func,
    onDurationChange: PropTypes.func
  }

  render() {
    const { 
      startTime,
      duration,
      maxAllowedDuration,
      dragged,
      onDragStart,
      onDragEnd,
      onStartRecording,
      onStopRecording,
      onDurationChange,
      ...otherProps
    } = this.props;

    let allowedDuration = Math.min(duration || 5000, maxAllowedDuration || 5000);
    let width = Math.round(Math.max(allowedDuration, 5000) / 1000 * 50);
    return (
      <div 
        className={'audio recorder flex' + (dragged ? ' dragged' : '')}
        style={{
          left: Math.round(startTime / 1000 * 50),
          width: width,
          background: 'white'
        }}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}>
        <AudioRecorder 
          onDurationChange={onDurationChange}
          onStart={onStartRecording}
          onStop={onStopRecording}
          height={35}
          width={250}
        />
        {
          duration > maxAllowedDuration &&
          <div className="flash"/>
        }
        { duration == 0 && 
          <button className="btn clear remove" onClick={this.hide}><i className="fa fa-times"/></button>        
        }
      </div>
    );
  }
  
  hide = () => {
    if (this.props.onStopRecording) this.props.onStopRecording();
  }
}    

export default AudioRecorderItem;