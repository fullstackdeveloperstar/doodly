import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import $ from 'jquery'
import Modal from './modal.jsx'

class ConfirmationModal extends React.Component {
  static defaultProps = {
    message: 'Are you sure about this?',
    confirmLabel: 'Ok',
    abortLabel: 'Cancel'
  }

  componentDidMount() {
    this.promise = new $.Deferred();
    this.refs.modal.show();
  }

  render() {
    return (
      <Modal ref="modal" className="confirmation" onCancel={this.abort}>
        <div className="text">{this.props.message}</div>
        <div className='text-center'>
          <button className="btn default lg" onClick={this.confirm}>{this.props.confirmLabel}</button>&nbsp;&nbsp;&nbsp;
          <button className="btn destroy lg" onClick={this.abort}>{this.props.abortLabel}</button>
        </div>
      </Modal>
    );
  }

  show = () => {
    this.refs.modal.show();
  }

  confirm = (e) => {
    e.stopPropagation();
    this.refs.modal.hide();
    this.promise.resolve();
  }

  abort = (e) => {
    if (e) e.stopPropagation();
    this.refs.modal.hide();
    this.promise.reject();
  }

}

window.confirm = (message, options) => {
  options = options || {};
  let props = $.extend({message: message}, options);
  let wrapper = document.body.appendChild(document.createElement('div'));
  let component = ReactDOM.render(React.createElement(ConfirmationModal, props), wrapper);

  let cleanup = function() {
    ReactDOM.unmountComponentAtNode(wrapper);
    setTimeout(wrapper.remove())
  }

  return component.promise.always(cleanup).promise();
}

export default ConfirmationModal
