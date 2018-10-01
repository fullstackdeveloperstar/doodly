import React from 'react'
import HeaderBar from '../common/header-bar.jsx'

import SideBar from '../common/sidebar.jsx'
import AssetEditor from '../asset-editor/asset-editor.jsx'
import SceneEditor from '../scene-editor/scene-editor.jsx'
import FontPreview from '../font-preview/font-preview.jsx'
import AudioPreview from '../audio-preview/audio-preview.jsx'

class AssetManager extends React.Component {
  state = {
    item: null,
    mode: null,

  }

  render() {
    var editor;
    switch (this.state.mode) {
      case 'asset':
        editor = <AssetEditor item={this.state.item} inManager={true} {...this.props}/>;
        break;
      case 'template':
        editor = <SceneEditor item={this.state.item} {...this.props} ref="sceneEditor"/>;
        break;
      case 'font':
        editor = <FontPreview item={this.state.item} inManager={true} {...this.props}/>;
        break;
      case 'audio':
        editor = <AudioPreview item={this.state.item} inManager={true} {...this.props}/>;
        break;
      default:
        editor = <div className="flex fill" style={{position: 'relative'}}><div className="toast" ref="toast"></div></div>;
        break;
    }
    return (
      <div className="fill flex column">
        <HeaderBar {...this.props} inManager={true} title="Asset Manager"/>
        <div className="container fill flex stretch no-overflow">
          <SideBar onItemClick={this.handleClickedItem} mode={this.state.mode} {...this.props} inManager={true}/>
          {editor}
        </div>
      </div>
    );
  }

  handleClickedItem = (item) => {
    if (!item) {
      this.setState({
        item: null,
        mode: null,
      });
      return;
    }

    var allowedToOpen = this.state.mode != 'template' || item.type == 'template';
    if (allowedToOpen) {
      var prevItemType = this.state.item ? this.getItemType(this.state.item) : '';
      if (!this.state.item || !this.state.item.requiresSave) {
        this.setState({
          item: item,
          mode: this.getItemType(item)
        });
      } else
        confirm('The ' + prevItemType + ' that you are currently editing has changes that will be discarded. Are you sure you want to continue?')
          .then(() => {
            this.setState({
              item: item,
              mode: this.getItemType(item)
            });
          })
    } else {
      if (this.state.mode == 'template') {
        if (this.getItemType(item) == 'asset' || this.getItemType(item) == 'font') {
          this.refs.sceneEditor.addAsset(item);
        }
      }
    }
  }

  getItemType = (item) => {
    switch (item.type) {
      case 'template':
        return 'template';
      case 'font':
        return 'font'
      case 'sound':
        return 'audio';
      default:
        return 'asset';
    }
  }


}

export default AssetManager