import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'

import LoginForm from './login-form.jsx'
import Auth from './auth.js'

class ResetPassword extends React.Component {
  static propTypes = {
    actionListener: PropTypes.func.isRequired,
    email: PropTypes.string.isRequired
  }

  state = {}
  
  render() {
    return (
      <div className="flex fill center space-around">
        <form onSubmit={this.handleForgotPassword}>
          <div className="auth reset-pass">
            <div className="row">
              {
                this.state.token ?
                  <label>Password reset token:</label>
                :
                  <div>
                    <p>We have sent you an email that contains a token.</p>
                    <p>Please enter the token in the box below in order to continue:</p>
                  </div>
              }
              <input type="text" ref="token"/>
            </div>
            {
              this.state.token ?
                <div style={{width: 240, margin: '80px 0 0'}}>
                  <div className="row">
                    <label>Enter your new password:</label>
                    <input type="text" ref="password"/>
                  </div>
                  <div className="row">
                    <label>Re-enter password:</label>
                    <input type="text" ref="password_confirmation"/>
                  </div>
                  <div className="row">
                    <button className="btn success" onClick={this.state.token ? this.handleResetPassword : this.handleContinue}>{this.state.token ? 'Update password' : 'Continue'}</button>
                  </div>
                </div>
              :
                <div className="row text-right">
                  <button className="btn success" onClick={this.handleContinue}>Continue</button>
                </div>
            }
            {
            }
          </div>
        </form>
      </div>
    );
  }

  handleResetPassword = (e) => {
    e.preventDefault();
    $.post(server_url + '/password/reset',
        {
          email: this.props.email,
          token: this.refs.token.value,
          password: this.refs.password.value,
          password_confirmation: this.refs.password_confirmation.value,
        }
      )
      .done(function(data){
        Auth.login(this.props.email, this.refs.password.value, this.props.actionListener);
      }.bind(this))
      .fail(function(response){
        var data = response.responseJSON;
        alert(typeof data.error == 'string' ? data.error : data.error.join("\n"));
      });
    return false;
  }

  handleContinue = (e) => {
    e.preventDefault();
    this.setState({ token: this.refs.token.value });
    return false;
  }

}

export default ResetPassword
