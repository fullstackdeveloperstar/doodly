import React from 'react'
import PropTypes from 'prop-types'

import Auth from './auth.js'

class LoginForm extends React.Component {
  static propTypes = {
    actionListener: PropTypes.func.isRequired
  }

  render() {
    return (
      <div className="flex fill center space-around">
        <form onSubmit={this.handleLogin}>
          <div className="auth login">
            <div className="row">
              <label>Email:</label>
              <input type="text" ref="email"/>
            </div>
            <div className="row">
            <label>Password:</label>
            <input type="password" ref="password"/>
            </div>
            <div className="row flex fill center space-between">
              <a href="javascript:;" onClick={this.emitAction.bind(this, 'forgot_pass')}>Forgot password?</a>
              <button className="btn success" onClick={this.handleLogin}>Login</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handleLogin = (e) => {
    if (e) e.preventDefault();
    Auth.login(this.refs.email.value, this.refs.password.value, this.props.actionListener);
    return false;
  }

  emitAction = (action) => {
    this.props.actionListener(action);
  }
}

export default LoginForm
