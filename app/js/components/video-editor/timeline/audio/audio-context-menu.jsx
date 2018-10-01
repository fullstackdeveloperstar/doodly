import React from 'react'
import PropTypes from 'prop-types'
import ContextMenu, { MenuItem } from 'components/common/context-menu.jsx'

class AudioContextMenu extends React.Component{
  static PropTypes = {
    actionListener: PropTypes.func.isRequired
  }

  state = {
    sound: null
  }

  render() {
    let { sound, ...props } = this.state;
    return (
      <ContextMenu ref="menu" {...props}>
        {
          this.state.sound &&
          <div>
            <MenuItem title="Fade In" icoAfter={this.state.sound.effects.filter(effect => effect.type == 'fadeIn').length > 0 ? 'fa fa-check' : null} onClick={this.toggleFadeIn}/>
            <MenuItem title="Fade Out" icoAfter={this.state.sound.effects.filter(effect => effect.type == 'fadeOut').length > 0 ? 'fa fa-check' : null} onClick={this.toggleFadeOut}/>
          </div>
        }
      </ContextMenu>
    )
  }

  show = (sound, event) => {
    this.setState({
      sound: sound,
      x: event.clientX - 10,
      y: event.clientY - 10,
    })
    this.refs.menu.show();
  }

  toggleFadeIn = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'toggleFadeIn',
      data: {
        sound: this.state.sound
      }
    })
  }

  toggleFadeOut = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'toggleFadeOut',
      data: {
        sound: this.state.sound
      }
    })
  }

}

export default AudioContextMenu
