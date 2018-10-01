import React from 'react'

class AssetEditorUserActions extends React.Component {

  render() {
    return (
      <div className="group no-shrink">
        <button className="btn success sm" onClick={this.save} disabled={!this.props.item.requiresSave}>Save & return</button>
        &nbsp;&nbsp;
        <button className="btn sm" onClick={this.return}>Return without saving</button>
      </div>
    );
  }

  save    = () => { this.props.assetActionListener('save&return'); }
  return  = () => { this.props.assetActionListener('return'); }

}

export default AssetEditorUserActions
