import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import $ from 'jquery'

import HeaderBar from '../common/header-bar.jsx'

class UserProfile extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
  }

  render() {
    return (
      <div className="flex column fill">
        <HeaderBar {...this.props} title="User Details"/>
        <div className="container fill flex space-around">
          <div className="user-profile">
            <div className="flex space-around">
              <div className="flex center details">
                <img src="images/user_placeholder.svg" width="150" height="150"/>
                <div>
                  <h1>{this.props.user.name}</h1>
                  <h3>{this.props.user.email}</h3>
                </div>
              </div>
            </div>
            <section className="password">
              <h2>Password</h2>
              <div className="content">
                <button className="btn default lg" ref="passwordBtn" onClick={this.showPasswordForm}>Change password</button>
                <div ref="passwordForm" style={{display: 'none', width: 250}}>
                  <div className="row">
                    <label>New Password:</label>
                    <input type="text" ref="password" />
                  </div>
                  <div className="row">
                    <label>Re-enter password:</label>
                    <input type="text" ref="password_confirmation" />
                  </div>
                  <div className="row text-right">
                    <button className="btn success" onClick={this.handleUpdatePassword}>Update password</button>
                  </div>
                </div>
              </div>
            </section>
            <section className="purchases">
              <h2>Purchases</h2>
              <div className="content">
                {
                  this.props.user.products.map((purchase, i) => (
                    <div className="purchase flex center" key={i}>
                      <div className="purchased_on">{purchase.created_at}</div>
                      <div className="product_name fill">{this.getProductName(purchase.type)}</div>
                    </div>
                  ))
                }
              </div>
            </section>
          </div>
          <div className="toast" ref="toast"></div>
        </div>
      </div>
    );
  }

  getProductName(type) {
    if (type == 'PRO_ASSETS')
      return 'Doodly - PRO Assets package'

    if (type == 'DEVELOPER_LICENSE')
      return 'Doodly - Enterprise license'

    if (type == 'DOODLY_CLUB')
      return 'Doodly Club Membership'

    if (type == 'DOODLY_GOLD' || type == 'DOODLY_GOLD_YRLY')
      return 'Doodly - Gold Membership'

    if (type == 'DOODLY_PLATINUM' || type == 'DOODLY_PLATINUM_YRLY')
      return 'Doodly - Platinum Membership'

    if (type == 'DOODLY_ENTERPRISE' || type == 'DOODLY_ENTERPRISE_YRLY')
      return 'Doodly - Enterprise Membership'

    return 'Doodly';
  }

  showPasswordForm = (e) => {
    e.preventDefault();
    $(ReactDOM.findDOMNode(this.refs.passwordBtn)).hide();
    $(ReactDOM.findDOMNode(this.refs.passwordForm)).show();
  }

  hidePasswordForm = () => {
    $(ReactDOM.findDOMNode(this.refs.passwordBtn)).show();
    $(ReactDOM.findDOMNode(this.refs.passwordForm)).hide();
  }

  handleUpdatePassword = (e) => {
    e.preventDefault();
    $('.toast').html('Updating password...').fadeIn(500);
    $.ajax({
      url: server_url + '/users/' + this.props.user.id,
      type: 'PUT',
      data: {
        password: this.refs.password.value,
        password_confirmation: this.refs.password_confirmation.value,
      },
    })
      .done(data => {
        $('.toast').html('Password updated successfully');
        setTimeout(() => { $('.toast').fadeOut(500) }, 2000);
        this.hidePasswordForm();
      })
      .fail((response) => {
        $('.toast').hide();
        var data = response.responseJSON;
        alert(data.error.join("\n"));
      })
  }

}

export default UserProfile
