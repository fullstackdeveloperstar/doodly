var $ = require('jquery');
var _ = require('lodash');

var ImageEffects = require('./lib/image-effects.js');

import black_hoodie_thick_marker from './hands/whiteboard/black_hoodie_thick_marker.js';
import no_clothes_thin_marker from './hands/whiteboard/no_clothes_thin_marker.js';
import woman_no_clothes_thin_black_marker from './hands/whiteboard/woman_no_clothes_thin_black_marker.js';
import brown_man_thin_marker_black from './hands/whiteboard/brown_man_thin_marker_black.js';
import brown_woman_thin_marker from './hands/whiteboard/brown_woman_thin_marker.js';
import white_woman_medium_black_marker from './hands/whiteboard/white_woman_medium_black_marker.js';

import no_clothes_chalk_white from './hands/blackboard/no_clothes_chalk_white.js';
import woman_no_clothes_chalk_white from './hands/blackboard/woman_no_clothes_chalk_white.js';
import brown_man_chalk_white from './hands/blackboard/brown_man_chalk_white.js';
import brown_woman_chalk_white from './hands/blackboard/brown_woman_chalk_white.js';

import white_man_thick_marker from './hands/glassboard/white_man_thick_marker.js';

import Video from './models/video'

const hands = {
  whiteboard: [
    black_hoodie_thick_marker,
    no_clothes_thin_marker,
    woman_no_clothes_thin_black_marker,
    brown_man_thin_marker_black,
    brown_woman_thin_marker,
    white_woman_medium_black_marker,
  ],
  blackboard: [
    no_clothes_chalk_white,
    woman_no_clothes_chalk_white,
    brown_man_chalk_white,
    brown_woman_chalk_white,
  ],
  greenboard: [
    no_clothes_chalk_white,
    woman_no_clothes_chalk_white,
    brown_man_chalk_white,
    brown_woman_chalk_white,
  ],
  glassboard: [
    white_man_thick_marker,
  ],
  custom: {
    marker: [
      black_hoodie_thick_marker,
      no_clothes_thin_marker,
      woman_no_clothes_thin_black_marker,
      brown_man_thin_marker_black,
      brown_woman_thin_marker,
      white_woman_medium_black_marker],
    chalk: [
      no_clothes_chalk_white,
      woman_no_clothes_chalk_white,
      brown_man_chalk_white,
      brown_woman_chalk_white]
  },
  default_whiteboard_set: 0,
  default_blackboard_set: 0,
  default_greenboard_set: 0,
  default_glassboard_set: 0,
  default_custom_marker_set: 0,
  default_custom_chalk_set: 0,
};

