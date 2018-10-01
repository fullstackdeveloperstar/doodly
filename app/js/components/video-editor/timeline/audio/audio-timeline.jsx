import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Sound from 'models/sound'

import $ from 'jquery'

import AudioTimelineItem from './audio-timeline-item'
import AudioRecorderItem from './audio-recorder-item'
import AudioContextMenu from './audio-context-menu'

import CircleButton from 'components/common/circle-button'

class ScenesTimeline extends Component {
  static propTypes = {
    music: PropTypes.array.isRequired,
    channelVolumes: PropTypes.array.isRequired,
    videoActionListener: PropTypes.func.isRequired,
    style: PropTypes.object.isRequired,
  }

  state = {
    recordAudio: false,
    recordedDuration: 0,
  }

  render() {
    let voiceSegments = this.props.music.filter(sound => sound.channel == 1)
    let voiceChannelEnd = Math.max(0, ...voiceSegments.map(sound => sound.startTime + sound.playableDuration()));

    return (
      <div>
        { [0, 1].map(channel => (
          <div
            key={channel}
            className="music no-shrink"
            style={this.props.style}
            onDragEnter={this.handleMusicDragEnter.bind(this, channel)}
            onDragOver={this.handleMusicDragOver}
            onDragLeave={this.handleMusicDragLeave}
            onDrop={this.handleMusicDrop}>
            {
              this.props.music.filter(sound => sound.channel == channel).map((sound, i) => (
                <AudioTimelineItem
                  key={i}
                  sound={sound}
                  volume={this.props.channelVolumes[channel]}
                  dragged={this.state.draggedAudio == sound}
                  onDelete={this.deleteAudio.bind(this, sound)}
                  onDragStart={this.handleAudioDragStart.bind(this, sound)}
                  onDragEnd={this.handleAudioDragEnd}
                  actionListener={this.handleAction}
                  onContextMenu={this.showContextMenu.bind(this, sound)}
                  />
              ))
            }
            {
              channel == 1 && 
              (
                this.state.recordAudio ?
                  <AudioRecorderItem 
                    ref="audioRecorder"
                    key={voiceSegments.length}
                    dragged={!!this.state.draggedAudioRecorder}
                    onDragStart={this.handleAudioRecorderDragStart}
                    onDragEnd={this.handleAudioRecorderDragEnd}
                    startTime={this.state.recordAtTime}
                    duration={this.state.recordedDuration}
                    maxAllowedDuration={this.state.maxAllowedRecordingDuration}
                    onStartRecording={this.startRecoding}
                    onStopRecording={this.handleRecordedAudio}
                    onDurationChange={this.handleRecorderDurationChange}
                    onHide={this.hideAudioRecorder}
                    />
                :
                  <div 
                    key={voiceSegments.length} 
                    className="flex center space-around no-shrink" 
                    style={{
                      paddingLeft: 10, 
                      width: 36, 
                      height: 36, 
                      position: 'absolute',
                      left: Math.round(voiceChannelEnd / 1000 * 50)
                    }}
                    >
                    <CircleButton className="grey small" onClick={this.showAudioRecorder} title="Record audio">
                      <i className="fa fa-plus"/>
                    </CircleButton>
                  </div>
              )
            }
            <div className="drop-target"/>
          </div>
        )) }
        <AudioContextMenu ref="audioContextMenu" actionListener={this.handleAction} />        
      </div>
    );
  }

  handleAudioDragStart = (audio, e) => {
    this.setState({
      dragEnterLeave: 0,
      draggedAudio: audio,
      draggedFromX: e.clientX - $(e.target).offset().left
    });
  }

  handleAudioDragEnd = (e) => {
    $('.music .drop-target').hide();

    if (this.state.draggedAudio)
      this.setState({
        draggedAudio: null
      });

    if (localStorage.draggedItem)
      delete localStorage.draggedItem;
  }

  handleAudioRecorderDragStart = (e) => {
    this.setState({
      dragEnterLeave: 0,
      draggedAudioRecorder: true,
      draggedFromX: e.clientX - $(e.target).offset().left
    });
  }

  handleAudioRecorderDragEnd = (e) => {
    $('.music .drop-target').hide();
    this.setState({
      draggedAudioRecorder: false
    });
  }

