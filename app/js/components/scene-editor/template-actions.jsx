import React from 'react'
import PropTypes from 'prop-types'

class TemplateActions extends React.Component {
  static propTypes = {
    scene: PropTypes.object,
    sceneActionListener: PropTypes.func.isRequired
  }

  render() {
    return (
      <div>
        <div className="group flex space-between no-shrink">
          <button className="btn success" onClick={this.preview}>Preview</button>
          {<button className="btn finish" onClick={this.finishEditing}>Finish Editing</button>}
        </div>
        <h3>Actions</h3>
        <div className="group no-shrink">
          <button
            className="btn success"
            onClick={this.save}
            disabled={!this.props.scene || !this.props.scene.requiresSave}
          >Save</button>&nbsp;&nbsp;
          {
            this.props.item.status == 'published' ?
              <button
                className="btn"
                onClick={this.unpublish}
                disabled={this.props.scene && this.props.scene.requiresSave}
              >Unpublish</button>
            :
              <button
                className="btn default"
                onClick={this.publish}
                disabled={this.props.scene && this.props.scene.requiresSave}
              >Publish</button>
          }
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button className="btn destroy" onClick={this.delete}>Delete</button>
        </div>
      </div>
    );
  }

  preview       = () => { this.props.sceneActionListener('preview') }
  finishEditing = () => { this.props.sceneActionListener('finish_editing') }
  save          = () => { this.props.sceneActionListener('save') }
  publish       = () => { this.props.sceneActionListener('publish') }
  unpublish     = () => { this.props.sceneActionListener('unpublish') }
  delete        = () => { this.props.sceneActionListener('delete') }
  preview       = () => { this.props.sceneActionListener('preview') }

}

export default TemplateActions
