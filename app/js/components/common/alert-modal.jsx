import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import $ from 'jquery'
import Modal from './modal.jsx'

class AlertModal extends React.Component {
  static propTypes = {
    message: PropTypes.string.isRequired
  }

  static defaultProps = {
    message: 'Some stuff happened.',
    buttonLabel: 'Ok',
  }

  componentDidMount() {
    this.promise = new $.Deferred();
    this.refs.modal.show();
  }

  render() {
    return (
      <Modal ref="modal" className="confirmation" onCancel={this.abort}>
        <div className="text" dangerouslySetInnerHTML={{__html: this.props.message}}/>
        <div className='text-center'>
          <button className="btn default lg" onClick={this.abort}>{this.props.buttonLabel}</button>
        </div>
      </Modal>
    );
  }

  show = () => {
    this.refs.modal.show();
  }

  abort = (e) => {
    if (e) e.stopPropagation();
    this.refs.modal.hide();
    this.promise.reject();
  }

}

window.alert = (message, options) => {
  options = options || {};
  let props = $.extend({message: message}, options);
  let wrapper = document.body.appendChild(document.createElement('div'));
  let component = ReactDOM.render(React.createElement(AlertModal, props), wrapper);

  let cleanup = function() {
    ReactDOM.unmountComponentAtNode(wrapper);
    setTimeout(wrapper.remove())
  }

  return component.promise.always(cleanup).promise();
}

export default AlertModal
