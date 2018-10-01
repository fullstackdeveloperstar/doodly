import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'

class TimeInput extends React.Component {
  static propTypes = {
    value: PropTypes.number.isRequired,
    onUpdate: PropTypes.func.isRequired,
    className: PropTypes.string
  }

  componentDidMount() {
    this.setValue(this.props.value);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps) {
      this.setValue(this.props.value);
    }
  }

  render() {
    return (
      <div className={'time-input' + (this.props.className ? ' ' + this.props.className : '') }>
        <input ref="input" onBlur={this.onValueChange} onClick={this.clear} onKeyPress={this.handleKeyPress} style={{pointerEvents: 'all'}}/>
        <div className="input-controls">
          <button className="btn clear" onClick={this.decrease} style={{pointerEvents: 'all'}}><i className="fa fa-minus"/></button>
          <hr/>
          <button className="btn clear" onClick={this.increase} style={{pointerEvents: 'all'}}><i className="fa fa-plus"/></button>
        </div>
      </div>
    );
  }

  setValue = (value) => {
    this.setState({value: value});
    this.refs.input.value = _.round(value / 1000, 2) + 's';
  }


  increase = (e) => {
    e.preventDefault();
    e.stopPropagation();
    var value = this.state.value + 250;
    this.setValue(value);
    if (this.props.onUpdate) this.props.onUpdate(value);
  }

  decrease = (e) => {
    e.stopPropagation();
    var value = Math.max(this.state.value - 250, this.props.minValue || 0);
    this.setValue(value);
    if (this.props.onUpdate) this.props.onUpdate(value);
  }

  onValueChange = (e) => {
    var value = this.props.minValue || 0;
    if (this.refs.input.value != '' && parseFloat(this.refs.input.value) != NaN)
      value = Math.max((parseFloat(this.refs.input.value)) * 1000, this.props.minValue || 0);
    this.setValue(value);
    if (this.props.onUpdate) this.props.onUpdate(value);
  }

  handleKeyPress = (e) => {
    if (e.charCode == 13)
      this.refs.input.blur();
  }

  clear = (e) => {
    e.stopPropagation();
    this.refs.input.value = '';
  }

}

export default TimeInput
