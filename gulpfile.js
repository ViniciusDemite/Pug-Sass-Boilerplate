/**
 * Settings
 * Turn on/off build features
 */

const settings = {
  clean: true,
  scripts: true,
  polyfills: false,
  styles: true,
  svgs: false,
  images: false,
  copy: true,
  html: true,
  reload: true,
};

/**
 * Paths to project folders
 */

const paths = {
  input: 'src/',
  output: 'dist/',
  scripts: {
    input: 'src/js/*',
    polyfills: '.polyfill.js',
    output: 'dist/js/',
  },
  styles: {
    input: 'src/sass/**/*.{scss,sass}',
    output: 'dist/css/',
  },
  svgs: {
    input: 'src/svg/*.svg',
    output: 'dist/svg/',
  },
  images: {
    input: 'src/img/*.{png,jpg,gif}',
    output: 'dist/img/',
  },
  copy: {
    input: 'src/copy/**/*',
    output: 'dist/',
  },
  html: {
    input: 'src/view/*.pug',
    output: 'dist/',
  },
  reload: './dist',
};

/**
 * Template for banner to add to file headers
 */

const banner = {
  main:
    '/*!' +
    ' <%= package.name %> v<%= package.version %>' +
    ' | (c) ' +
    new Date().getFullYear() +
    ' <%= package.author.name %>' +
    ' | <%= package.license %> License' +
    ' | <%= package.repository.url %>' +
    ' */\n',
};

/**
 * Gulp Packages
 */

// General
const { gulp, src, dest, watch, series, parallel } = require('gulp');
const del = require('del');
const flatmap = require('gulp-flatmap');
const lazypipe = require('lazypipe');
const rename = require('gulp-rename');
const header = require('gulp-header');
const package = require('./package.json');

// Scripts
const jshint = require('gulp-jshint');
const stylish = require('jshint-stylish');
const concat = require('gulp-concat');
const uglify = require('gulp-terser');
const optimizejs = require('gulp-optimize-js');

// Styles
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const prefix = require('autoprefixer');
const minify = require('cssnano');

// Pug
const pug = require('gulp-pug');

// SVGs
const svgmin = require('gulp-svgmin');

// Images
const imagemin = require('gulp-imagemin');

// BrowserSync
const browserSync = require('browser-sync');

/**
 * Gulp Tasks
 */

// Remove pre-existing content from output folders
const cleanDist = function (done) {
  // Make sure this feature is activated before running
  if (!settings.clean) return done();

  // Clean the dist folder
  del.sync([paths.output]);

  // Signal completion
  return done();
};

// Repeated JavaScript tasks
const jsTasks = lazypipe()
  .pipe(header, banner.main, { package: package })
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, { suffix: '.min' })
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, { package: package })
  .pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
const buildScripts = function (done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Run tasks on script files
  return src(paths.scripts.input).pipe(
    flatmap(function (stream, file) {
      // If the file is a directory
      if (file.isDirectory()) {
        // Setup a suffix constiable
        let suffix = '';

        // If separate polyfill files enabled
        if (settings.polyfills) {
          // Update the suffix
          suffix = '.polyfills';

          // Grab files that aren't polyfills, concatenate them, and process them
          src([
            file.path + '/*.js',
            '!' + file.path + '/*' + paths.scripts.polyfills,
          ])
            .pipe(concat(file.relative + '.js'))
            .pipe(jsTasks());
        }

        // Grab all files and concatenate them
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + '/*.js')
          .pipe(concat(file.relative + suffix + '.js'))
          .pipe(jsTasks());

        return stream;
      }

      // Otherwise, process the file
      return stream.pipe(jsTasks());
    })
  );
};

// Lint scripts
const lintScripts = function (done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Lint scripts
  return src(paths.scripts.input)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
};

// Process, lint, and minify Sass files
const buildStyles = function (done) {
  // Make sure this feature is activated before running
  if (!settings.styles) return done();

  // Run tasks on all Sass files
  return src(paths.styles.input)
    .pipe(
      sass({
        outputStyle: 'expanded',
        sourceComments: true,
      })
    )
    .pipe(
      postcss([
        prefix({
          cascade: true,
          remove: true,
        }),
      ])
    )
    .pipe(header(banner.main, { package: package }))
    .pipe(dest(paths.styles.output))
    .pipe(rename({ suffix: '.min' }))
    .pipe(
      postcss([
        minify({
          discardComments: {
            removeAll: true,
          },
        }),
      ])
    )
    .pipe(dest(paths.styles.output));
};

// Process pug files
const buildPug = function (done) {
  // Make sure this feature is activated before running
  if (!settings.html) return done();

  // Optimize SVG files
  return src(paths.html.input)
    .pipe(
      pug({
        doctype: 'html',
        pretty: true,
      })
    )
    .pipe(dest(paths.html.output));
};

// Optimize SVG files
const buildSVGs = function (done) {
  // Make sure this feature is activated before running
  if (!settings.svgs) return done();

  // Optimize SVG files
  return src(paths.svgs.input).pipe(svgmin()).pipe(dest(paths.svgs.output));
};

// Optimize images
const buildImages = function (done) {
  // Make sure this feature is activated before running
  if (!settings.images) return done();

  // Optimize images files
  return src(paths.images.input)
    .pipe(imagemin())
    .pipe(dest(paths.images.output));
};

// Copy static files into output folder
const copyFiles = function (done) {
  // Make sure this feature is activated before running
  if (!settings.copy) return done();

  // Copy static files
  return src(paths.copy.input).pipe(dest(paths.copy.output));
};

// Watch for changes to the src directory
const startServer = function (done) {
  // Make sure this feature is activated before running
  if (!settings.reload) return done();

  // Initialize BrowserSync
  browserSync.init({
    server: {
      baseDir: paths.reload,
    },
  });

  // Signal completion
  done();
};

// Reload the browser when files change
const reloadBrowser = function (done) {
  if (!settings.reload) return done();
  browserSync.reload();
  done();
};

// Watch for changes
const watchSource = function (done) {
  watch(paths.input, series(exports.default, reloadBrowser));
  done();
};

/**
 * Export Tasks
 */

// Default task
// gulp
exports.default = series(
  cleanDist,
  parallel(
    buildScripts,
    lintScripts,
    buildStyles,
    buildPug,
    buildSVGs,
    buildImages,
    copyFiles
  )
);

// Watch and reload
// gulp watch
exports.watch = series(exports.default, startServer, watchSource);
