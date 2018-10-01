import React from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import _ from 'lodash'

import Asset from '../../models/asset.js'

class FontPreview extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
  }

  state = {
    initialCanvasWidth: 600,
    initialCanvasHeight: 290,
    canvasAlign: 'absolute-center',
    zoom: 1,
    texts: [
      'The quick brown fox jumps over the lazy dog.',
      'abcdefghijklmnopqrstuvwxyz'.split('').join(' '),
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').join(' '),
      '0123456789'.split('').join(' ')
    ],
    cache: []
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props != prevProps) this.load();
  }

  render() {
    return (
      <div className="font-preview fill flex stretch">
        <div className="canvas-holder fill" ref="canvasHolder" >
          <canvas
            className={'main-canvas ' + this.state.canvasAlign}
            ref="mainCanvas"
            width={this.state.initialCanvasWidth * this.state.zoom}
            height={this.state.initialCanvasHeight * this.state.zoom}
          />
          <i className={this.state.loading ? 'spinner fa fa-3x fa-refresh fa-spin' : 'hidden'}/>
          <button className="btn destroy" onClick={this.delete}>Delete</button>
        </div>
      </div>
    );
  }

  load = () => {
    if (this.currentAnimation) cancelAnimationFrame(this.currentAnimation);

    var asset = new Asset(this.props.item);
    asset.text =  'The quick brown fox jumps over the lazy dog.\n' +
                  'abcdefghijklmnopqrstuvwxyz'.split('').join(' ') + '\n' +
                  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').join(' ') + '\n' +
                  '0123456789'.split('').join(' ');
    asset.fontSize = 60;
    asset.animationDuration = 1000 * asset.text.length / 15;

    this.setState({
      animationStartTime: null,
      loading: true,
      asset: asset
    });

    requestAnimationFrame(() => {
      this.state.asset.preload(() => {
        var assetM = this.state.asset.measure(this.refs.mainCanvas, this.state.zoom);
        this.state.asset.fontSize = (this.state.initialCanvasWidth * this.state.zoom - 60) / assetM.width * 60;
        assetM = this.state.asset.measure(this.refs.mainCanvas, this.state.zoom);
        this.setState({
          loading: false,
          initialCanvasHeight: assetM.height + 60
        })
        requestAnimationFrame(this.updateMainCanvas);
      }, this.state.cache);
    })

  }

  delete = () => {
    confirm('Are you sure you want to delete this font? This action is not reversible.\nThe font will no longer be available outside the scenes that already use it.')
      .then(() => {
        $.ajax({
          url: server_url + '/assets/' + this.props.item.id,
          type: 'PUT',
          data: {status: 'inactive'},
          success: function(data) {
            this.setState({published: false})
            this.props.item.status = 'inactive';
            if (this.props.item.onStatusChange) {
              this.props.item.onStatusChange();
            }
            // TODO: show nice toast to user about asset being deleted
          }.bind(this)
        })
      })
  }

  updateMainCanvas = () => {
    this.currentAnimation = requestAnimationFrame(this.drawPreview);
  }

  drawPreview = () => {
    if (this.state.loading) return;
    var canvas = this.refs.mainCanvas; if (!canvas) return;

    if (!this.state.animationStartTime) {
      this.setState({
        animationStartTime: Date.now()
      });
      this.currentAnimation = requestAnimationFrame(this.drawPreview);
      return;
    }

    if (this.currentAnimation) cancelAnimationFrame(this.currentAnimation);

    var elapsed = Date.now() - this.state.animationStartTime;
    var progress = elapsed / this.state.asset.animationDuration;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // console.log(progress);
    this.state.asset.drawPartial(canvas, this.state.zoom, progress);

    if (progress <= 1)
      setTimeout(() => this.currentAnimation = requestAnimationFrame(this.drawPreview), 1000 / 30);
    else
      this.setState({
        animationStartTime: null,
        maxFontWidth: null
      });
  }

}

export default FontPreview
