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

export function reload(done) {
  browserSync.reload();
  done();
}

export function html() {
  return src(htmlPaths.src, { allowEmpty: true })
    .pipe(dest(htmlPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: HTML setup complete', onLast: true }));
}

// Sass task: compiles the style.scss file into style.css
export function css(){
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
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "js" completed', onLast: true }));
}

export function php() {
  return src(phpPaths.src, { allowEmpty: true })
    .pipe(dest(phpPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: PHP setup complete', onLast: true }));
}

export function fonts() {
  return src(fontsPaths.src, { allowEmpty: true })
    .pipe(dest(fontsPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "fonts" completed', onLast: true })
  );
}

export function images() {
  return src(imagesPaths.src, { allowEmpty: true })
    .pipe(dest(imagesPaths.dest))
    .pipe(browserSync.stream())
    .pipe(notify({ message: 'TASK: "images" completed', onLast: true })
  );
}

// Delete Dist folder for fresh build
export function clean() {
  return del([dirs.dest]);
}

export function watchFiles() {
  watch(htmlPaths.src, series(html, reload));
  watch(sassPaths.src, series(css, reload));
  watch(phpPaths.src, series(php, reload));
  watch(fontsPaths.src, series(fonts, reload));
  watch(imagesPaths.src, series(images, reload));
}

const build = series(
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

exports.build = build;

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
