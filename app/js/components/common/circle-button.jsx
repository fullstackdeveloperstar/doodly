import React from 'react'
import PropTypes from 'prop-types'

class CircleButton extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired    
  }


  render() {
    return (
      <div className={'btn circle ' + this.props.className} onClick={this.props.onClick} title={this.props.title}>
        {this.props.children}
      </div>
    );
  }

}

export default CircleButton
