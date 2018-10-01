import $ from 'jquery'
import _ from 'lodash'


class Sound {
  constructor(object, onLoadCallback) {
    this.id = object.id;
    this.blob = object.blob;

    if (object.data && typeof object.data == 'string')
      var data = JSON.parse(object.data)

    this.duration = object.duration || (data && data.duration);
    this.path = object.path;

    this.channel = object.channel || 0;
    this.startTime = object.startTime || 0;

    this.clipStart = object.clipStart || 0;
    this.clipEnd = object.clipEnd || 0;

    this.playing = false;
    this.pos = object.pos || (this.clipStart / 1000);

    this.effects = object.effects || [];

    // preload audio
    if (object.player) {
      this.player = object.player;
      if (onLoadCallback) onLoadCallback();
    } else {
      this.onLoadCallback = onLoadCallback;
      this.player = document.createElement('audio');
      this.player.oncanplaythrough = () => {
        if (this.player.duration != Infinity)
          this.duration = Math.round(this.player.duration * 1000);
        
        if (this.onLoadCallback) this.onLoadCallback();
      }
      this.player.preload = true;
      this.player.src = this.path;
    }
  }

  playableDuration() {
    return this.duration - this.clipStart - this.clipEnd;
  }

  resetPos() {
    this.pos = Math.max(this.clipStart / 1000, 0.001); // won't take 0
  }

  toggleEffect(effectType) {
    let foundEffectIndex = this.effects.findIndex((effect) => effect.type == effectType);
    if (foundEffectIndex != -1) {
      this.effects.splice(foundEffectIndex, 1);
    } else {
      this.effects.push({
        type: effectType,
        duration: 1000
      })
    }
  }

  exportable() {
    let s = _.cloneDeep(this);
    delete s.blob;    
    delete s.playing;
    delete s.pos;
    delete s.player;
    delete s.onLoadCallback;
    delete s.ready;
    return s;
  }

  // video can only be recorded in the context of a video
  // requires video in order to upload the audio under the correct user account
  save(video, callback) {
    var formData = new FormData();
    formData.append('user_id', video.user_id);
    formData.append('asset_src', this.blob);
    formData.append('type', 'sound');
    formData.append('title', 'Recorded audio for: ' + video.title);
    formData.append('data', JSON.stringify({duration: this.duration}));

    $.ajax({
      url: server_url + '/assets',
      method: 'POST',
      data: formData,
      contentType: false,
      processData: false
    }).done((data) => {
      this.path = data.path;
      this.id = data.id;
      callback();
    })
    .fail((request, textStatus, error) => callback(request));   
  }
}

module.exports = Sound;
