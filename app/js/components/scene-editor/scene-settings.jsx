import React from 'react'
import PropTypes from 'prop-types'
import Modal from '../common/modal.jsx'
import TimeInput from '../common/time-input.jsx'

class SceneSettings extends React.Component {
  static propTypes = {
    scene: PropTypes.object.isRequired,
  }
  
  static defaultProps = {
    exitAnimation: 'none',
    extraTime: 500,
  }

  state = {
    exitAnimation: this.props.scene.exitAnimation,
    extraTime: this.props.scene.extraTime
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps)
      this.setState({
        exitAnimation: this.props.scene.exitAnimation,
        extraTime: this.props.scene.extraTime
      })
  }

  render() {
    let exitAnimations = ['none'];
    if (this.props.video && this.props.video.sceneTransition == 'camera-panning') {
      exitAnimations.push('camera-panning');
    } else {
      exitAnimations.push('swipe-left', 'swipe-right', 'swipe-up', 'swipe-down');
    }

    return (
      <Modal ref="modal" title="Scene Settings" className="scene-settings">
        <div className="group flex center">
          <label>Exit animation:</label>&nbsp;&nbsp;
          <div className="pretty-select">
            <select ref="exitAnimation" value={this.state.exitAnimation} onChange={this.changeExitAnimation}>
              { exitAnimations.map((animation, i) =>
                <option value={animation} key={i}>
                  {(animation[0].toUpperCase() + animation.slice(1)).replace('-', ' ')}
                </option>
              )}
            </select>
          </div>
        </div>
        <div className="group flex center">
          <label>Extra time at the end:</label>&nbsp;&nbsp;
          <TimeInput value={this.state.extraTime} minValue={500} onUpdate={this.handleExtraTime}/>
        </div>
        <div className="group flex space-around">
          <button className="btn lg success" onClick={this.apply}>Apply</button>
        </div>
      </Modal>
    )
  }

  show = () => {
    this.refs.modal.show();
  }

  handleExtraTime = (value) => {
    this.setState({
      extraTime: value
    })
  }

  changeExitAnimation = (event) => {
    this.setState({
      exitAnimation: event.target.value
    })
  }

  apply = () => {
    this.props.scene.exitAnimation = this.state.exitAnimation;
    this.props.scene.extraTime = this.state.extraTime;

    this.props.scene.updateStatus();

    if (this.props.scene.onChangeCallback)
      this.props.scene.onChangeCallback();

    this.refs.modal.hide();
  }

}

export default SceneSettings;