  handleMusicDragEnter = (channel, e) => {
    if (!this.state.draggedAudio) {
      
      if (localStorage.draggedItem) {
        let item = JSON.parse(localStorage.draggedItem);
        if (item.type != 'sound') return;
      } else 

      if (this.state.draggedAudioRecorder) {
        if (channel != 1) return;
      }

    }

    if (channel != this.state.draggedAudioTargetChannel)
      $('.music .drop-target').hide();

    this.setState({
      dragEnterLeave: this.state.dragEnterLeave + 1,
      draggedAudioTargetChannel: channel
    });

    let target = $(e.target).hasClass('music') ? e.target : $(e.target).closest('.music')[0];
    let dropTarget = $('.drop-target', target);

    $(dropTarget).show();
  }

  handleMusicDragOver = (e) => {
    e.preventDefault();
    if (!this.state.draggedAudio && !localStorage.draggedItem && !this.state.draggedAudioRecorder) return;

    var duration;
    if (this.state.draggedAudio) {
      duration = this.state.draggedAudio.playableDuration();
    } else 
    
    if (localStorage.draggedItem) {
      let object = JSON.parse(localStorage.draggedItem);
      if (object.type != 'sound') return;
      let objectData = JSON.parse(object.data);
      duration = objectData.duration;
    } else

    if (this.state.draggedAudioRecorder) {
      duration = 5000;
    }

    let width = duration / 1000 * 50;

    let target = $(e.target).hasClass('music') ? e.target : $(e.target).closest('.music')[0];
    let dropTarget = $('.drop-target', target);

    var x = e.clientX - $('.video-timeline .scrollable').offset().left + $('.video-timeline .scrollable').scrollLeft() - (this.state.draggedFromX || 170);
    var left = Math.max(x, 0);

    let canDropAudio = true;

    // make sure we don't drop on top of existent audio segments
    let channelAudio = this.props.music.filter(sound => sound.channel == this.state.draggedAudioTargetChannel && sound != this.state.draggedAudio);
    for (var i = 0; i < channelAudio.length; i++) {
      let audio = channelAudio[i];
      let isLeftOf = (left + duration / 1000 * 50) < audio.startTime / 1000 * 50;
      let isRightOf = left > ((audio.startTime + audio.playableDuration()) / 1000 * 50);
      if (!isLeftOf && !isRightOf) {
        canDropAudio = false;
        break;
      }
    }

    // make sure the audio recorder isn't dragged to first channel
    if (this.state.draggedAudioRecorder && this.state.draggedAudioTargetChannel == 0) {
      canDropAudio = false;
    }

    // make sure that audio segments are not dropped on top of the recoder
    if (this.state.draggedAudio && this.state.recordAudio && this.state.draggedAudioTargetChannel == 1) {
      let isLeftOf = (left + this.state.draggedAudio.playableDuration() / 1000 * 50) < this.state.recordAtTime / 1000 * 50
      let isRightOf = left > (this.state.recordAtTime + (this.state.recordedDuration || 5000)) / 1000 * 50

      if (!isLeftOf && !isRightOf) {
        canDropAudio = false;
      }
    }

    dropTarget.css('background', canDropAudio ? 'rgba(100, 255, 100, 0.3)' : 'rgba(255, 100, 100, 0.3)');
    dropTarget.css('width', width);
    dropTarget.css('left', left);

    this.setState({ canDropAudio });
  }

  handleMusicDragLeave = (e) => {
    this.setState({
      dragEnterLeave: this.state.dragEnterLeave - 1
    });

    let target = $(e.target).hasClass('music') ? e.target : $(e.target).closest('.music')[0];
    let dropTarget = $('.drop-target', target);

    if (this.state.dragEnterLeave <= 0) {
      $(dropTarget).hide();
      this.setState({
        dragEnterLeave: 0,
        draggedAudioTargetChannel: null
      });
    }
  }

  handleMusicDrop = (e) => {
    if (this.state.draggedAudioTargetChannel >= 0) {
      if (this.state.canDropAudio) {
        var x = e.clientX - $('.video-timeline .scrollable').offset().left + $('.video-timeline .scrollable').scrollLeft() - (this.state.draggedFromX || 170);
        var startTime = Math.round(Math.max(x, 0) / 50 * 1000);
        if (this.state.draggedAudio) {
          this.state.draggedAudio.channel = this.state.draggedAudioTargetChannel;
          this.state.draggedAudio.startTime = startTime;
          this.props.videoActionListener({action: 'change'});

          this.handleAudioDragEnd(e);
        } else

        if (localStorage.draggedItem) {
          if (JSON.parse(localStorage.draggedItem).type == 'sound')
            this.props.videoActionListener({
              action: 'add_music',
              data: {
                sound: JSON.parse(e.dataTransfer.getData('item')),
                startTime,
                channel: this.state.draggedAudioTargetChannel
              }
            })

            this.handleAudioDragEnd(e);
        } else

        if (this.state.draggedAudioRecorder) {
          this.setState({
            draggedAudioRecorder: null,
            recordAtTime: startTime
          });

          this.handleAudioRecorderDragEnd(e);
        }
      }
    }

    this.handleAudioDragEnd(e);

    $('.music .drop-target').hide();
    this.props.videoActionListener({action: 'change'}); 
  }

