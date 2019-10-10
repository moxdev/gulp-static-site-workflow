"use strict";
// Initialize modules
// Importing specific gulp API functions lets us write them below as series() instead of gulp.series()
const { src, dest, watch, series, parallel } = require('gulp');
// Importing all the Gulp-related packages we want to use
const autoprefixer        = require('autoprefixer');
const babel               = require('gulp-babel');
const browserSync         = require('browser-sync').create();
const browserSyncReuseTab = require('browser-sync-reuse-tab')(browserSync)
const concat              = require('gulp-concat');
const cssnano             = require('cssnano');
const del                 = require('del');
const Fiber               = require('fibers');
const newer               = require('gulp-newer');
const plumber             = require('gulp-plumber');
const postcss             = require('gulp-postcss');
const rename              = require('gulp-rename');
const sass                = require('gulp-sass');
const sourcemaps          = require('gulp-sourcemaps');
const uglify              = require('gulp-uglify');
const notify              = require('gulp-notify');
var replace               = require('gulp-replace');

/**
 * # Set sass.compiler for future compatibilty
 * * can also use "node-sass"
 * @ https://www.npmjs.com/package/gulp-sass
 */

sass.compiler = require('dart-sass');

// File paths
const files = {
  htmlPath: './src/index.html',
  scssPath: './src/scss/**/*.scss',
  jsPath: './src/js/**/*.js',
  jsDest: './dist/js/',
}

// Works!
// BrowserSync
function browserSyncServer(done) {
  browserSync.init({
    server: {
      baseDir: "./dist/"
    },
    port: 3000,
    injectChanges: true,
    open: false // do not automatically open browser
  }, browserSyncReuseTab );
  done();
}

// Works!
// Delete Dist folder for fresh build
function clean() {
  return del(["./dist/"]);
}

// Works!
function htmlTask(){
  return src(files.htmlPath, { allowEmpty: true })
  .pipe(dest('dist'))
  .pipe(browserSync.stream())
  .pipe(notify({ message: 'TASK: HTML setup complete', onLast: true }));
}

// Works!
// Sass task: compiles the style.scss file into style.css
function scssTask(){
  return src(files.scssPath, { allowEmpty: true })
    .pipe(plumber()) // initialize plumber first
    .pipe(sourcemaps.init()) // initialize sourcemaps
    .pipe(sass({
      fiber: Fiber,
      outputStyle: 'expanded',
    }).on('error', sass.logError))  // using dart-sass w/ fiber
    .pipe(dest('./src/css/')) // put expanded CSS in src/css folder for debugging
    .pipe(rename({ suffix: ".min" }))  // rename file with .min
    .pipe(postcss([autoprefixer(), cssnano()]))  // run postcss options
    .pipe(sourcemaps.write('.')) // write sourcemaps file in current directory
    .pipe(plumber.stop())
    .pipe(dest('./dist/css/')) // put final minified CSS in dist/css folder
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'Task: CSS compiled successfully', onLast: true })
  );
}

// JS task: concatenates and uglifies JS files to script.js
// function jsTask(){
//   return src(files.jsPath, { allowEmpty: true })
//     .pipe(concat('all.js'))
//     .pipe(uglify())
//     .pipe(dest('dist')
//   );
// }

function scripts() {
  return src(files.jsPath, { sourcemaps: true })
    .pipe(babel())
    .pipe(uglify())
    .pipe(concat('main.min.js'))
    .pipe(dest(files.jsDest));
}

// // JS task: concatenates and uglifies JS files to script.js
// function jsTask(){
//   return src([
//     files.jsPath,
//     //,'!' + 'includes/js/jquery.min.js', // to exclude any specific files
//     ], { allowEmpty: true })
//     .pipe(concat('all.js'))
//     .pipe(uglify())
//     .pipe(dest('dist')
//   );
// }

// Cachebust
// var cbString = new Date().getTime();
// function cacheBustTask(){
//   return src(['index.html'])
//     .pipe(replace(/cb=\d+/g, 'cb=' + cbString))
//     .pipe(dest('.'));
// }

// Watch task: watch SCSS and JS files for changes
// If any change, run scss and js tasks simultaneously
function watchTask(){
  watch(
    [files.scssPath, files.jsPath, files.htmlPath],
    parallel(scssTask, scripts, jsTask, htmlTask)
  );
}

// Watch files
function watchFiles() {
  watch(files.scssPath, scssTask);
  watch("./src/**/*.html", htmlTask);
}

// BrowserSync Reload
function browserSyncReload(done) {
  browserSync.reload();
  done();
}

// Export the default Gulp task so it can be run
// Runs the scss and js tasks simultaneously
// then runs cacheBust, then watch task
exports.default = series(
  parallel(scssTask, scripts, htmlTask, browserSyncServer),
  watchFiles
);

exports.html = htmlTask;
exports.js = scripts;
exports.css = scssTask;
exports.clean = clean;




// Look into this
// - Replace Autoprefixer browsers option to Browserslist config.
//   Use browserslist key in package.json or .browserslistrc file.