var Hand = {
  sets: hands,
  currentSet: hands.whiteboard[0],

  useSet: function(index, style, mode, callback) {

    if (index == -1) {
      this.currentSet = null;

      if (callback)
        callback();
    } else {
      this.loadCallback = callback;

      let handsForCurrentStyle = hands.whiteboard;
      let defaultSetForCurrentStyle = hands.default_whiteboard_set;
      if (style == 'blackboard' || style == 'greenboard') {
        handsForCurrentStyle = hands.blackboard;
        if (style == 'blackboard') {
          defaultSetForCurrentStyle = hands.default_blackboard_set;
        } else {
          defaultSetForCurrentStyle = hands.default_greenboard_set;
        }
      } else
      if (style == 'colorboard' || style == 'imageboard') {
        if(!mode) mode = 'marker';
        handsForCurrentStyle = hands.custom[mode];
        if (mode == 'chalk') {
          defaultSetForCurrentStyle = hands.default_custom_chalk_set;
        } else {
          defaultSetForCurrentStyle = hands.default_custom_marker_set;
        }
      } else
      if (style == 'glassboard') {
        handsForCurrentStyle = hands.glassboard;
        defaultSetForCurrentStyle = hands.default_glassboard_set;
      }

      this.currentSet = handsForCurrentStyle.length > index ? handsForCurrentStyle[index] : handsForCurrentStyle[defaultSetForCurrentStyle];

      this.preload();
    }
  },

  preload: function() {
    this.toLoad = this.currentSet.angles.length + this.currentSet.erasers.length;
    this.currentSet.angles.map(hand => {
      let img = new Image();
      img.onload = () => {
        hand.img = img;
        this.toLoad--;
        if (this.toLoad == 0 && this.loadCallback)
          this.loadCallback();
      };
      img.src = hand.src;
    })
    this.currentSet.erasers.map(hand => {
      let img = new Image();
      img.onload = () => {
        hand.img = img;
        this.toLoad--;
        if (this.toLoad == 0 && this.loadCallback)
          this.loadCallback();
      };
      img.src = hand.src;
    })

  },

  draw: function(canvas, x, y, angle, prevHand, fps = 15, handStyle = Video.HandStyleRight) {
    var ctx = canvas.getContext('2d');

    if (this.currentSet) {
      // don't allow the hand to rotate more than 20 degrees at a time
      if (prevHand) {
        var dA = _.clamp(angle.asset - prevHand.angle.asset, -20, 20);
        var dC = _.clamp(angle.canvas - prevHand.angle.canvas, -20, 20);
        angle.asset = prevHand.angle.asset + dA;
        angle.canvas = prevHand.angle.canvas + dC;
      }

      let penAngle = angle.canvas * (1 - this.currentSet.angleVariation) + angle.asset * this.currentSet.angleVariation;

      var hand = this.currentSet.angles.reduce((prev, curr) => Math.abs(curr.angle - penAngle) < Math.abs(prev.angle - penAngle) ? curr : prev);
      var zoom = canvas.height * 1.7 * (this.currentSet.scale || 1) / hand.img.height;
      var drawBlurred = false;

      var handX = handStyle == Video.HandStyleLeft ? 1-hand.x : hand.x;

      var handWidth = hand.img.width * zoom,
          handHeight = hand.img.height * zoom,
          handPenX = handX * handWidth,
          handPenY = hand.y * handHeight;
      
      var handCanvas = document.createElement('canvas');
      var handCtx = handCanvas.getContext('2d');
      handCanvas.width = handWidth;
      handCanvas.height = handHeight;
      
      // Flip canvas for Left-Handed
      if(handStyle == Video.HandStyleLeft) {
        handCtx.translate(handWidth, 0);
        handCtx.scale(-1, 1);
      }

      handCtx.drawImage(hand.img, 0, 0, handWidth, handHeight);

      if (prevHand) {
        var dx = x - prevHand.x,
            dy = y - prevHand.y,
            h = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height),
            bluredHandScale = 0.3,
            blurRadius = h * 40 * fps / 15;

        if (blurRadius > 2) {
          drawBlurred = true;
          var canvasPadding = blurRadius;

          var canvasWidth = (handWidth + canvasPadding * 2) * bluredHandScale;
          var canvasHeight = (handHeight + canvasPadding * 2) * bluredHandScale;
          handPenX += canvasPadding / bluredHandScale;
          handPenY += canvasPadding / bluredHandScale;

          var tempCanvas = document.createElement('canvas');
          var tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = canvasHeight;

          tempCtx.drawImage(handCanvas, canvasPadding, canvasPadding, handWidth * bluredHandScale, handHeight * bluredHandScale);
          ImageEffects.GaussianBlur(tempCanvas, blurRadius * bluredHandScale);
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(
        drawBlurred ? tempCanvas : handCanvas,
        x - handPenX,
        y - handPenY,
        drawBlurred ? canvasWidth / bluredHandScale : handWidth,
        drawBlurred ? canvasHeight / bluredHandScale : handHeight
      );

      // verification red dot
      // ctx.arc(x, y, 4, 0, 2 * Math.PI, false);
      // ctx.fillStyle = 'red';
      // ctx.fill();

      ctx.restore();

      return {
        hand: hand,
        x: x,
        y: y,
        angle: angle
      }
    } else {
      return null;
    }
  },

  drawEraser: function(canvas, x, y, useFinger) {
    if (!this.currentSet) return;
    if (this.currentSet.erasers.length == 0) return;

    let hand = this.currentSet.erasers[useFinger && this.currentSet.erasers.length > 1 ? 1 : 0];

    let zoom = canvas.height * 1.7 / hand.img.height;

    var handWidth = hand.img.width * zoom,
        handHeight = hand.img.height * zoom,
        handPenX = hand.x * handWidth,
        handPenY = hand.y * handHeight;

    let ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      hand.img,
      x - handPenX,
      y - handPenY,
      handWidth,
      handHeight
    );
    ctx.restore();
  }
}


$(function(){
  Hand.useSet(0, 'whiteboard');
});

module.exports = Hand;
