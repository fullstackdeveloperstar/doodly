import React from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import _ from 'lodash'

import TimeInput from '../common/time-input.jsx'

class SceneItemsList extends React.Component {
  static propTypes = {
    items: PropTypes.array.isRequired,
    selection: PropTypes.array,
    onSelectItem: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired
  }

  render() {
    return (
      <div className="group fill items">
        {this.props.items.map((item, i) =>
        (
          <div
            key={i}
            id={i}
            className={
              'item flex center' +
              (this.props.selection.indexOf(item) != -1 ? ' active' : '') +
              (this.draggedItem == item ? ' hidden':'')
            }
            draggable={this.props.items.length > 1}
            onDragStart={this.handleItemDragStart}
            onDragEnd={this.handleItemDragEnd}
            onDragOver={this.handleItemDragOver}
            onDrop={this.handleItemDrop}
            onMouseDown={this.handleSelectItem.bind(this, item)}>
            <div className="img_wrapper flex center space-around"><img draggable={false} src={item.type == 'font' && item.cachedImg && item.cachedImg.toDataURL() || item.thumb_path}/></div>
            <div className="fill settings">
              <label>Delay:</label>
                <TimeInput className="dark" value={item.animationDelay || 0} onUpdate={this.updateAnimationDelay.bind(this, i)}/>
              <hr/>
              <label>Duration:</label>
              <TimeInput className="dark" value={item.animationDuration} minValue={0} onUpdate={this.updateAnimationDuration.bind(this, i)}/>
            </div>
          </div>
        ))}
        <div
          className="item clear"
          draggable={false}
          key={this.props.items.length}
          id={this.props.items.length}
          onDragOver={this.handleItemDragOver}
          onDrop={this.handleItemDrop}/>
      </div>
    );
  }

  handleSelectItem = (item, e) => {
    let cmdKeyDowned = false;
    if (e.metaKey || e.ctrlKey) {
      cmdKeyDowned = true;
    }
    
    this.props.onSelectItem(item, cmdKeyDowned);
  }

  handleItemDragStart = (e) => {
    this.draggedFromIndex = e.target.id;
    this.draggedItem = this.props.items[e.target.id];
  }
  
  handleItemDragEnd = (e) => {
    e.preventDefault();
    if (this.draggedItem) {
      _.pullAt(this.props.items, this.draggedFromIndex);
      this.props.items.splice(this.dropTarget - (this.draggedFromIndex < this.dropTarget ? 1 : 0), 0, this.draggedItem);
      this.draggedItem = null;
      this.draggedFromIndex = null;
      this.dropTarget = null;
      this.forceUpdate();
      $('.item.drop-target').removeClass('drop-target');
      this.props.onChange();
    }
  }

  handleItemDragOver = (e) => {
    e.preventDefault();
    if (!this.draggedItem) return;

    if (!this.dropTarget) {
      this.forceUpdate();
    }
    this.dropTarget = e.target.id;
    $('.item.drop-target').removeClass('drop-target');
    $(e.target).addClass('drop-target');
  }

  handleItemDrop = (e) => {
    e.preventDefault();
  }

  updateAnimationDelay = (i, value) => {
    let prevValue = this.props.items[i].animationDelay;
    this.props.items[i].animationDelay = value;
    this.props.onChange();
    this.props.onChange({
      action: 'change_animation_delay',
      scope: this.props.items[i],
      prevValue: prevValue
    });
  }

  updateAnimationDuration = (i, value) => {
    let prevValue = this.props.items[i].animationDuration;
    this.props.items[i].animationDuration =  value;
    this.props.onChange({
      action: 'change_animation_duration',
      scope: this.props.items[i],
      prevValue: prevValue
    });
  }

}

export default SceneItemsList
