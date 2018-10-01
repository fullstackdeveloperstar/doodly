import React from 'react'
import PropTypes from 'prop-types'

import '../../lib/time.utils.js'
import '../../lib/string.utils.js'
import Video from "../../models/video.js";

class RecentVideoItem extends React.Component {
  static propType = {
    item: PropTypes.object.isRequired,
    actionListener: PropTypes.func.isRequired
  }

  state = {
    loading: true,
    background: null,
    mode: Video.ModeMarker,
    style: Video.StyleWhiteboard
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps != this.props)
      this.load();
  }

  load = () => {

    // mode, style 
    let style = this.props.item.style;
    let mode = Video.ModeMarker;
    if (style == Video.StyleColorboard || style == Video.StyleImageboard) {
      if(this.props.item.mode) {
        mode = this.props.item.mode;
      } else {
        mode = Video.ModeMarker;
      }
    } else if(style == Video.StyleBlackboard || style == Video.StyleGreenboard) {
      mode = Video.ModeChalk;
    } else {
      mode = Video.ModeMarker;
    }
    this.setState({
      mode: mode,
      style: style
    });

    // background
    Video.LoadBackground(this.props.item).then((background) => {

      this.setState({ background: background });

      let thumb = new Image();
      thumb.onload = () => {
        this.setState({ loading: false });
      }
      thumb.src = this.props.item.thumb_path;
    });


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
      <div className={'recent-video-item flex column ' + this.state.style} onClick={this.edit} onContextMenu={this.props.onContextMenu}>
        <div className="background">
          <div className="flex center space-around img-wrapper" onClick={this.edit}>
            {this.state.loading && <i className="spinner fa fa-2x fa-refresh fa-spin"/>}
            {!this.state.loading &&
              <div className="img" style={{
                  visibility: this.state.loading ? 'hidden' : 'visible',
                  backgroundColor: this.state.background.type == Video.BackgroundTypeColor ? this.state.background.backgroundColor : null,
                  backgroundImage: this.state.background.type == Video.BackgroundTypeImage ? 'url(\'' + this.state.background.backgroundImage.src + '\')' : null,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center center',
                  backgroundRepeat: 'no-repeat'
              }}>
                <div style={{
                  width:'100%', 
                  height:'100%', 
                  backgroundSize: 'contain',
                  backgroundPosition: 'center center',
                  backgroundRepeat: 'no-repeat',
                  backgroundImage: 'url(\'' + this.props.item.thumb_path + '\')',
                  mixBlendMode: this.state.mode == Video.ModeChalk ? 'screen' : null,
                  }}>
                </div>
              </div>
            }
          </div>
        </div>
        <span className="title">{this.props.item.title.shorten(34)}</span>
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

export default RecentVideoItem
