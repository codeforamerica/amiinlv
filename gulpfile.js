var gulp = require('gulp');
var less = require('gulp-less');
var gutil = require('gulp-util');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var mold = require('mold-source-map');
var path = require('path');
var browserify = require('browserify');


gulp.task('less', function() {
    gulp.src('public/less/application.less')
        .pipe(less())
        .pipe(gulp.dest('public/css/'))
        .on('error', gutil.log);
});

gulp.task('watch-js', function () {
    var bundler = watchify('./src/application.js');

    bundler.on('update', rebundleScripts);

    function rebundleScripts() {
        return bundler.bundle({debug: true})
            .pipe(mold.transformSourcesRelativeTo(path.join(__dirname, 'public/js')))
            .pipe(source('application.js'))
            .pipe(gulp.dest('public/js'))
            .on('end', gutil.log);
    }

    return rebundleScripts();
});

gulp.task('bundle-js-single', function() {
    var bundler = browserify({entries:['./src/application.js'], debug: true});

    return bundler.bundle()
        .pipe(mold.transformSourcesRelativeTo(path.join(__dirname, 'public/js')))
        .pipe(source('application.js'))
        .pipe(gulp.dest('public/js'))
        .on('end', gutil.log);
});

gulp.task('watch-css', function() {
    gulp.watch('public/less/**/*.less', ['less']);
});

/* -- Tasks intended to be run for ease of use */
/* usage: gulp */
gulp.task('default', ['less', 'bundle-js-single']);

/*usage: gulp watch */
gulp.task('watch', ['watch-css', 'watch-js']);
