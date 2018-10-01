import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/modal.jsx';
import ColorPicker from '../common/color-picker.jsx';
import TimeInput from '../common/time-input.jsx';

// color picker requires the following changes
// -- remove alpha component from SketchPicker
// -- SketchInputFields: set dragLabel to false

class AssetSettings extends React.Component {
  static propTypes = {
    asset: PropTypes.object.isRequired,
    assets: [],
  }

  state = {
    color: '#000000',
    entryAnimation: 'draw',
    entryAnimationDuration: 3000,
    exitAnimation: 'none',
    exitAnimationDuration: 0
  }

  render () {
    return (
      <Modal ref="assetModal" className="asset-settings" title="Asset settings" blocksInteraction={true}>
        <div className="group settings flex center">
          <label>Color:</label>&nbsp;&nbsp;
          <ColorPicker color={this.state.color} onChange={this.handleColorChange}/>
        </div>
        <div className="group settings flex center space-between">
          <div style={{width: '45%'}}>
            <label>Enter Animation:</label>
            <div className="pretty-select" style={{ marginBottom: 5}}>
              <select ref="entryAnimation" onChange={this.handleEntryAnimationChange}>
                <option value="none">None</option>
                <option value="draw">Draw</option>
              </select>
            </div>
            <TimeInput value={this.state.entryAnimationDuration} onUpdate={this.handleEntryAnimationDurationChange.bind(this)}/>
          </div>
          <div style={{width: '45%'}}>
            <label>Exit Animation:</label>
            <div className="pretty-select" style={{ marginBottom: 5 }}>
              <select ref="exitAnimation" onChange={this.handleExitAnimationChange}>
                <option value="none">None</option>
                <option value="erase">Erase</option>
              </select>
            </div>
            <TimeInput value={this.state.exitAnimationDuration} onUpdate={this.handleExitAnimationDurationChange.bind(this)}/>
          </div>
        </div>
        <div className="group flex space-around">
          <button className="btn lg success" onClick={this.apply}>Apply</button>
        </div>
      </Modal>
    )
  }

  componentDidMount() {
    this.setup();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps)
      this.setup();
  }

  show = () => {
    this.refs.assetModal.show();
  }

  setup = () => {
    this.setState({
      color: this.props.asset.color,
      entryAnimation: this.props.asset.entryAnimation,
      entryAnimationDuration: this.props.asset.animationDuration,
      exitAnimation: this.props.asset.exitAnimation,
      exitAnimationDuration: this.props.asset.exitAnimationDuration
    });

    this.refs.exitAnimation.value = this.props.asset.exitAnimation;
    this.refs.entryAnimation.value = this.props.asset.entryAnimation;
  }

  handleColorChange = (color) => {
    this.setState({color: color});
  }

  handleEntryAnimationChange = () => {
    let value = this.refs.entryAnimation.value;
    this.setState({
      entryAnimation: value,
      entryAnimationDuration: value == 'none' ? 0 : (this.state.animationDuration || this.props.asset.animationDuration || 3000)
    });
  }

  handleEntryAnimationDurationChange = (time) => {
    this.setState({entryAnimationDuration: (this.state.entryAnimation != 'none' ? time : 0)});
  }

  handleExitAnimationChange = () => {
    let value = this.refs.exitAnimation.value;
    this.setState({
      exitAnimation: value,
      exitAnimationDuration: value == 'none' ? 0 : (this.state.exitAnimationDuration || this.props.asset.exitAnimationDuration || 3000)
    });
  }

  handleExitAnimationDurationChange = (time) => {
    this.setState({exitAnimationDuration: (this.state.exitAnimation != 'none' ? time : 0)});
  }

  apply = () => {
    this.props.assets.forEach( asset => {
      asset.color = this.state.color;
      asset.entryAnimation = this.state.entryAnimation;
      asset.animationDuration = this.state.entryAnimationDuration;
      asset.exitAnimation = this.state.exitAnimation;
      asset.exitAnimationDuration = this.state.exitAnimationDuration;
    });
    this.props.onChange && this.props.onChange();
    this.refs.assetModal.hide();
  }

}

export default AssetSettings;
