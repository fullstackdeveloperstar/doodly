import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import Cache from '../../cache.js'

import HeaderBar from '../common/header-bar.jsx'
import VideoItem from './video-item.jsx'
import RecentVideoItem from './recent-video-item.jsx'
import CreateVideoPopup from './create-video-popup.jsx'

import VideoContextMenu from './video-context-menu.jsx'
import Upgrades from './upgrades.jsx'

class VideosList extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    actionListener: PropTypes.func.isRequired,
    handleAjaxFail: PropTypes.func.isRequired    
  }

  state = {
    videos: [],
    loading: true
  }

  componentDidMount() {
    this.mounted = true;
    this.load();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  load = () => {
    var cached_videos = Cache.get('videos');
    if (cached_videos) {
      this.setState({
        videos: cached_videos,
        loading: false
      });
    }
    $.get(server_url + '/videos')
      .done(data => {
        if (this.mounted)
          this.setState({
            videos: data,
            loading: false
          })
        Cache.put('videos', data);
      })
      .fail((request, textStatus, error) => this.props.handleAjaxFail(request, this.load));
  }

  render() {
    let recent = _.orderBy(this.state.videos, 'updated_at', 'desc').slice(0, 5);
    var recentItems = recent.map(video => <RecentVideoItem item={video} key={video.id} actionListener={this.handleAction} onContextMenu={this.showVideoContextMenu.bind(this, video.id)}/>)
    var items = this.state.videos.length > 0 ?
                  this.state.videos.map(video => <VideoItem item={video} key={video.id} actionListener={this.handleAction} onContextMenu={this.showVideoContextMenu.bind(this, video.id)}/>)
                :
                  !this.state.loading &&
                  <div className="no-content">
                    You haven&#39;t yet created any videos.
                  </div>

    return (
      <div className="flex column fill my-videos">
        <HeaderBar {...this.props} title="My Videos"/>
        <div className="recent-videos flex center space-around">
          <div className="container">
            <h2>Recent Videos</h2>
            <div className="flex center">
              <div className="create" onClick={() => this.refs.createVideoPopup.show()}>
                <div className="background flex center space-around"><i className="fa fa-plus fa-3x"/></div>
                <span className="title">Create New Video</span>
              </div>
              {recentItems}
            </div>
          </div>
        </div>
        <div className="flex space-around">
          <div className={'width-wrapper flex' + (this.props.user.hasUpgrades() ? '' : ' space-around')}>
            <div className="video-list fill">
              { this.state.loading &&
                <div className="spinner text-center"><i className="fa fa-refresh fa-spin"/> Loading...</div>
              }
              {items}
            </div>
            {
              this.props.user.hasUpgrades() &&
              <Upgrades user={this.props.user}/>
            }
          </div>
        </div>
        <CreateVideoPopup ref="createVideoPopup" onVideoCreated={this.handleVideoCreated} />
        <VideoContextMenu ref="videoContextMenu" actionListener={this.handleAction}/>
        <div className="toast"/>
      </div>
    );
  }

  handleVideoCreated = (video) => {
    this.state.videos.push(video);
    Cache.put('videos', this.state.videos);
    this.forceUpdate();
    if (this.props.actionListener)
      this.props.actionListener({action: 'edit_video', scope: video});
  }

  handleAction = (action) => {
    switch (typeof action == 'string' ? action : action.action) {
      case 'delete_video':
        confirm('Are you sure you want to delete this video?')
        .then(() => {
          $('.toast').html('Deleting video...').fadeIn(500);
          $.ajax({
            url: server_url + '/videos/' + action.video.id,
            method: 'DELETE'
          })
            .done((data) => {
              _.remove(this.state.videos, action.video);
              this.forceUpdate();
            })
            .always(() => {
              $('.toast').fadeOut();
            });
        })
        break;
      case 'duplicate_video':
        $('.toast').html('Duplicating video...').fadeIn(500);
        $.get(server_url + '/videos/' + action.data.videoId + '/duplicate')
        .done((data) => {
          this.state.videos.push(data);
          this.forceUpdate();
          $('.toast').fadeOut();
        })
        break;
      default:
        this.props.actionListener(action);
    }
  }

  showVideoContextMenu = (videoId, event) => {
    this.refs.videoContextMenu.show(videoId, event);
  }

}

export default VideosList
