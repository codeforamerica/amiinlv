var gulp = require('gulp');
var less = require('gulp-less');
var gutil = require('gulp-util');

gulp.task('less', function() {
    gulp.src('public/less/application.less')
        .pipe(less())
        .pipe(gulp.dest('public/css/'))
        .on('error', gutil.log);
});

