import React from 'react'

class AssetEditorStaffActions extends React.Component {

  render() {
    return (
      <div className="group flex space-between no-shrink">
        <button
          className="btn success sm"
          onClick={this.save}
          disabled={!this.props.item.requiresSave}
        >Save</button>
        {
          this.props.published ?
            <button
              className="btn sm"
              onClick={this.unpublish}
              disabled={this.props.item.requiresSave}
            >Unpublish</button>
          :
            <button
              className="btn default sm"
              onClick={this.publish}
              disabled={this.props.item.requiresSave}
            >Publish</button>
        }
        <button className="btn sm" onClick={this.settings}>Settings</button>
        <button className="btn destroy sm" onClick={this.delete}>Delete</button>
      </div>
    );
  }

  save      = () => { this.props.assetActionListener('save'); }
  publish   = () => { this.props.assetActionListener('publish'); }
  unpublish = () => { this.props.assetActionListener('unpublish'); }
  settings  = () => { this.props.assetActionListener('settings'); }
  delete    = () => { this.props.assetActionListener('delete'); }

}

export default AssetEditorStaffActions
