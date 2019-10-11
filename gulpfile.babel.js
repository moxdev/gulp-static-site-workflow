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

const dirs = {
  src: 'src',
  dest: 'dist'
};

const htmlPaths = {
  src: `${dirs.src}/*.html`,
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

export function server(done) {
  browserSync.init({
    server: {
      baseDir: './dist/'
    },
    port: 3000,
    injectChanges: true,
    open: false // do not automatically open browser
  }, bsReuseTab);
  done();
}

export function html() {
  return src(htmlPaths.src, { allowEmpty: true })
    .pipe(dest(htmlPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: HTML setup complete', onLast: true }));
}

// Sass task: compiles the style.scss file into style.css
function css(){
  return src(sassPaths.src, { allowEmpty: true })
    .pipe(plumber()) // initialize plumber first
    .pipe(sourcemaps.init()) // initialize sourcemaps
    .pipe(sass({
      fiber: Fiber,
      outputStyle: 'expanded',
    }).on('error', sass.logError))  // using dart-sass w/ fiber
    .pipe(dest('./src/css/')) // put expanded CSS in src/css folder for debugging
    .pipe(rename({ suffix: '.min' }))  // rename file with .min
    .pipe(postcss([autoprefixer(), cssnano()]))  // run postcss options
    .pipe(sourcemaps.write('.')) // write sourcemaps file in current directory
    .pipe(plumber.stop())
    .pipe(dest(sassPaths.dest)) // put final minified CSS in dist/css folder
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'Task: CSS compiled successfully', onLast: true })
    );
}

export function scripts() {
  return src(jsPaths.src, { allowEmpty: true })
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(rollup({
      plugins: [
        resolve(),
        commonjs(),
        eslint(),
        babel({
          exclude: 'node_modules/**',
          runtimeHelpers: true
        }),
        uglify.uglify()
      ]
    },{
      format: 'iife'
    }))
    .pipe(rename({
      suffix: '.min'
    })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(plumber.stop())
    .pipe(dest(jsPaths.dest))
    .pipe(notify({ message: 'TASK: "js" completed', onLast: true }));
}

// Delete Dist folder for fresh build
export function clean() {
  return del([dirs.dest]);
}

/*
  * You could even use `export as` to rename exported tasks
  */
function watchFiles() {
  watch(htmlPaths.src, html);
  watch(sassPaths.src, css);
  watch(jsPaths.src, scripts);
}
export { watchFiles as watch };

const build = series(parallel(scripts, html, server));
/*
 * Export a default task
 */
export default build;