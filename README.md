Am I in Las Vegas?
==================

Sometimes it's hard to know, because the city limits have the complexity of a fractal curve.

Install
-------

‘Am I In Las Vegas’ (AIILV) is a Node application written in Javascript.

1. On a plain Ubuntu system, install the `nodejs` and `npm` packages.

    apt-get install -y nodejs npm

2. Install the additional Node `express` module:

    npm install express

Run
---

To run AIILV:

    node server.js

Build Assets
---

In order to build the assets, you need to install gulp (npm install -g gulp).

You are of course free to use the locally installed gulp node module if you prefer.
    node node_modules/gulp/bin/gulp.js

If you only want to run the stylesheet compiler and js compile, simply run gulp.

The default task will do a once-off compile and close.

The 'watch' task will monitor any less or js files for changes and re-run the less or browserify build
automatically if any appropriate files are changed.

You may also use the "npm run-script" make and "npm run-script watch" commands to invoke gulp and gulp watch respectively.