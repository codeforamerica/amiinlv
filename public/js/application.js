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
  router()

  // Requests browser's permission to use
  // geolocator upon page load, if necessary
  cacheCurrentLocation()
}

function init (data) {
  /* global json, map */
  json = data
  map = new Map(data)

  $('#input-target').on('click', onGetCurrentLocation)
  $('#input-go').on('click', onGo)
  $('#location-form').on('submit', onSubmit)
  $(document).keydown(function (e) {
    if (e.which == 27 && e.ctrlKey == false && e.metaKey == false) reset()
  })
  $('#about-link').on('click', onClickAboutLink)
  $('#about-close').on('click', onClickAboutClose)
  $('#example-link').on('click', onClickExampleLink)

  $('.dismiss-ie-browser').click(function (e) {
    e.preventDefault()
    $('.ie-browser').hide()
  })

  $('#input-location').focus()
  map.render()

  $('#map').addClass('no-panning')
}

/**
 * Checks page route and acts accordingly
 */

function router () {
  var q = window.location.search.substr(1)

  switch (q) {
    case 'about':
      aboutOpenInstantaneously()
      break
    case 'locate':
      onGetCurrentLocation()
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
      // TODO: Do not call this on page load since it
      // resets the URL currently
      // reset()
      break
  }
}

/**
 * Fill in the address input with the example
 */

function onClickExampleLink (e) {
  e.preventDefault()

  var address = $('#example-link').text()
  $('#input-location').val(address + ', ' + config.name)
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
  $('#input-location').val('')
  $('#alert').hide()
  aboutClose()
  $('#question').fadeIn(150)
  $('#input-location').focus()
  $('#map').addClass('no-panning')

  // Reset URL
  if (Modernizr.history) {
    window.history.pushState({}, 'home', '/')
  } else {
    window.location = '/'
  }

  // New example link!
  setExampleLink()

  // Reset map if initialized
  if (map) {
    map.reset()
  }
}

function onClickReset (e) {
  e.preventDefault()
  reset()
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

  map.createMarker(latitude, longitude)
  map.createPopup(latitude, longitude, answer, detail)
  map.setLocation(latitude, longitude, config.finalZoom)

  $('#map').removeClass('no-panning')

  // Leaflet stops event propagation in map elements, so this event
  // needs to be bound to another one of the inner wrappers after it
  // is created
  $('#reset-button').on('click', onClickReset)

  $('#question').fadeOut(250)
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
  geocodeByCurrentLocation()
  return false
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
    $('#input-location').focus()
    for (var i = 0; i < 3; i++) {
      $('#input-location').animate({backgroundColor: '#fee'}, 100).animate({backgroundColor: '#fff'}, 100)
    }
    $('#alert').html('Please enter an address').slideDown(100)
  }
  return false
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
  }

  var onError = function (err) {
    alert('Error getting current position. Geolocation may be disabled on this browser.')
  }

  getCurrentLocation(onSuccess, onError)
}

/**
 * Geocodes an address
 */

function geocodeByAddress (address) {
  geocodeAddress(address, function (res) {
    /* global latitude, longitude */
    if (res && res.results.length > 0) {
      var result = res.results[0].geometry.location

      latitude = result.lat
      longitude = result.lng
      checkWithinLimits(latitude, longitude)
    }
  })
}

/**
 * Opens about window
 */

