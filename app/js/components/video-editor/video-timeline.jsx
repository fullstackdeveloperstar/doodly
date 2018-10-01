import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import ScenesTimeline from './timeline/scenes/scenes-timeline'
import AudioTimeline from './timeline/audio/audio-timeline'
import VolumeContextMenu from './volume-context-menu'

var MAX_GRID_WIDTH = 32030

class VideoTimeline extends React.Component {
  static propTypes = {
    video: PropTypes.object.isRequired,
    videoActionListener: PropTypes.func.isRequired
  }

  state = {
    totalVideoTime: $(window).width() / 50 * 1000,
  }

  componentDidMount() {
    this.animation = requestAnimationFrame(this.update);
    if (this.props.video && this.props.video.scenes)
      this.scrollToSelectedScene();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps) {
      this.animation = requestAnimationFrame(this.update);
    }
  }

  componentWillUnmount() {
    if (this.animation)
      cancelAnimationFrame(this.animation);
  }

  render() {
    var gridHTML = [], drawnWidth = this.state.totalVideoTime/1000 * 50, i = 0;
    while (drawnWidth > 0) {
      var width = Math.min(drawnWidth, MAX_GRID_WIDTH);
      gridHTML.push(<canvas width={width} height="35" className="grid" key={i}/>);
      drawnWidth -= width;
      i++
    }
    return (
      <div className="video-timeline flex stretch" ref="timeline">
        <div className="header">
          <div className="settings flex center space-around">
            <button className="btn clear" onClick={this.showSettings}><i className="fa fa-lg fa-gear"/> Settings</button>
          </div>
          <div className="scenes flex center space-around"><i className="fa fa-lg fa-picture-o"/></div>
          <div className="music flex center">
            &nbsp;&nbsp;&nbsp;&nbsp;
            <div className="flex fill space-around"><i className="fa fa-lg fa-music"/></div>
            {
              this.props.video &&
              <i className="fa fa-volume-up" onClick={this.showVolumeContextMenu.bind(this, 0)}/>
            }
            &nbsp;&nbsp;
          </div>
          <div className="music flex center">
            &nbsp;&nbsp;&nbsp;&nbsp;
            <div className="flex fill space-around"><i className="fa fa-lg fa-microphone"/></div>
            {
              this.props.video &&
              <i className="fa fa-volume-up" onClick={this.showVolumeContextMenu.bind(this, 1)}/>
            }
            &nbsp;&nbsp;
          </div>
          {
            this.props.video &&
            <VolumeContextMenu
              ref="volumeContextMenu"
              volume={this.state.currentVolumeChannel != undefined ? this.props.video.volumes[this.state.currentVolumeChannel] : 1}
              onVolumeChange={this.handleVolumeChange}/>
          }
        </div>
        <div className={'fill scrollable' + (this.state.resizing ? ' resizing' : '')} ref="scrollable" onMouseMove={this.handleScenesMouseMove} onMouseUp={this.handleScenesMouseUp}>
          <div className="grid-wrapper" style={{width: this.state.totalVideoTime/1000*50}}>{ gridHTML }</div>
          <ScenesTimeline 
            scenes={this.props.video.scenes} 
            selectedIndex={this.props.video.selectedScene}
            videoStyle={this.props.video.style}
            style={{width: this.state.totalVideoTime/1000*50}}
            onSelect={this.scrollToSelectedScene}
            videoActionListener={this.props.videoActionListener}
            />
          <AudioTimeline
            music={this.props.video.music}
            channelVolumes={this.props.video.volumes}
            style={{width: this.state.totalVideoTime/1000*50}}
            videoActionListener={this.props.videoActionListener}
            />
        </div>
      </div>
    );
  }

  update = () => {
    if (this.props.video) {
      var totalMusicTime = (this.props.video && this.props.video.musicTime) || 0;
      var totalAnimationTime = (this.props.video && this.props.video.animationTime) || 0;
      this.setState({
        totalVideoTime: Math.max(Math.max(totalAnimationTime, totalMusicTime) + 5000, $('.grid-wrapper').parent().width() / 50 * 1000),
      });
    }
    this.updateGrid();
  }

  updateGrid = () => {
    var grids = document.querySelectorAll('.grid-wrapper .grid');
    for (var gi = 0; gi < grids.length; gi++) {
      var grid = grids[gi]
      var ctx = grid.getContext('2d');
      ctx.clearRect(0, 0, grid.width, grid.height);
      for (var i = (gi > 0 ? 0 : 10); i < grid.width; i+= 10) {
        var ti = i + gi * MAX_GRID_WIDTH;
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(i, ti%50 == 0 ? 23 : 29);
        ctx.lineTo(i, grid.height);
        ctx.strokeStyle = '#499df5';
        ctx.stroke();
        if (ti%250 == 0) {
          var text = ti / 50 + 's';
          if (ti / 50 > 60) {
            var minutes = Math.floor(ti / 50 / 60); if (minutes < 10) minutes = '0' + minutes;
            var seconds = ti / 50 % 60; if (seconds < 10) seconds = '0' + seconds;
            text = minutes + ':' + seconds;
          }
          ctx.fillStyle="#499df5";
          ctx.font="10px 'ProximaNova', sans-serif";
          ctx.fillText(text, i - ctx.measureText(text).width / 2, 17);
        }
      }
    };
  }

  scrollToTime = (time) => {
    if (this.currentAnimation)
      cancelAnimationFrame(this.currentAnimation);

    var scrollTo = time / 1000 * 50 - ($(this.refs.timeline).width() - 100) / 2;
    this.currentAnimation = requestAnimationFrame(() => $(this.refs.scrollable).animate({scrollLeft: scrollTo}, 400))
  }

  showSettings = (e) => {
    if (this.props.videoActionListener)
      this.props.videoActionListener('show_settings');
  }



  // SCENE FUNCTIONS

  scrollToSelectedScene = () => {
    if (this.currentAnimation)
      cancelAnimationFrame(this.currentAnimation);

    var scenesBefore = this.props.video.scenes.filter((item, index) => index < this.props.video.selectedScene);
    var timeBefore = _.sum(scenesBefore.map(scene => scene.animationTime || 5000)) || 0;
    var totalScrollTime = timeBefore + (this.props.video.scenes[this.props.video.selectedScene].animationTime || 5000) / 2;
    var scrollTo = totalScrollTime / 1000 * 50 - ($(this.refs.timeline).width() - 100) / 2;
    this.currentAnimation = requestAnimationFrame(() => $(this.refs.scrollable).animate({scrollLeft: scrollTo}, 400))
  }

  // AUDIO FUNCTIONS

  showVolumeContextMenu = (channel, e) => {
    this.setState({currentVolumeChannel: channel});
    this.refs.volumeContextMenu.show(e);
  }

  handleVolumeChange = (volume) => {
    this.props.video.volumes[this.state.currentVolumeChannel] = volume;
    this.props.videoActionListener({action: 'change'});
  }

}

export default VideoTimeline
