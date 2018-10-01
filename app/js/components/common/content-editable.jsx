import React from 'react'

import $ from 'jquery'

class ContentEditable extends React.Component {

  state = {
    canEdit: false,
    intialHTML: this.props.html
  }  

  render() {
    let {html, ...props} = this.props;
    return React.createElement(
      this.props.tagName || 'div', {
        ...props,
        ref: (e) => this.htmlEl = e,
        onClick: this.handleClick,
        onBlur: this.handleBlur,
        onKeyDown: this.handleKeyPress,
        contentEditable: this.state.canEdit,
        dangerouslySetInnerHTML: {__html: html}
      }
    );
  }

  emitChange = () => {
    var html = this.htmlEl.innerHTML;
    if (this.props.onChange && html) {
      this.props.onChange(html);
    }
  }

  handleClick = (event) => {
    this.setState({
      canEdit: true,
      initialHTML: this.htmlEl.innerHTML
    });

    setTimeout(() => {
      if (!$(this.htmlEl).is(':focus')) {
        let selection = window.getSelection();
        let range = document.createRange();
        range.setStart(this.htmlEl.childNodes[0], this.htmlEl.innerHTML.length);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        this.htmlEl.focus();
      }
    }, 0)

    this.props.onSelect && this.props.onSelect();
  }

  handleBlur = () => {
    this.setState({canEdit: false});
    this.emitChange();
    if (!this.htmlEl.innerHTML) {
      this.htmlEl.innerHTML = this.state.initialHTML;
    } else {
      this.emitChange();
    }
  }


  handleKeyPress = (e) => {
    if (e.keyCode == 13) { // enter
      if (!this.htmlEl.innerHTML) {
        this.htmlEl.innerHTML = this.state.initialHTML;
      } else {
        this.emitChange();
      }
      this.setState({canEdit: false});
      return false;
    }
    
    if (e.keyCode == 27) { // escape
      this.htmlEl.innerHTML = this.state.initialHTML;
      this.setState({canEdit: false});
      return false;
    }
  }

}

export default ContentEditable
