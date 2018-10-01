import React from 'react'
import PropTypes from 'prop-types'
import ContextMenu, { MenuItem } from 'components/common/context-menu.jsx'

class SceneContextMenu extends React.Component{
  static PropTypes = {
    actionListener: PropTypes.func.isRequired
  }

  state = {
    sceneIndex: -1
  }

  render() {
    let { sceneIndex, ...props } = this.state;
    return (
      <ContextMenu ref="menu" {...props}>
        <MenuItem title="Preview Scene" onClick={this.previewScene}/>
        <MenuItem title="Duplicate Scene" onClick={this.duplicateScene}/>
        <MenuItem title="Delete Scene" onClick={this.deleteScene}/>
      </ContextMenu>
    )
  }

  show = (sceneIndex, event) => {
    this.setState({
      sceneIndex: sceneIndex,
      x: event.clientX - 10,
      y: event.clientY - 10,
    })
    this.refs.menu.show();
  }

  previewScene = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'preview_scene',
      data: {
        index: this.state.sceneIndex
      }
    })
  }

  duplicateScene = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'duplicate_scene',
      data: {
        index: this.state.sceneIndex
      }
    })
  }

  deleteScene = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'delete_scene',
      data: {
        index: this.state.sceneIndex
      }
    })
  }

}

export default SceneContextMenu
