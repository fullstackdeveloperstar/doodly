import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

class ContextMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = { visibility: 'hidden' };

    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps && this.props.x && this.props.y) {
      let width = $(ReactDOM.findDOMNode(this)).outerWidth();
      let height = $(ReactDOM.findDOMNode(this)).outerHeight();

      let x = this.props.x;
      if (x + width > $('body').width()) x -= width - 20;

      let y = this.props.y;
      if (y + height > $('body').height()) y -= height - 20;

      this.setState({
        left: x,
        top: y
      });
    }
  }
  

  componentDidMount() {
    ReactDOM.findDOMNode(this).addEventListener('click', this.handleClick);
  }

  componentWillUnmount() {
    ReactDOM.findDOMNode(this).removeEventListener('click', this.handleClick);
  }

  render() {
    let style = {
      position: 'absolute',
      left: this.state.left || 0,
      top: this.state.top || 0,
      zIndex: 99999,
      visibility: this.state.visibility
    }
    return (
      <div className='context-menu' style={style}>
        {this.props.children}
      </div>
    )
  }

  hide = () => {
    document.removeEventListener('click', this.hide);
    this.setState({ visibility: 'hidden' })
  }

  show = () => {
    document.addEventListener('click', this.hide);
    this.setState({ visibility: 'visible' })
  }

  handleClick = (e) => {
    if (this.props.preventDismiss)
      e.stopPropagation();
  }
}


export const MenuItem = (props) => {
  return (
    <div className={'menu-item ' + (props.class ? props.class : '')} onClick={props.onClick}>
      <nobr>
        {
          props.icoBefore &&
          <span> 
            &nbsp;
            <i className={props.icoBefore}></i>
          </span>
        }
        { props.title }
        {
          props.icoAfter &&
          <span> 
            &nbsp;
            <i className={props.icoAfter}></i>
          </span>
        }
      </nobr>
    </div>
  )
}


export default ContextMenu
