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

Build assets
------------

In order to build the assets, you need to install gulp (npm install -g gulp).

You are of course free to use the locally installed gulp node module if you prefer.
    node node_modules/gulp/bin/gulp.js

If you only want to run the stylesheet compiler and js compile, simply run gulp.

The default task will do a once-off compile and close.

The 'watch' task will monitor any js files for changes and re-run the browserify build
automatically if any appropriate files are changed.

You may also use the "npm run-script" make and "npm run-script watch" commands to invoke gulp and gulp watch respectively.

Stylesheets are now auto-generated from source [SCSS](http://sass-lang.com/) in the Express server via middleware, so 

Browser support
---------------

- Evergreen browsers (Chrome, Firefox) - current and one previous version
- Safari 7 and 8
- Internet Explorer 9 and above (IE8 is explicitly not supported)
- Mobile support: yes, but no specific minimum browsers targeted

Need an official address checker?
---------------------------------

Try these:

* [Business licensing jurisdiction](http://www.lasvegasnevada.gov/Apply/27541.htm)
* [Report a problem](http://m.lasvegasnevada.gov/ReportProblem.aspx) form via the City of Las Vegas mobile site
* [CLV GIS Geo services](http://clvplaces.appspot.com/) if you are more of a GIS-minded person