function onClickAboutLink (e) {
  e.preventDefault()

  if (Modernizr.history) {
    window.history.pushState({}, 'about', '?about')
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
  $('#location-form').hide()
  $('#about').show()
}

/**
 * Closes about window
 */

function onClickAboutClose (e) {
  e.preventDefault()
  reset()
}

function aboutClose () {
  $('#about').fadeOut(200, function () {
    $('#location-form').fadeIn(200)
  })
}

/**
 * Determine what needs to be done based on URI
 */

preInit()

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
  address: '495 S. Las Vegas Blvd',
  latitude: 36.18,
  longitude: -115.18,
  initialZoom: 13,
  finalZoom: 14,
  fileName: '/data/region.geojson',
  tagline: 'Because the city boundaries are a lot weirder than you think.',
  about: 'Las Vegas is one of the most visited cities in the world, and yet its most famous destination&mdash;a 6.8km boulevard of extravagantly themed casinos commonly known as ‘The Strip’&mdash;is actually located outside of Las Vegas city limits.  To add to the confusion, the city’s true borders are often jagged and full of small holes.  Local residents may still receive mail at a valid Las Vegas address, according to the U.S. Postal Service, even if they are under the jurisdiction of one of the surrounding unincorporated communities throughout Clark County.  As a result, the City of Las Vegas requires residents verify that they reside within city limits to receive city services.',
  responseYes: 'You are within city limits!',
  responseNo: 'You are not in Las Vegas!',
  examples: [
    '1319 Shadow Mountain Place',
    '3497 Holly Ave',
    '953 East Sahara Avenue'
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

var geocode = function (address, callback) {
  var params = {
    address: address,
    sensor:  false
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
  var popup = L.popup({
    autoPan: true,
    closeButton: false,
    autoPanPadding: [10,10]
  })
  .setLatLng([lat, lng])
  .setContent('<h1>' + answer + '</h1><p>' + detail + '</p><button id="reset-button">Again?</button>')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9zcmMvYXBwbGljYXRpb24uanMiLCIuLi8uLi9jb25maWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi11dGlscy9nZW9qc29uLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2N1cnJlbnRfbG9jYXRpb24uanMiLCIuLi8uLi9zcmMvZ2VvY29kZS5qcyIsIi4uLy4uL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdqdSA9IHJlcXVpcmUoJ2dlb2pzb24tdXRpbHMnKVxudmFyIGdlb2NvZGVBZGRyZXNzID0gcmVxdWlyZSgnLi9nZW9jb2RlJylcbnZhciBnZXRDdXJyZW50TG9jYXRpb24gPSByZXF1aXJlKCcuL2N1cnJlbnRfbG9jYXRpb24nKVxudmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwJylcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxuXG52YXIganNvbiA9IHt9XG52YXIgbWFwXG52YXIgbGF0aXR1ZGVcbnZhciBsb25naXR1ZGVcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gTUFQIFZBUklBQkxFU1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBhcHBsaWNhdGlvbiBhbmQgc2V0c1xuICogZXZlbnQgbGlzdGVuZXJzXG4gKi9cblxuZnVuY3Rpb24gcHJlSW5pdCAoKSB7XG4gIHJvdXRlcigpXG5cbiAgLy8gUmVxdWVzdHMgYnJvd3NlcidzIHBlcm1pc3Npb24gdG8gdXNlXG4gIC8vIGdlb2xvY2F0b3IgdXBvbiBwYWdlIGxvYWQsIGlmIG5lY2Vzc2FyeVxuICBjYWNoZUN1cnJlbnRMb2NhdGlvbigpXG59XG5cbmZ1bmN0aW9uIGluaXQgKGRhdGEpIHtcbiAgLyogZ2xvYmFsIGpzb24sIG1hcCAqL1xuICBqc29uID0gZGF0YVxuICBtYXAgPSBuZXcgTWFwKGRhdGEpXG5cbiAgJCgnI2lucHV0LXRhcmdldCcpLm9uKCdjbGljaycsIG9uR2V0Q3VycmVudExvY2F0aW9uKVxuICAkKCcjaW5wdXQtZ28nKS5vbignY2xpY2snLCBvbkdvKVxuICAkKCcjbG9jYXRpb24tZm9ybScpLm9uKCdzdWJtaXQnLCBvblN1Ym1pdClcbiAgJChkb2N1bWVudCkua2V5ZG93bihmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLndoaWNoID09IDI3ICYmIGUuY3RybEtleSA9PSBmYWxzZSAmJiBlLm1ldGFLZXkgPT0gZmFsc2UpIHJlc2V0KClcbiAgfSlcbiAgJCgnI2Fib3V0LWxpbmsnKS5vbignY2xpY2snLCBvbkNsaWNrQWJvdXRMaW5rKVxuICAkKCcjYWJvdXQtY2xvc2UnKS5vbignY2xpY2snLCBvbkNsaWNrQWJvdXRDbG9zZSlcbiAgJCgnI2V4YW1wbGUtbGluaycpLm9uKCdjbGljaycsIG9uQ2xpY2tFeGFtcGxlTGluaylcblxuICAkKCcuZGlzbWlzcy1pZS1icm93c2VyJykuY2xpY2soZnVuY3Rpb24gKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAkKCcuaWUtYnJvd3NlcicpLmhpZGUoKVxuICB9KVxuXG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKClcbiAgbWFwLnJlbmRlcigpXG5cbiAgJCgnI21hcCcpLmFkZENsYXNzKCduby1wYW5uaW5nJylcbn1cblxuLyoqXG4gKiBDaGVja3MgcGFnZSByb3V0ZSBhbmQgYWN0cyBhY2NvcmRpbmdseVxuICovXG5cbmZ1bmN0aW9uIHJvdXRlciAoKSB7XG4gIHZhciBxID0gd2luZG93LmxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSlcblxuICBzd2l0Y2ggKHEpIHtcbiAgICBjYXNlICdhYm91dCc6XG4gICAgICBhYm91dE9wZW5JbnN0YW50YW5lb3VzbHkoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdsb2NhdGUnOlxuICAgICAgb25HZXRDdXJyZW50TG9jYXRpb24oKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdxdWVyeSc6XG4gICAgICAvLyAvcXVlcnk9eCB3aGVyZSB4IGlzIHRoZSBhZGRyZXNzIHRvIGdlb2NvZGVcbiAgICAgIC8vIHRoaXMgaXMgdG90YWxseSBicm9rZW4gYmVjYXVzZSBzd2l0Y2ggY2FzZSBtYXRjaGluZyBpc24ndCBkb25lIG9uIHBhcnRpYWwgc3RyaW5nXG4gICAgICB2YXIgZmluZGdlbyA9IHEuc3Vic3RyKHEuaW5kZXhPZignPScpKVxuICAgICAgaWYgKGZpbmRnZW8pIHtcbiAgICAgICAgZ2VvY29kZUJ5QWRkcmVzcyhmaW5kZ2VvKVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBUT0RPOiBEbyBub3QgY2FsbCB0aGlzIG9uIHBhZ2UgbG9hZCBzaW5jZSBpdFxuICAgICAgLy8gcmVzZXRzIHRoZSBVUkwgY3VycmVudGx5XG4gICAgICAvLyByZXNldCgpXG4gICAgICBicmVha1xuICB9XG59XG5cbi8qKlxuICogRmlsbCBpbiB0aGUgYWRkcmVzcyBpbnB1dCB3aXRoIHRoZSBleGFtcGxlXG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0V4YW1wbGVMaW5rIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIHZhciBhZGRyZXNzID0gJCgnI2V4YW1wbGUtbGluaycpLnRleHQoKVxuICAkKCcjaW5wdXQtbG9jYXRpb24nKS52YWwoYWRkcmVzcyArICcsICcgKyBjb25maWcubmFtZSlcbn1cblxuZnVuY3Rpb24gc2V0RXhhbXBsZUxpbmsgKCkge1xuICB2YXIgZXhhbXBsZXMgPSBjb25maWcuZXhhbXBsZXMgfHwgW11cbiAgaWYgKGV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGV4YW1wbGVzLmxlbmd0aClcbiAgICAkKCcjZXhhbXBsZS1saW5rJykudGV4dChleGFtcGxlc1tpXSlcbiAgfVxufVxuXG4vKipcbiAqIFJlc2V0cyB0aGUgYXBwbGljYXRpb24gdG8gaXRzIGluaXRpYWwgc3RhdGVcbiAqL1xuXG5mdW5jdGlvbiByZXNldCAoKSB7XG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLnZhbCgnJylcbiAgJCgnI2FsZXJ0JykuaGlkZSgpXG4gIGFib3V0Q2xvc2UoKVxuICAkKCcjcXVlc3Rpb24nKS5mYWRlSW4oMTUwKVxuICAkKCcjaW5wdXQtbG9jYXRpb24nKS5mb2N1cygpXG4gICQoJyNtYXAnKS5hZGRDbGFzcygnbm8tcGFubmluZycpXG5cbiAgLy8gUmVzZXQgVVJMXG4gIGlmIChNb2Rlcm5penIuaGlzdG9yeSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ2hvbWUnLCAnLycpXG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmxvY2F0aW9uID0gJy8nXG4gIH1cblxuICAvLyBOZXcgZXhhbXBsZSBsaW5rIVxuICBzZXRFeGFtcGxlTGluaygpXG5cbiAgLy8gUmVzZXQgbWFwIGlmIGluaXRpYWxpemVkXG4gIGlmIChtYXApIHtcbiAgICBtYXAucmVzZXQoKVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpY2tSZXNldCAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcbiAgcmVzZXQoKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGFuc3dlciBhbmQgZHJvcHMgdGhlIHBpbiBvbiB0aGUgbWFwXG4gKi9cblxuZnVuY3Rpb24gc2V0QW5zd2VyIChhbnN3ZXIpIHtcbiAgLy8gSW5jbHVkZSBhIG1lc3NhZ2UgcHJvdmlkaW5nIGZ1cnRoZXIgaW5mb3JtYXRpb24uXG4gIC8vIEN1cnJlbnRseSwgaXQncyBqdXN0IGEgc2ltcGxlIHJlc3RhdGVtZW50IG9mIHRoZVxuICAvLyBhbnN3ZXIuICBTZWUgR2l0SHViIGlzc3VlICM2LlxuICB2YXIgZGV0YWlsXG4gIGlmIChhbnN3ZXIgPT0gJ1llcycpIHtcbiAgICBkZXRhaWwgPSBjb25maWcucmVzcG9uc2VZZXNcbiAgfSBlbHNlIHtcbiAgICBkZXRhaWwgPSBjb25maWcucmVzcG9uc2VOb1xuICB9XG5cbiAgbWFwLmNyZWF0ZU1hcmtlcihsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICBtYXAuY3JlYXRlUG9wdXAobGF0aXR1ZGUsIGxvbmdpdHVkZSwgYW5zd2VyLCBkZXRhaWwpXG4gIG1hcC5zZXRMb2NhdGlvbihsYXRpdHVkZSwgbG9uZ2l0dWRlLCBjb25maWcuZmluYWxab29tKVxuXG4gICQoJyNtYXAnKS5yZW1vdmVDbGFzcygnbm8tcGFubmluZycpXG5cbiAgLy8gTGVhZmxldCBzdG9wcyBldmVudCBwcm9wYWdhdGlvbiBpbiBtYXAgZWxlbWVudHMsIHNvIHRoaXMgZXZlbnRcbiAgLy8gbmVlZHMgdG8gYmUgYm91bmQgdG8gYW5vdGhlciBvbmUgb2YgdGhlIGlubmVyIHdyYXBwZXJzIGFmdGVyIGl0XG4gIC8vIGlzIGNyZWF0ZWRcbiAgJCgnI3Jlc2V0LWJ1dHRvbicpLm9uKCdjbGljaycsIG9uQ2xpY2tSZXNldClcblxuICAkKCcjcXVlc3Rpb24nKS5mYWRlT3V0KDI1MClcbn1cblxuLyoqXG4gKiBDaGVja3MgdG8gc2VlIHdoZXRoZXIgYSBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlXG4gKiBmYWxsIHdpdGhpbiB0aGUgbGltaXRzIHByb3ZpZGVkIGluIHJlZ2lvbi5qc29uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2xhdGl0dWRlXSB0aGUgbGF0aXR1ZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbG9uZ2l0dWRlXSB0aGUgbG9uZ2l0dWRlXG4gKi9cblxuZnVuY3Rpb24gY2hlY2tXaXRoaW5MaW1pdHMgKGxhdGl0dWRlLCBsb25naXR1ZGUpIHtcbiAgdmFyIHBvaW50ID0ge1xuICAgIHR5cGU6ICdQb2ludCcsXG4gICAgY29vcmRpbmF0ZXM6IFsgbG9uZ2l0dWRlLCBsYXRpdHVkZSBdXG4gIH1cbiAgdmFyIHBvbHlnb24gPSBqc29uLmZlYXR1cmVzWzBdLmdlb21ldHJ5XG4gIHZhciB3aXRoaW5MaW1pdHMgPSBnanUucG9pbnRJblBvbHlnb24ocG9pbnQsIHBvbHlnb24pXG5cbiAgaWYgKHdpdGhpbkxpbWl0cykge1xuICAgIG9uV2l0aGluTGltaXRzKClcbiAgfSBlbHNlIHtcbiAgICBvbk91dHNpZGVMaW1pdHMoKVxuICB9XG59XG5cbi8qKlxuICogRGlzcGxheXMgYW4gYW5zd2VyIHRoYXQgc3BlY2lmaWVzIHRoYXQgdGhlIGxvY2F0aW9uXG4gKiBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uV2l0aGluTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKCdZZXMnKVxufVxuXG4vKipcbiAqIERpc3BsYXlzIGFuIGFuc3dlciB0aGF0IHNwZWNpZmllcyB0aGF0IHRoZSBsb2NhdGlvblxuICogaXMgbm90IHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25PdXRzaWRlTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKCdObycpXG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiwgYW5kIGNoZWNrcyB3aGV0aGVyXG4gKiBpdCBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uR2V0Q3VycmVudExvY2F0aW9uICgpIHtcbiAgZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uKClcbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogU3VibWl0cyB0aGUgZm9ybSwgZ2VvY29kZXMgdGhlIGFkZHJlc3MsIGFuZCBjaGVja3NcbiAqIHdoZXRoZXIgaXQgaXMgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvbkdvICgpIHtcbiAgc3VibWl0TG9jYXRpb24oKVxufVxuXG4vKipcbiAqIFN1Ym1pdHMgdGhlIGZvcm0sIGdlb2NvZGVzIHRoZSBhZGRyZXNzLCBhbmQgY2hlY2tzXG4gKiB3aGV0aGVyIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25TdWJtaXQgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHN1Ym1pdExvY2F0aW9uKClcbn1cblxuLyoqXG4gKiBTdWJtaXRzIGZvcm1cbiAqL1xuZnVuY3Rpb24gc3VibWl0TG9jYXRpb24gKCkge1xuICB2YXIgJGlucHV0ID0gJCgnI2lucHV0LWxvY2F0aW9uJylcbiAgdmFyIGFkZHJlc3MgPSAkaW5wdXQudmFsKClcbiAgaWYgKGFkZHJlc3MgIT0gJycpIHtcbiAgICBnZW9jb2RlQnlBZGRyZXNzKGFkZHJlc3MpXG5cbiAgICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ3F1ZXJ5JywgJy8/cXVlcnk9JyArIGVuY29kZVVSSUNvbXBvbmVudChhZGRyZXNzKSlcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uID0gJy8/cXVlcnk9JyArIGVuY29kZVVSSUNvbXBvbmVudChhZGRyZXNzKVxuICAgIH1cblxuICB9IGVsc2Uge1xuICAgICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgJCgnI2lucHV0LWxvY2F0aW9uJykuYW5pbWF0ZSh7YmFja2dyb3VuZENvbG9yOiAnI2ZlZSd9LCAxMDApLmFuaW1hdGUoe2JhY2tncm91bmRDb2xvcjogJyNmZmYnfSwgMTAwKVxuICAgIH1cbiAgICAkKCcjYWxlcnQnKS5odG1sKCdQbGVhc2UgZW50ZXIgYW4gYWRkcmVzcycpLnNsaWRlRG93bigxMDApXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogSW5pdGlhbCBjdXJyZW50IGxvY2F0aW9uIGNhY2hlXG4gKi9cblxuZnVuY3Rpb24gY2FjaGVDdXJyZW50TG9jYXRpb24gKCkge1xuICB2YXIgb25TdWNjZXNzID0gZnVuY3Rpb24gKHBvc2l0aW9uKSB7XG4gICAgLyogZ2xvYmFsIGxhdGl0dWRlLCBsb25naXR1ZGUgKi9cbiAgICBsYXRpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZVxuICAgIGxvbmdpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGVcbiAgfVxuXG4gIC8vIERvIG5vdGhpbmcgaWYgd2UgYXJlIHVuYWJsZSB0byBkbyBnZW9sb2NhdGlvblxuICAvLyBObyBlcnJvciBjYWxsYmFja1xuXG4gIGdldEN1cnJlbnRMb2NhdGlvbihvblN1Y2Nlc3MpXG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiBhbmQgY2hlY2tzIHdoZXRoZXIgaXQgaXNcbiAqIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uICgpIHtcbiAgdmFyIG9uU3VjY2VzcyA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xuICAgIC8qIGdsb2JhbCBsYXRpdHVkZSwgbG9uZ2l0dWRlICovXG4gICAgbGF0aXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGVcbiAgICBsb25naXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlXG4gICAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSlcbiAgfVxuXG4gIHZhciBvbkVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGN1cnJlbnQgcG9zaXRpb24uIEdlb2xvY2F0aW9uIG1heSBiZSBkaXNhYmxlZCBvbiB0aGlzIGJyb3dzZXIuJylcbiAgfVxuXG4gIGdldEN1cnJlbnRMb2NhdGlvbihvblN1Y2Nlc3MsIG9uRXJyb3IpXG59XG5cbi8qKlxuICogR2VvY29kZXMgYW4gYWRkcmVzc1xuICovXG5cbmZ1bmN0aW9uIGdlb2NvZGVCeUFkZHJlc3MgKGFkZHJlc3MpIHtcbiAgZ2VvY29kZUFkZHJlc3MoYWRkcmVzcywgZnVuY3Rpb24gKHJlcykge1xuICAgIC8qIGdsb2JhbCBsYXRpdHVkZSwgbG9uZ2l0dWRlICovXG4gICAgaWYgKHJlcyAmJiByZXMucmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gcmVzLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb25cblxuICAgICAgbGF0aXR1ZGUgPSByZXN1bHQubGF0XG4gICAgICBsb25naXR1ZGUgPSByZXN1bHQubG5nXG4gICAgICBjaGVja1dpdGhpbkxpbWl0cyhsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICAgIH1cbiAgfSlcbn1cblxuLyoqXG4gKiBPcGVucyBhYm91dCB3aW5kb3dcbiAqL1xuXG5mdW5jdGlvbiBvbkNsaWNrQWJvdXRMaW5rIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmIChNb2Rlcm5penIuaGlzdG9yeSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ2Fib3V0JywgJz9hYm91dCcpXG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmxvY2F0aW9uID0gJz9hYm91dCdcbiAgfVxuXG4gIGFib3V0T3BlbigpXG59XG5cbmZ1bmN0aW9uIGFib3V0T3BlbiAoKSB7XG4gICQoJyNsb2NhdGlvbi1mb3JtJykuZmFkZU91dCgyMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjYWJvdXQnKS5mYWRlSW4oMjAwKVxuICB9KVxufVxuXG4vKipcbiAqIE9wZW5zIGFib3V0IHdpbmRvdywgd2l0aG91dCBhbmltYXRpb25cbiAqL1xuXG5mdW5jdGlvbiBhYm91dE9wZW5JbnN0YW50YW5lb3VzbHkgKCkge1xuICAkKCcjbG9jYXRpb24tZm9ybScpLmhpZGUoKVxuICAkKCcjYWJvdXQnKS5zaG93KClcbn1cblxuLyoqXG4gKiBDbG9zZXMgYWJvdXQgd2luZG93XG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0Fib3V0Q2xvc2UgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHJlc2V0KClcbn1cblxuZnVuY3Rpb24gYWJvdXRDbG9zZSAoKSB7XG4gICQoJyNhYm91dCcpLmZhZGVPdXQoMjAwLCBmdW5jdGlvbiAoKSB7XG4gICAgJCgnI2xvY2F0aW9uLWZvcm0nKS5mYWRlSW4oMjAwKVxuICB9KVxufVxuXG4vKipcbiAqIERldGVybWluZSB3aGF0IG5lZWRzIHRvIGJlIGRvbmUgYmFzZWQgb24gVVJJXG4gKi9cblxucHJlSW5pdCgpXG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSByZWdpb24uanNvbiBmaWxlIGFuZCBpbml0aWFsaXplc1xuICogdGhlIGFwcGxpY2F0aW9uXG4gKi9cblxualF1ZXJ5KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICQuZ2V0SlNPTihjb25maWcuZmlsZU5hbWUsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaW5pdChkYXRhKVxuICB9KVxufSlcbiIsInZhciBjb25maWcgPSB7XG4gIG5hbWU6ICdMYXMgVmVnYXMnLFxuICBhZGRyZXNzOiAnNDk1IFMuIExhcyBWZWdhcyBCbHZkJyxcbiAgbGF0aXR1ZGU6IDM2LjE4LFxuICBsb25naXR1ZGU6IC0xMTUuMTgsXG4gIGluaXRpYWxab29tOiAxMyxcbiAgZmluYWxab29tOiAxNCxcbiAgZmlsZU5hbWU6ICcvZGF0YS9yZWdpb24uZ2VvanNvbicsXG4gIHRhZ2xpbmU6ICdCZWNhdXNlIHRoZSBjaXR5IGJvdW5kYXJpZXMgYXJlIGEgbG90IHdlaXJkZXIgdGhhbiB5b3UgdGhpbmsuJyxcbiAgYWJvdXQ6ICdMYXMgVmVnYXMgaXMgb25lIG9mIHRoZSBtb3N0IHZpc2l0ZWQgY2l0aWVzIGluIHRoZSB3b3JsZCwgYW5kIHlldCBpdHMgbW9zdCBmYW1vdXMgZGVzdGluYXRpb24mbWRhc2g7YSA2LjhrbSBib3VsZXZhcmQgb2YgZXh0cmF2YWdhbnRseSB0aGVtZWQgY2FzaW5vcyBjb21tb25seSBrbm93biBhcyDigJhUaGUgU3RyaXDigJkmbWRhc2g7aXMgYWN0dWFsbHkgbG9jYXRlZCBvdXRzaWRlIG9mIExhcyBWZWdhcyBjaXR5IGxpbWl0cy4gIFRvIGFkZCB0byB0aGUgY29uZnVzaW9uLCB0aGUgY2l0eeKAmXMgdHJ1ZSBib3JkZXJzIGFyZSBvZnRlbiBqYWdnZWQgYW5kIGZ1bGwgb2Ygc21hbGwgaG9sZXMuICBMb2NhbCByZXNpZGVudHMgbWF5IHN0aWxsIHJlY2VpdmUgbWFpbCBhdCBhIHZhbGlkIExhcyBWZWdhcyBhZGRyZXNzLCBhY2NvcmRpbmcgdG8gdGhlIFUuUy4gUG9zdGFsIFNlcnZpY2UsIGV2ZW4gaWYgdGhleSBhcmUgdW5kZXIgdGhlIGp1cmlzZGljdGlvbiBvZiBvbmUgb2YgdGhlIHN1cnJvdW5kaW5nIHVuaW5jb3Jwb3JhdGVkIGNvbW11bml0aWVzIHRocm91Z2hvdXQgQ2xhcmsgQ291bnR5LiAgQXMgYSByZXN1bHQsIHRoZSBDaXR5IG9mIExhcyBWZWdhcyByZXF1aXJlcyByZXNpZGVudHMgdmVyaWZ5IHRoYXQgdGhleSByZXNpZGUgd2l0aGluIGNpdHkgbGltaXRzIHRvIHJlY2VpdmUgY2l0eSBzZXJ2aWNlcy4nLFxuICByZXNwb25zZVllczogJ1lvdSBhcmUgd2l0aGluIGNpdHkgbGltaXRzIScsXG4gIHJlc3BvbnNlTm86ICdZb3UgYXJlIG5vdCBpbiBMYXMgVmVnYXMhJyxcbiAgZXhhbXBsZXM6IFtcbiAgICAnMTMxOSBTaGFkb3cgTW91bnRhaW4gUGxhY2UnLFxuICAgICczNDk3IEhvbGx5IEF2ZScsXG4gICAgJzk1MyBFYXN0IFNhaGFyYSBBdmVudWUnXG4gIF1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWdcbiIsIihmdW5jdGlvbiAoKSB7XG4gIHZhciBnanUgPSB0aGlzLmdqdSA9IHt9O1xuXG4gIC8vIEV4cG9ydCB0aGUgZ2VvanNvbiBvYmplY3QgZm9yICoqQ29tbW9uSlMqKlxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdqdTtcbiAgfVxuXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwOi8vd3d3LmtldmxpbmRldi5jb20vZ3VpL21hdGgvaW50ZXJzZWN0aW9uL0ludGVyc2VjdGlvbi5qc1xuICBnanUubGluZVN0cmluZ3NJbnRlcnNlY3QgPSBmdW5jdGlvbiAobDEsIGwyKSB7XG4gICAgdmFyIGludGVyc2VjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBsMS5jb29yZGluYXRlcy5sZW5ndGggLSAyOyArK2kpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDw9IGwyLmNvb3JkaW5hdGVzLmxlbmd0aCAtIDI7ICsraikge1xuICAgICAgICB2YXIgYTEgPSB7XG4gICAgICAgICAgeDogbDEuY29vcmRpbmF0ZXNbaV1bMV0sXG4gICAgICAgICAgeTogbDEuY29vcmRpbmF0ZXNbaV1bMF1cbiAgICAgICAgfSxcbiAgICAgICAgICBhMiA9IHtcbiAgICAgICAgICAgIHg6IGwxLmNvb3JkaW5hdGVzW2kgKyAxXVsxXSxcbiAgICAgICAgICAgIHk6IGwxLmNvb3JkaW5hdGVzW2kgKyAxXVswXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYjEgPSB7XG4gICAgICAgICAgICB4OiBsMi5jb29yZGluYXRlc1tqXVsxXSxcbiAgICAgICAgICAgIHk6IGwyLmNvb3JkaW5hdGVzW2pdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICBiMiA9IHtcbiAgICAgICAgICAgIHg6IGwyLmNvb3JkaW5hdGVzW2ogKyAxXVsxXSxcbiAgICAgICAgICAgIHk6IGwyLmNvb3JkaW5hdGVzW2ogKyAxXVswXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdWFfdCA9IChiMi54IC0gYjEueCkgKiAoYTEueSAtIGIxLnkpIC0gKGIyLnkgLSBiMS55KSAqIChhMS54IC0gYjEueCksXG4gICAgICAgICAgdWJfdCA9IChhMi54IC0gYTEueCkgKiAoYTEueSAtIGIxLnkpIC0gKGEyLnkgLSBhMS55KSAqIChhMS54IC0gYjEueCksXG4gICAgICAgICAgdV9iID0gKGIyLnkgLSBiMS55KSAqIChhMi54IC0gYTEueCkgLSAoYjIueCAtIGIxLngpICogKGEyLnkgLSBhMS55KTtcbiAgICAgICAgaWYgKHVfYiAhPSAwKSB7XG4gICAgICAgICAgdmFyIHVhID0gdWFfdCAvIHVfYixcbiAgICAgICAgICAgIHViID0gdWJfdCAvIHVfYjtcbiAgICAgICAgICBpZiAoMCA8PSB1YSAmJiB1YSA8PSAxICYmIDAgPD0gdWIgJiYgdWIgPD0gMSkge1xuICAgICAgICAgICAgaW50ZXJzZWN0cy5wdXNoKHtcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgICAgICAgICAnY29vcmRpbmF0ZXMnOiBbYTEueCArIHVhICogKGEyLnggLSBhMS54KSwgYTEueSArIHVhICogKGEyLnkgLSBhMS55KV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaW50ZXJzZWN0cy5sZW5ndGggPT0gMCkgaW50ZXJzZWN0cyA9IGZhbHNlO1xuICAgIHJldHVybiBpbnRlcnNlY3RzO1xuICB9XG5cbiAgLy8gQm91bmRpbmcgQm94XG5cbiAgZnVuY3Rpb24gYm91bmRpbmdCb3hBcm91bmRQb2x5Q29vcmRzIChjb29yZHMpIHtcbiAgICB2YXIgeEFsbCA9IFtdLCB5QWxsID0gW11cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzWzBdLmxlbmd0aDsgaSsrKSB7XG4gICAgICB4QWxsLnB1c2goY29vcmRzWzBdW2ldWzFdKVxuICAgICAgeUFsbC5wdXNoKGNvb3Jkc1swXVtpXVswXSlcbiAgICB9XG5cbiAgICB4QWxsID0geEFsbC5zb3J0KGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGEgLSBiIH0pXG4gICAgeUFsbCA9IHlBbGwuc29ydChmdW5jdGlvbiAoYSxiKSB7IHJldHVybiBhIC0gYiB9KVxuXG4gICAgcmV0dXJuIFsgW3hBbGxbMF0sIHlBbGxbMF1dLCBbeEFsbFt4QWxsLmxlbmd0aCAtIDFdLCB5QWxsW3lBbGwubGVuZ3RoIC0gMV1dIF1cbiAgfVxuXG4gIGdqdS5wb2ludEluQm91bmRpbmdCb3ggPSBmdW5jdGlvbiAocG9pbnQsIGJvdW5kcykge1xuICAgIHJldHVybiAhKHBvaW50LmNvb3JkaW5hdGVzWzFdIDwgYm91bmRzWzBdWzBdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzFdID4gYm91bmRzWzFdWzBdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzBdIDwgYm91bmRzWzBdWzFdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzBdID4gYm91bmRzWzFdWzFdKSBcbiAgfVxuXG4gIC8vIFBvaW50IGluIFBvbHlnb25cbiAgLy8gaHR0cDovL3d3dy5lY3NlLnJwaS5lZHUvSG9tZXBhZ2VzL3dyZi9SZXNlYXJjaC9TaG9ydF9Ob3Rlcy9wbnBvbHkuaHRtbCNMaXN0aW5nIHRoZSBWZXJ0aWNlc1xuXG4gIGZ1bmN0aW9uIHBucG9seSAoeCx5LGNvb3Jkcykge1xuICAgIHZhciB2ZXJ0ID0gWyBbMCwwXSBdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjb29yZHNbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmVydC5wdXNoKGNvb3Jkc1tpXVtqXSlcbiAgICAgIH1cblx0ICB2ZXJ0LnB1c2goY29vcmRzW2ldWzBdKVxuICAgICAgdmVydC5wdXNoKFswLDBdKVxuICAgIH1cblxuICAgIHZhciBpbnNpZGUgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdmVydC5sZW5ndGggLSAxOyBpIDwgdmVydC5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIGlmICgoKHZlcnRbaV1bMF0gPiB5KSAhPSAodmVydFtqXVswXSA+IHkpKSAmJiAoeCA8ICh2ZXJ0W2pdWzFdIC0gdmVydFtpXVsxXSkgKiAoeSAtIHZlcnRbaV1bMF0pIC8gKHZlcnRbal1bMF0gLSB2ZXJ0W2ldWzBdKSArIHZlcnRbaV1bMV0pKSBpbnNpZGUgPSAhaW5zaWRlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVxuICB9XG5cbiAgZ2p1LnBvaW50SW5Qb2x5Z29uID0gZnVuY3Rpb24gKHAsIHBvbHkpIHtcbiAgICB2YXIgY29vcmRzID0gKHBvbHkudHlwZSA9PSBcIlBvbHlnb25cIikgPyBbIHBvbHkuY29vcmRpbmF0ZXMgXSA6IHBvbHkuY29vcmRpbmF0ZXNcblxuICAgIHZhciBpbnNpZGVCb3ggPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZ2p1LnBvaW50SW5Cb3VuZGluZ0JveChwLCBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMoY29vcmRzW2ldKSkpIGluc2lkZUJveCA9IHRydWVcbiAgICB9XG4gICAgaWYgKCFpbnNpZGVCb3gpIHJldHVybiBmYWxzZVxuXG4gICAgdmFyIGluc2lkZVBvbHkgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocG5wb2x5KHAuY29vcmRpbmF0ZXNbMV0sIHAuY29vcmRpbmF0ZXNbMF0sIGNvb3Jkc1tpXSkpIGluc2lkZVBvbHkgPSB0cnVlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVBvbHlcbiAgfVxuXG4gIC8vIHN1cHBvcnQgbXVsdGkgKGJ1dCBub3QgZG9udXQpIHBvbHlnb25zXG4gIGdqdS5wb2ludEluTXVsdGlQb2x5Z29uID0gZnVuY3Rpb24gKHAsIHBvbHkpIHtcbiAgICB2YXIgY29vcmRzX2FycmF5ID0gKHBvbHkudHlwZSA9PSBcIk11bHRpUG9seWdvblwiKSA/IFsgcG9seS5jb29yZGluYXRlcyBdIDogcG9seS5jb29yZGluYXRlc1xuXG4gICAgdmFyIGluc2lkZUJveCA9IGZhbHNlXG4gICAgdmFyIGluc2lkZVBvbHkgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzX2FycmF5Lmxlbmd0aDsgaSsrKXtcbiAgICAgIHZhciBjb29yZHMgPSBjb29yZHNfYXJyYXlbaV07XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIWluc2lkZUJveCl7XG4gICAgICAgICAgaWYgKGdqdS5wb2ludEluQm91bmRpbmdCb3gocCwgYm91bmRpbmdCb3hBcm91bmRQb2x5Q29vcmRzKGNvb3Jkc1tqXSkpKSB7XG4gICAgICAgICAgICBpbnNpZGVCb3ggPSB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWluc2lkZUJveCkgcmV0dXJuIGZhbHNlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIWluc2lkZVBvbHkpe1xuICAgICAgICAgIGlmIChwbnBvbHkocC5jb29yZGluYXRlc1sxXSwgcC5jb29yZGluYXRlc1swXSwgY29vcmRzW2pdKSkge1xuICAgICAgICAgICAgaW5zaWRlUG9seSA9IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5zaWRlUG9seVxuICB9XG5cbiAgZ2p1Lm51bWJlclRvUmFkaXVzID0gZnVuY3Rpb24gKG51bWJlcikge1xuICAgIHJldHVybiBudW1iZXIgKiBNYXRoLlBJIC8gMTgwO1xuICB9XG5cbiAgZ2p1Lm51bWJlclRvRGVncmVlID0gZnVuY3Rpb24gKG51bWJlcikge1xuICAgIHJldHVybiBudW1iZXIgKiAxODAgLyBNYXRoLlBJO1xuICB9XG5cbiAgLy8gd3JpdHRlbiB3aXRoIGhlbHAgZnJvbSBAdGF1dG9sb2dlXG4gIGdqdS5kcmF3Q2lyY2xlID0gZnVuY3Rpb24gKHJhZGl1c0luTWV0ZXJzLCBjZW50ZXJQb2ludCwgc3RlcHMpIHtcbiAgICB2YXIgY2VudGVyID0gW2NlbnRlclBvaW50LmNvb3JkaW5hdGVzWzFdLCBjZW50ZXJQb2ludC5jb29yZGluYXRlc1swXV0sXG4gICAgICBkaXN0ID0gKHJhZGl1c0luTWV0ZXJzIC8gMTAwMCkgLyA2MzcxLFxuICAgICAgLy8gY29udmVydCBtZXRlcnMgdG8gcmFkaWFudFxuICAgICAgcmFkQ2VudGVyID0gW2dqdS5udW1iZXJUb1JhZGl1cyhjZW50ZXJbMF0pLCBnanUubnVtYmVyVG9SYWRpdXMoY2VudGVyWzFdKV0sXG4gICAgICBzdGVwcyA9IHN0ZXBzIHx8IDE1LFxuICAgICAgLy8gMTUgc2lkZWQgY2lyY2xlXG4gICAgICBwb2x5ID0gW1tjZW50ZXJbMF0sIGNlbnRlclsxXV1dO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHM7IGkrKykge1xuICAgICAgdmFyIGJybmcgPSAyICogTWF0aC5QSSAqIGkgLyBzdGVwcztcbiAgICAgIHZhciBsYXQgPSBNYXRoLmFzaW4oTWF0aC5zaW4ocmFkQ2VudGVyWzBdKSAqIE1hdGguY29zKGRpc3QpXG4gICAgICAgICAgICAgICsgTWF0aC5jb3MocmFkQ2VudGVyWzBdKSAqIE1hdGguc2luKGRpc3QpICogTWF0aC5jb3MoYnJuZykpO1xuICAgICAgdmFyIGxuZyA9IHJhZENlbnRlclsxXSArIE1hdGguYXRhbjIoTWF0aC5zaW4oYnJuZykgKiBNYXRoLnNpbihkaXN0KSAqIE1hdGguY29zKHJhZENlbnRlclswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhkaXN0KSAtIE1hdGguc2luKHJhZENlbnRlclswXSkgKiBNYXRoLnNpbihsYXQpKTtcbiAgICAgIHBvbHlbaV0gPSBbXTtcbiAgICAgIHBvbHlbaV1bMV0gPSBnanUubnVtYmVyVG9EZWdyZWUobGF0KTtcbiAgICAgIHBvbHlbaV1bMF0gPSBnanUubnVtYmVyVG9EZWdyZWUobG5nKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIFwidHlwZVwiOiBcIlBvbHlnb25cIixcbiAgICAgIFwiY29vcmRpbmF0ZXNcIjogW3BvbHldXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFzc3VtZXMgcmVjdGFuZ2xlIHN0YXJ0cyBhdCBsb3dlciBsZWZ0IHBvaW50XG4gIGdqdS5yZWN0YW5nbGVDZW50cm9pZCA9IGZ1bmN0aW9uIChyZWN0YW5nbGUpIHtcbiAgICB2YXIgYmJveCA9IHJlY3RhbmdsZS5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgeG1pbiA9IGJib3hbMF1bMF0sXG4gICAgICB5bWluID0gYmJveFswXVsxXSxcbiAgICAgIHhtYXggPSBiYm94WzJdWzBdLFxuICAgICAgeW1heCA9IGJib3hbMl1bMV07XG4gICAgdmFyIHh3aWR0aCA9IHhtYXggLSB4bWluO1xuICAgIHZhciB5d2lkdGggPSB5bWF4IC0geW1pbjtcbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW3htaW4gKyB4d2lkdGggLyAyLCB5bWluICsgeXdpZHRoIC8gMl1cbiAgICB9O1xuICB9XG5cbiAgLy8gZnJvbSBodHRwOi8vd3d3Lm1vdmFibGUtdHlwZS5jby51ay9zY3JpcHRzL2xhdGxvbmcuaHRtbFxuICBnanUucG9pbnREaXN0YW5jZSA9IGZ1bmN0aW9uIChwdDEsIHB0Mikge1xuICAgIHZhciBsb24xID0gcHQxLmNvb3JkaW5hdGVzWzBdLFxuICAgICAgbGF0MSA9IHB0MS5jb29yZGluYXRlc1sxXSxcbiAgICAgIGxvbjIgPSBwdDIuY29vcmRpbmF0ZXNbMF0sXG4gICAgICBsYXQyID0gcHQyLmNvb3JkaW5hdGVzWzFdLFxuICAgICAgZExhdCA9IGdqdS5udW1iZXJUb1JhZGl1cyhsYXQyIC0gbGF0MSksXG4gICAgICBkTG9uID0gZ2p1Lm51bWJlclRvUmFkaXVzKGxvbjIgLSBsb24xKSxcbiAgICAgIGEgPSBNYXRoLnBvdyhNYXRoLnNpbihkTGF0IC8gMiksIDIpICsgTWF0aC5jb3MoZ2p1Lm51bWJlclRvUmFkaXVzKGxhdDEpKVxuICAgICAgICAqIE1hdGguY29zKGdqdS5udW1iZXJUb1JhZGl1cyhsYXQyKSkgKiBNYXRoLnBvdyhNYXRoLnNpbihkTG9uIC8gMiksIDIpLFxuICAgICAgYyA9IDIgKiBNYXRoLmF0YW4yKE1hdGguc3FydChhKSwgTWF0aC5zcXJ0KDEgLSBhKSk7XG4gICAgcmV0dXJuICg2MzcxICogYykgKiAxMDAwOyAvLyByZXR1cm5zIG1ldGVyc1xuICB9LFxuXG4gIC8vIGNoZWNrcyBpZiBnZW9tZXRyeSBsaWVzIGVudGlyZWx5IHdpdGhpbiBhIGNpcmNsZVxuICAvLyB3b3JrcyB3aXRoIFBvaW50LCBMaW5lU3RyaW5nLCBQb2x5Z29uXG4gIGdqdS5nZW9tZXRyeVdpdGhpblJhZGl1cyA9IGZ1bmN0aW9uIChnZW9tZXRyeSwgY2VudGVyLCByYWRpdXMpIHtcbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PSAnUG9pbnQnKSB7XG4gICAgICByZXR1cm4gZ2p1LnBvaW50RGlzdGFuY2UoZ2VvbWV0cnksIGNlbnRlcikgPD0gcmFkaXVzO1xuICAgIH0gZWxzZSBpZiAoZ2VvbWV0cnkudHlwZSA9PSAnTGluZVN0cmluZycgfHwgZ2VvbWV0cnkudHlwZSA9PSAnUG9seWdvbicpIHtcbiAgICAgIHZhciBwb2ludCA9IHt9O1xuICAgICAgdmFyIGNvb3JkaW5hdGVzO1xuICAgICAgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIC8vIGl0J3MgZW5vdWdoIHRvIGNoZWNrIHRoZSBleHRlcmlvciByaW5nIG9mIHRoZSBQb2x5Z29uXG4gICAgICAgIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaSBpbiBjb29yZGluYXRlcykge1xuICAgICAgICBwb2ludC5jb29yZGluYXRlcyA9IGNvb3JkaW5hdGVzW2ldO1xuICAgICAgICBpZiAoZ2p1LnBvaW50RGlzdGFuY2UocG9pbnQsIGNlbnRlcikgPiByYWRpdXMpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBhZGFwdGVkIGZyb20gaHR0cDovL3BhdWxib3Vya2UubmV0L2dlb21ldHJ5L3BvbHlhcmVhL2phdmFzY3JpcHQudHh0XG4gIGdqdS5hcmVhID0gZnVuY3Rpb24gKHBvbHlnb24pIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgLy8gVE9ETzogcG9seWdvbiBob2xlcyBhdCBjb29yZGluYXRlc1sxXVxuICAgIHZhciBwb2ludHMgPSBwb2x5Z29uLmNvb3JkaW5hdGVzWzBdO1xuICAgIHZhciBqID0gcG9pbnRzLmxlbmd0aCAtIDE7XG4gICAgdmFyIHAxLCBwMjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaiA9IGkrKykge1xuICAgICAgdmFyIHAxID0ge1xuICAgICAgICB4OiBwb2ludHNbaV1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tpXVswXVxuICAgICAgfTtcbiAgICAgIHZhciBwMiA9IHtcbiAgICAgICAgeDogcG9pbnRzW2pdWzFdLFxuICAgICAgICB5OiBwb2ludHNbal1bMF1cbiAgICAgIH07XG4gICAgICBhcmVhICs9IHAxLnggKiBwMi55O1xuICAgICAgYXJlYSAtPSBwMS55ICogcDIueDtcbiAgICB9XG5cbiAgICBhcmVhIC89IDI7XG4gICAgcmV0dXJuIGFyZWE7XG4gIH0sXG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9wYXVsYm91cmtlLm5ldC9nZW9tZXRyeS9wb2x5YXJlYS9qYXZhc2NyaXB0LnR4dFxuICBnanUuY2VudHJvaWQgPSBmdW5jdGlvbiAocG9seWdvbikge1xuICAgIHZhciBmLCB4ID0gMCxcbiAgICAgIHkgPSAwO1xuICAgIC8vIFRPRE86IHBvbHlnb24gaG9sZXMgYXQgY29vcmRpbmF0ZXNbMV1cbiAgICB2YXIgcG9pbnRzID0gcG9seWdvbi5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgaiA9IHBvaW50cy5sZW5ndGggLSAxO1xuICAgIHZhciBwMSwgcDI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIHZhciBwMSA9IHtcbiAgICAgICAgeDogcG9pbnRzW2ldWzFdLFxuICAgICAgICB5OiBwb2ludHNbaV1bMF1cbiAgICAgIH07XG4gICAgICB2YXIgcDIgPSB7XG4gICAgICAgIHg6IHBvaW50c1tqXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2pdWzBdXG4gICAgICB9O1xuICAgICAgZiA9IHAxLnggKiBwMi55IC0gcDIueCAqIHAxLnk7XG4gICAgICB4ICs9IChwMS54ICsgcDIueCkgKiBmO1xuICAgICAgeSArPSAocDEueSArIHAyLnkpICogZjtcbiAgICB9XG5cbiAgICBmID0gZ2p1LmFyZWEocG9seWdvbikgKiA2O1xuICAgIHJldHVybiB7XG4gICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbeSAvIGYsIHggLyBmXVxuICAgIH07XG4gIH0sXG5cbiAgZ2p1LnNpbXBsaWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwga2luaykgeyAvKiBzb3VyY2VbXSBhcnJheSBvZiBnZW9qc29uIHBvaW50cyAqL1xuICAgIC8qIGtpbmtcdGluIG1ldHJlcywga2lua3MgYWJvdmUgdGhpcyBkZXB0aCBrZXB0ICAqL1xuICAgIC8qIGtpbmsgZGVwdGggaXMgdGhlIGhlaWdodCBvZiB0aGUgdHJpYW5nbGUgYWJjIHdoZXJlIGEtYiBhbmQgYi1jIGFyZSB0d28gY29uc2VjdXRpdmUgbGluZSBzZWdtZW50cyAqL1xuICAgIGtpbmsgPSBraW5rIHx8IDIwO1xuICAgIHNvdXJjZSA9IHNvdXJjZS5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxuZzogby5jb29yZGluYXRlc1swXSxcbiAgICAgICAgbGF0OiBvLmNvb3JkaW5hdGVzWzFdXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbl9zb3VyY2UsIG5fc3RhY2ssIG5fZGVzdCwgc3RhcnQsIGVuZCwgaSwgc2lnO1xuICAgIHZhciBkZXZfc3FyLCBtYXhfZGV2X3NxciwgYmFuZF9zcXI7XG4gICAgdmFyIHgxMiwgeTEyLCBkMTIsIHgxMywgeTEzLCBkMTMsIHgyMywgeTIzLCBkMjM7XG4gICAgdmFyIEYgPSAoTWF0aC5QSSAvIDE4MC4wKSAqIDAuNTtcbiAgICB2YXIgaW5kZXggPSBuZXcgQXJyYXkoKTsgLyogYXJheSBvZiBpbmRleGVzIG9mIHNvdXJjZSBwb2ludHMgdG8gaW5jbHVkZSBpbiB0aGUgcmVkdWNlZCBsaW5lICovXG4gICAgdmFyIHNpZ19zdGFydCA9IG5ldyBBcnJheSgpOyAvKiBpbmRpY2VzIG9mIHN0YXJ0ICYgZW5kIG9mIHdvcmtpbmcgc2VjdGlvbiAqL1xuICAgIHZhciBzaWdfZW5kID0gbmV3IEFycmF5KCk7XG5cbiAgICAvKiBjaGVjayBmb3Igc2ltcGxlIGNhc2VzICovXG5cbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDMpIHJldHVybiAoc291cmNlKTsgLyogb25lIG9yIHR3byBwb2ludHMgKi9cblxuICAgIC8qIG1vcmUgY29tcGxleCBjYXNlLiBpbml0aWFsaXplIHN0YWNrICovXG5cbiAgICBuX3NvdXJjZSA9IHNvdXJjZS5sZW5ndGg7XG4gICAgYmFuZF9zcXIgPSBraW5rICogMzYwLjAgLyAoMi4wICogTWF0aC5QSSAqIDYzNzgxMzcuMCk7IC8qIE5vdyBpbiBkZWdyZWVzICovXG4gICAgYmFuZF9zcXIgKj0gYmFuZF9zcXI7XG4gICAgbl9kZXN0ID0gMDtcbiAgICBzaWdfc3RhcnRbMF0gPSAwO1xuICAgIHNpZ19lbmRbMF0gPSBuX3NvdXJjZSAtIDE7XG4gICAgbl9zdGFjayA9IDE7XG5cbiAgICAvKiB3aGlsZSB0aGUgc3RhY2sgaXMgbm90IGVtcHR5ICAuLi4gKi9cbiAgICB3aGlsZSAobl9zdGFjayA+IDApIHtcblxuICAgICAgLyogLi4uIHBvcCB0aGUgdG9wLW1vc3QgZW50cmllcyBvZmYgdGhlIHN0YWNrcyAqL1xuXG4gICAgICBzdGFydCA9IHNpZ19zdGFydFtuX3N0YWNrIC0gMV07XG4gICAgICBlbmQgPSBzaWdfZW5kW25fc3RhY2sgLSAxXTtcbiAgICAgIG5fc3RhY2stLTtcblxuICAgICAgaWYgKChlbmQgLSBzdGFydCkgPiAxKSB7IC8qIGFueSBpbnRlcm1lZGlhdGUgcG9pbnRzID8gKi9cblxuICAgICAgICAvKiAuLi4geWVzLCBzbyBmaW5kIG1vc3QgZGV2aWFudCBpbnRlcm1lZGlhdGUgcG9pbnQgdG9cbiAgICAgICAgZWl0aGVyIHNpZGUgb2YgbGluZSBqb2luaW5nIHN0YXJ0ICYgZW5kIHBvaW50cyAqL1xuXG4gICAgICAgIHgxMiA9IChzb3VyY2VbZW5kXS5sbmcoKSAtIHNvdXJjZVtzdGFydF0ubG5nKCkpO1xuICAgICAgICB5MTIgPSAoc291cmNlW2VuZF0ubGF0KCkgLSBzb3VyY2Vbc3RhcnRdLmxhdCgpKTtcbiAgICAgICAgaWYgKE1hdGguYWJzKHgxMikgPiAxODAuMCkgeDEyID0gMzYwLjAgLSBNYXRoLmFicyh4MTIpO1xuICAgICAgICB4MTIgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbZW5kXS5sYXQoKSArIHNvdXJjZVtzdGFydF0ubGF0KCkpKTsgLyogdXNlIGF2ZyBsYXQgdG8gcmVkdWNlIGxuZyAqL1xuICAgICAgICBkMTIgPSAoeDEyICogeDEyKSArICh5MTIgKiB5MTIpO1xuXG4gICAgICAgIGZvciAoaSA9IHN0YXJ0ICsgMSwgc2lnID0gc3RhcnQsIG1heF9kZXZfc3FyID0gLTEuMDsgaSA8IGVuZDsgaSsrKSB7XG5cbiAgICAgICAgICB4MTMgPSBzb3VyY2VbaV0ubG5nKCkgLSBzb3VyY2Vbc3RhcnRdLmxuZygpO1xuICAgICAgICAgIHkxMyA9IHNvdXJjZVtpXS5sYXQoKSAtIHNvdXJjZVtzdGFydF0ubGF0KCk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHgxMykgPiAxODAuMCkgeDEzID0gMzYwLjAgLSBNYXRoLmFicyh4MTMpO1xuICAgICAgICAgIHgxMyAqPSBNYXRoLmNvcyhGICogKHNvdXJjZVtpXS5sYXQoKSArIHNvdXJjZVtzdGFydF0ubGF0KCkpKTtcbiAgICAgICAgICBkMTMgPSAoeDEzICogeDEzKSArICh5MTMgKiB5MTMpO1xuXG4gICAgICAgICAgeDIzID0gc291cmNlW2ldLmxuZygpIC0gc291cmNlW2VuZF0ubG5nKCk7XG4gICAgICAgICAgeTIzID0gc291cmNlW2ldLmxhdCgpIC0gc291cmNlW2VuZF0ubGF0KCk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHgyMykgPiAxODAuMCkgeDIzID0gMzYwLjAgLSBNYXRoLmFicyh4MjMpO1xuICAgICAgICAgIHgyMyAqPSBNYXRoLmNvcyhGICogKHNvdXJjZVtpXS5sYXQoKSArIHNvdXJjZVtlbmRdLmxhdCgpKSk7XG4gICAgICAgICAgZDIzID0gKHgyMyAqIHgyMykgKyAoeTIzICogeTIzKTtcblxuICAgICAgICAgIGlmIChkMTMgPj0gKGQxMiArIGQyMykpIGRldl9zcXIgPSBkMjM7XG4gICAgICAgICAgZWxzZSBpZiAoZDIzID49IChkMTIgKyBkMTMpKSBkZXZfc3FyID0gZDEzO1xuICAgICAgICAgIGVsc2UgZGV2X3NxciA9ICh4MTMgKiB5MTIgLSB5MTMgKiB4MTIpICogKHgxMyAqIHkxMiAtIHkxMyAqIHgxMikgLyBkMTI7IC8vIHNvbHZlIHRyaWFuZ2xlXG4gICAgICAgICAgaWYgKGRldl9zcXIgPiBtYXhfZGV2X3Nxcikge1xuICAgICAgICAgICAgc2lnID0gaTtcbiAgICAgICAgICAgIG1heF9kZXZfc3FyID0gZGV2X3NxcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF4X2Rldl9zcXIgPCBiYW5kX3NxcikgeyAvKiBpcyB0aGVyZSBhIHNpZy4gaW50ZXJtZWRpYXRlIHBvaW50ID8gKi9cbiAgICAgICAgICAvKiAuLi4gbm8sIHNvIHRyYW5zZmVyIGN1cnJlbnQgc3RhcnQgcG9pbnQgKi9cbiAgICAgICAgICBpbmRleFtuX2Rlc3RdID0gc3RhcnQ7XG4gICAgICAgICAgbl9kZXN0Kys7XG4gICAgICAgIH0gZWxzZSB7IC8qIC4uLiB5ZXMsIHNvIHB1c2ggdHdvIHN1Yi1zZWN0aW9ucyBvbiBzdGFjayBmb3IgZnVydGhlciBwcm9jZXNzaW5nICovXG4gICAgICAgICAgbl9zdGFjaysrO1xuICAgICAgICAgIHNpZ19zdGFydFtuX3N0YWNrIC0gMV0gPSBzaWc7XG4gICAgICAgICAgc2lnX2VuZFtuX3N0YWNrIC0gMV0gPSBlbmQ7XG4gICAgICAgICAgbl9zdGFjaysrO1xuICAgICAgICAgIHNpZ19zdGFydFtuX3N0YWNrIC0gMV0gPSBzdGFydDtcbiAgICAgICAgICBzaWdfZW5kW25fc3RhY2sgLSAxXSA9IHNpZztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLyogLi4uIG5vIGludGVybWVkaWF0ZSBwb2ludHMsIHNvIHRyYW5zZmVyIGN1cnJlbnQgc3RhcnQgcG9pbnQgKi9cbiAgICAgICAgaW5kZXhbbl9kZXN0XSA9IHN0YXJ0O1xuICAgICAgICBuX2Rlc3QrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiB0cmFuc2ZlciBsYXN0IHBvaW50ICovXG4gICAgaW5kZXhbbl9kZXN0XSA9IG5fc291cmNlIC0gMTtcbiAgICBuX2Rlc3QrKztcblxuICAgIC8qIG1ha2UgcmV0dXJuIGFycmF5ICovXG4gICAgdmFyIHIgPSBuZXcgQXJyYXkoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5fZGVzdDsgaSsrKVxuICAgICAgci5wdXNoKHNvdXJjZVtpbmRleFtpXV0pO1xuXG4gICAgcmV0dXJuIHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcIlBvaW50XCIsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbby5sbmcsIG8ubGF0XVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gaHR0cDovL3d3dy5tb3ZhYmxlLXR5cGUuY28udWsvc2NyaXB0cy9sYXRsb25nLmh0bWwjZGVzdFBvaW50XG4gIGdqdS5kZXN0aW5hdGlvblBvaW50ID0gZnVuY3Rpb24gKHB0LCBicm5nLCBkaXN0KSB7XG4gICAgZGlzdCA9IGRpc3QvNjM3MTsgIC8vIGNvbnZlcnQgZGlzdCB0byBhbmd1bGFyIGRpc3RhbmNlIGluIHJhZGlhbnNcbiAgICBicm5nID0gZ2p1Lm51bWJlclRvUmFkaXVzKGJybmcpO1xuXG4gICAgdmFyIGxvbjEgPSBnanUubnVtYmVyVG9SYWRpdXMocHQuY29vcmRpbmF0ZXNbMF0pO1xuICAgIHZhciBsYXQxID0gZ2p1Lm51bWJlclRvUmFkaXVzKHB0LmNvb3JkaW5hdGVzWzFdKTtcblxuICAgIHZhciBsYXQyID0gTWF0aC5hc2luKCBNYXRoLnNpbihsYXQxKSpNYXRoLmNvcyhkaXN0KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGxhdDEpKk1hdGguc2luKGRpc3QpKk1hdGguY29zKGJybmcpICk7XG4gICAgdmFyIGxvbjIgPSBsb24xICsgTWF0aC5hdGFuMihNYXRoLnNpbihicm5nKSpNYXRoLnNpbihkaXN0KSpNYXRoLmNvcyhsYXQxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGRpc3QpLU1hdGguc2luKGxhdDEpKk1hdGguc2luKGxhdDIpKTtcbiAgICBsb24yID0gKGxvbjIrMypNYXRoLlBJKSAlICgyKk1hdGguUEkpIC0gTWF0aC5QSTsgIC8vIG5vcm1hbGlzZSB0byAtMTgwLi4rMTgwwrpcblxuICAgIHJldHVybiB7XG4gICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbZ2p1Lm51bWJlclRvRGVncmVlKGxvbjIpLCBnanUubnVtYmVyVG9EZWdyZWUobGF0MildXG4gICAgfTtcbiAgfTtcblxufSkoKTtcbiIsInZhciBnZXRDdXJyZW50TG9jYXRpb24gPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgdmFyIGdlb2xvY2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yLmdlb2xvY2F0aW9uXG4gIHZhciBvcHRpb25zID0ge1xuICAgIGVuYWJsZUhpZ2hBY2N1cmFjeTogdHJ1ZSxcbiAgICBtYXhpbXVtQWdlOiA1MDAwXG4gIH1cblxuICBpZiAoZ2VvbG9jYXRvcikge1xuICAgIGdlb2xvY2F0b3IuZ2V0Q3VycmVudFBvc2l0aW9uKHN1Y2Nlc3MsIGVycm9yLCBvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgZ2VvbG9jYXRpb24nKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q3VycmVudExvY2F0aW9uXG4iLCJ2YXIgR09PR0xFX01BUFNfVVJMID0gJ2h0dHA6Ly9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2dlb2NvZGUvanNvbidcblxudmFyIGdlb2NvZGUgPSBmdW5jdGlvbiAoYWRkcmVzcywgY2FsbGJhY2spIHtcbiAgdmFyIHBhcmFtcyA9IHtcbiAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgIHNlbnNvcjogIGZhbHNlXG4gIH1cblxuICB2YXIgdXJsID0gR09PR0xFX01BUFNfVVJMICsgJz8nICsgJC5wYXJhbShwYXJhbXMpXG5cbiAgJC5hamF4KHVybCwgeyBzdWNjZXNzOiBjYWxsYmFjayB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlb2NvZGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxudmFyIE1BUF9BVFRSSUJVVElPTiA9ICdNYXAgdGlsZXMgYnkgPGEgaHJlZj1cImh0dHA6Ly9zdGFtZW4uY29tXCI+U3RhbWVuIERlc2lnbjwvYT4sIHVuZGVyIDxhIGhyZWY9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS8zLjBcIj5DQyBCWSAzLjA8L2E+LiBEYXRhIGJ5IDxhIGhyZWY9XCJodHRwOi8vb3BlbnN0cmVldG1hcC5vcmdcIj5PcGVuU3RyZWV0TWFwPC9hPiwgdW5kZXIgPGEgaHJlZj1cImh0dHA6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvY29weXJpZ2h0XCI+T0RiTDwvYT4uJ1xudmFyIFRJTEVfTEFZRVJfVVJMID0gJ2h0dHA6Ly90aWxlLnN0YW1lbi5jb20vdG9uZXIve3p9L3t4fS97eX0ucG5nJ1xuXG4vLyBSZXRpbmEgdGlsZXNcbmlmICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+IDEpIHtcbiAgVElMRV9MQVlFUl9VUkwgPSAnaHR0cDovL3RpbGUuc3RhbWVuLmNvbS90b25lci97en0ve3h9L3t5fUAyeC5wbmcnXG59XG5cbnZhciBSRUdJT05fTEFZRVJfU1RZTEUgPXtcbiAgY29sb3I6ICcjZjExJyxcbiAgd2VpZ2h0OiA1LFxuICBvcGFjaXR5OiAwLjFcbn1cblxudmFyIE1hcCA9IGZ1bmN0aW9uIChqc29uKSB7XG4gIHRoaXMuanNvbiA9IGpzb25cblxuICB0aGlzLm1hcCA9IEwubWFwKCdtYXAnLCB7XG4gICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgIHRvdWNoWm9vbTogZmFsc2UsXG4gICAgc2Nyb2xsV2hlZWxab29tOiBmYWxzZSxcbiAgICBkb3VibGVDbGlja1pvb206IGZhbHNlLFxuICAgIGJveFpvb206IGZhbHNlLFxuICAgIGNsb3NlUG9wdXBPbkNsaWNrOiBmYWxzZSxcbiAgICBrZXlib2FyZDogZmFsc2UsXG4gICAgem9vbUNvbnRyb2w6IGZhbHNlXG4gIH0pXG5cbiAgdGhpcy5tYXJrZXJzID0gW11cbn1cblxudmFyIG1hcmtlckljb24gPSBMLmljb24oe1xuICBpY29uVXJsOiAnL2ltZy9tYXJrZXIuc3ZnJyxcbiAgc2hhZG93VXJsOiAnL2ltZy9tYXJrZXJfc2hhZG93LnBuZycsXG5cbiAgaWNvblNpemU6ICAgICBbMzYsIDQzXSwgLy8gc2l6ZSBvZiB0aGUgaWNvblxuICBzaGFkb3dTaXplOiAgIFsxMDAsIDUwXSxcbiAgaWNvbkFuY2hvcjogICBbMTgsIDQzXSwgLy8gcG9pbnQgb2YgdGhlIGljb24gd2hpY2ggd2lsbCBjb3JyZXNwb25kIHRvIG1hcmtlcidzIGxvY2F0aW9uXG4gIHNoYWRvd0FuY2hvcjogWzQwLCA0NF0sXG4gIHBvcHVwQW5jaG9yOiAgWzAsIC01MF0gLy8gcG9pbnQgZnJvbSB3aGljaCB0aGUgcG9wdXAgc2hvdWxkIG9wZW4gcmVsYXRpdmUgdG8gdGhlIGljb25BbmNob3Jcbn0pXG5cbk1hcC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICBMLnRpbGVMYXllcihUSUxFX0xBWUVSX1VSTCwge1xuICAgIGF0dHJpYnV0aW9uOiBNQVBfQVRUUklCVVRJT04sXG4gICAgbWF4Wm9vbTogMjNcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgTC5nZW9Kc29uKHRoaXMuanNvbiwge1xuICAgIHN0eWxlOiBSRUdJT05fTEFZRVJfU1RZTEVcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgdGhpcy5yZXNldCgpXG59XG5cbk1hcC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucmVtb3ZlTWFya2VycygpXG4gIHRoaXMuc2V0TG9jYXRpb24oY29uZmlnLmxhdGl0dWRlLCBjb25maWcubG9uZ2l0dWRlLCBjb25maWcuaW5pdGlhbFpvb20pXG4gIHRoaXMubWFwLmNsb3NlUG9wdXAoKVxuICB0aGlzLm1hcC5kcmFnZ2luZy5kaXNhYmxlKClcbn1cblxuTWFwLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIChsYXQsIGxuZywgem9vbSkge1xuICB0aGlzLm1hcC5zZXRWaWV3KFtsYXQsIGxuZ10sIHpvb20pXG4gIHRoaXMubWFwLmRyYWdnaW5nLmVuYWJsZSgpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlTWFya2VyID0gZnVuY3Rpb24gKGxhdCwgbG5nKSB7XG4gIHZhciBtYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsbmddLCB7XG4gICAgaWNvbjogbWFya2VySWNvbixcbiAgICBjbGlja2FibGU6IGZhbHNlXG4gIH0pLmFkZFRvKHRoaXMubWFwKVxuICB0aGlzLm1hcmtlcnMucHVzaChtYXJrZXIpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlUG9wdXAgPSBmdW5jdGlvbiAobGF0LCBsbmcsIGFuc3dlciwgZGV0YWlsKSB7XG4gIHZhciBwb3B1cCA9IEwucG9wdXAoe1xuICAgIGF1dG9QYW46IHRydWUsXG4gICAgY2xvc2VCdXR0b246IGZhbHNlLFxuICAgIGF1dG9QYW5QYWRkaW5nOiBbMTAsMTBdXG4gIH0pXG4gIC5zZXRMYXRMbmcoW2xhdCwgbG5nXSlcbiAgLnNldENvbnRlbnQoJzxoMT4nICsgYW5zd2VyICsgJzwvaDE+PHA+JyArIGRldGFpbCArICc8L3A+PGJ1dHRvbiBpZD1cInJlc2V0LWJ1dHRvblwiPkFnYWluPzwvYnV0dG9uPicpXG4gIC5vcGVuT24odGhpcy5tYXApXG59XG5cbk1hcC5wcm90b3R5cGUucmVtb3ZlTWFya2VycyA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1hcmtlcnMubGVuZ3RoOyBpKyspIHtcbiAgICB0aGlzLm1hcC5yZW1vdmVMYXllcih0aGlzLm1hcmtlcnNbaV0pXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNYXBcbiJdfQ==
