import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Cache from './cache.js'

import LoginForm from './components/auth/login-form.jsx'
import ForgotPassword from './components/auth/forgot-password.jsx'
import ResetPassword from './components/auth/reset-password.jsx'

import UserProfile from './components/user-profile/user-profile.jsx'

import AssetManager from './components/asset-manager/asset-manager.js'

import VideosList from './components/videos-list/videos-list.jsx'
import VideoEditor from './components/video-editor/video-editor.jsx'

import AlertModal from './components/common/alert-modal.jsx'
import ConfirmationModal from './components/common/confirmation-modal.jsx'
import UpdateModal from './components/update-modal.jsx'

import User from './models/user.js'

var remote = window.require('electron').remote;
const ipcRenderer = window.require('electron').ipcRenderer;

const apiVersion = '1.2';

// window.server_url = 'https://www.doodly.net/api/v' + apiVersion;
window.server_url = 'https://staging.doodly.net/api/v' + apiVersion;
// window.server_url = 'http://localhost:8000/api/v' + apiVersion;

// window.ffmpeg_path = remote.getGlobal('ffmpeg');
window.ffmpeg_path = './app/vendor/ffmpeg/osx/ffmpeg';

$.ajaxSetup({timeout: 30000});

class Main extends React.Component {
  state = {
    loading: true,
    authForm: 'login',
    navigation: ['my_videos'],
    savedState: [null],
  }

  componentDidMount() {
    if (localStorage.token) {
      $.ajaxSetup({headers: {'Authorization': localStorage.token}});
      this.requestTokenRefresh(() => {
        this.loadUserDetails();
      });
    } else {
      this.setState({loading: false});
    }

    window.onbeforeunload = () => {
      let saveRequired = this.refs.videoEditor && this.refs.videoEditor.state.video.requiresSave;
      if (!this.closeConfirmed && saveRequired) {
        ipcRenderer.send('request-focus');
        this.refs.videoEditor.promptSave(() => {
          this.closeConfirmed = true;
          window.close();
        });
        return false;
      }

      this.cleanUp();
    }

    ipcRenderer.on('update-available', (event, update_info) => {
      confirmUpdate(update_info)
      .then(() => {
        if (this.refs.videoEditor)
          this.refs.videoEditor.promptSave(() => { ipcRenderer.send('apply-update'); });
        else
          ipcRenderer.send('apply-update');
      });
    });
  }

  render() {
    var mainContent = <div className="flex column fill center space-around">
                        <div><i className="spinner fa fa-lg fa-refresh fa-spin"/>&nbsp;&nbsp;Loading...</div>
                      </div>;
    if (!this.state.loading) {
      if (!localStorage.token)
        switch (this.state.authForm) {
          // TODO: reset password request code, reset pass
          case 'forgot_pass':
            mainContent = <ForgotPassword actionListener={this.handleAction}/>;
            break;
          case 'reset_pass':
            mainContent = <ResetPassword email={this.state.forgotPassEmail} actionListener={this.handleAction}/>;
            break;
          default:
            mainContent = <LoginForm actionListener={this.handleAction}/>;
        }
      else {
        var currentPage = this.state.navigation[this.state.navigation.length - 1];
        var currentSavedState = this.state.savedState[this.state.savedState.length - 1];

        switch (typeof currentPage == 'string' ? currentPage : currentPage.action) {
          case 'asset_manager':
            mainContent = <AssetManager
                            user={this.state.me}
                            prevPage={this.getPrevPageTitle()}
                            actionListener={this.handleAction}
                            handleAjaxFail={this.handleAjaxFail}/>
            break;
          case 'edit_video':
            mainContent = <VideoEditor
                            user={this.state.me}
                            video={currentPage.scope}
                            ref="videoEditor"
                            savedState={currentSavedState}
                            prevPage={this.getPrevPageTitle()}
                            actionListener={this.handleAction}
                            handleAjaxFail={this.handleAjaxFail}/>
            break;
          case 'user_profile':
            mainContent = <UserProfile
                            user={this.state.me}
                            prevPage={this.getPrevPageTitle()}
                            actionListener={this.handleAction}
                            handleAjaxFail={this.handleAjaxFail}/>
            break;
          default:
            mainContent = <VideosList
                            user={this.state.me}
                            actionListener={this.handleAction}
                            handleAjaxFail={this.handleAjaxFail}/>
        }
      }
    }
    return mainContent;
  }

