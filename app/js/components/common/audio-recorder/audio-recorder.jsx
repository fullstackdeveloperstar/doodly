// cool blog article on how to do this: http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

// distortion curve for the waveshaper, thanks to Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

import React, { Component }   from 'react'
import { string, number, bool, func } from 'prop-types'
import Recorder from './recorder'
import AudioContext from './audio-context'
import Visualizer from './visualizer'


export default class AudioRecorder extends Component {
  constructor(props) {
    super(props);
    this.state = {
      analyser            : null,
      microphoneRecorder  : null,
      canvas              : null,
      canvasCtx           : null,
      duration: 0
    }
  }

  componentDidMount() {
    const { onStop, onStart, audioElem, audioBitsPerSecond, mimeType } = this.props;
    const { visualizer } = this.refs;
    const canvas = visualizer;
    const canvasCtx = canvas.getContext("2d");
    const options = {
      audioBitsPerSecond : audioBitsPerSecond,
      mimeType           : mimeType
    }

    if(audioElem) {
      const analyser = AudioContext.getAnalyser();

      AudioPlayer.create(audioElem);

      this.setState({
        analyser            : analyser,
        canvas              : canvas,
        canvasCtx           : canvasCtx
      }, () => {
        requestAnimationFrame(this.visualize);
      });
    } else {
      const analyser = AudioContext.getAnalyser();

      this.setState({
        analyser            : analyser,
        microphoneRecorder  : new Recorder(onStart, onStop, this.onData, options),
        canvas              : canvas,
        canvasCtx           : canvasCtx
      }, () => {
        requestAnimationFrame(this.visualize)
      });
    }

  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.recording) {
      requestAnimationFrame(this.visualize)
    }
  }
  

  visualize = () => {
    const { backgroundColor, strokeColor, visualSetting } = this.props;
    const { canvas, canvasCtx, analyser } = this.state;

    if(visualSetting === 'sinewave') {
      Visualizer.visualizeSineWave(analyser, canvasCtx, canvas, backgroundColor, strokeColor);

    } else if(visualSetting === 'frequencyBars') {
      Visualizer.visualizeFrequencyBars(analyser, canvasCtx, canvas, backgroundColor, strokeColor);

    }

  }

  clear() {
    const { canvas, canvasCtx } = this.state;
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  onData = (data) => {
    this.setState({ duration: data.duration });
    if (this.props.onDurationChange) 
      this.props.onDurationChange(data.duration);
  }

  startRecording = () => {
    const { microphoneRecorder } = this.state;

    this.setState({ recording: true });
    this.clear();
    microphoneRecorder.startRecording(this.props.onStart);
  }

  stopRecording = () => {
    const { microphoneRecorder } = this.state;

    this.setState({ recording: false });
    microphoneRecorder.stopRecording(this.props.onStop);
  }

  render() {
    const { onStop, width, height } = this.props;
    
    let minutes = Math.floor(this.state.duration / 1000 / 60);
    let seconds = Math.floor(this.state.duration / 1000 % 60);

    let visualizerWidth = width - ((this.refs.controls && this.refs.controls.width) || 120);

    return (
      <div className="flex center space-around" style={{ width: width }}>
        { this.state.recording? 
          <span>
            <button className="btn clear control" onClick={this.stopRecording}>
              <i className="fa fa-stop-circle fa-2x"></i>
            </button>
          </span>
        :            
          <button className="btn clear control" onClick={this.startRecording}>
            <span className="fa-stack">
              <i className="fa fa-circle fa-stack-2x"></i>
              <i className="fa fa-microphone fa-stack-1x fa-inverse"></i>
            </span>
          </button>
        }    
        <div>
          { ('0' + minutes).slice(-3) + ':' + ('0' + seconds).slice(-2) }
        </div>
        <canvas 
          ref="visualizer" 
          width={visualizerWidth} 
          height={height} 
          className={this.props.className} 
          style={{ marginRight: 10 }}/>
      </div>      
    );
  }
}

AudioRecorder.propTypes = {
  backgroundColor : string,
  strokeColor     : string,
  className       : string,
  audioBitsPerSecond: number,
  mimeType        : string,
  record          : bool.isRequired,
  onStop          : func,
  onDurationChange: func,
  width           : number.isRequired,
  height          : number.isRequired
};

AudioRecorder.defaultProps = {
  backgroundColor   : 'rgba(255, 255, 255, 0.5)',
  strokeColor       : '#000000',
  className         : 'visualizer',
  audioBitsPerSecond: 128000,
  mimeType          : 'audio/mp3',
  record            : false,
  visualSetting     : 'sinewave'
}