import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import ContentEditable from '../common/content-editable.jsx'

class HeaderBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isUserMenuVisible: false
    };

    this.toggleUserMenu = this.toggleUserMenu.bind(this);
    this.emitAction = this.emitAction.bind(this);
    this.getLogo = this.getLogo.bind(this);
    this.getLicense = this.getLicense.bind(this);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.toggleUserMenu);
  }

  render() {
    return (
      <header className="flex center">
        <img src={this.getLogo()} className="logo"/>
        <div className="flex fill center space-between">
          <div>
          {
            this.props.prevPage && this.props.actionListener && !this.props.hideBackButton &&
            <div className="flex center">
              <div className="separator"/>
              <a href="javascript:;" className="back" onClick={this.emitAction.bind(this, 'back')}>{this.props.prevPage}</a>
            </div>
          }
          </div>
          <div className="title">
            {
              this.props.canEditTitle ?
                <div>
                  {this.props.title.substr(0, this.props.title.indexOf(':') + 2)}
                  <ContentEditable
                    style={{display: 'inline-block'}}
                    html={this.props.title.substr(this.props.title.indexOf(':') + 2)}
                    onChange={(title) => this.props.onTitleChange(title)}/>
                </div>
                :
                this.props.title
            }
          </div>
          <div className="user-area flex center">
            <div className="licenses flex column space-around">
              { this.getLicense() }
            </div>
            <div className="separator"/>
            <div className="user">
      				<a href="javascript:;" onClick={this.toggleUserMenu.bind(this)} className="flex center">
                <i className="fa fa-angle-down fa-lg" />&nbsp;&nbsp;
      					<img src="images/user_placeholder.png" alt="" />&nbsp;&nbsp;
      					<span className="name">{this.props.user.name}</span>
      				</a>
              <nav>
                <div className="top_arrow"></div>

      					<div><nobr><a href="javascript:;" onClick={this.emitAction.bind(this, 'user_profile')}>User Details</a></nobr></div>
                {
                  (this.props.user.level == 'admin' || this.props.user.level == 'staff') && !this.props.inManager &&
                  <div><nobr><a href="javascript:;" onClick={this.emitAction.bind(this, 'asset_manager')}>Asset Manager</a></nobr></div>
                }
      					<div><a href="javascript:;" onClick={this.emitAction.bind(this, 'logout')}>Logout</a></div>
              </nav>
            </div>
          </div>
        </div>
      </header>
    );
  }

  toggleUserMenu = (event) => {
      event.stopPropagation();

      if (this.state.isUserMenuVisible) {
        $('.user nav', ReactDOM.findDOMNode(this)).fadeOut(200);
        window.removeEventListener('click', this.toggleUserMenu);
      } else {
        $('.user nav', ReactDOM.findDOMNode(this)).fadeIn(200);
        window.addEventListener('click', this.toggleUserMenu);
      }

      this.setState({isUserMenuVisible: !this.state.isUserMenuVisible});
  }

  emitAction = (action) => {
    if (this.props.actionListener)
      this.props.actionListener(action);
  }

  getLogo = () => {
    if (this.props.user.hasPro())
      return 'images/logo_pro.png';

    return 'images/logo.png';
  }

  getLicense = () => {
    if (this.props.user.hasMembershipEnterprise())
      return 'Enterprise Membership';
    if (this.props.user.hasMembershipPlatinum())
      return 'Platinum Membership';
    if (this.props.user.hasMembershipGold())
      return 'Gold Membership';
    if (this.props.user.hasEnterprise())
      return 'Enterprise License';

    return 'Standard License';
  }

}

export default HeaderBar