  loadUserDetails = () => {
    $.get(server_url + '/me')
      .done((data, textStatus, request) => {
        this.setState({
          loading: false,
          me: new User(data),
        });
        setTimeout(this.forceUpdate(), 50);
      })
      .fail((request, textStatus, error) => this.handleAjaxFail(request, this.loadUserDetails));
  }

  logout = () => {
    localStorage.removeItem('token');
    Cache.remove('videos');

    this.setState({
      loading: false,
      navigation: ['my_videos'],
      authForm: 'login',
      savedState: [null],
    });
    this.forceUpdate();
  }

  requestTokenRefresh = (callback) => {
    $.get(server_url + '/auth/refresh')
      .done((data, textStatus, request) => {
        if (request.getResponseHeader('Authorization')) {
          localStorage.setItem('token', request.getResponseHeader('Authorization'));
          $.ajaxSetup({headers: {'Authorization': localStorage.token}});
        }
        if (callback) callback();
      })
      .fail((request, textStatus, error) => this.logout());
  }

  handleAjaxFail = (request, callback) => {
    if (request.responseJSON) console.log(request.responseJSON);

    if (request.responseJSON && request.responseJSON.error == 'token_expired') {
      this.requestTokenRefresh(callback);
    } else
    if (request.responseJSON && request.responseJSON.error == 'main_product_not_purchased') {
      this.logout();
      alert('A Doodly Membership (Gold, Platinum or Enterprise) or a Doodly - Standard License is required in order to use the app.\n\nIf you have purchased the app, and the license was not registered correctly, please contact our support team and we\'ll fix the problem ASAP.');
    }
    if (request.responseJSON && request.responseJSON.error == 'token_invalid') {
      this.logout();
    }
    if (request.responseJSON && request.responseJSON.error == 'user_not_found') {
      this.logout();
      alert('The entered login details are incorrect.');
    }
  }

  handleAction = (action) => {
    // save state of current screen before navigating away
    var currentPage = this.state.navigation[this.state.navigation.length - 1];
    switch (typeof currentPage == 'string' ? currentPage : currentPage.action) {
      case 'edit_video':
        this.state.savedState[this.state.savedState.length - 1] = this.refs.videoEditor.currentState();
        break;
      default:
        break;
    }

    // create emtpy state for the next screen
    if (action != 'back')
      this.state.savedState.push(null);

    // handle screen change
    switch (typeof action == 'string' ? action : action.action) {
      case 'load_user_details':
        this.loadUserDetails();
        break;
      case 'logout':
        this.logout();
        break;
      case 'forgot_pass':
        this.setState({authForm: 'forgot_pass'});
        break;
      case 'reset_pass':
        this.setState({
          authForm: 'reset_pass',
          forgotPassEmail: action.email
        });
        break;
      case 'back':
        if (this.refs.videoEditor)
          this.refs.videoEditor.promptSave(() => {
            this.state.navigation.pop();
            this.state.savedState.pop();
            this.forceUpdate();
          })
        else {
          if (this.state.navigation.length > 1) {
            this.state.navigation.pop();
            this.state.savedState.pop();
            this.forceUpdate();
          } else {
            this.setState({authForm: 'login'});
          }
        }
        break;
      default:
        this.state.navigation.push(action);
        this.forceUpdate();
    }
  }

  getPrevPageTitle = () => {
    if (this.state.navigation.length == 1) return null;
    var latestAction = this.state.navigation[this.state.navigation.length - 2];
    switch (typeof latestAction == 'string' ? latestAction : latestAction.action) {
      case 'edit_video':
        return 'Edit Video';
      default:
        return 'My Videos';
    }
  }

  cleanUp = () => {
    delete localStorage.scope;
    delete this.closeConfirmed;
    delete localStorage.clipBoard;
    Cache.remove('categories');
  }

}

ReactDOM.render(<Main />, document.querySelectorAll('.wrapper')[0]);
