import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'

class ForgotPassword extends React.Component {

  static propTypes = {
    actionListener: PropTypes.func.isRequired
  }

  render() {
    return (
      <div className="flex fill center space-around">
        <form onSubmit={this.handleForgotPassword}>
          <div className="auth forgot-pass">
            <div className="row">
              <label>Please enter your email address to get started:</label>
              <input type="text" ref="email"/>
            </div>
            <div className="row flex center space-between">
              <a href="javascript:;" onClick={this.emitAction.bind(this, 'back')}>Cancel</a>
              <button className="btn success" onClick={this.handleForgotPassword}>Request password reset</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  handleForgotPassword = (e) => {
    e.preventDefault();
    $.post(server_url + '/password',
        {
          email: this.refs.email.value,
        }
      )
      .done(function(data){
        this.emitAction({
          action: 'reset_pass',
          email: this.refs.email.value,
        });
      }.bind(this))
      .fail(function(response){
        var data = response.responseJSON;
        alert(data.error);
      });
    return false;
  }

  emitAction = (action) => {
    this.props.actionListener(action);
  }

}

export default ForgotPassword
