import gulp from 'gulp';
import mocha from 'gulp-mocha';
import 'espower-babel/guess';

gulp.task('test', () => {
  gulp.src('./test/**/*Test.js').pipe(mocha());
});
