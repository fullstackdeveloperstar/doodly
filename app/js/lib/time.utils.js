String.prototype.toHHMMSS = function () {
    var sec_num = Math.round(parseInt(this, 0) / 1000);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

Number.prototype.toHHMMSS = function () {
    var sec_num = Math.round(this / 1000);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

Number.prototype.toMMSS = function() {
  var sec_num = Math.round(this / 1000);
  var minutes = Math.floor(sec_num / 60);
  var seconds = sec_num - (minutes * 60);

  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  var time    = minutes+':'+seconds;
  return time;
}

Number.prototype.toAproxTime = function() {
  var sec_num = Math.round(this / 1000);
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours > 0) {
    if (minutes > 30)
      return 'About ' + (hours + 1) + ' hours';
    else
      return 'About ' + hours + ' hours';
  } else {
    if (minutes > 0) {
      if (seconds > 30)
        return 'About ' + (minutes + 1) + ' minutes';
      else
        return 'About ' + minutes + ' minutes';
    } else
      return seconds + ' seconds';
  }
}
