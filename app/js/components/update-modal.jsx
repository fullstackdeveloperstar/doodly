import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'
import { markdown } from 'markdown'

import Modal from './common/modal.jsx'

class UpdateModal extends React.Component {
  props = {
    info: ''
  }

  componentDidMount() {
    this.promise = new $.Deferred();
    this.refs.modal.show();

    var authHeader = $.ajaxSettings.headers['Authorization'];
    delete $.ajaxSettings.headers['Authorization'];
    $.ajax({
      url: 'https://s3.amazonaws.com/doodly/updates/latest/changelog.md',
      headers: {}
    })
      .done(data => {
        $('.update.confirmation .changelog .content').html(markdown.toHTML(data));
      });
    $.ajaxSetup({headers: {'Authorization': authHeader}});
  }

  render() {
    return (
      <Modal ref="modal" className="update confirmation" title="Update Available" onCancel={this.abort}>
        <div className="text">
          The application will be automatically updated the next time it starts.
          <p>Latest changes:</p>
          <div className="changelog"><div className="content">loading...</div></div>
        </div>
        <div className='text-center'>
          <button className="btn success lg" onClick={this.confirm}>Apply update now</button>&nbsp;&nbsp;&nbsp;
          <button className="btn destroy lg" onClick={this.abort}>Later</button>
        </div>
      </Modal>
    );
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

window.confirmUpdate = (info) => {
  let wrapper = document.body.appendChild(document.createElement('div'));
  let component = ReactDOM.render(React.createElement(UpdateModal, {info: info}), wrapper);

  let cleanup = function() {
    ReactDOM.unmountComponentAtNode(wrapper);
    setTimeout(wrapper.remove())
  }

  return component.promise.always(cleanup).promise();
}

export default UpdateModal
