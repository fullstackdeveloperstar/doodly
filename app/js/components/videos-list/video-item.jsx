import React from 'react'
import PropTypes from 'prop-types'

import '../../lib/time.utils.js'

class VideoItem extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
    actionListener: PropTypes.func.isRequired
  }

  state = {
    loading: true
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps != this.props)
      this.load();
  }

  load = () => {
    if (this.props.item.data) {
      var data = JSON.parse(this.props.item.data);
      this.setState({
        scenes: data.scenes,
        length: data.length.toHHMMSS(),
      })
    } else {
      this.setState({
        scenes: 0,
        length: '00:00:00'
      });
    }
  }

  render() {
    return (
      <div className={'video-item flex center ' + this.props.item.style} onClick={this.edit} onContextMenu={this.props.onContextMenu}>
        <h2 className="fill">{this.props.item.title}</h2>
        <div className="details">
          <nobr>Length: <b>{this.state.length} / {this.state.scenes} scenes</b></nobr>
        </div>
        <div className="actions flex center space-around">
          <button className="btn clear" title="Edit" onClick={this.edit}><i className="fa fa-lg fa-pencil-square-o"/></button>
          <button className="btn clear" title="Delete" onClick={this.delete}><i className="fa fa-lg fa-trash-o"/></button>
        </div>
      </div>
    );
  }

  edit = (e) => {
    this.props.actionListener({action: 'edit_video', scope: this.props.item});
    e.stopPropagation();
  }

  delete = (e) => {
    this.props.actionListener({action: 'delete_video', video: this.props.item});
    e.stopPropagation();
  }

}

export default VideoItem