  showAudioRecorder = (e) => {
    let voiceSegments = this.props.music.filter(sound => sound.channel == 1);
    let voiceChannelEnd = Math.max(0, ...voiceSegments.map(sound => sound.startTime + sound.playableDuration()));
    this.setState({ 
      recordAudio: true,
      recordAtTime: voiceChannelEnd
    });
  }

  startRecoding = () => {
    let voiceChannelAudio = this.props.music.filter(audio => audio.channel == 1);
    let audioAfterRecording = voiceChannelAudio.filter(audio => audio.startTime > this.state.recordAtTime);
    let maxAllowedDuration = audioAfterRecording.length > 0 ? Math.max(...audioAfterRecording.map(audio => audio.startTime)) - this.state.recordAtTime : Infinity;

    this.setState({ maxAllowedRecordingDuration: maxAllowedDuration });

    if (this.props.videoActionListener)
      this.props.videoActionListener({
        action: 'start_recording',
        data: {
          recordAtTime: this.state.recordAtTime
        }
      })
  }

  handleRecordedAudio = (blobObject) => {
    if (blobObject) {
      let recordedAudio = new Sound({
        blob: blobObject.blob,
        path: blobObject.blobURL,
        channel: 1,
        duration: blobObject.duration,
        startTime: this.state.recordAtTime,
        clipEnd: this.state.maxAllowedRecordingDuration < blobObject.duration ? blobObject.duration - this.state.maxAllowedRecordingDuration : 0
      });

      this.props.music.push(recordedAudio);
    }

    this.setState({ 
      recordAudio: false,
      recordedDuration: 0
    });

    if (this.props.videoActionListener) 
      this.props.videoActionListener('stop_recording');
  }

  handleRecorderDurationChange = (duration) => {
    this.setState({ recordedDuration: duration });
  }

  handleAudioTogglePlay = (sound, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    } 

    this.props.music.map((audio) => { if (audio != sound) { audio.playing = false; } });

    sound.playing = !sound.playing;

    if (!sound.playing)
      sound.resetPos();

    this.forceUpdate();
  }

  applyAudioConstraints = (sound) => {
    let audio_before = this.props.music.filter(audio => audio.channel == sound.channel && audio.startTime < sound.startTime);
    let audio_after = this.props.music.filter(audio => audio.channel == sound.channel && audio.startTime > sound.startTime);

    let leftConstraint = Math.max(0, ...audio_before.map(audio => audio.startTime + audio.playableDuration() + 1));
    let rightConstraint = Math.min(...audio_after.map(audio => audio.startTime - 1));

    let startDiff = sound.startTime - leftConstraint;
    if (startDiff < 0) {
      sound.startTime -= startDiff;
      sound.clipStart -= startDiff;
    }

    let endDiff = rightConstraint - sound.startTime - sound.playableDuration();
    if (endDiff < 0) {
      sound.clipEnd -= endDiff;
    }
  }

  showContextMenu(sound, event) {
    this.refs.audioContextMenu.show(sound, event);
  }

  handleAction = (action) => {
    if (typeof action == 'object') {
      var data = action.data;
      var action = action.action;
    }

    switch (action) {
      case 'silence!':
        this.props.music.map(audio => audio.playing = false );
        this.forceUpdate();
        this.props.music.map(audio => audio.resetPos() );
        this.forceUpdate();
        break;
      case 'toggleFadeIn':
        data.sound.toggleEffect('fadeIn');
        this.forceUpdate();
        break;
      case 'toggleFadeOut':
        data.sound.toggleEffect('fadeOut');
        this.forceUpdate();
        break;
      case 'apply_audio_contstraints':
        this.applyAudioConstraints(data.sound);
        break;
      default: // update
        this.props.videoActionListener('change');
        this.forceUpdate();
        break;
    }
  }

  deleteAudio = (sound, e) => {
    e.stopPropagation();
    confirm('Are you sure you want to remove this audio from the music timeline?')
      .then(() => {
        this.props.videoActionListener({
          action: 'remove_music',
          data: {
            sound
          }
        })
      })
  }
}

export default ScenesTimeline;