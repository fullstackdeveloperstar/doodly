import React from 'react'
import PropTypes from 'prop-types'


class SceneActions extends React.Component {
  static propTypes = {
    scene: PropTypes.object,
    sceneActionListener: PropTypes.func.isRequired
  }

  render() {
    var requiresSave = this.props.requiresSave || (this.props.scene && this.props.scene.requiresSave);
    return (
      <div>
        <h3>Actions</h3>
        <div className="group no-shrink">
          <button className="btn success" onClick={this.save} disabled={!requiresSave}>Save</button>
          &nbsp;&nbsp;
          <button className="btn default" onClick={this.preview} disabled={!this.props.canPreview}>Preview</button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button className="btn" onClick={this.export}>Export</button>
        </div>
        <h3>Scene</h3>
        <div className="group">
          <button className="btn" onClick={this.settings}>Scene Settings</button>
        </div>
      </div>
    );
  }

  save = () => { this.props.sceneActionListener('save') }
  preview = () => { this.props.sceneActionListener('preview') }
  export = () => { this.props.sceneActionListener('export') }
  settings = () => { this.props.sceneActionListener('settings') }

}

export default SceneActions
