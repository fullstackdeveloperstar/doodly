import React, { Component } from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import _ from 'lodash'

import CircleButton from 'components/common/circle-button'
import ScenesTimelineItem from './scenes-timeline-item'
import SceneContextMenu from './scene-context-menu'

const SCENE_EXIT_TIME = 400

class ScenesTimeline extends Component {
  static propTypes = {
    scenes: PropTypes.arrayOf(PropTypes.object.isRequired).isRequired,
    selectedIndex: PropTypes.number.isRequired,
    videoStyle: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    videoActionListener: PropTypes.func.isRequired,
    style: PropTypes.object.isRequired,
  }

  state = {
    resizing: false
  }

  render() {
    return (
      <div className="scenes no-shrink" onMouseMove={this.handleMouseMove} onMouseUp={this.handleMouseUp} style={this.props.style}>
        <div className="flex">
          {
            this.props.scenes.map((scene, i) => (
              <ScenesTimelineItem 
                key={i}
                id={i}
                scene={scene}
                exitTime={this.sceneExitTime(i)}
                selected={this.props.selectedIndex == i}
                dragged={this.draggedFromIndex == i}
                draggable={this.props.scenes.length > 1}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onDragOver={this.handleDragOver}
                onDrop={this.handleDrop}
                onClick={this.selectScene.bind(this, i)}
                onContextMenu={this.showContextMenu.bind(this, i)}
                onStartResizing={this.handleResizingStart.bind(this, i)}
                videoStyle={this.props.videoStyle}
                />
            ))
          }
          <div className="scene clear no-shrink"
            style={{width: 250}}
            key={this.props.scenes.length}
            id={this.props.scenes.length}
            draggable={false}
            onDragOver={this.handleDragOver}
            onDragEnd={this.handleDragEnd}
            onDrop={this.handleDrop}
            />
          <div key={this.props.scenes.length + 1} className="flex center space-around no-shrink" style={{width: 100, position: 'relative', left: -250}}>
            <CircleButton className="add grey" onClick={this.addScene} title="Add new scene">
              <i className="fa fa-2x fa-plus"/>
            </CircleButton>
          </div>
          <SceneContextMenu ref="sceneContextMenu" actionListener={this.props.videoActionListener}/>
        </div>
      </div>
    );
  }

  sceneExitTime = (index) => {
    return index != (this.props.scenes.length - 1) && this.props.scenes[index].exitAnimation != 'none' ? SCENE_EXIT_TIME : 0;
  }  

  addScene = () => {
    this.props.videoActionListener({
      action: 'add_scene'
    });
  }

  selectScene = (index) => {
    this.props.videoActionListener({
      action: 'select_scene',
      data: {
        index
      }
    });

    this.props.onSelect();
  }

  showContextMenu = (index, e) => {
    this.refs.sceneContextMenu.show(index, e);
  }

  handleResizingStart = (index, e) => {
    this.setState({
      resizing: true,
      resizingIndex: index,
      startX: e.clientX,
      initialAnimationTime: this.props.scenes[index].animationTime
    })
    e.preventDefault();
  }

  handleMouseMove = (e) => {
    if (this.state.resizing) {
      this.props.scenes[this.state.resizingIndex].animationTime = this.state.initialAnimationTime + Math.round((e.clientX - this.state.startX)/50 * 1000)
      this.forceUpdate();
    }
  }

  handleMouseUp = (e) => {
    if (this.state.resizing){
      e.preventDefault();
      this.props.scenes[this.state.resizingIndex].resizeBy(Math.round((e.clientX - this.state.startX)/50 * 1000));
      this.setState({
        resizing: false,
        resizingIndex: null,
        startX: null
      });
      this.props.videoActionListener('change');
    }
  }

  handleDragStart = (e) => {
    if (this.state.resizing) return;
    this.draggedFromIndex = e.target.id;
    this.draggedScene = this.props.scenes[e.target.id];
  }

  handleDragEnd = (e) => {
    e.preventDefault();
    if (this.draggedScene) {

      _.pullAt(this.props.scenes, this.draggedFromIndex);
      let dropAtIndex = this.dropTarget - (this.draggedFromIndex < this.dropTarget ? 1 : 0)

      this.props.scenes.splice(dropAtIndex, 0, this.draggedScene);

      let newSelectedIndex = this.props.selectedIndex;
      if (this.draggedFromIndex == this.props.selectedIndex) {
        newSelectedIndex = dropAtIndex;
      } else if (this.draggedFromIndex > this.props.selectedIndex && dropAtIndex <= this.props.selectedIndex) {
        newSelectedIndex++;
      } else if (this.draggedFromIndex < this.props.selectedIndex && dropAtIndex > this.props.selectedIndex) {
        newSelectedIndex--;
      }

      this.props.videoActionListener({
        action: 'select_scene',
        data: {
          index: newSelectedIndex
        }
      });

      this.draggedScene = null;
      this.draggedFromIndex = null;
      this.dropTarget = null;
      $('.scene.drop-target').removeClass('drop-target');

      this.props.videoActionListener('update_scenes_order');
    }
  }

  handleDragOver = (e) => {
    e.preventDefault();
    if (!this.draggedScene) return;
    if (!e.target.className.includes('scene')) return;

    if (!this.dropTarget) {
      this.forceUpdate();
    }
    this.dropTarget = e.target.id;
    $('.scene.drop-target').removeClass('drop-target');
    $(e.target).addClass('drop-target');
  }

  handleDrop = (e) => {
    e.preventDefault();
  }
}

export default ScenesTimeline;