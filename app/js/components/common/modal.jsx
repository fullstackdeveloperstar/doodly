import React from 'react'
import PropTypes from 'prop-types'

class Modal extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    dimBackground: PropTypes.bool,
    onCancel: PropTypes.func  
  }

  state = {
    visible: false
  }

  render() {
    const { className, blockInteraction, title, dimBackground, children } = this.props;
    const { visible } = this.state;

    return (
      <div className={'modal' + (visible ? ' visible ' : ' ') + className}>
        { dimBackground &&
          <div className="shadow" onClick={!blockInteraction && this.cancel}/>
        }
        <div className="content">
          { !blockInteraction &&
            <div className="close" onClick={this.cancel}><i className="fa fa-lg fa-times"/></div>
          }
          { title && <h2 className="title">{title}</h2> }
          {children}
        </div>
      </div>
    );
  }
  
  handleKeyUp = (e) => {
    if (e.keyCode == 27) {
      e.preventDefault();
      this.cancel();
    }
  }

  show = () => {
    this.setState({visible: true});
    window.addEventListener('keyup', this.handleKeyUp);
  }

  hide = () => {
    this.setState({visible: false});
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  cancel = () => {
    this.hide();
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  }
}

Modal.defaultProps = {
  blockInteraction: false,
  dimBackground: true
}

export default Modal
