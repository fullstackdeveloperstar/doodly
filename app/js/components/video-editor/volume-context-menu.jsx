import React from 'react'
import PropTypes from 'prop-types'

import ContextMenu from 'components/common/context-menu'
import VolumeControl from 'components/common/volume-control'

class VolumeContextMenu extends React.Component {
  static propTypes = {
    volume: PropTypes.number.isRequired,
    onVolumeChange: PropTypes.func.isRequired
  }

  render () {
    return (
      <ContextMenu ref="menu" {...this.state} preventDismiss={true}>
        <VolumeControl width={30} height={78} segments={10} volume={this.props.volume} onVolumeChange={this.props.onVolumeChange}/>
      </ContextMenu>
    )
  }

  show = (event) => {
    this.setState({
      x: event.clientX - 10,
      y: event.clientY - 90,
    })
    this.refs.menu.show();
  }
}

export default VolumeContextMenu
