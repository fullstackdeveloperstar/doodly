String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

String.prototype.shorten = function(length) {
  return this.length >= length ?
          this.substr(0, length - 3) + '...' :
          this
};
