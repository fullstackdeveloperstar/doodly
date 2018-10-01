import React from 'react'
import PropTypes from 'prop-types'
import ContextMenu, { MenuItem } from '../common/context-menu.jsx'

class AssetContextMenu extends React.Component {
  static propTypes = {
    actionListener: PropTypes.func.isRequired
  }

  state = {
    assetID: -1,
    x: 0,
    y: 0
  }

  render() {
    let { assetID, ...props } = this.state;
    return (
      <ContextMenu ref="menu" {...props}>
        <MenuItem title="Erase Asset" onClick={this.erase}/>
      </ContextMenu>
    )
  }

  show = (asset, x, y) => {
    this.setState({
      asset: asset,
      x: x - 10,
      y: y - 10,
    })
    this.refs.menu.show();
  }

  erase = (e) => {
    e.stopPropagation();
    this.props.actionListener({
      action: 'erase_asset',
      data: {
        asset: this.state.asset
      }
    })
  }

}

export default AssetContextMenu
