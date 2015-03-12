var gulp = require('gulp')
var gutil = require('gulp-util')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')
var svgSprite = require('gulp-svg-sprite')
var watchify = require('watchify')
var source = require('vinyl-source-stream')
var mold = require('mold-source-map')
var path = require('path')
var browserify = require('browserify')
var buffer = require('vinyl-buffer')

gulp.task('watch-js', function () {
  var bundler = watchify('./src/application.js')

  bundler.on('update', rebundleScripts)

  function rebundleScripts () {
    return bundler.bundle({ debug: true })
      .pipe(mold.transformSourcesRelativeTo(path.join(__dirname, 'public/js')))
      .pipe(source('application.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(rename(function (path) {
        if (path.extname === '.js') {
          path.basename += '.min'
        }
      }))
      .pipe(gulp.dest('public/js'))
      .on('end', gutil.log)
  }

  return rebundleScripts()
})

gulp.task('bundle-js-single', function () {
  var bundler = browserify({ entries: ['./src/application.js'], debug: true, cache: {}, packageCache: {}, fullPaths: true}) //cache: {}, packageCache: {}, fullPaths: true

  return bundler.bundle()
    .pipe(mold.transformSourcesRelativeTo(path.join(__dirname, 'public/js')))
    .pipe(source('application.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(rename(function (path) {
      if (path.extname === '.js') {
        path.basename += '.min'
      }
    }))
    .pipe(gulp.dest('public/js'))
    .on('end', gutil.log)
})

gulp.task('bundle-svg', function () {
  return gulp.src('./src/images/*.svg')
    .pipe(svgSprite({
      log: 'verbose',
      shape: {
        id: {
          generator: 'svg-%s'
        }
      },
      mode: {
        symbol: {
          dest: '',
          sprite: 'images.svg',
          inline: true
        }
      }
    }))
    .pipe(gulp.dest('./public/img'))
})

/* -- Tasks intended to be run for ease of use */
/* usage: gulp */
gulp.task('default', ['bundle-js-single', 'bundle-svg'])

/*usage: gulp watch */
gulp.task('watch', ['watch-js'])

/*usage: gulp watch */
gulp.task('svg', ['bundle-svg'])
