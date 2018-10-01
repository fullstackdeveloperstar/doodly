import React from 'react'
import PropTypes from 'prop-types'
import WaveSurfer from 'react-wavesurfer'
import $ from 'jquery'

class AudioTimelineItem extends React.Component {
  static propTypes = {
    sound: PropTypes.object.isRequired,
    volume: PropTypes.number.isRequired,

    onDelete: PropTypes.func.isRequired,

    dragged: PropTypes.bool,
    onDragStart: PropTypes.func,
    onDragEnd: PropTypes.func,

    actionListener: PropTypes.func.isRequired,
  }

  state = {
    clipping: false
  }

  componentDidMount() {
    $('body').bind('mousemove', this.onMouseMove);
    $('body').bind('mouseup', this.onMouseUp);
  }

  componentWillUnmount() {
    $('body').unbind('mousemove', this.onMouseMove);
    $('body').unbind('mouseup', this.onMouseUp);
  }

  componentWillUpdate(nextProps, nextState) {
    if (!nextState.clipping && !nextProps.sound.playing)
      this.refs.waveSurfer._seekTo(nextProps.sound.pos);
    if (nextProps.sound.playing != this.refs.waveSurfer._wavesurfer.params.interact)
      this.refs.waveSurfer._wavesurfer.toggleInteraction();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.volume != this.props.volume && this.props.sound.playing) {
      this.applyEffects();
    }
  }


  applyEffects = () => {
    let sound = this.props.sound;

    let waveSurfer = this.refs.waveSurfer._wavesurfer;
    let gainNode = waveSurfer.backend.gainNode;

    let pos = waveSurfer.getCurrentTime() * 1000 - sound.clipStart;

    gainNode.gain.cancelScheduledValues(gainNode.context.currentTime);

    let fadeInEffect = sound.effects.find(effect => effect.type == 'fadeIn');
    if (fadeInEffect && pos < fadeInEffect.duration) {
      let startValue = pos / fadeInEffect.duration + 0.01;
      gainNode.gain.setValueAtTime(startValue, gainNode.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.props.volume, gainNode.context.currentTime + (fadeInEffect.duration - pos) / 1000);
    } else {
      gainNode.gain.setValueAtTime(this.props.volume, gainNode.context.currentTime);
    }

    let fadeOutEffect = sound.effects.find(effect => effect.type == 'fadeOut');
    if (fadeOutEffect) {
      let endTime = gainNode.context.currentTime * 1000 + (sound.playableDuration() - pos);
      let startValue = Math.min(this.props.volume, (sound.playableDuration() - pos) / fadeOutEffect.duration);

      gainNode.gain.setValueAtTime(startValue, (endTime - fadeOutEffect.duration) / 1000);
      gainNode.gain.linearRampToValueAtTime(0.01, endTime / 1000);
    }
  } 


  render () {
    const {
      sound,
      volume,
      dragged,
      onTogglePlay,
      onDelete,
      onDragStart,
      onDragEnd,
      actionListener,
      ...otherProps,
    } = this.props;

    let effects = sound.effects.map((effect, index) =>
      <div key={index} className={'effect ' + effect.type} style={{width: effect.duration / 1000 * 50}}>
        {
          ['fadeIn', 'fadeOut'].indexOf(effect.type) != -1 && <div className="resize-handle" onMouseDown={this.handleStartResizingEffect.bind(this, effect.type)}/>
        }
      </div>
    );


    return (
      <div
        draggable={!sound.playing}
        onDragStart={(e) => { this.handleDragStart(e); onDragStart(e); }}
        onDragEnd={onDragEnd}
        className={'audio' + (dragged ? ' dragged' : '')}
        onDoubleClick={this.togglePlaying}
        style={{
          position: 'absolute',
          left: Math.round(sound.startTime / 1000 * 50),
        }}
        {...otherProps}
        >
        <div className="width_wrapper" style={{
          width: Math.round(sound.playableDuration() / 1000 * 50),
          height: 35
          }}>
          <div style={{
            position: 'absolute',
            left: -Math.round(sound.clipStart / 1000 * 50),
            width: Math.round(sound.duration / 1000 * 50)
            }}>
            <WaveSurfer
              audioFile={sound.path}
              playing={sound.playing}
              pos={sound.pos}
              volume={volume}
              onPosChange={this.handlePosChange}
              onReady={this.handleWavesurferReady}
              onPlay={this.applyEffects}
              ref="waveSurfer"
              options={{
                waveColor: '#aaa',
                progressColor: '#09a85a',
                height: 35,
                barWidth: 3,
                cursorWidth: 0,
                interact: false,
                normalize: true,
                hideScrollbar: true,
                maxCanvasWidth: Math.round(Math.floor(sound.duration / 1000 * 50 / 2) * 2) // must be even width
              }}/>
            </div>
        </div>
        { effects }
        <div className="resize-handle start" onMouseDown={this.handleStartClipping.bind(this, 'start')}/>
        <div className="resize-handle end" onMouseDown={this.handleStartClipping.bind(this, 'end')}/>
        <button className="btn clear remove" onClick={onDelete}><i className="fa fa-times"/></button>
      </div>
    )
  }

  handleStartClipping = (side, e) => {
    this.setState({
      clipping: true,
      clippingSide: side,
      startX: e.clientX,
      startTime: this.props.sound.startTime,
      startClipValue: (side == 'start' ? this.props.sound.clipStart : this.props.sound.clipEnd)
    });

    e.preventDefault();
  }

  handleStartResizingEffect = (effectType, e) => {
    let effect = this.props.sound.effects.find(effect => effect.type == effectType);
    this.setState({
      resizingEffect: true,
      effectType,
      startX: e.clientX,
      startDuration: effect.duration,
    });

    e.preventDefault();
  }

  onMouseMove = (e) => {
    if (this.state.clipping) {
      let sound = this.props.sound;
      if (this.state.clippingSide == 'start') {
        let dX = (e.clientX - this.state.startX) / 50 * 1000;
        sound.startTime = this.state.startTime + Math.max(-this.state.startClipValue, dX);
        sound.clipStart = this.state.startClipValue + Math.max(-this.state.startClipValue, dX);
      } else {
        let dX = (this.state.startX - e.clientX) / 50 * 1000;
        sound.clipEnd = this.state.startClipValue + Math.max(-this.state.startClipValue, dX);
      }

      // allow audio timeline to contraint the sound to its suroundings
      this.props.actionListener({
        action: 'apply_audio_contstraints',
        data: {
          sound: this.props.sound
        }
      });

      sound.pos = sound.playing ? Math.max(sound.clipStart / 1000, sound.pos) : (sound.clipStart / 1000);

      this.forceUpdate();
    } else

    if (this.state.resizingEffect) {
      let effect = this.props.sound.effects.find(effect => effect.type == this.state.effectType);
      let dX = (e.clientX - this.state.startX) / 50 * 1000;
      effect.duration = Math.min(
        this.state.startDuration + dX * (effect.type == 'fadeIn' ? 1 : -1),
        this.props.sound.playableDuration() - 
        this.props.sound.effects.filter(effect => effect.type != this.state.effectType)
                                .map(effect => effect.duration)
                                .reduce((a, b) => a + b, 0)
      );

      this.forceUpdate();
    }
  }

  onMouseUp = (e) => {
    if (this.state.clipping) {
      this.setState({ clipping: false });
      this.props.actionListener('change');
    } else

    if (this.state.resizingEffect) {
      this.setState({ resizingEffect: false });
      this.props.actionListener('change');
    }
  }

  handleDragStart = (e) => {
    if (this.props.sound.playing)
      this.props.onTogglePlay();

    let musicIco = $('.drag-audio-ico');
    if (musicIco.length == 0) {
      musicIco = $('<i class="fa fa-2x fa-music drag-audio-ico" style="color: #999; position: absolute; left: -99999px;"/>');
      $('body').append(musicIco[0]);
    }
    e.dataTransfer.setDragImage(musicIco[0], 15, 15);
  }

  handlePosChange = (e) => {
    let sound = this.props.sound;
    if (sound.playing) {
      let updatedPos = e.originalArgs[0];

      if (updatedPos) {
        sound.pos = updatedPos;
        if (sound.pos * 1000 > (sound.duration - sound.clipEnd)) {
          this.togglePlaying();
        }
      }

    }
  }

  togglePlaying = (e) => {
    if (e) e.preventDefault();

    let sound = this.props.sound;
    let wasPlaying = sound.playing;

    this.props.actionListener('silence!');

    if (!wasPlaying) {
      sound.playing = true;
      sound.resetPos();
    }
  }

  handleWavesurferReady = () => {
    if ($('.toast').html() == 'Adding audio...')
      $('.toast').fadeOut();

    this.props.sound.ready = true;
  }
}

export default AudioTimelineItem
