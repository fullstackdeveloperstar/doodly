import React from 'react'
import PropTypes from 'prop-types'
import { SketchPicker } from 'react-color'
import ColorUtils from "../../lib/color.utils";

class ColorPicker extends React.Component {
  state = {
    resetColor: {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    },
    color: {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    },
    displayColorPicker: false
  }

  componentDidMount() {
    this.setup();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps)
      this.setup();
  }

  setup = () => {
    if (this.props.resetColor) {
      let rgbColor = ColorUtils.hexToRgb(this.props.resetColor)
      this.setState({
        resetColor: {
          r: rgbColor.r,
          g: rgbColor.g,
          b: rgbColor.b,
          a: 1
        }
      });
    }
    if (this.props.color) {
      let rgbColor = ColorUtils.hexToRgb(this.props.color)
      this.setState({
        color: {
          r: rgbColor.r,
          g: rgbColor.g,
          b: rgbColor.b,
          a: 1
        }
      });
    }
  }

  togglePicker = () => {
    this.setState({ displayColorPicker: !this.state.displayColorPicker });
  }

  handleChange = (color) => {
    if (color) {
      this.setState({color: color.rgb});
      this.props.onChange && this.props.onChange(color.hex);
    } else {
      var hex = ColorUtils.rgbToHex(this.state.resetColor);
      this.setState({color: this.state.resetColor});
      this.props.onChange && this.props.onChange(hex);
    }
  }

  render () {
    let styles = {
      color: {
        width: '36px',
        height: '14px',
        borderRadius: '2px',
        background: `rgba(${ this.state.color.r }, ${ this.state.color.g }, ${ this.state.color.b }, 1)`,
      },
      swatch: {
        padding: '5px',
        background: '#fff',
        borderRadius: '1px',
        boxShadow: '0 0 0 1px rgba(0,0,0,.25)',
        display: 'inline-block',
        cursor: 'pointer',
      },
      popover: {
        position: 'absolute',
        zIndex: '2',
      },
      cover: {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
      reset: {
        display: (this.state.color.r != this.state.resetColor.r || this.state.color.g != this.state.resetColor.g || this.state.color.b != this.state.resetColor.b) ? 'block' : 'none',
        color: '#993333',
      }
    }

    return (
      <div>
        <div className="flex center">
          <div style={ styles.swatch } onClick={ this.togglePicker }>
            <div style={ styles.color } />
          </div>
          <button className="btn clear xs" onClick={this.handleChange.bind(this, null)}><i className="fa fa-ban" style={styles.reset}/></button>
        </div>
        {
          this.state.displayColorPicker &&
          <div style={ styles.popover }>
            <div style={ styles.cover } onClick={ this.togglePicker }/>
            <SketchPicker color={this.state.color} disableAlpha={true} onChange={this.handleChange}/>
          </div>
        }
      </div>
    )
  }
}

export default ColorPicker;
