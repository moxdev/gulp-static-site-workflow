'use strict';

import { src, dest, watch, series, parallel } from 'gulp';
// Importing all the Gulp-related packages we want to use
import autoprefixer from 'autoprefixer';
import babel from 'rollup-plugin-babel';
import browserSyncReuseTab from 'browser-sync-reuse-tab';
import {create as bsCreate} from 'browser-sync';
import cssnano from 'cssnano';
import commonjs from 'rollup-plugin-commonjs';
import del from 'del';
import { eslint } from 'rollup-plugin-eslint';
import Fiber from 'fibers';
import gulpif from 'gulp-if';
import minimist from 'minimist';
import notify from 'gulp-notify';
import plumber from 'gulp-plumber';
import postcss from 'gulp-postcss';
import rename from 'gulp-rename';
import resolve from 'rollup-plugin-node-resolve';
import rollup from 'gulp-better-rollup';
import sass from 'gulp-dart-sass';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'rollup-plugin-uglify';

const browserSync = bsCreate();
const bsReuseTab = browserSyncReuseTab(browserSync);

/**
 * ! Options for development / production conditionals
 * * default is development env
 * * official Gulp recipe for environments
 * @ https://github.com/gulpjs/gulp/blob/6b92e9225d20584a4ea3b7fea6b2d9d3fe159e5e/docs/recipes/pass-arguments-from-cli.md
 */
const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'development' },
  production: { env: process.env.NODE_ENV || 'production' }
};

const options = minimist(process.argv.slice(2), knownOptions);

// File Paths
const dirs = {
  src: 'src',
  dest: 'dist'
};

const htmlPaths = {
  src: `${dirs.src}/**/*.html`,
  dest: dirs.dest,
};

const sassPaths = {
  src: `${dirs.src}/scss/**/*.scss`,
  dest: `${dirs.dest}/css/`
};

const jsPaths = {
  src: `${dirs.src}/js/**/*.js`,
  dest: `${dirs.dest}/js/`
};

const phpPaths = {
  src: `${dirs.src}/**/*.php`,
  dest: dirs.dest
};

const fontsPaths = {
  src: `${dirs.src}/fonts/*`,
  dest: `${dirs.dest}/fonts/`
};

const imagesPaths = {
  src: `${dirs.src}/imgs/*`,
  dest: `${dirs.dest}/imgs/`
};

// Initiate BrowserSync server
export function server(done) {
  browserSync.init({
    server: {
      baseDir: './dist/'
    },
    port: 3000,
    injectChanges: true,
    open: false // do not automatically open browser, will open in same tab if already opened
  }, bsReuseTab);
  done();
}

// BrowserSync reload function
export function reload(done) {
  browserSync.reload();
  done();
}

// HTML function: copies html files to  dist/
export function html() {
  return src(htmlPaths.src, { allowEmpty: true })
    .pipe(dest(htmlPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'Task: HTML complete!', onLast: true }));
}
/**
* ! CSS function:
* @ uses 'gulp-better-rollup' https://www.npmjs.com/package/gulp-better-rollup
* * compiles the src/scss/styles.scss file into styles.css
* * copies js files to dist/js/
* * minifies js if in production environment
* * run with `gulp scripts`
*/
export function css(){
  return src(sassPaths.src, { allowEmpty: true })
    .pipe(plumber()) // initialize plumber first
    .pipe(sourcemaps.init()) // initialize sourcemaps
    .pipe(sass({ fiber: Fiber }).on('error', sass.logError))  // using dart-sass w/ fiber
    .pipe(postcss([autoprefixer()])) // run postcss autoprefixer
    .pipe(gulpif(options.env === 'production', postcss([cssnano()])))  // minify css if production environment
    .pipe(sourcemaps.write('.')) // write sourcemaps file in current directory
    .pipe(plumber.stop())
    .pipe(dest(sassPaths.dest)) // put CSS and sourcemaps in dist/css folder
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: CSS complete!', onLast: true })
    );
}
/**
 * ! Scripts function:
 * @ uses 'gulp-better-rollup' https://www.npmjs.com/package/gulp-better-rollup
 * * checks for js errors
 * * copies js files to dist/js/
 * * minifies js if in production environment
 * * run with `gulp scripts`
 */
export function scripts() {
  return src(jsPaths.src, { allowEmpty: true })
    .pipe(plumber()) // initialize plumber first
    .pipe(sourcemaps.init()) // initialize sourcemaps
    .pipe(rollup({
      plugins: [
        resolve(),
        commonjs(),
        eslint(),
        babel({
          exclude: 'node_modules/**'
        }),
        gulpif(options.env === 'production', uglify.uglify())  // minify js if in production environment
      ]
    },{
      format: 'iife'
    }))
    .pipe(rename({ suffix: '.min' }))  // rename file to use .min.js
    .pipe(sourcemaps.write('.'))  // write sourcemaps file in current directory
    .pipe(plumber.stop())
    .pipe(dest(jsPaths.dest))  // put js files and sourcemaps in dist/js folder
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "scripts" completed!', onLast: true }));
}
/**
 * ! PHP function:
 * * copies all php files to dist/
 * * run with `gulp php`
 */
export function php() {
  return src(phpPaths.src, { allowEmpty: true })
    .pipe(dest(phpPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "php" completed!', onLast: true }));
}
/**
* ! Fonts function:
* * copies font files to dist/fonts/
* * run with `gulp fonts`
*/
export function fonts() {
  return src(fontsPaths.src, { allowEmpty: true })
    .pipe(dest(fontsPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "fonts" completed', onLast: true })
    );
}
/**
* ! Images function:
* * copies image files to dist/img/
* * run with `gulp images`
*/
export function images() {
  return src(imagesPaths.src, { allowEmpty: true })
    .pipe(dest(imagesPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "images" completed', onLast: true })
    );
}
/**
* ! Clean function:
* * deletes dist/ folder for a clean build
* * run with `gulp clean`
*/
export function clean() {
  return del([dirs.dest]);
}
/**
* ! WatchFiles function:
* * watches for changes
* * runs coresponding functions if changes
* * reloads BrowserSync
* * run with `gulp watchFiles`
*/
export function watchFiles() {
  watch(htmlPaths.src, series(html, reload));
  watch(sassPaths.src, series(css, reload));
  watch(phpPaths.src, series(php, reload));
  watch(fontsPaths.src, series(fonts, reload));
  watch(imagesPaths.src, series(images, reload));
}
/**
* ! Build:
* * deletes the dist/ files
* * runs other fucntions to rebuild dist/
* * run with `gulp build`
*/
export const build = series(
  clean,
  parallel(
    scripts,
    css,
    html,
    php,
    fonts,
    images
  )
);
/**
* ! Gulp default:
* * deletes the dist/ files
* * runs other fucntions to rebuild dist/
* * starts BrowserSync server
* * watches files for changes and reloads browser if changes
* * run with `gulp`
*/
exports.default = series(
  clean,
  parallel(
    scripts,
    css,
    html,
    php,
    fonts,
    images
  ),
  server,
  watchFiles
);
