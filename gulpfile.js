var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var notify = require("gulp-notify");

var scriptsDir = './app/js';
var buildDir = './app/build';


function buildScript(file, watch) {
  var props = Object.assign({}, watchify.args, {
    debug: true,
    entries: [scriptsDir + '/' + file],
    paths: ['./app/js'],
    extensions: ['.js', '.jsx']
  });

  var bundler = watch ? watchify(browserify(props), {ignoreWatch: true}) : browserify(props);

  bundler.transform(babelify, {presets: ['es2015', 'es2016', 'react', 'stage-0']});

  function rebundle() {
    var stream = bundler.bundle();
    return stream.on('error', notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
      }))
      .pipe(source(file))
      .pipe(gulp.dest(buildDir + '/'));
  }
  bundler.on('update', function() {
    rebundle();
    gutil.log('Rebundle...');
  });

  return rebundle();
}

gulp.task('build', () => {
  return buildScript('main.js', false);
});

gulp.task('watch', () => {
  return buildScript('main.js', true);
});

gulp.task('default', gulp.series(/*'build', */ 'watch'));
