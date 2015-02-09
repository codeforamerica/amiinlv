(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var gju = require('geojson-utils')
var geocodeAddress = require('./geocode')
var getCurrentLocation = require('./current_location')
var Map = require('./map')
var config = require('../config')

var json = {}
var map
var latitude
var longitude

//--------------------
// MAP VARIABLES
//--------------------

/**
 * Initializes the application and sets
 * event listeners
 */

function preInit () {
  // Force initial page load to have a triggered onpopstate
  if (Modernizr.history) {
    window.history.replaceState(null, null, document.URL)
  }
  router()

  // Requests browser's permission to use
  // geolocator upon page load, if necessary
  cacheCurrentLocation()
}

function init (data) {
  /* global json, map */
  json = data
  map = new Map(data)

  // Setup event listeners
  $('#input-target').on('click', onGetCurrentLocation)
  // Go and Submit does the same thing, don't want to execute it twice
  //$('#input-go').on('click', onGo)
  $('#location-form').on('submit', onSubmit)
  $('#about-link').on('click', onClickAboutLink)
  $('#about-close').on('click', onClickAboutClose)
  $('#example-link').on('click', onClickExampleLink)
  $('#dismiss-ie-browser').on('click', onClickDismissIEMessage)

  $('#input-location').focus()
  map.render()

  $('#map').addClass('no-panning')

  // Press escape to reset the view
  $(document).keydown(function (e) {
    if (e.which == 27 && e.ctrlKey == false && e.metaKey == false) loadHomePage()
  })
}

function onClickDismissIEMessage (e) {
  e.preventDefault()
  $('.ie-browser').hide()
}

/**
 * Checks page route and acts accordingly
 */

function router () {
  var q = window.location.search.substr(1)
  var page = q.split('=')[0]
  var values = q.split('=')[1]

  switch (page) {
    case 'about':
      aboutOpenInstantaneously()
      break
    case 'latlng':
      var lat = parseFloat(values.split(',')[0])
      var lng = parseFloat(values.split(',')[1])
      goToLatLng(lat, lng)
      break
    case 'query':
      // /query=x where x is the address to geocode
      // this is totally broken because switch case matching isn't done on partial string
      var findgeo = q.substr(q.indexOf('='))
      if (findgeo) {
        geocodeByAddress(findgeo)
        break
      }
    default:
      reset()
      break
  }
}

// Listen for history changes
window.onpopstate = function (event) {
  // This event will fire on initial page load for Safari and old Chrome
  // So lack of state does not necessarily mean reset, depend on router here
  if (!event.state) {
    router()
    return
  } else {
    switch (event.state.page) {
      case 'about':
        aboutOpen()
        break
      case 'latlng':
        goToLatLng(event.state.latitude, event.state.longitude)
        break
      default:
        reset()
        break
    }
  }
}

/**
 * Fill in the address input with the example
 */

function onClickExampleLink (e) {
  e.preventDefault()

  var address = $('#example-link').text()
  $('#input-location').val(address)
}

function setExampleLink () {
  var examples = config.examples || []
  if (examples.length > 0) {
    var i = Math.floor(Math.random() * examples.length)
    $('#example-link').text(examples[i])
  }
}

/**
 * Resets the application to its initial state
 */

function reset () {
  // Show the question box
  $('#question').show()

  $('#input-location').val('')
  $('#alert').hide()
  aboutClose()
  resetCurrentLocationButton()
  $('#question').fadeIn(150)
  $('#input-location').focus()
  $('#map').addClass('no-panning')

  // New example link!
  setExampleLink()

  // Reset map if initialized
  if (map) {
    map.reset()
  }
}

function loadHomePage () {
  reset()

  // Set URL
  if (Modernizr.history) {
    window.history.pushState({}, 'home', '/')
  } else {
    window.location = '/'
  }
}

function onClickReset (e) {
  e.preventDefault()
  loadHomePage()
}

/**
 * Renders the answer and drops the pin on the map
 */

function setAnswer (answer) {
  // Include a message providing further information.
  // Currently, it's just a simple restatement of the
  // answer.  See GitHub issue #6.
  var detail
  if (answer == 'Yes') {
    detail = config.responseYes
  } else {
    detail = config.responseNo
  }

  $('#question').fadeOut(250, function () {
    map.createMarker(latitude, longitude)
    map.createPopup(latitude, longitude, answer, detail)
    map.setLocation(latitude, longitude, config.finalZoom)

    $('#map').removeClass('no-panning')

    // Leaflet stops event propagation in map elements, so this event
    // needs to be bound to another one of the inner wrappers after it
    // is created
    $('#reset-button').on('click', onClickReset)
  })
}

/**
 * Checks to see whether a latitude and longitude
 * fall within the limits provided in region.json
 * @param {String} [latitude] the latitude
 * @param {String} [longitude] the longitude
 */

function checkWithinLimits (latitude, longitude) {
  var point = {
    type: 'Point',
    coordinates: [ longitude, latitude ]
  }
  var polygon = json.features[0].geometry
  var withinLimits = gju.pointInPolygon(point, polygon)

  if (withinLimits) {
    onWithinLimits()
  } else {
    onOutsideLimits()
  }
}

/**
 * Displays an answer that specifies that the location
 * is within the limits
 */

function onWithinLimits () {
  setAnswer('Yes')
}

/**
 * Displays an answer that specifies that the location
 * is not within the limits
 */

function onOutsideLimits () {
  setAnswer('No')
}

/**
 * Gets the current location, and checks whether
 * it is within the limits
 */

function onGetCurrentLocation () {
  $('#input-target .loading-text').show()
  $('#input-target .default-text').hide()
  geocodeByCurrentLocation()
}

/**
 * Submits the form, geocodes the address, and checks
 * whether it is within the limits
 */

function onGo () {
  submitLocation()
}

/**
 * Submits the form, geocodes the address, and checks
 * whether it is within the limits
 */

function onSubmit (e) {
  e.preventDefault()
  submitLocation()
}

/**
 * Submits form
 */
function submitLocation () {
  var $input = $('#input-location')
  var address = $input.val()
  if (address != '') {
    geocodeByAddress(address)

    if (Modernizr.history) {
      window.history.pushState({}, 'query', '/?query=' + encodeURIComponent(address))
    } else {
      window.location = '/?query=' + encodeURIComponent(address)
    }
  } else {
    displayAlert('Please enter an address')
  }
  return false
}

function displayAlert (message) {
  $('#alert').html(message).slideDown(100)
}

/**
 * Initial current location cache
 */

function cacheCurrentLocation () {
  var onSuccess = function (position) {
    /* global latitude, longitude */
    latitude = position.coords.latitude
    longitude = position.coords.longitude
  }

  // Do nothing if we are unable to do geolocation
  // No error callback

  getCurrentLocation(onSuccess)
}

/**
 * Gets the current location and checks whether it is
 * within the limits
 */

function geocodeByCurrentLocation () {
  var onSuccess = function (position) {
    /* global latitude, longitude */
    latitude = position.coords.latitude
    longitude = position.coords.longitude
    checkWithinLimits(latitude, longitude)

    // Set URL
    var URLString = '?latlng=' + latitude + ',' + longitude
    if (Modernizr.history) {
      window.history.pushState({
        page: 'latlng',
        latitude: latitude,
        longitude: longitude
      }, 'latlng', URLString)
    } else {
      window.location = URLString
    }
  }

  var onError = function (err) {
    alert('Unable to retrieve current position. Geolocation may be disabled on this browser or unavailable on this system.')
    resetCurrentLocationButton()
  }

  getCurrentLocation(onSuccess, onError)
}

function goToLatLng (lat, lng) {
  // Set global values too
  latitude = lat
  longitude = lng

  // Check
  checkWithinLimits(latitude, longitude)
}

function resetCurrentLocationButton () {
  $('#input-target .loading-text').hide()
  $('#input-target .default-text').show()
}

/**
 * Geocodes an address
 */

function geocodeByAddress (address) {
  geocodeAddress(address, config.regionBias, function (res) {
    /* global latitude, longitude */
    if (res && res.results.length > 0) {
      var result = res.results[0].geometry.location

      latitude = result.lat
      longitude = result.lng
      checkWithinLimits(latitude, longitude)
    } else {
      // No results!
      displayAlert('No results for this address!')
    }
  })
}

/**
 * Opens about window
 */

function onClickAboutLink (e) {
  e.preventDefault()

  if (Modernizr.history) {
    window.history.pushState({ page: 'about' }, 'about', '?about')
  } else {
    window.location = '?about'
  }

  aboutOpen()
}

function aboutOpen () {
  $('#location-form').fadeOut(200, function () {
    $('#about').fadeIn(200)
  })
}

/**
 * Opens about window, without animation
 */

function aboutOpenInstantaneously () {
  // Show the question box
  $('#question').show()

  $('#location-form').hide()
  $('#about').show()
}

/**
 * Closes about window
 */

function onClickAboutClose (e) {
  e.preventDefault()
  loadHomePage()
}

function aboutClose () {
  $('#about').fadeOut(200, function () {
    $('#location-form').fadeIn(200)
  })
}

/**
 * Determine what needs to be done based on URI
 */

window.onload = preInit

/**
 * Retrieves the region.json file and initializes
 * the application
 */

jQuery(document).ready(function () {
  $.getJSON(config.fileName, function (data) {
    init(data)
  })
})

},{"../config":2,"./current_location":4,"./geocode":5,"./map":6,"geojson-utils":3}],2:[function(require,module,exports){
var config = {
  name: 'Las Vegas',
  latitude: 36.18,
  longitude: -115.18,
  regionBias: '35.773258,-115.642090|36.469890,-114.636840',
  initialZoom: 13,
  finalZoom: 14,
  fileName: '/data/region.geojson',
  tagline: 'Because the city boundaries are a lot weirder than you think.',
  about: 'Las Vegas is one of the most visited cities in the world, and yet its most famous destination &mdash; a 6.8km boulevard of extravagantly themed casinos commonly known as ‘The Strip’ &mdash; is actually located outside of Las Vegas city limits.  To add to the confusion, the city’s true borders are often jagged and full of small holes.  According to the U.S. Postal Service, local residents may still claim a Las Vegas address, even if they are under the jurisdiction of one of the surrounding unincorporated communities throughout Clark County.  As a result, the City of Las Vegas requires residents verify that they reside within city limits to receive city services.',
  responseYes: 'You are within city limits!',
  responseNo: 'You are not in Las Vegas!',
  examples: [
    '1319 Shadow Mountain Place',
    '3497 Holly Ave',
    '953 East Sahara Avenue',
    '3490 N Torrey Pines Drive',
    '8787 W Washburn Drive',
    '3355 South Las Vegas Boulevard',
    '6967 W Tropical Parkway'
  ]
}

module.exports = config

},{}],3:[function(require,module,exports){
(function () {
  var gju = this.gju = {};

  // Export the geojson object for **CommonJS**
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = gju;
  }

  // adapted from http://www.kevlindev.com/gui/math/intersection/Intersection.js
  gju.lineStringsIntersect = function (l1, l2) {
    var intersects = [];
    for (var i = 0; i <= l1.coordinates.length - 2; ++i) {
      for (var j = 0; j <= l2.coordinates.length - 2; ++j) {
        var a1 = {
          x: l1.coordinates[i][1],
          y: l1.coordinates[i][0]
        },
          a2 = {
            x: l1.coordinates[i + 1][1],
            y: l1.coordinates[i + 1][0]
          },
          b1 = {
            x: l2.coordinates[j][1],
            y: l2.coordinates[j][0]
          },
          b2 = {
            x: l2.coordinates[j + 1][1],
            y: l2.coordinates[j + 1][0]
          },
          ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
          ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
          u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
        if (u_b != 0) {
          var ua = ua_t / u_b,
            ub = ub_t / u_b;
          if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            intersects.push({
              'type': 'Point',
              'coordinates': [a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)]
            });
          }
        }
      }
    }
    if (intersects.length == 0) intersects = false;
    return intersects;
  }

  // Bounding Box

  function boundingBoxAroundPolyCoords (coords) {
    var xAll = [], yAll = []

    for (var i = 0; i < coords[0].length; i++) {
      xAll.push(coords[0][i][1])
      yAll.push(coords[0][i][0])
    }

    xAll = xAll.sort(function (a,b) { return a - b })
    yAll = yAll.sort(function (a,b) { return a - b })

    return [ [xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]] ]
  }

  gju.pointInBoundingBox = function (point, bounds) {
    return !(point.coordinates[1] < bounds[0][0] || point.coordinates[1] > bounds[1][0] || point.coordinates[0] < bounds[0][1] || point.coordinates[0] > bounds[1][1]) 
  }

  // Point in Polygon
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html#Listing the Vertices

  function pnpoly (x,y,coords) {
    var vert = [ [0,0] ]

    for (var i = 0; i < coords.length; i++) {
      for (var j = 0; j < coords[i].length; j++) {
        vert.push(coords[i][j])
      }
	  vert.push(coords[i][0])
      vert.push([0,0])
    }

    var inside = false
    for (var i = 0, j = vert.length - 1; i < vert.length; j = i++) {
      if (((vert[i][0] > y) != (vert[j][0] > y)) && (x < (vert[j][1] - vert[i][1]) * (y - vert[i][0]) / (vert[j][0] - vert[i][0]) + vert[i][1])) inside = !inside
    }

    return inside
  }

  gju.pointInPolygon = function (p, poly) {
    var coords = (poly.type == "Polygon") ? [ poly.coordinates ] : poly.coordinates

    var insideBox = false
    for (var i = 0; i < coords.length; i++) {
      if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[i]))) insideBox = true
    }
    if (!insideBox) return false

    var insidePoly = false
    for (var i = 0; i < coords.length; i++) {
      if (pnpoly(p.coordinates[1], p.coordinates[0], coords[i])) insidePoly = true
    }

    return insidePoly
  }

  // support multi (but not donut) polygons
  gju.pointInMultiPolygon = function (p, poly) {
    var coords_array = (poly.type == "MultiPolygon") ? [ poly.coordinates ] : poly.coordinates

    var insideBox = false
    var insidePoly = false
    for (var i = 0; i < coords_array.length; i++){
      var coords = coords_array[i];
      for (var j = 0; j < coords.length; j++) {
        if (!insideBox){
          if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[j]))) {
            insideBox = true
          }
        }
      }
      if (!insideBox) return false
      for (var j = 0; j < coords.length; j++) {
        if (!insidePoly){
          if (pnpoly(p.coordinates[1], p.coordinates[0], coords[j])) {
            insidePoly = true
          }
        }
      }
    }

    return insidePoly
  }

  gju.numberToRadius = function (number) {
    return number * Math.PI / 180;
  }

  gju.numberToDegree = function (number) {
    return number * 180 / Math.PI;
  }

  // written with help from @tautologe
  gju.drawCircle = function (radiusInMeters, centerPoint, steps) {
    var center = [centerPoint.coordinates[1], centerPoint.coordinates[0]],
      dist = (radiusInMeters / 1000) / 6371,
      // convert meters to radiant
      radCenter = [gju.numberToRadius(center[0]), gju.numberToRadius(center[1])],
      steps = steps || 15,
      // 15 sided circle
      poly = [[center[0], center[1]]];
    for (var i = 0; i < steps; i++) {
      var brng = 2 * Math.PI * i / steps;
      var lat = Math.asin(Math.sin(radCenter[0]) * Math.cos(dist)
              + Math.cos(radCenter[0]) * Math.sin(dist) * Math.cos(brng));
      var lng = radCenter[1] + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(radCenter[0]),
                                          Math.cos(dist) - Math.sin(radCenter[0]) * Math.sin(lat));
      poly[i] = [];
      poly[i][1] = gju.numberToDegree(lat);
      poly[i][0] = gju.numberToDegree(lng);
    }
    return {
      "type": "Polygon",
      "coordinates": [poly]
    };
  }

  // assumes rectangle starts at lower left point
  gju.rectangleCentroid = function (rectangle) {
    var bbox = rectangle.coordinates[0];
    var xmin = bbox[0][0],
      ymin = bbox[0][1],
      xmax = bbox[2][0],
      ymax = bbox[2][1];
    var xwidth = xmax - xmin;
    var ywidth = ymax - ymin;
    return {
      'type': 'Point',
      'coordinates': [xmin + xwidth / 2, ymin + ywidth / 2]
    };
  }

  // from http://www.movable-type.co.uk/scripts/latlong.html
  gju.pointDistance = function (pt1, pt2) {
    var lon1 = pt1.coordinates[0],
      lat1 = pt1.coordinates[1],
      lon2 = pt2.coordinates[0],
      lat2 = pt2.coordinates[1],
      dLat = gju.numberToRadius(lat2 - lat1),
      dLon = gju.numberToRadius(lon2 - lon1),
      a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(gju.numberToRadius(lat1))
        * Math.cos(gju.numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (6371 * c) * 1000; // returns meters
  },

  // checks if geometry lies entirely within a circle
  // works with Point, LineString, Polygon
  gju.geometryWithinRadius = function (geometry, center, radius) {
    if (geometry.type == 'Point') {
      return gju.pointDistance(geometry, center) <= radius;
    } else if (geometry.type == 'LineString' || geometry.type == 'Polygon') {
      var point = {};
      var coordinates;
      if (geometry.type == 'Polygon') {
        // it's enough to check the exterior ring of the Polygon
        coordinates = geometry.coordinates[0];
      } else {
        coordinates = geometry.coordinates;
      }
      for (var i in coordinates) {
        point.coordinates = coordinates[i];
        if (gju.pointDistance(point, center) > radius) {
          return false;
        }
      }
    }
    return true;
  }

  // adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
  gju.area = function (polygon) {
    var area = 0;
    // TODO: polygon holes at coordinates[1]
    var points = polygon.coordinates[0];
    var j = points.length - 1;
    var p1, p2;

    for (var i = 0; i < points.length; j = i++) {
      var p1 = {
        x: points[i][1],
        y: points[i][0]
      };
      var p2 = {
        x: points[j][1],
        y: points[j][0]
      };
      area += p1.x * p2.y;
      area -= p1.y * p2.x;
    }

    area /= 2;
    return area;
  },

  // adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
  gju.centroid = function (polygon) {
    var f, x = 0,
      y = 0;
    // TODO: polygon holes at coordinates[1]
    var points = polygon.coordinates[0];
    var j = points.length - 1;
    var p1, p2;

    for (var i = 0; i < points.length; j = i++) {
      var p1 = {
        x: points[i][1],
        y: points[i][0]
      };
      var p2 = {
        x: points[j][1],
        y: points[j][0]
      };
      f = p1.x * p2.y - p2.x * p1.y;
      x += (p1.x + p2.x) * f;
      y += (p1.y + p2.y) * f;
    }

    f = gju.area(polygon) * 6;
    return {
      'type': 'Point',
      'coordinates': [y / f, x / f]
    };
  },

  gju.simplify = function (source, kink) { /* source[] array of geojson points */
    /* kink	in metres, kinks above this depth kept  */
    /* kink depth is the height of the triangle abc where a-b and b-c are two consecutive line segments */
    kink = kink || 20;
    source = source.map(function (o) {
      return {
        lng: o.coordinates[0],
        lat: o.coordinates[1]
      }
    });

    var n_source, n_stack, n_dest, start, end, i, sig;
    var dev_sqr, max_dev_sqr, band_sqr;
    var x12, y12, d12, x13, y13, d13, x23, y23, d23;
    var F = (Math.PI / 180.0) * 0.5;
    var index = new Array(); /* aray of indexes of source points to include in the reduced line */
    var sig_start = new Array(); /* indices of start & end of working section */
    var sig_end = new Array();

    /* check for simple cases */

    if (source.length < 3) return (source); /* one or two points */

    /* more complex case. initialize stack */

    n_source = source.length;
    band_sqr = kink * 360.0 / (2.0 * Math.PI * 6378137.0); /* Now in degrees */
    band_sqr *= band_sqr;
    n_dest = 0;
    sig_start[0] = 0;
    sig_end[0] = n_source - 1;
    n_stack = 1;

    /* while the stack is not empty  ... */
    while (n_stack > 0) {

      /* ... pop the top-most entries off the stacks */

      start = sig_start[n_stack - 1];
      end = sig_end[n_stack - 1];
      n_stack--;

      if ((end - start) > 1) { /* any intermediate points ? */

        /* ... yes, so find most deviant intermediate point to
        either side of line joining start & end points */

        x12 = (source[end].lng() - source[start].lng());
        y12 = (source[end].lat() - source[start].lat());
        if (Math.abs(x12) > 180.0) x12 = 360.0 - Math.abs(x12);
        x12 *= Math.cos(F * (source[end].lat() + source[start].lat())); /* use avg lat to reduce lng */
        d12 = (x12 * x12) + (y12 * y12);

        for (i = start + 1, sig = start, max_dev_sqr = -1.0; i < end; i++) {

          x13 = source[i].lng() - source[start].lng();
          y13 = source[i].lat() - source[start].lat();
          if (Math.abs(x13) > 180.0) x13 = 360.0 - Math.abs(x13);
          x13 *= Math.cos(F * (source[i].lat() + source[start].lat()));
          d13 = (x13 * x13) + (y13 * y13);

          x23 = source[i].lng() - source[end].lng();
          y23 = source[i].lat() - source[end].lat();
          if (Math.abs(x23) > 180.0) x23 = 360.0 - Math.abs(x23);
          x23 *= Math.cos(F * (source[i].lat() + source[end].lat()));
          d23 = (x23 * x23) + (y23 * y23);

          if (d13 >= (d12 + d23)) dev_sqr = d23;
          else if (d23 >= (d12 + d13)) dev_sqr = d13;
          else dev_sqr = (x13 * y12 - y13 * x12) * (x13 * y12 - y13 * x12) / d12; // solve triangle
          if (dev_sqr > max_dev_sqr) {
            sig = i;
            max_dev_sqr = dev_sqr;
          }
        }

        if (max_dev_sqr < band_sqr) { /* is there a sig. intermediate point ? */
          /* ... no, so transfer current start point */
          index[n_dest] = start;
          n_dest++;
        } else { /* ... yes, so push two sub-sections on stack for further processing */
          n_stack++;
          sig_start[n_stack - 1] = sig;
          sig_end[n_stack - 1] = end;
          n_stack++;
          sig_start[n_stack - 1] = start;
          sig_end[n_stack - 1] = sig;
        }
      } else { /* ... no intermediate points, so transfer current start point */
        index[n_dest] = start;
        n_dest++;
      }
    }

    /* transfer last point */
    index[n_dest] = n_source - 1;
    n_dest++;

    /* make return array */
    var r = new Array();
    for (var i = 0; i < n_dest; i++)
      r.push(source[index[i]]);

    return r.map(function (o) {
      return {
        type: "Point",
        coordinates: [o.lng, o.lat]
      }
    });
  }

  // http://www.movable-type.co.uk/scripts/latlong.html#destPoint
  gju.destinationPoint = function (pt, brng, dist) {
    dist = dist/6371;  // convert dist to angular distance in radians
    brng = gju.numberToRadius(brng);

    var lon1 = gju.numberToRadius(pt.coordinates[0]);
    var lat1 = gju.numberToRadius(pt.coordinates[1]);

    var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) +
                          Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
    var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1),
                                 Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
    lon2 = (lon2+3*Math.PI) % (2*Math.PI) - Math.PI;  // normalise to -180..+180º

    return {
      'type': 'Point',
      'coordinates': [gju.numberToDegree(lon2), gju.numberToDegree(lat2)]
    };
  };

})();

},{}],4:[function(require,module,exports){
var getCurrentLocation = function (success, error) {
  var geolocator = window.navigator.geolocation
  var options = {
    enableHighAccuracy: true,
    maximumAge: 5000
  }

  if (geolocator) {
    geolocator.getCurrentPosition(success, error, options)
  } else {
    console.log('Browser does not support geolocation')
  }
}

module.exports = getCurrentLocation

},{}],5:[function(require,module,exports){
var GOOGLE_MAPS_URL = 'http://maps.googleapis.com/maps/api/geocode/json'

// Google Maps Geocoding API documentation
// https://developers.google.com/maps/documentation/geocoding/

var geocode = function (address, bias, callback) {
  var params = {
    address: address,
    bounds: bias,
    sensor: false
  }

  var url = GOOGLE_MAPS_URL + '?' + $.param(params)

  $.ajax(url, { success: callback })
}

module.exports = geocode

},{}],6:[function(require,module,exports){
var config = require('../config')
var MAP_ATTRIBUTION = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
var TILE_LAYER_URL = 'http://tile.stamen.com/toner/{z}/{x}/{y}.png'

// Retina tiles
if (window.devicePixelRatio > 1) {
  TILE_LAYER_URL = 'http://tile.stamen.com/toner/{z}/{x}/{y}@2x.png'
}

var REGION_LAYER_STYLE ={
  color: '#f11',
  weight: 5,
  opacity: 0.1
}

var Map = function (json) {
  this.json = json

  this.map = L.map('map', {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    closePopupOnClick: false,
    keyboard: false,
    zoomControl: false
  })

  this.markers = []
}

var markerIcon = L.icon({
  iconUrl: '/img/marker.svg',
  shadowUrl: '/img/marker_shadow.png',

  iconSize:     [36, 43], // size of the icon
  shadowSize:   [100, 50],
  iconAnchor:   [18, 43], // point of the icon which will correspond to marker's location
  shadowAnchor: [40, 44],
  popupAnchor:  [0, -50] // point from which the popup should open relative to the iconAnchor
})

Map.prototype.render = function () {
  L.tileLayer(TILE_LAYER_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 23
  }).addTo(this.map)

  L.geoJson(this.json, {
    style: REGION_LAYER_STYLE
  }).addTo(this.map)

  this.reset()
}

Map.prototype.reset = function () {
  this.removeMarkers()
  this.setLocation(config.latitude, config.longitude, config.initialZoom)
  this.map.closePopup()
  this.map.dragging.disable()
}

Map.prototype.setLocation = function (lat, lng, zoom) {
  this.map.setView([lat, lng], zoom)
  this.map.dragging.enable()
  return true
}

Map.prototype.createMarker = function (lat, lng) {
  var marker = L.marker([lat, lng], {
    icon: markerIcon,
    clickable: false
  }).addTo(this.map)
  this.markers.push(marker)
  return true
}

Map.prototype.createPopup = function (lat, lng, answer, detail) {
  // As of Leaflet 0.6+, autoPan is buggy and unreliable
  // (my guess? because we're overwriting a lot of that popup appearance style)
  var popup = L.popup({
    autoPan: false,
    closeButton: false
  })
  .setLatLng([lat, lng])
  .setContent('<h2>' + answer + '</h2><p>' + detail + '</p><button id="reset-button">Again?</button>')
  .openOn(this.map)
}

Map.prototype.removeMarkers = function () {
  for (var i = 0; i < this.markers.length; i++) {
    this.map.removeLayer(this.markers[i])
  }
  return true
}

module.exports = Map

},{"../config":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9zcmMvYXBwbGljYXRpb24uanMiLCIuLi8uLi9jb25maWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi11dGlscy9nZW9qc29uLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2N1cnJlbnRfbG9jYXRpb24uanMiLCIuLi8uLi9zcmMvZ2VvY29kZS5qcyIsIi4uLy4uL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25jQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2p1ID0gcmVxdWlyZSgnZ2VvanNvbi11dGlscycpXG52YXIgZ2VvY29kZUFkZHJlc3MgPSByZXF1aXJlKCcuL2dlb2NvZGUnKVxudmFyIGdldEN1cnJlbnRMb2NhdGlvbiA9IHJlcXVpcmUoJy4vY3VycmVudF9sb2NhdGlvbicpXG52YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAnKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cbnZhciBqc29uID0ge31cbnZhciBtYXBcbnZhciBsYXRpdHVkZVxudmFyIGxvbmdpdHVkZVxuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNQVAgVkFSSUFCTEVTXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGFwcGxpY2F0aW9uIGFuZCBzZXRzXG4gKiBldmVudCBsaXN0ZW5lcnNcbiAqL1xuXG5mdW5jdGlvbiBwcmVJbml0ICgpIHtcbiAgLy8gRm9yY2UgaW5pdGlhbCBwYWdlIGxvYWQgdG8gaGF2ZSBhIHRyaWdnZXJlZCBvbnBvcHN0YXRlXG4gIGlmIChNb2Rlcm5penIuaGlzdG9yeSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCBudWxsLCBkb2N1bWVudC5VUkwpXG4gIH1cbiAgcm91dGVyKClcblxuICAvLyBSZXF1ZXN0cyBicm93c2VyJ3MgcGVybWlzc2lvbiB0byB1c2VcbiAgLy8gZ2VvbG9jYXRvciB1cG9uIHBhZ2UgbG9hZCwgaWYgbmVjZXNzYXJ5XG4gIGNhY2hlQ3VycmVudExvY2F0aW9uKClcbn1cblxuZnVuY3Rpb24gaW5pdCAoZGF0YSkge1xuICAvKiBnbG9iYWwganNvbiwgbWFwICovXG4gIGpzb24gPSBkYXRhXG4gIG1hcCA9IG5ldyBNYXAoZGF0YSlcblxuICAvLyBTZXR1cCBldmVudCBsaXN0ZW5lcnNcbiAgJCgnI2lucHV0LXRhcmdldCcpLm9uKCdjbGljaycsIG9uR2V0Q3VycmVudExvY2F0aW9uKVxuICAvLyBHbyBhbmQgU3VibWl0IGRvZXMgdGhlIHNhbWUgdGhpbmcsIGRvbid0IHdhbnQgdG8gZXhlY3V0ZSBpdCB0d2ljZVxuICAvLyQoJyNpbnB1dC1nbycpLm9uKCdjbGljaycsIG9uR28pXG4gICQoJyNsb2NhdGlvbi1mb3JtJykub24oJ3N1Ym1pdCcsIG9uU3VibWl0KVxuICAkKCcjYWJvdXQtbGluaycpLm9uKCdjbGljaycsIG9uQ2xpY2tBYm91dExpbmspXG4gICQoJyNhYm91dC1jbG9zZScpLm9uKCdjbGljaycsIG9uQ2xpY2tBYm91dENsb3NlKVxuICAkKCcjZXhhbXBsZS1saW5rJykub24oJ2NsaWNrJywgb25DbGlja0V4YW1wbGVMaW5rKVxuICAkKCcjZGlzbWlzcy1pZS1icm93c2VyJykub24oJ2NsaWNrJywgb25DbGlja0Rpc21pc3NJRU1lc3NhZ2UpXG5cbiAgJCgnI2lucHV0LWxvY2F0aW9uJykuZm9jdXMoKVxuICBtYXAucmVuZGVyKClcblxuICAkKCcjbWFwJykuYWRkQ2xhc3MoJ25vLXBhbm5pbmcnKVxuXG4gIC8vIFByZXNzIGVzY2FwZSB0byByZXNldCB0aGUgdmlld1xuICAkKGRvY3VtZW50KS5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUud2hpY2ggPT0gMjcgJiYgZS5jdHJsS2V5ID09IGZhbHNlICYmIGUubWV0YUtleSA9PSBmYWxzZSkgbG9hZEhvbWVQYWdlKClcbiAgfSlcbn1cblxuZnVuY3Rpb24gb25DbGlja0Rpc21pc3NJRU1lc3NhZ2UgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICQoJy5pZS1icm93c2VyJykuaGlkZSgpXG59XG5cbi8qKlxuICogQ2hlY2tzIHBhZ2Ugcm91dGUgYW5kIGFjdHMgYWNjb3JkaW5nbHlcbiAqL1xuXG5mdW5jdGlvbiByb3V0ZXIgKCkge1xuICB2YXIgcSA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpXG4gIHZhciBwYWdlID0gcS5zcGxpdCgnPScpWzBdXG4gIHZhciB2YWx1ZXMgPSBxLnNwbGl0KCc9JylbMV1cblxuICBzd2l0Y2ggKHBhZ2UpIHtcbiAgICBjYXNlICdhYm91dCc6XG4gICAgICBhYm91dE9wZW5JbnN0YW50YW5lb3VzbHkoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdsYXRsbmcnOlxuICAgICAgdmFyIGxhdCA9IHBhcnNlRmxvYXQodmFsdWVzLnNwbGl0KCcsJylbMF0pXG4gICAgICB2YXIgbG5nID0gcGFyc2VGbG9hdCh2YWx1ZXMuc3BsaXQoJywnKVsxXSlcbiAgICAgIGdvVG9MYXRMbmcobGF0LCBsbmcpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgIC8vIC9xdWVyeT14IHdoZXJlIHggaXMgdGhlIGFkZHJlc3MgdG8gZ2VvY29kZVxuICAgICAgLy8gdGhpcyBpcyB0b3RhbGx5IGJyb2tlbiBiZWNhdXNlIHN3aXRjaCBjYXNlIG1hdGNoaW5nIGlzbid0IGRvbmUgb24gcGFydGlhbCBzdHJpbmdcbiAgICAgIHZhciBmaW5kZ2VvID0gcS5zdWJzdHIocS5pbmRleE9mKCc9JykpXG4gICAgICBpZiAoZmluZGdlbykge1xuICAgICAgICBnZW9jb2RlQnlBZGRyZXNzKGZpbmRnZW8pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc2V0KClcbiAgICAgIGJyZWFrXG4gIH1cbn1cblxuLy8gTGlzdGVuIGZvciBoaXN0b3J5IGNoYW5nZXNcbndpbmRvdy5vbnBvcHN0YXRlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIC8vIFRoaXMgZXZlbnQgd2lsbCBmaXJlIG9uIGluaXRpYWwgcGFnZSBsb2FkIGZvciBTYWZhcmkgYW5kIG9sZCBDaHJvbWVcbiAgLy8gU28gbGFjayBvZiBzdGF0ZSBkb2VzIG5vdCBuZWNlc3NhcmlseSBtZWFuIHJlc2V0LCBkZXBlbmQgb24gcm91dGVyIGhlcmVcbiAgaWYgKCFldmVudC5zdGF0ZSkge1xuICAgIHJvdXRlcigpXG4gICAgcmV0dXJuXG4gIH0gZWxzZSB7XG4gICAgc3dpdGNoIChldmVudC5zdGF0ZS5wYWdlKSB7XG4gICAgICBjYXNlICdhYm91dCc6XG4gICAgICAgIGFib3V0T3BlbigpXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdsYXRsbmcnOlxuICAgICAgICBnb1RvTGF0TG5nKGV2ZW50LnN0YXRlLmxhdGl0dWRlLCBldmVudC5zdGF0ZS5sb25naXR1ZGUpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXNldCgpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRmlsbCBpbiB0aGUgYWRkcmVzcyBpbnB1dCB3aXRoIHRoZSBleGFtcGxlXG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0V4YW1wbGVMaW5rIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIHZhciBhZGRyZXNzID0gJCgnI2V4YW1wbGUtbGluaycpLnRleHQoKVxuICAkKCcjaW5wdXQtbG9jYXRpb24nKS52YWwoYWRkcmVzcylcbn1cblxuZnVuY3Rpb24gc2V0RXhhbXBsZUxpbmsgKCkge1xuICB2YXIgZXhhbXBsZXMgPSBjb25maWcuZXhhbXBsZXMgfHwgW11cbiAgaWYgKGV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGV4YW1wbGVzLmxlbmd0aClcbiAgICAkKCcjZXhhbXBsZS1saW5rJykudGV4dChleGFtcGxlc1tpXSlcbiAgfVxufVxuXG4vKipcbiAqIFJlc2V0cyB0aGUgYXBwbGljYXRpb24gdG8gaXRzIGluaXRpYWwgc3RhdGVcbiAqL1xuXG5mdW5jdGlvbiByZXNldCAoKSB7XG4gIC8vIFNob3cgdGhlIHF1ZXN0aW9uIGJveFxuICAkKCcjcXVlc3Rpb24nKS5zaG93KClcblxuICAkKCcjaW5wdXQtbG9jYXRpb24nKS52YWwoJycpXG4gICQoJyNhbGVydCcpLmhpZGUoKVxuICBhYm91dENsb3NlKClcbiAgcmVzZXRDdXJyZW50TG9jYXRpb25CdXR0b24oKVxuICAkKCcjcXVlc3Rpb24nKS5mYWRlSW4oMTUwKVxuICAkKCcjaW5wdXQtbG9jYXRpb24nKS5mb2N1cygpXG4gICQoJyNtYXAnKS5hZGRDbGFzcygnbm8tcGFubmluZycpXG5cbiAgLy8gTmV3IGV4YW1wbGUgbGluayFcbiAgc2V0RXhhbXBsZUxpbmsoKVxuXG4gIC8vIFJlc2V0IG1hcCBpZiBpbml0aWFsaXplZFxuICBpZiAobWFwKSB7XG4gICAgbWFwLnJlc2V0KClcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2FkSG9tZVBhZ2UgKCkge1xuICByZXNldCgpXG5cbiAgLy8gU2V0IFVSTFxuICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICdob21lJywgJy8nKVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5sb2NhdGlvbiA9ICcvJ1xuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpY2tSZXNldCAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcbiAgbG9hZEhvbWVQYWdlKClcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBhbnN3ZXIgYW5kIGRyb3BzIHRoZSBwaW4gb24gdGhlIG1hcFxuICovXG5cbmZ1bmN0aW9uIHNldEFuc3dlciAoYW5zd2VyKSB7XG4gIC8vIEluY2x1ZGUgYSBtZXNzYWdlIHByb3ZpZGluZyBmdXJ0aGVyIGluZm9ybWF0aW9uLlxuICAvLyBDdXJyZW50bHksIGl0J3MganVzdCBhIHNpbXBsZSByZXN0YXRlbWVudCBvZiB0aGVcbiAgLy8gYW5zd2VyLiAgU2VlIEdpdEh1YiBpc3N1ZSAjNi5cbiAgdmFyIGRldGFpbFxuICBpZiAoYW5zd2VyID09ICdZZXMnKSB7XG4gICAgZGV0YWlsID0gY29uZmlnLnJlc3BvbnNlWWVzXG4gIH0gZWxzZSB7XG4gICAgZGV0YWlsID0gY29uZmlnLnJlc3BvbnNlTm9cbiAgfVxuXG4gICQoJyNxdWVzdGlvbicpLmZhZGVPdXQoMjUwLCBmdW5jdGlvbiAoKSB7XG4gICAgbWFwLmNyZWF0ZU1hcmtlcihsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICAgIG1hcC5jcmVhdGVQb3B1cChsYXRpdHVkZSwgbG9uZ2l0dWRlLCBhbnN3ZXIsIGRldGFpbClcbiAgICBtYXAuc2V0TG9jYXRpb24obGF0aXR1ZGUsIGxvbmdpdHVkZSwgY29uZmlnLmZpbmFsWm9vbSlcblxuICAgICQoJyNtYXAnKS5yZW1vdmVDbGFzcygnbm8tcGFubmluZycpXG5cbiAgICAvLyBMZWFmbGV0IHN0b3BzIGV2ZW50IHByb3BhZ2F0aW9uIGluIG1hcCBlbGVtZW50cywgc28gdGhpcyBldmVudFxuICAgIC8vIG5lZWRzIHRvIGJlIGJvdW5kIHRvIGFub3RoZXIgb25lIG9mIHRoZSBpbm5lciB3cmFwcGVycyBhZnRlciBpdFxuICAgIC8vIGlzIGNyZWF0ZWRcbiAgICAkKCcjcmVzZXQtYnV0dG9uJykub24oJ2NsaWNrJywgb25DbGlja1Jlc2V0KVxuICB9KVxufVxuXG4vKipcbiAqIENoZWNrcyB0byBzZWUgd2hldGhlciBhIGxhdGl0dWRlIGFuZCBsb25naXR1ZGVcbiAqIGZhbGwgd2l0aGluIHRoZSBsaW1pdHMgcHJvdmlkZWQgaW4gcmVnaW9uLmpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBbbGF0aXR1ZGVdIHRoZSBsYXRpdHVkZVxuICogQHBhcmFtIHtTdHJpbmd9IFtsb25naXR1ZGVdIHRoZSBsb25naXR1ZGVcbiAqL1xuXG5mdW5jdGlvbiBjaGVja1dpdGhpbkxpbWl0cyAobGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICB2YXIgcG9pbnQgPSB7XG4gICAgdHlwZTogJ1BvaW50JyxcbiAgICBjb29yZGluYXRlczogWyBsb25naXR1ZGUsIGxhdGl0dWRlIF1cbiAgfVxuICB2YXIgcG9seWdvbiA9IGpzb24uZmVhdHVyZXNbMF0uZ2VvbWV0cnlcbiAgdmFyIHdpdGhpbkxpbWl0cyA9IGdqdS5wb2ludEluUG9seWdvbihwb2ludCwgcG9seWdvbilcblxuICBpZiAod2l0aGluTGltaXRzKSB7XG4gICAgb25XaXRoaW5MaW1pdHMoKVxuICB9IGVsc2Uge1xuICAgIG9uT3V0c2lkZUxpbWl0cygpXG4gIH1cbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBhbiBhbnN3ZXIgdGhhdCBzcGVjaWZpZXMgdGhhdCB0aGUgbG9jYXRpb25cbiAqIGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25XaXRoaW5MaW1pdHMgKCkge1xuICBzZXRBbnN3ZXIoJ1llcycpXG59XG5cbi8qKlxuICogRGlzcGxheXMgYW4gYW5zd2VyIHRoYXQgc3BlY2lmaWVzIHRoYXQgdGhlIGxvY2F0aW9uXG4gKiBpcyBub3Qgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvbk91dHNpZGVMaW1pdHMgKCkge1xuICBzZXRBbnN3ZXIoJ05vJylcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBjdXJyZW50IGxvY2F0aW9uLCBhbmQgY2hlY2tzIHdoZXRoZXJcbiAqIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25HZXRDdXJyZW50TG9jYXRpb24gKCkge1xuICAkKCcjaW5wdXQtdGFyZ2V0IC5sb2FkaW5nLXRleHQnKS5zaG93KClcbiAgJCgnI2lucHV0LXRhcmdldCAuZGVmYXVsdC10ZXh0JykuaGlkZSgpXG4gIGdlb2NvZGVCeUN1cnJlbnRMb2NhdGlvbigpXG59XG5cbi8qKlxuICogU3VibWl0cyB0aGUgZm9ybSwgZ2VvY29kZXMgdGhlIGFkZHJlc3MsIGFuZCBjaGVja3NcbiAqIHdoZXRoZXIgaXQgaXMgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvbkdvICgpIHtcbiAgc3VibWl0TG9jYXRpb24oKVxufVxuXG4vKipcbiAqIFN1Ym1pdHMgdGhlIGZvcm0sIGdlb2NvZGVzIHRoZSBhZGRyZXNzLCBhbmQgY2hlY2tzXG4gKiB3aGV0aGVyIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25TdWJtaXQgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHN1Ym1pdExvY2F0aW9uKClcbn1cblxuLyoqXG4gKiBTdWJtaXRzIGZvcm1cbiAqL1xuZnVuY3Rpb24gc3VibWl0TG9jYXRpb24gKCkge1xuICB2YXIgJGlucHV0ID0gJCgnI2lucHV0LWxvY2F0aW9uJylcbiAgdmFyIGFkZHJlc3MgPSAkaW5wdXQudmFsKClcbiAgaWYgKGFkZHJlc3MgIT0gJycpIHtcbiAgICBnZW9jb2RlQnlBZGRyZXNzKGFkZHJlc3MpXG5cbiAgICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ3F1ZXJ5JywgJy8/cXVlcnk9JyArIGVuY29kZVVSSUNvbXBvbmVudChhZGRyZXNzKSlcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uID0gJy8/cXVlcnk9JyArIGVuY29kZVVSSUNvbXBvbmVudChhZGRyZXNzKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBkaXNwbGF5QWxlcnQoJ1BsZWFzZSBlbnRlciBhbiBhZGRyZXNzJylcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gZGlzcGxheUFsZXJ0IChtZXNzYWdlKSB7XG4gICQoJyNhbGVydCcpLmh0bWwobWVzc2FnZSkuc2xpZGVEb3duKDEwMClcbn1cblxuLyoqXG4gKiBJbml0aWFsIGN1cnJlbnQgbG9jYXRpb24gY2FjaGVcbiAqL1xuXG5mdW5jdGlvbiBjYWNoZUN1cnJlbnRMb2NhdGlvbiAoKSB7XG4gIHZhciBvblN1Y2Nlc3MgPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcbiAgICAvKiBnbG9iYWwgbGF0aXR1ZGUsIGxvbmdpdHVkZSAqL1xuICAgIGxhdGl0dWRlID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlXG4gICAgbG9uZ2l0dWRlID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuICB9XG5cbiAgLy8gRG8gbm90aGluZyBpZiB3ZSBhcmUgdW5hYmxlIHRvIGRvIGdlb2xvY2F0aW9uXG4gIC8vIE5vIGVycm9yIGNhbGxiYWNrXG5cbiAgZ2V0Q3VycmVudExvY2F0aW9uKG9uU3VjY2Vzcylcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBjdXJyZW50IGxvY2F0aW9uIGFuZCBjaGVja3Mgd2hldGhlciBpdCBpc1xuICogd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBnZW9jb2RlQnlDdXJyZW50TG9jYXRpb24gKCkge1xuICB2YXIgb25TdWNjZXNzID0gZnVuY3Rpb24gKHBvc2l0aW9uKSB7XG4gICAgLyogZ2xvYmFsIGxhdGl0dWRlLCBsb25naXR1ZGUgKi9cbiAgICBsYXRpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZVxuICAgIGxvbmdpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGVcbiAgICBjaGVja1dpdGhpbkxpbWl0cyhsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuXG4gICAgLy8gU2V0IFVSTFxuICAgIHZhciBVUkxTdHJpbmcgPSAnP2xhdGxuZz0nICsgbGF0aXR1ZGUgKyAnLCcgKyBsb25naXR1ZGVcbiAgICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7XG4gICAgICAgIHBhZ2U6ICdsYXRsbmcnLFxuICAgICAgICBsYXRpdHVkZTogbGF0aXR1ZGUsXG4gICAgICAgIGxvbmdpdHVkZTogbG9uZ2l0dWRlXG4gICAgICB9LCAnbGF0bG5nJywgVVJMU3RyaW5nKVxuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24gPSBVUkxTdHJpbmdcbiAgICB9XG4gIH1cblxuICB2YXIgb25FcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICBhbGVydCgnVW5hYmxlIHRvIHJldHJpZXZlIGN1cnJlbnQgcG9zaXRpb24uIEdlb2xvY2F0aW9uIG1heSBiZSBkaXNhYmxlZCBvbiB0aGlzIGJyb3dzZXIgb3IgdW5hdmFpbGFibGUgb24gdGhpcyBzeXN0ZW0uJylcbiAgICByZXNldEN1cnJlbnRMb2NhdGlvbkJ1dHRvbigpXG4gIH1cblxuICBnZXRDdXJyZW50TG9jYXRpb24ob25TdWNjZXNzLCBvbkVycm9yKVxufVxuXG5mdW5jdGlvbiBnb1RvTGF0TG5nIChsYXQsIGxuZykge1xuICAvLyBTZXQgZ2xvYmFsIHZhbHVlcyB0b29cbiAgbGF0aXR1ZGUgPSBsYXRcbiAgbG9uZ2l0dWRlID0gbG5nXG5cbiAgLy8gQ2hlY2tcbiAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSlcbn1cblxuZnVuY3Rpb24gcmVzZXRDdXJyZW50TG9jYXRpb25CdXR0b24gKCkge1xuICAkKCcjaW5wdXQtdGFyZ2V0IC5sb2FkaW5nLXRleHQnKS5oaWRlKClcbiAgJCgnI2lucHV0LXRhcmdldCAuZGVmYXVsdC10ZXh0Jykuc2hvdygpXG59XG5cbi8qKlxuICogR2VvY29kZXMgYW4gYWRkcmVzc1xuICovXG5cbmZ1bmN0aW9uIGdlb2NvZGVCeUFkZHJlc3MgKGFkZHJlc3MpIHtcbiAgZ2VvY29kZUFkZHJlc3MoYWRkcmVzcywgY29uZmlnLnJlZ2lvbkJpYXMsIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAvKiBnbG9iYWwgbGF0aXR1ZGUsIGxvbmdpdHVkZSAqL1xuICAgIGlmIChyZXMgJiYgcmVzLnJlc3VsdHMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHJlcy5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uXG5cbiAgICAgIGxhdGl0dWRlID0gcmVzdWx0LmxhdFxuICAgICAgbG9uZ2l0dWRlID0gcmVzdWx0LmxuZ1xuICAgICAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSlcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gcmVzdWx0cyFcbiAgICAgIGRpc3BsYXlBbGVydCgnTm8gcmVzdWx0cyBmb3IgdGhpcyBhZGRyZXNzIScpXG4gICAgfVxuICB9KVxufVxuXG4vKipcbiAqIE9wZW5zIGFib3V0IHdpbmRvd1xuICovXG5cbmZ1bmN0aW9uIG9uQ2xpY2tBYm91dExpbmsgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgaWYgKE1vZGVybml6ci5oaXN0b3J5KSB7XG4gICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHsgcGFnZTogJ2Fib3V0JyB9LCAnYWJvdXQnLCAnP2Fib3V0JylcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cubG9jYXRpb24gPSAnP2Fib3V0J1xuICB9XG5cbiAgYWJvdXRPcGVuKClcbn1cblxuZnVuY3Rpb24gYWJvdXRPcGVuICgpIHtcbiAgJCgnI2xvY2F0aW9uLWZvcm0nKS5mYWRlT3V0KDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICQoJyNhYm91dCcpLmZhZGVJbigyMDApXG4gIH0pXG59XG5cbi8qKlxuICogT3BlbnMgYWJvdXQgd2luZG93LCB3aXRob3V0IGFuaW1hdGlvblxuICovXG5cbmZ1bmN0aW9uIGFib3V0T3Blbkluc3RhbnRhbmVvdXNseSAoKSB7XG4gIC8vIFNob3cgdGhlIHF1ZXN0aW9uIGJveFxuICAkKCcjcXVlc3Rpb24nKS5zaG93KClcblxuICAkKCcjbG9jYXRpb24tZm9ybScpLmhpZGUoKVxuICAkKCcjYWJvdXQnKS5zaG93KClcbn1cblxuLyoqXG4gKiBDbG9zZXMgYWJvdXQgd2luZG93XG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0Fib3V0Q2xvc2UgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIGxvYWRIb21lUGFnZSgpXG59XG5cbmZ1bmN0aW9uIGFib3V0Q2xvc2UgKCkge1xuICAkKCcjYWJvdXQnKS5mYWRlT3V0KDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICQoJyNsb2NhdGlvbi1mb3JtJykuZmFkZUluKDIwMClcbiAgfSlcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hhdCBuZWVkcyB0byBiZSBkb25lIGJhc2VkIG9uIFVSSVxuICovXG5cbndpbmRvdy5vbmxvYWQgPSBwcmVJbml0XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSByZWdpb24uanNvbiBmaWxlIGFuZCBpbml0aWFsaXplc1xuICogdGhlIGFwcGxpY2F0aW9uXG4gKi9cblxualF1ZXJ5KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICQuZ2V0SlNPTihjb25maWcuZmlsZU5hbWUsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaW5pdChkYXRhKVxuICB9KVxufSlcbiIsInZhciBjb25maWcgPSB7XG4gIG5hbWU6ICdMYXMgVmVnYXMnLFxuICBsYXRpdHVkZTogMzYuMTgsXG4gIGxvbmdpdHVkZTogLTExNS4xOCxcbiAgcmVnaW9uQmlhczogJzM1Ljc3MzI1OCwtMTE1LjY0MjA5MHwzNi40Njk4OTAsLTExNC42MzY4NDAnLFxuICBpbml0aWFsWm9vbTogMTMsXG4gIGZpbmFsWm9vbTogMTQsXG4gIGZpbGVOYW1lOiAnL2RhdGEvcmVnaW9uLmdlb2pzb24nLFxuICB0YWdsaW5lOiAnQmVjYXVzZSB0aGUgY2l0eSBib3VuZGFyaWVzIGFyZSBhIGxvdCB3ZWlyZGVyIHRoYW4geW91IHRoaW5rLicsXG4gIGFib3V0OiAnTGFzIFZlZ2FzIGlzIG9uZSBvZiB0aGUgbW9zdCB2aXNpdGVkIGNpdGllcyBpbiB0aGUgd29ybGQsIGFuZCB5ZXQgaXRzIG1vc3QgZmFtb3VzIGRlc3RpbmF0aW9uICZtZGFzaDsgYSA2LjhrbSBib3VsZXZhcmQgb2YgZXh0cmF2YWdhbnRseSB0aGVtZWQgY2FzaW5vcyBjb21tb25seSBrbm93biBhcyDigJhUaGUgU3RyaXDigJkgJm1kYXNoOyBpcyBhY3R1YWxseSBsb2NhdGVkIG91dHNpZGUgb2YgTGFzIFZlZ2FzIGNpdHkgbGltaXRzLiAgVG8gYWRkIHRvIHRoZSBjb25mdXNpb24sIHRoZSBjaXR54oCZcyB0cnVlIGJvcmRlcnMgYXJlIG9mdGVuIGphZ2dlZCBhbmQgZnVsbCBvZiBzbWFsbCBob2xlcy4gIEFjY29yZGluZyB0byB0aGUgVS5TLiBQb3N0YWwgU2VydmljZSwgbG9jYWwgcmVzaWRlbnRzIG1heSBzdGlsbCBjbGFpbSBhIExhcyBWZWdhcyBhZGRyZXNzLCBldmVuIGlmIHRoZXkgYXJlIHVuZGVyIHRoZSBqdXJpc2RpY3Rpb24gb2Ygb25lIG9mIHRoZSBzdXJyb3VuZGluZyB1bmluY29ycG9yYXRlZCBjb21tdW5pdGllcyB0aHJvdWdob3V0IENsYXJrIENvdW50eS4gIEFzIGEgcmVzdWx0LCB0aGUgQ2l0eSBvZiBMYXMgVmVnYXMgcmVxdWlyZXMgcmVzaWRlbnRzIHZlcmlmeSB0aGF0IHRoZXkgcmVzaWRlIHdpdGhpbiBjaXR5IGxpbWl0cyB0byByZWNlaXZlIGNpdHkgc2VydmljZXMuJyxcbiAgcmVzcG9uc2VZZXM6ICdZb3UgYXJlIHdpdGhpbiBjaXR5IGxpbWl0cyEnLFxuICByZXNwb25zZU5vOiAnWW91IGFyZSBub3QgaW4gTGFzIFZlZ2FzIScsXG4gIGV4YW1wbGVzOiBbXG4gICAgJzEzMTkgU2hhZG93IE1vdW50YWluIFBsYWNlJyxcbiAgICAnMzQ5NyBIb2xseSBBdmUnLFxuICAgICc5NTMgRWFzdCBTYWhhcmEgQXZlbnVlJyxcbiAgICAnMzQ5MCBOIFRvcnJleSBQaW5lcyBEcml2ZScsXG4gICAgJzg3ODcgVyBXYXNoYnVybiBEcml2ZScsXG4gICAgJzMzNTUgU291dGggTGFzIFZlZ2FzIEJvdWxldmFyZCcsXG4gICAgJzY5NjcgVyBUcm9waWNhbCBQYXJrd2F5J1xuICBdXG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnXG4iLCIoZnVuY3Rpb24gKCkge1xuICB2YXIgZ2p1ID0gdGhpcy5nanUgPSB7fTtcblxuICAvLyBFeHBvcnQgdGhlIGdlb2pzb24gb2JqZWN0IGZvciAqKkNvbW1vbkpTKipcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnanU7XG4gIH1cblxuICAvLyBhZGFwdGVkIGZyb20gaHR0cDovL3d3dy5rZXZsaW5kZXYuY29tL2d1aS9tYXRoL2ludGVyc2VjdGlvbi9JbnRlcnNlY3Rpb24uanNcbiAgZ2p1LmxpbmVTdHJpbmdzSW50ZXJzZWN0ID0gZnVuY3Rpb24gKGwxLCBsMikge1xuICAgIHZhciBpbnRlcnNlY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbDEuY29vcmRpbmF0ZXMubGVuZ3RoIC0gMjsgKytpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8PSBsMi5jb29yZGluYXRlcy5sZW5ndGggLSAyOyArK2opIHtcbiAgICAgICAgdmFyIGExID0ge1xuICAgICAgICAgIHg6IGwxLmNvb3JkaW5hdGVzW2ldWzFdLFxuICAgICAgICAgIHk6IGwxLmNvb3JkaW5hdGVzW2ldWzBdXG4gICAgICAgIH0sXG4gICAgICAgICAgYTIgPSB7XG4gICAgICAgICAgICB4OiBsMS5jb29yZGluYXRlc1tpICsgMV1bMV0sXG4gICAgICAgICAgICB5OiBsMS5jb29yZGluYXRlc1tpICsgMV1bMF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGIxID0ge1xuICAgICAgICAgICAgeDogbDIuY29vcmRpbmF0ZXNbal1bMV0sXG4gICAgICAgICAgICB5OiBsMi5jb29yZGluYXRlc1tqXVswXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYjIgPSB7XG4gICAgICAgICAgICB4OiBsMi5jb29yZGluYXRlc1tqICsgMV1bMV0sXG4gICAgICAgICAgICB5OiBsMi5jb29yZGluYXRlc1tqICsgMV1bMF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHVhX3QgPSAoYjIueCAtIGIxLngpICogKGExLnkgLSBiMS55KSAtIChiMi55IC0gYjEueSkgKiAoYTEueCAtIGIxLngpLFxuICAgICAgICAgIHViX3QgPSAoYTIueCAtIGExLngpICogKGExLnkgLSBiMS55KSAtIChhMi55IC0gYTEueSkgKiAoYTEueCAtIGIxLngpLFxuICAgICAgICAgIHVfYiA9IChiMi55IC0gYjEueSkgKiAoYTIueCAtIGExLngpIC0gKGIyLnggLSBiMS54KSAqIChhMi55IC0gYTEueSk7XG4gICAgICAgIGlmICh1X2IgIT0gMCkge1xuICAgICAgICAgIHZhciB1YSA9IHVhX3QgLyB1X2IsXG4gICAgICAgICAgICB1YiA9IHViX3QgLyB1X2I7XG4gICAgICAgICAgaWYgKDAgPD0gdWEgJiYgdWEgPD0gMSAmJiAwIDw9IHViICYmIHViIDw9IDEpIHtcbiAgICAgICAgICAgIGludGVyc2VjdHMucHVzaCh7XG4gICAgICAgICAgICAgICd0eXBlJzogJ1BvaW50JyxcbiAgICAgICAgICAgICAgJ2Nvb3JkaW5hdGVzJzogW2ExLnggKyB1YSAqIChhMi54IC0gYTEueCksIGExLnkgKyB1YSAqIChhMi55IC0gYTEueSldXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGludGVyc2VjdHMubGVuZ3RoID09IDApIGludGVyc2VjdHMgPSBmYWxzZTtcbiAgICByZXR1cm4gaW50ZXJzZWN0cztcbiAgfVxuXG4gIC8vIEJvdW5kaW5nIEJveFxuXG4gIGZ1bmN0aW9uIGJvdW5kaW5nQm94QXJvdW5kUG9seUNvb3JkcyAoY29vcmRzKSB7XG4gICAgdmFyIHhBbGwgPSBbXSwgeUFsbCA9IFtdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkc1swXS5sZW5ndGg7IGkrKykge1xuICAgICAgeEFsbC5wdXNoKGNvb3Jkc1swXVtpXVsxXSlcbiAgICAgIHlBbGwucHVzaChjb29yZHNbMF1baV1bMF0pXG4gICAgfVxuXG4gICAgeEFsbCA9IHhBbGwuc29ydChmdW5jdGlvbiAoYSxiKSB7IHJldHVybiBhIC0gYiB9KVxuICAgIHlBbGwgPSB5QWxsLnNvcnQoZnVuY3Rpb24gKGEsYikgeyByZXR1cm4gYSAtIGIgfSlcblxuICAgIHJldHVybiBbIFt4QWxsWzBdLCB5QWxsWzBdXSwgW3hBbGxbeEFsbC5sZW5ndGggLSAxXSwgeUFsbFt5QWxsLmxlbmd0aCAtIDFdXSBdXG4gIH1cblxuICBnanUucG9pbnRJbkJvdW5kaW5nQm94ID0gZnVuY3Rpb24gKHBvaW50LCBib3VuZHMpIHtcbiAgICByZXR1cm4gIShwb2ludC5jb29yZGluYXRlc1sxXSA8IGJvdW5kc1swXVswXSB8fCBwb2ludC5jb29yZGluYXRlc1sxXSA+IGJvdW5kc1sxXVswXSB8fCBwb2ludC5jb29yZGluYXRlc1swXSA8IGJvdW5kc1swXVsxXSB8fCBwb2ludC5jb29yZGluYXRlc1swXSA+IGJvdW5kc1sxXVsxXSkgXG4gIH1cblxuICAvLyBQb2ludCBpbiBQb2x5Z29uXG4gIC8vIGh0dHA6Ly93d3cuZWNzZS5ycGkuZWR1L0hvbWVwYWdlcy93cmYvUmVzZWFyY2gvU2hvcnRfTm90ZXMvcG5wb2x5Lmh0bWwjTGlzdGluZyB0aGUgVmVydGljZXNcblxuICBmdW5jdGlvbiBwbnBvbHkgKHgseSxjb29yZHMpIHtcbiAgICB2YXIgdmVydCA9IFsgWzAsMF0gXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY29vcmRzW2ldLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZlcnQucHVzaChjb29yZHNbaV1bal0pXG4gICAgICB9XG5cdCAgdmVydC5wdXNoKGNvb3Jkc1tpXVswXSlcbiAgICAgIHZlcnQucHVzaChbMCwwXSlcbiAgICB9XG5cbiAgICB2YXIgaW5zaWRlID0gZmFsc2VcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IHZlcnQubGVuZ3RoIC0gMTsgaSA8IHZlcnQubGVuZ3RoOyBqID0gaSsrKSB7XG4gICAgICBpZiAoKCh2ZXJ0W2ldWzBdID4geSkgIT0gKHZlcnRbal1bMF0gPiB5KSkgJiYgKHggPCAodmVydFtqXVsxXSAtIHZlcnRbaV1bMV0pICogKHkgLSB2ZXJ0W2ldWzBdKSAvICh2ZXJ0W2pdWzBdIC0gdmVydFtpXVswXSkgKyB2ZXJ0W2ldWzFdKSkgaW5zaWRlID0gIWluc2lkZVxuICAgIH1cblxuICAgIHJldHVybiBpbnNpZGVcbiAgfVxuXG4gIGdqdS5wb2ludEluUG9seWdvbiA9IGZ1bmN0aW9uIChwLCBwb2x5KSB7XG4gICAgdmFyIGNvb3JkcyA9IChwb2x5LnR5cGUgPT0gXCJQb2x5Z29uXCIpID8gWyBwb2x5LmNvb3JkaW5hdGVzIF0gOiBwb2x5LmNvb3JkaW5hdGVzXG5cbiAgICB2YXIgaW5zaWRlQm94ID0gZmFsc2VcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGdqdS5wb2ludEluQm91bmRpbmdCb3gocCwgYm91bmRpbmdCb3hBcm91bmRQb2x5Q29vcmRzKGNvb3Jkc1tpXSkpKSBpbnNpZGVCb3ggPSB0cnVlXG4gICAgfVxuICAgIGlmICghaW5zaWRlQm94KSByZXR1cm4gZmFsc2VcblxuICAgIHZhciBpbnNpZGVQb2x5ID0gZmFsc2VcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHBucG9seShwLmNvb3JkaW5hdGVzWzFdLCBwLmNvb3JkaW5hdGVzWzBdLCBjb29yZHNbaV0pKSBpbnNpZGVQb2x5ID0gdHJ1ZVxuICAgIH1cblxuICAgIHJldHVybiBpbnNpZGVQb2x5XG4gIH1cblxuICAvLyBzdXBwb3J0IG11bHRpIChidXQgbm90IGRvbnV0KSBwb2x5Z29uc1xuICBnanUucG9pbnRJbk11bHRpUG9seWdvbiA9IGZ1bmN0aW9uIChwLCBwb2x5KSB7XG4gICAgdmFyIGNvb3Jkc19hcnJheSA9IChwb2x5LnR5cGUgPT0gXCJNdWx0aVBvbHlnb25cIikgPyBbIHBvbHkuY29vcmRpbmF0ZXMgXSA6IHBvbHkuY29vcmRpbmF0ZXNcblxuICAgIHZhciBpbnNpZGVCb3ggPSBmYWxzZVxuICAgIHZhciBpbnNpZGVQb2x5ID0gZmFsc2VcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkc19hcnJheS5sZW5ndGg7IGkrKyl7XG4gICAgICB2YXIgY29vcmRzID0gY29vcmRzX2FycmF5W2ldO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjb29yZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCFpbnNpZGVCb3gpe1xuICAgICAgICAgIGlmIChnanUucG9pbnRJbkJvdW5kaW5nQm94KHAsIGJvdW5kaW5nQm94QXJvdW5kUG9seUNvb3Jkcyhjb29yZHNbal0pKSkge1xuICAgICAgICAgICAgaW5zaWRlQm94ID0gdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFpbnNpZGVCb3gpIHJldHVybiBmYWxzZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjb29yZHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKCFpbnNpZGVQb2x5KXtcbiAgICAgICAgICBpZiAocG5wb2x5KHAuY29vcmRpbmF0ZXNbMV0sIHAuY29vcmRpbmF0ZXNbMF0sIGNvb3Jkc1tqXSkpIHtcbiAgICAgICAgICAgIGluc2lkZVBvbHkgPSB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVBvbHlcbiAgfVxuXG4gIGdqdS5udW1iZXJUb1JhZGl1cyA9IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICByZXR1cm4gbnVtYmVyICogTWF0aC5QSSAvIDE4MDtcbiAgfVxuXG4gIGdqdS5udW1iZXJUb0RlZ3JlZSA9IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICByZXR1cm4gbnVtYmVyICogMTgwIC8gTWF0aC5QSTtcbiAgfVxuXG4gIC8vIHdyaXR0ZW4gd2l0aCBoZWxwIGZyb20gQHRhdXRvbG9nZVxuICBnanUuZHJhd0NpcmNsZSA9IGZ1bmN0aW9uIChyYWRpdXNJbk1ldGVycywgY2VudGVyUG9pbnQsIHN0ZXBzKSB7XG4gICAgdmFyIGNlbnRlciA9IFtjZW50ZXJQb2ludC5jb29yZGluYXRlc1sxXSwgY2VudGVyUG9pbnQuY29vcmRpbmF0ZXNbMF1dLFxuICAgICAgZGlzdCA9IChyYWRpdXNJbk1ldGVycyAvIDEwMDApIC8gNjM3MSxcbiAgICAgIC8vIGNvbnZlcnQgbWV0ZXJzIHRvIHJhZGlhbnRcbiAgICAgIHJhZENlbnRlciA9IFtnanUubnVtYmVyVG9SYWRpdXMoY2VudGVyWzBdKSwgZ2p1Lm51bWJlclRvUmFkaXVzKGNlbnRlclsxXSldLFxuICAgICAgc3RlcHMgPSBzdGVwcyB8fCAxNSxcbiAgICAgIC8vIDE1IHNpZGVkIGNpcmNsZVxuICAgICAgcG9seSA9IFtbY2VudGVyWzBdLCBjZW50ZXJbMV1dXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ZXBzOyBpKyspIHtcbiAgICAgIHZhciBicm5nID0gMiAqIE1hdGguUEkgKiBpIC8gc3RlcHM7XG4gICAgICB2YXIgbGF0ID0gTWF0aC5hc2luKE1hdGguc2luKHJhZENlbnRlclswXSkgKiBNYXRoLmNvcyhkaXN0KVxuICAgICAgICAgICAgICArIE1hdGguY29zKHJhZENlbnRlclswXSkgKiBNYXRoLnNpbihkaXN0KSAqIE1hdGguY29zKGJybmcpKTtcbiAgICAgIHZhciBsbmcgPSByYWRDZW50ZXJbMV0gKyBNYXRoLmF0YW4yKE1hdGguc2luKGJybmcpICogTWF0aC5zaW4oZGlzdCkgKiBNYXRoLmNvcyhyYWRDZW50ZXJbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jb3MoZGlzdCkgLSBNYXRoLnNpbihyYWRDZW50ZXJbMF0pICogTWF0aC5zaW4obGF0KSk7XG4gICAgICBwb2x5W2ldID0gW107XG4gICAgICBwb2x5W2ldWzFdID0gZ2p1Lm51bWJlclRvRGVncmVlKGxhdCk7XG4gICAgICBwb2x5W2ldWzBdID0gZ2p1Lm51bWJlclRvRGVncmVlKGxuZyk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBcInR5cGVcIjogXCJQb2x5Z29uXCIsXG4gICAgICBcImNvb3JkaW5hdGVzXCI6IFtwb2x5XVxuICAgIH07XG4gIH1cblxuICAvLyBhc3N1bWVzIHJlY3RhbmdsZSBzdGFydHMgYXQgbG93ZXIgbGVmdCBwb2ludFxuICBnanUucmVjdGFuZ2xlQ2VudHJvaWQgPSBmdW5jdGlvbiAocmVjdGFuZ2xlKSB7XG4gICAgdmFyIGJib3ggPSByZWN0YW5nbGUuY29vcmRpbmF0ZXNbMF07XG4gICAgdmFyIHhtaW4gPSBiYm94WzBdWzBdLFxuICAgICAgeW1pbiA9IGJib3hbMF1bMV0sXG4gICAgICB4bWF4ID0gYmJveFsyXVswXSxcbiAgICAgIHltYXggPSBiYm94WzJdWzFdO1xuICAgIHZhciB4d2lkdGggPSB4bWF4IC0geG1pbjtcbiAgICB2YXIgeXdpZHRoID0geW1heCAtIHltaW47XG4gICAgcmV0dXJuIHtcbiAgICAgICd0eXBlJzogJ1BvaW50JyxcbiAgICAgICdjb29yZGluYXRlcyc6IFt4bWluICsgeHdpZHRoIC8gMiwgeW1pbiArIHl3aWR0aCAvIDJdXG4gICAgfTtcbiAgfVxuXG4gIC8vIGZyb20gaHR0cDovL3d3dy5tb3ZhYmxlLXR5cGUuY28udWsvc2NyaXB0cy9sYXRsb25nLmh0bWxcbiAgZ2p1LnBvaW50RGlzdGFuY2UgPSBmdW5jdGlvbiAocHQxLCBwdDIpIHtcbiAgICB2YXIgbG9uMSA9IHB0MS5jb29yZGluYXRlc1swXSxcbiAgICAgIGxhdDEgPSBwdDEuY29vcmRpbmF0ZXNbMV0sXG4gICAgICBsb24yID0gcHQyLmNvb3JkaW5hdGVzWzBdLFxuICAgICAgbGF0MiA9IHB0Mi5jb29yZGluYXRlc1sxXSxcbiAgICAgIGRMYXQgPSBnanUubnVtYmVyVG9SYWRpdXMobGF0MiAtIGxhdDEpLFxuICAgICAgZExvbiA9IGdqdS5udW1iZXJUb1JhZGl1cyhsb24yIC0gbG9uMSksXG4gICAgICBhID0gTWF0aC5wb3coTWF0aC5zaW4oZExhdCAvIDIpLCAyKSArIE1hdGguY29zKGdqdS5udW1iZXJUb1JhZGl1cyhsYXQxKSlcbiAgICAgICAgKiBNYXRoLmNvcyhnanUubnVtYmVyVG9SYWRpdXMobGF0MikpICogTWF0aC5wb3coTWF0aC5zaW4oZExvbiAvIDIpLCAyKSxcbiAgICAgIGMgPSAyICogTWF0aC5hdGFuMihNYXRoLnNxcnQoYSksIE1hdGguc3FydCgxIC0gYSkpO1xuICAgIHJldHVybiAoNjM3MSAqIGMpICogMTAwMDsgLy8gcmV0dXJucyBtZXRlcnNcbiAgfSxcblxuICAvLyBjaGVja3MgaWYgZ2VvbWV0cnkgbGllcyBlbnRpcmVseSB3aXRoaW4gYSBjaXJjbGVcbiAgLy8gd29ya3Mgd2l0aCBQb2ludCwgTGluZVN0cmluZywgUG9seWdvblxuICBnanUuZ2VvbWV0cnlXaXRoaW5SYWRpdXMgPSBmdW5jdGlvbiAoZ2VvbWV0cnksIGNlbnRlciwgcmFkaXVzKSB7XG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ1BvaW50Jykge1xuICAgICAgcmV0dXJuIGdqdS5wb2ludERpc3RhbmNlKGdlb21ldHJ5LCBjZW50ZXIpIDw9IHJhZGl1cztcbiAgICB9IGVsc2UgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ0xpbmVTdHJpbmcnIHx8IGdlb21ldHJ5LnR5cGUgPT0gJ1BvbHlnb24nKSB7XG4gICAgICB2YXIgcG9pbnQgPSB7fTtcbiAgICAgIHZhciBjb29yZGluYXRlcztcbiAgICAgIGlmIChnZW9tZXRyeS50eXBlID09ICdQb2x5Z29uJykge1xuICAgICAgICAvLyBpdCdzIGVub3VnaCB0byBjaGVjayB0aGUgZXh0ZXJpb3IgcmluZyBvZiB0aGUgUG9seWdvblxuICAgICAgICBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGkgaW4gY29vcmRpbmF0ZXMpIHtcbiAgICAgICAgcG9pbnQuY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlc1tpXTtcbiAgICAgICAgaWYgKGdqdS5wb2ludERpc3RhbmNlKHBvaW50LCBjZW50ZXIpID4gcmFkaXVzKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9wYXVsYm91cmtlLm5ldC9nZW9tZXRyeS9wb2x5YXJlYS9qYXZhc2NyaXB0LnR4dFxuICBnanUuYXJlYSA9IGZ1bmN0aW9uIChwb2x5Z29uKSB7XG4gICAgdmFyIGFyZWEgPSAwO1xuICAgIC8vIFRPRE86IHBvbHlnb24gaG9sZXMgYXQgY29vcmRpbmF0ZXNbMV1cbiAgICB2YXIgcG9pbnRzID0gcG9seWdvbi5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgaiA9IHBvaW50cy5sZW5ndGggLSAxO1xuICAgIHZhciBwMSwgcDI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIHZhciBwMSA9IHtcbiAgICAgICAgeDogcG9pbnRzW2ldWzFdLFxuICAgICAgICB5OiBwb2ludHNbaV1bMF1cbiAgICAgIH07XG4gICAgICB2YXIgcDIgPSB7XG4gICAgICAgIHg6IHBvaW50c1tqXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2pdWzBdXG4gICAgICB9O1xuICAgICAgYXJlYSArPSBwMS54ICogcDIueTtcbiAgICAgIGFyZWEgLT0gcDEueSAqIHAyLng7XG4gICAgfVxuXG4gICAgYXJlYSAvPSAyO1xuICAgIHJldHVybiBhcmVhO1xuICB9LFxuXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZ2VvbWV0cnkvcG9seWFyZWEvamF2YXNjcmlwdC50eHRcbiAgZ2p1LmNlbnRyb2lkID0gZnVuY3Rpb24gKHBvbHlnb24pIHtcbiAgICB2YXIgZiwgeCA9IDAsXG4gICAgICB5ID0gMDtcbiAgICAvLyBUT0RPOiBwb2x5Z29uIGhvbGVzIGF0IGNvb3JkaW5hdGVzWzFdXG4gICAgdmFyIHBvaW50cyA9IHBvbHlnb24uY29vcmRpbmF0ZXNbMF07XG4gICAgdmFyIGogPSBwb2ludHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgcDEsIHAyO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBqID0gaSsrKSB7XG4gICAgICB2YXIgcDEgPSB7XG4gICAgICAgIHg6IHBvaW50c1tpXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2ldWzBdXG4gICAgICB9O1xuICAgICAgdmFyIHAyID0ge1xuICAgICAgICB4OiBwb2ludHNbal1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tqXVswXVxuICAgICAgfTtcbiAgICAgIGYgPSBwMS54ICogcDIueSAtIHAyLnggKiBwMS55O1xuICAgICAgeCArPSAocDEueCArIHAyLngpICogZjtcbiAgICAgIHkgKz0gKHAxLnkgKyBwMi55KSAqIGY7XG4gICAgfVxuXG4gICAgZiA9IGdqdS5hcmVhKHBvbHlnb24pICogNjtcbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW3kgLyBmLCB4IC8gZl1cbiAgICB9O1xuICB9LFxuXG4gIGdqdS5zaW1wbGlmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGtpbmspIHsgLyogc291cmNlW10gYXJyYXkgb2YgZ2VvanNvbiBwb2ludHMgKi9cbiAgICAvKiBraW5rXHRpbiBtZXRyZXMsIGtpbmtzIGFib3ZlIHRoaXMgZGVwdGgga2VwdCAgKi9cbiAgICAvKiBraW5rIGRlcHRoIGlzIHRoZSBoZWlnaHQgb2YgdGhlIHRyaWFuZ2xlIGFiYyB3aGVyZSBhLWIgYW5kIGItYyBhcmUgdHdvIGNvbnNlY3V0aXZlIGxpbmUgc2VnbWVudHMgKi9cbiAgICBraW5rID0ga2luayB8fCAyMDtcbiAgICBzb3VyY2UgPSBzb3VyY2UubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsbmc6IG8uY29vcmRpbmF0ZXNbMF0sXG4gICAgICAgIGxhdDogby5jb29yZGluYXRlc1sxXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5fc291cmNlLCBuX3N0YWNrLCBuX2Rlc3QsIHN0YXJ0LCBlbmQsIGksIHNpZztcbiAgICB2YXIgZGV2X3NxciwgbWF4X2Rldl9zcXIsIGJhbmRfc3FyO1xuICAgIHZhciB4MTIsIHkxMiwgZDEyLCB4MTMsIHkxMywgZDEzLCB4MjMsIHkyMywgZDIzO1xuICAgIHZhciBGID0gKE1hdGguUEkgLyAxODAuMCkgKiAwLjU7XG4gICAgdmFyIGluZGV4ID0gbmV3IEFycmF5KCk7IC8qIGFyYXkgb2YgaW5kZXhlcyBvZiBzb3VyY2UgcG9pbnRzIHRvIGluY2x1ZGUgaW4gdGhlIHJlZHVjZWQgbGluZSAqL1xuICAgIHZhciBzaWdfc3RhcnQgPSBuZXcgQXJyYXkoKTsgLyogaW5kaWNlcyBvZiBzdGFydCAmIGVuZCBvZiB3b3JraW5nIHNlY3Rpb24gKi9cbiAgICB2YXIgc2lnX2VuZCA9IG5ldyBBcnJheSgpO1xuXG4gICAgLyogY2hlY2sgZm9yIHNpbXBsZSBjYXNlcyAqL1xuXG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAzKSByZXR1cm4gKHNvdXJjZSk7IC8qIG9uZSBvciB0d28gcG9pbnRzICovXG5cbiAgICAvKiBtb3JlIGNvbXBsZXggY2FzZS4gaW5pdGlhbGl6ZSBzdGFjayAqL1xuXG4gICAgbl9zb3VyY2UgPSBzb3VyY2UubGVuZ3RoO1xuICAgIGJhbmRfc3FyID0ga2luayAqIDM2MC4wIC8gKDIuMCAqIE1hdGguUEkgKiA2Mzc4MTM3LjApOyAvKiBOb3cgaW4gZGVncmVlcyAqL1xuICAgIGJhbmRfc3FyICo9IGJhbmRfc3FyO1xuICAgIG5fZGVzdCA9IDA7XG4gICAgc2lnX3N0YXJ0WzBdID0gMDtcbiAgICBzaWdfZW5kWzBdID0gbl9zb3VyY2UgLSAxO1xuICAgIG5fc3RhY2sgPSAxO1xuXG4gICAgLyogd2hpbGUgdGhlIHN0YWNrIGlzIG5vdCBlbXB0eSAgLi4uICovXG4gICAgd2hpbGUgKG5fc3RhY2sgPiAwKSB7XG5cbiAgICAgIC8qIC4uLiBwb3AgdGhlIHRvcC1tb3N0IGVudHJpZXMgb2ZmIHRoZSBzdGFja3MgKi9cblxuICAgICAgc3RhcnQgPSBzaWdfc3RhcnRbbl9zdGFjayAtIDFdO1xuICAgICAgZW5kID0gc2lnX2VuZFtuX3N0YWNrIC0gMV07XG4gICAgICBuX3N0YWNrLS07XG5cbiAgICAgIGlmICgoZW5kIC0gc3RhcnQpID4gMSkgeyAvKiBhbnkgaW50ZXJtZWRpYXRlIHBvaW50cyA/ICovXG5cbiAgICAgICAgLyogLi4uIHllcywgc28gZmluZCBtb3N0IGRldmlhbnQgaW50ZXJtZWRpYXRlIHBvaW50IHRvXG4gICAgICAgIGVpdGhlciBzaWRlIG9mIGxpbmUgam9pbmluZyBzdGFydCAmIGVuZCBwb2ludHMgKi9cblxuICAgICAgICB4MTIgPSAoc291cmNlW2VuZF0ubG5nKCkgLSBzb3VyY2Vbc3RhcnRdLmxuZygpKTtcbiAgICAgICAgeTEyID0gKHNvdXJjZVtlbmRdLmxhdCgpIC0gc291cmNlW3N0YXJ0XS5sYXQoKSk7XG4gICAgICAgIGlmIChNYXRoLmFicyh4MTIpID4gMTgwLjApIHgxMiA9IDM2MC4wIC0gTWF0aC5hYnMoeDEyKTtcbiAgICAgICAgeDEyICo9IE1hdGguY29zKEYgKiAoc291cmNlW2VuZF0ubGF0KCkgKyBzb3VyY2Vbc3RhcnRdLmxhdCgpKSk7IC8qIHVzZSBhdmcgbGF0IHRvIHJlZHVjZSBsbmcgKi9cbiAgICAgICAgZDEyID0gKHgxMiAqIHgxMikgKyAoeTEyICogeTEyKTtcblxuICAgICAgICBmb3IgKGkgPSBzdGFydCArIDEsIHNpZyA9IHN0YXJ0LCBtYXhfZGV2X3NxciA9IC0xLjA7IGkgPCBlbmQ7IGkrKykge1xuXG4gICAgICAgICAgeDEzID0gc291cmNlW2ldLmxuZygpIC0gc291cmNlW3N0YXJ0XS5sbmcoKTtcbiAgICAgICAgICB5MTMgPSBzb3VyY2VbaV0ubGF0KCkgLSBzb3VyY2Vbc3RhcnRdLmxhdCgpO1xuICAgICAgICAgIGlmIChNYXRoLmFicyh4MTMpID4gMTgwLjApIHgxMyA9IDM2MC4wIC0gTWF0aC5hYnMoeDEzKTtcbiAgICAgICAgICB4MTMgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbaV0ubGF0KCkgKyBzb3VyY2Vbc3RhcnRdLmxhdCgpKSk7XG4gICAgICAgICAgZDEzID0gKHgxMyAqIHgxMykgKyAoeTEzICogeTEzKTtcblxuICAgICAgICAgIHgyMyA9IHNvdXJjZVtpXS5sbmcoKSAtIHNvdXJjZVtlbmRdLmxuZygpO1xuICAgICAgICAgIHkyMyA9IHNvdXJjZVtpXS5sYXQoKSAtIHNvdXJjZVtlbmRdLmxhdCgpO1xuICAgICAgICAgIGlmIChNYXRoLmFicyh4MjMpID4gMTgwLjApIHgyMyA9IDM2MC4wIC0gTWF0aC5hYnMoeDIzKTtcbiAgICAgICAgICB4MjMgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbaV0ubGF0KCkgKyBzb3VyY2VbZW5kXS5sYXQoKSkpO1xuICAgICAgICAgIGQyMyA9ICh4MjMgKiB4MjMpICsgKHkyMyAqIHkyMyk7XG5cbiAgICAgICAgICBpZiAoZDEzID49IChkMTIgKyBkMjMpKSBkZXZfc3FyID0gZDIzO1xuICAgICAgICAgIGVsc2UgaWYgKGQyMyA+PSAoZDEyICsgZDEzKSkgZGV2X3NxciA9IGQxMztcbiAgICAgICAgICBlbHNlIGRldl9zcXIgPSAoeDEzICogeTEyIC0geTEzICogeDEyKSAqICh4MTMgKiB5MTIgLSB5MTMgKiB4MTIpIC8gZDEyOyAvLyBzb2x2ZSB0cmlhbmdsZVxuICAgICAgICAgIGlmIChkZXZfc3FyID4gbWF4X2Rldl9zcXIpIHtcbiAgICAgICAgICAgIHNpZyA9IGk7XG4gICAgICAgICAgICBtYXhfZGV2X3NxciA9IGRldl9zcXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1heF9kZXZfc3FyIDwgYmFuZF9zcXIpIHsgLyogaXMgdGhlcmUgYSBzaWcuIGludGVybWVkaWF0ZSBwb2ludCA/ICovXG4gICAgICAgICAgLyogLi4uIG5vLCBzbyB0cmFuc2ZlciBjdXJyZW50IHN0YXJ0IHBvaW50ICovXG4gICAgICAgICAgaW5kZXhbbl9kZXN0XSA9IHN0YXJ0O1xuICAgICAgICAgIG5fZGVzdCsrO1xuICAgICAgICB9IGVsc2UgeyAvKiAuLi4geWVzLCBzbyBwdXNoIHR3byBzdWItc2VjdGlvbnMgb24gc3RhY2sgZm9yIGZ1cnRoZXIgcHJvY2Vzc2luZyAqL1xuICAgICAgICAgIG5fc3RhY2srKztcbiAgICAgICAgICBzaWdfc3RhcnRbbl9zdGFjayAtIDFdID0gc2lnO1xuICAgICAgICAgIHNpZ19lbmRbbl9zdGFjayAtIDFdID0gZW5kO1xuICAgICAgICAgIG5fc3RhY2srKztcbiAgICAgICAgICBzaWdfc3RhcnRbbl9zdGFjayAtIDFdID0gc3RhcnQ7XG4gICAgICAgICAgc2lnX2VuZFtuX3N0YWNrIC0gMV0gPSBzaWc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7IC8qIC4uLiBubyBpbnRlcm1lZGlhdGUgcG9pbnRzLCBzbyB0cmFuc2ZlciBjdXJyZW50IHN0YXJ0IHBvaW50ICovXG4gICAgICAgIGluZGV4W25fZGVzdF0gPSBzdGFydDtcbiAgICAgICAgbl9kZXN0Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogdHJhbnNmZXIgbGFzdCBwb2ludCAqL1xuICAgIGluZGV4W25fZGVzdF0gPSBuX3NvdXJjZSAtIDE7XG4gICAgbl9kZXN0Kys7XG5cbiAgICAvKiBtYWtlIHJldHVybiBhcnJheSAqL1xuICAgIHZhciByID0gbmV3IEFycmF5KCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuX2Rlc3Q7IGkrKylcbiAgICAgIHIucHVzaChzb3VyY2VbaW5kZXhbaV1dKTtcblxuICAgIHJldHVybiByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJQb2ludFwiLFxuICAgICAgICBjb29yZGluYXRlczogW28ubG5nLCBvLmxhdF1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIGh0dHA6Ly93d3cubW92YWJsZS10eXBlLmNvLnVrL3NjcmlwdHMvbGF0bG9uZy5odG1sI2Rlc3RQb2ludFxuICBnanUuZGVzdGluYXRpb25Qb2ludCA9IGZ1bmN0aW9uIChwdCwgYnJuZywgZGlzdCkge1xuICAgIGRpc3QgPSBkaXN0LzYzNzE7ICAvLyBjb252ZXJ0IGRpc3QgdG8gYW5ndWxhciBkaXN0YW5jZSBpbiByYWRpYW5zXG4gICAgYnJuZyA9IGdqdS5udW1iZXJUb1JhZGl1cyhicm5nKTtcblxuICAgIHZhciBsb24xID0gZ2p1Lm51bWJlclRvUmFkaXVzKHB0LmNvb3JkaW5hdGVzWzBdKTtcbiAgICB2YXIgbGF0MSA9IGdqdS5udW1iZXJUb1JhZGl1cyhwdC5jb29yZGluYXRlc1sxXSk7XG5cbiAgICB2YXIgbGF0MiA9IE1hdGguYXNpbiggTWF0aC5zaW4obGF0MSkqTWF0aC5jb3MoZGlzdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhsYXQxKSpNYXRoLnNpbihkaXN0KSpNYXRoLmNvcyhicm5nKSApO1xuICAgIHZhciBsb24yID0gbG9uMSArIE1hdGguYXRhbjIoTWF0aC5zaW4oYnJuZykqTWF0aC5zaW4oZGlzdCkqTWF0aC5jb3MobGF0MSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhkaXN0KS1NYXRoLnNpbihsYXQxKSpNYXRoLnNpbihsYXQyKSk7XG4gICAgbG9uMiA9IChsb24yKzMqTWF0aC5QSSkgJSAoMipNYXRoLlBJKSAtIE1hdGguUEk7ICAvLyBub3JtYWxpc2UgdG8gLTE4MC4uKzE4MMK6XG5cbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW2dqdS5udW1iZXJUb0RlZ3JlZShsb24yKSwgZ2p1Lm51bWJlclRvRGVncmVlKGxhdDIpXVxuICAgIH07XG4gIH07XG5cbn0pKCk7XG4iLCJ2YXIgZ2V0Q3VycmVudExvY2F0aW9uID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gIHZhciBnZW9sb2NhdG9yID0gd2luZG93Lm5hdmlnYXRvci5nZW9sb2NhdGlvblxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBlbmFibGVIaWdoQWNjdXJhY3k6IHRydWUsXG4gICAgbWF4aW11bUFnZTogNTAwMFxuICB9XG5cbiAgaWYgKGdlb2xvY2F0b3IpIHtcbiAgICBnZW9sb2NhdG9yLmdldEN1cnJlbnRQb3NpdGlvbihzdWNjZXNzLCBlcnJvciwgb3B0aW9ucylcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZygnQnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGdlb2xvY2F0aW9uJylcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEN1cnJlbnRMb2NhdGlvblxuIiwidmFyIEdPT0dMRV9NQVBTX1VSTCA9ICdodHRwOi8vbWFwcy5nb29nbGVhcGlzLmNvbS9tYXBzL2FwaS9nZW9jb2RlL2pzb24nXG5cbi8vIEdvb2dsZSBNYXBzIEdlb2NvZGluZyBBUEkgZG9jdW1lbnRhdGlvblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vbWFwcy9kb2N1bWVudGF0aW9uL2dlb2NvZGluZy9cblxudmFyIGdlb2NvZGUgPSBmdW5jdGlvbiAoYWRkcmVzcywgYmlhcywgY2FsbGJhY2spIHtcbiAgdmFyIHBhcmFtcyA9IHtcbiAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgIGJvdW5kczogYmlhcyxcbiAgICBzZW5zb3I6IGZhbHNlXG4gIH1cblxuICB2YXIgdXJsID0gR09PR0xFX01BUFNfVVJMICsgJz8nICsgJC5wYXJhbShwYXJhbXMpXG5cbiAgJC5hamF4KHVybCwgeyBzdWNjZXNzOiBjYWxsYmFjayB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlb2NvZGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxudmFyIE1BUF9BVFRSSUJVVElPTiA9ICdNYXAgdGlsZXMgYnkgPGEgaHJlZj1cImh0dHA6Ly9zdGFtZW4uY29tXCI+U3RhbWVuIERlc2lnbjwvYT4sIHVuZGVyIDxhIGhyZWY9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS8zLjBcIj5DQyBCWSAzLjA8L2E+LiBEYXRhIGJ5IDxhIGhyZWY9XCJodHRwOi8vb3BlbnN0cmVldG1hcC5vcmdcIj5PcGVuU3RyZWV0TWFwPC9hPiwgdW5kZXIgPGEgaHJlZj1cImh0dHA6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvY29weXJpZ2h0XCI+T0RiTDwvYT4uJ1xudmFyIFRJTEVfTEFZRVJfVVJMID0gJ2h0dHA6Ly90aWxlLnN0YW1lbi5jb20vdG9uZXIve3p9L3t4fS97eX0ucG5nJ1xuXG4vLyBSZXRpbmEgdGlsZXNcbmlmICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+IDEpIHtcbiAgVElMRV9MQVlFUl9VUkwgPSAnaHR0cDovL3RpbGUuc3RhbWVuLmNvbS90b25lci97en0ve3h9L3t5fUAyeC5wbmcnXG59XG5cbnZhciBSRUdJT05fTEFZRVJfU1RZTEUgPXtcbiAgY29sb3I6ICcjZjExJyxcbiAgd2VpZ2h0OiA1LFxuICBvcGFjaXR5OiAwLjFcbn1cblxudmFyIE1hcCA9IGZ1bmN0aW9uIChqc29uKSB7XG4gIHRoaXMuanNvbiA9IGpzb25cblxuICB0aGlzLm1hcCA9IEwubWFwKCdtYXAnLCB7XG4gICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgIHRvdWNoWm9vbTogZmFsc2UsXG4gICAgc2Nyb2xsV2hlZWxab29tOiBmYWxzZSxcbiAgICBkb3VibGVDbGlja1pvb206IGZhbHNlLFxuICAgIGJveFpvb206IGZhbHNlLFxuICAgIGNsb3NlUG9wdXBPbkNsaWNrOiBmYWxzZSxcbiAgICBrZXlib2FyZDogZmFsc2UsXG4gICAgem9vbUNvbnRyb2w6IGZhbHNlXG4gIH0pXG5cbiAgdGhpcy5tYXJrZXJzID0gW11cbn1cblxudmFyIG1hcmtlckljb24gPSBMLmljb24oe1xuICBpY29uVXJsOiAnL2ltZy9tYXJrZXIuc3ZnJyxcbiAgc2hhZG93VXJsOiAnL2ltZy9tYXJrZXJfc2hhZG93LnBuZycsXG5cbiAgaWNvblNpemU6ICAgICBbMzYsIDQzXSwgLy8gc2l6ZSBvZiB0aGUgaWNvblxuICBzaGFkb3dTaXplOiAgIFsxMDAsIDUwXSxcbiAgaWNvbkFuY2hvcjogICBbMTgsIDQzXSwgLy8gcG9pbnQgb2YgdGhlIGljb24gd2hpY2ggd2lsbCBjb3JyZXNwb25kIHRvIG1hcmtlcidzIGxvY2F0aW9uXG4gIHNoYWRvd0FuY2hvcjogWzQwLCA0NF0sXG4gIHBvcHVwQW5jaG9yOiAgWzAsIC01MF0gLy8gcG9pbnQgZnJvbSB3aGljaCB0aGUgcG9wdXAgc2hvdWxkIG9wZW4gcmVsYXRpdmUgdG8gdGhlIGljb25BbmNob3Jcbn0pXG5cbk1hcC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICBMLnRpbGVMYXllcihUSUxFX0xBWUVSX1VSTCwge1xuICAgIGF0dHJpYnV0aW9uOiBNQVBfQVRUUklCVVRJT04sXG4gICAgbWF4Wm9vbTogMjNcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgTC5nZW9Kc29uKHRoaXMuanNvbiwge1xuICAgIHN0eWxlOiBSRUdJT05fTEFZRVJfU1RZTEVcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgdGhpcy5yZXNldCgpXG59XG5cbk1hcC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucmVtb3ZlTWFya2VycygpXG4gIHRoaXMuc2V0TG9jYXRpb24oY29uZmlnLmxhdGl0dWRlLCBjb25maWcubG9uZ2l0dWRlLCBjb25maWcuaW5pdGlhbFpvb20pXG4gIHRoaXMubWFwLmNsb3NlUG9wdXAoKVxuICB0aGlzLm1hcC5kcmFnZ2luZy5kaXNhYmxlKClcbn1cblxuTWFwLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIChsYXQsIGxuZywgem9vbSkge1xuICB0aGlzLm1hcC5zZXRWaWV3KFtsYXQsIGxuZ10sIHpvb20pXG4gIHRoaXMubWFwLmRyYWdnaW5nLmVuYWJsZSgpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlTWFya2VyID0gZnVuY3Rpb24gKGxhdCwgbG5nKSB7XG4gIHZhciBtYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsbmddLCB7XG4gICAgaWNvbjogbWFya2VySWNvbixcbiAgICBjbGlja2FibGU6IGZhbHNlXG4gIH0pLmFkZFRvKHRoaXMubWFwKVxuICB0aGlzLm1hcmtlcnMucHVzaChtYXJrZXIpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlUG9wdXAgPSBmdW5jdGlvbiAobGF0LCBsbmcsIGFuc3dlciwgZGV0YWlsKSB7XG4gIC8vIEFzIG9mIExlYWZsZXQgMC42KywgYXV0b1BhbiBpcyBidWdneSBhbmQgdW5yZWxpYWJsZVxuICAvLyAobXkgZ3Vlc3M/IGJlY2F1c2Ugd2UncmUgb3ZlcndyaXRpbmcgYSBsb3Qgb2YgdGhhdCBwb3B1cCBhcHBlYXJhbmNlIHN0eWxlKVxuICB2YXIgcG9wdXAgPSBMLnBvcHVwKHtcbiAgICBhdXRvUGFuOiBmYWxzZSxcbiAgICBjbG9zZUJ1dHRvbjogZmFsc2VcbiAgfSlcbiAgLnNldExhdExuZyhbbGF0LCBsbmddKVxuICAuc2V0Q29udGVudCgnPGgyPicgKyBhbnN3ZXIgKyAnPC9oMj48cD4nICsgZGV0YWlsICsgJzwvcD48YnV0dG9uIGlkPVwicmVzZXQtYnV0dG9uXCI+QWdhaW4/PC9idXR0b24+JylcbiAgLm9wZW5Pbih0aGlzLm1hcClcbn1cblxuTWFwLnByb3RvdHlwZS5yZW1vdmVNYXJrZXJzID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWFya2Vycy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMubWFwLnJlbW92ZUxheWVyKHRoaXMubWFya2Vyc1tpXSlcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcFxuIl19
