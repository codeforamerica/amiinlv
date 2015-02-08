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
      reset()
      break
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
      window.location = '/?query=' + encodeURIcomponent(address)
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
  responseNo: 'You are not in Las Vegas!'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9zcmMvYXBwbGljYXRpb24uanMiLCIuLi8uLi9jb25maWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi11dGlscy9nZW9qc29uLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2N1cnJlbnRfbG9jYXRpb24uanMiLCIuLi8uLi9zcmMvZ2VvY29kZS5qcyIsIi4uLy4uL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2p1ID0gcmVxdWlyZSgnZ2VvanNvbi11dGlscycpXG52YXIgZ2VvY29kZUFkZHJlc3MgPSByZXF1aXJlKCcuL2dlb2NvZGUnKVxudmFyIGdldEN1cnJlbnRMb2NhdGlvbiA9IHJlcXVpcmUoJy4vY3VycmVudF9sb2NhdGlvbicpXG52YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAnKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG5cbnZhciBqc29uID0ge31cbnZhciBtYXBcbnZhciBsYXRpdHVkZVxudmFyIGxvbmdpdHVkZVxuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNQVAgVkFSSUFCTEVTXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIGFwcGxpY2F0aW9uIGFuZCBzZXRzXG4gKiBldmVudCBsaXN0ZW5lcnNcbiAqL1xuXG5mdW5jdGlvbiBwcmVJbml0ICgpIHtcbiAgcm91dGVyKClcblxuICAvLyBSZXF1ZXN0cyBicm93c2VyJ3MgcGVybWlzc2lvbiB0byB1c2VcbiAgLy8gZ2VvbG9jYXRvciB1cG9uIHBhZ2UgbG9hZCwgaWYgbmVjZXNzYXJ5XG4gIGNhY2hlQ3VycmVudExvY2F0aW9uKClcbn1cblxuZnVuY3Rpb24gaW5pdCAoZGF0YSkge1xuICAvKiBnbG9iYWwganNvbiwgbWFwICovXG4gIGpzb24gPSBkYXRhXG4gIG1hcCA9IG5ldyBNYXAoZGF0YSlcblxuICAkKCcjaW5wdXQtdGFyZ2V0Jykub24oJ2NsaWNrJywgb25HZXRDdXJyZW50TG9jYXRpb24pXG4gICQoJyNpbnB1dC1nbycpLm9uKCdjbGljaycsIG9uR28pXG4gICQoJyNsb2NhdGlvbi1mb3JtJykub24oJ3N1Ym1pdCcsIG9uU3VibWl0KVxuICAkKGRvY3VtZW50KS5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUud2hpY2ggPT0gMjcgJiYgZS5jdHJsS2V5ID09IGZhbHNlICYmIGUubWV0YUtleSA9PSBmYWxzZSkgcmVzZXQoKVxuICB9KVxuICAkKCcjYWJvdXQtbGluaycpLm9uKCdjbGljaycsIG9uQ2xpY2tBYm91dExpbmspXG4gICQoJyNhYm91dC1jbG9zZScpLm9uKCdjbGljaycsIG9uQ2xpY2tBYm91dENsb3NlKVxuXG4gICQoJy5kaXNtaXNzLWllLWJyb3dzZXInKS5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICQoJy5pZS1icm93c2VyJykuaGlkZSgpXG4gIH0pXG5cbiAgJCgnI2lucHV0LWxvY2F0aW9uJykuZm9jdXMoKVxuICBtYXAucmVuZGVyKClcblxuICAkKCcjbWFwJykuYWRkQ2xhc3MoJ25vLXBhbm5pbmcnKVxufVxuXG4vKipcbiAqIENoZWNrcyBwYWdlIHJvdXRlIGFuZCBhY3RzIGFjY29yZGluZ2x5XG4gKi9cblxuZnVuY3Rpb24gcm91dGVyICgpIHtcbiAgdmFyIHEgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKVxuXG4gIHN3aXRjaCAocSkge1xuICAgIGNhc2UgJ2Fib3V0JzpcbiAgICAgIGFib3V0T3Blbkluc3RhbnRhbmVvdXNseSgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2xvY2F0ZSc6XG4gICAgICBvbkdldEN1cnJlbnRMb2NhdGlvbigpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgIC8vIC9xdWVyeT14IHdoZXJlIHggaXMgdGhlIGFkZHJlc3MgdG8gZ2VvY29kZVxuICAgICAgLy8gdGhpcyBpcyB0b3RhbGx5IGJyb2tlbiBiZWNhdXNlIHN3aXRjaCBjYXNlIG1hdGNoaW5nIGlzbid0IGRvbmUgb24gcGFydGlhbCBzdHJpbmdcbiAgICAgIHZhciBmaW5kZ2VvID0gcS5zdWJzdHIocS5pbmRleE9mKCc9JykpXG4gICAgICBpZiAoZmluZGdlbykge1xuICAgICAgICBnZW9jb2RlQnlBZGRyZXNzKGZpbmRnZW8pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc2V0KClcbiAgICAgIGJyZWFrXG4gIH1cbn1cblxuLyoqXG4gKiBSZXNldHMgdGhlIGFwcGxpY2F0aW9uIHRvIGl0cyBpbml0aWFsIHN0YXRlXG4gKi9cblxuZnVuY3Rpb24gcmVzZXQgKCkge1xuICAkKCcjaW5wdXQtbG9jYXRpb24nKS52YWwoJycpXG4gICQoJyNhbGVydCcpLmhpZGUoKVxuICBhYm91dENsb3NlKClcbiAgJCgnI3F1ZXN0aW9uJykuZmFkZUluKDE1MClcbiAgJCgnI2lucHV0LWxvY2F0aW9uJykuZm9jdXMoKVxuICAkKCcjbWFwJykuYWRkQ2xhc3MoJ25vLXBhbm5pbmcnKVxuXG4gIC8vIFJlc2V0IFVSTFxuICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICdob21lJywgJy8nKVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5sb2NhdGlvbiA9ICcvJ1xuICB9XG5cbiAgLy8gUmVzZXQgbWFwIGlmIGluaXRpYWxpemVkXG4gIGlmIChtYXApIHtcbiAgICBtYXAucmVzZXQoKVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpY2tSZXNldCAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcbiAgcmVzZXQoKVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGFuc3dlciBhbmQgZHJvcHMgdGhlIHBpbiBvbiB0aGUgbWFwXG4gKi9cblxuZnVuY3Rpb24gc2V0QW5zd2VyIChhbnN3ZXIpIHtcbiAgLy8gSW5jbHVkZSBhIG1lc3NhZ2UgcHJvdmlkaW5nIGZ1cnRoZXIgaW5mb3JtYXRpb24uXG4gIC8vIEN1cnJlbnRseSwgaXQncyBqdXN0IGEgc2ltcGxlIHJlc3RhdGVtZW50IG9mIHRoZVxuICAvLyBhbnN3ZXIuICBTZWUgR2l0SHViIGlzc3VlICM2LlxuICB2YXIgZGV0YWlsXG4gIGlmIChhbnN3ZXIgPT0gJ1llcycpIHtcbiAgICBkZXRhaWwgPSBjb25maWcucmVzcG9uc2VZZXNcbiAgfSBlbHNlIHtcbiAgICBkZXRhaWwgPSBjb25maWcucmVzcG9uc2VOb1xuICB9XG5cbiAgbWFwLmNyZWF0ZU1hcmtlcihsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICBtYXAuY3JlYXRlUG9wdXAobGF0aXR1ZGUsIGxvbmdpdHVkZSwgYW5zd2VyLCBkZXRhaWwpXG4gIG1hcC5zZXRMb2NhdGlvbihsYXRpdHVkZSwgbG9uZ2l0dWRlLCBjb25maWcuZmluYWxab29tKVxuXG4gICQoJyNtYXAnKS5yZW1vdmVDbGFzcygnbm8tcGFubmluZycpXG5cbiAgLy8gTGVhZmxldCBzdG9wcyBldmVudCBwcm9wYWdhdGlvbiBpbiBtYXAgZWxlbWVudHMsIHNvIHRoaXMgZXZlbnRcbiAgLy8gbmVlZHMgdG8gYmUgYm91bmQgdG8gYW5vdGhlciBvbmUgb2YgdGhlIGlubmVyIHdyYXBwZXJzIGFmdGVyIGl0XG4gIC8vIGlzIGNyZWF0ZWRcbiAgJCgnI3Jlc2V0LWJ1dHRvbicpLm9uKCdjbGljaycsIG9uQ2xpY2tSZXNldClcblxuICAkKCcjcXVlc3Rpb24nKS5mYWRlT3V0KDI1MClcbn1cblxuLyoqXG4gKiBDaGVja3MgdG8gc2VlIHdoZXRoZXIgYSBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlXG4gKiBmYWxsIHdpdGhpbiB0aGUgbGltaXRzIHByb3ZpZGVkIGluIHJlZ2lvbi5qc29uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2xhdGl0dWRlXSB0aGUgbGF0aXR1ZGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbbG9uZ2l0dWRlXSB0aGUgbG9uZ2l0dWRlXG4gKi9cblxuZnVuY3Rpb24gY2hlY2tXaXRoaW5MaW1pdHMgKGxhdGl0dWRlLCBsb25naXR1ZGUpIHtcbiAgdmFyIHBvaW50ID0ge1xuICAgIHR5cGU6ICdQb2ludCcsXG4gICAgY29vcmRpbmF0ZXM6IFsgbG9uZ2l0dWRlLCBsYXRpdHVkZSBdXG4gIH1cbiAgdmFyIHBvbHlnb24gPSBqc29uLmZlYXR1cmVzWzBdLmdlb21ldHJ5XG4gIHZhciB3aXRoaW5MaW1pdHMgPSBnanUucG9pbnRJblBvbHlnb24ocG9pbnQsIHBvbHlnb24pXG5cbiAgaWYgKHdpdGhpbkxpbWl0cykge1xuICAgIG9uV2l0aGluTGltaXRzKClcbiAgfSBlbHNlIHtcbiAgICBvbk91dHNpZGVMaW1pdHMoKVxuICB9XG59XG5cbi8qKlxuICogRGlzcGxheXMgYW4gYW5zd2VyIHRoYXQgc3BlY2lmaWVzIHRoYXQgdGhlIGxvY2F0aW9uXG4gKiBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uV2l0aGluTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKCdZZXMnKVxufVxuXG4vKipcbiAqIERpc3BsYXlzIGFuIGFuc3dlciB0aGF0IHNwZWNpZmllcyB0aGF0IHRoZSBsb2NhdGlvblxuICogaXMgbm90IHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25PdXRzaWRlTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKCdObycpXG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiwgYW5kIGNoZWNrcyB3aGV0aGVyXG4gKiBpdCBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uR2V0Q3VycmVudExvY2F0aW9uICgpIHtcbiAgZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uKClcbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogU3VibWl0cyB0aGUgZm9ybSwgZ2VvY29kZXMgdGhlIGFkZHJlc3MsIGFuZCBjaGVja3NcbiAqIHdoZXRoZXIgaXQgaXMgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvbkdvICgpIHtcbiAgc3VibWl0TG9jYXRpb24oKVxufVxuXG4vKipcbiAqIFN1Ym1pdHMgdGhlIGZvcm0sIGdlb2NvZGVzIHRoZSBhZGRyZXNzLCBhbmQgY2hlY2tzXG4gKiB3aGV0aGVyIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25TdWJtaXQgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHN1Ym1pdExvY2F0aW9uKClcbn1cblxuLyoqXG4gKiBTdWJtaXRzIGZvcm1cbiAqL1xuZnVuY3Rpb24gc3VibWl0TG9jYXRpb24gKCkge1xuICB2YXIgJGlucHV0ID0gJCgnI2lucHV0LWxvY2F0aW9uJylcbiAgdmFyIGFkZHJlc3MgPSAkaW5wdXQudmFsKClcbiAgaWYgKGFkZHJlc3MgIT0gJycpIHtcbiAgICBnZW9jb2RlQnlBZGRyZXNzKGFkZHJlc3MpXG5cbiAgICBpZiAoTW9kZXJuaXpyLmhpc3RvcnkpIHtcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ3F1ZXJ5JywgJy8/cXVlcnk9JyArIGVuY29kZVVSSUNvbXBvbmVudChhZGRyZXNzKSlcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uID0gJy8/cXVlcnk9JyArIGVuY29kZVVSSWNvbXBvbmVudChhZGRyZXNzKVxuICAgIH1cblxuICB9IGVsc2Uge1xuICAgICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKClcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgJCgnI2lucHV0LWxvY2F0aW9uJykuYW5pbWF0ZSh7YmFja2dyb3VuZENvbG9yOiAnI2ZlZSd9LCAxMDApLmFuaW1hdGUoe2JhY2tncm91bmRDb2xvcjogJyNmZmYnfSwgMTAwKVxuICAgIH1cbiAgICAkKCcjYWxlcnQnKS5odG1sKCdQbGVhc2UgZW50ZXIgYW4gYWRkcmVzcycpLnNsaWRlRG93bigxMDApXG4gIH1cbiAgcmV0dXJuIGZhbHNlXG59XG5cbi8qKlxuICogSW5pdGlhbCBjdXJyZW50IGxvY2F0aW9uIGNhY2hlXG4gKi9cblxuZnVuY3Rpb24gY2FjaGVDdXJyZW50TG9jYXRpb24gKCkge1xuICB2YXIgb25TdWNjZXNzID0gZnVuY3Rpb24gKHBvc2l0aW9uKSB7XG4gICAgLyogZ2xvYmFsIGxhdGl0dWRlLCBsb25naXR1ZGUgKi9cbiAgICBsYXRpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZVxuICAgIGxvbmdpdHVkZSA9IHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGVcbiAgfVxuXG4gIC8vIERvIG5vdGhpbmcgaWYgd2UgYXJlIHVuYWJsZSB0byBkbyBnZW9sb2NhdGlvblxuICAvLyBObyBlcnJvciBjYWxsYmFja1xuXG4gIGdldEN1cnJlbnRMb2NhdGlvbihvblN1Y2Nlc3MpXG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiBhbmQgY2hlY2tzIHdoZXRoZXIgaXQgaXNcbiAqIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uICgpIHtcbiAgdmFyIG9uU3VjY2VzcyA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xuICAgIC8qIGdsb2JhbCBsYXRpdHVkZSwgbG9uZ2l0dWRlICovXG4gICAgbGF0aXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGVcbiAgICBsb25naXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlXG4gICAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSlcbiAgfVxuXG4gIHZhciBvbkVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICAgIGFsZXJ0KCdFcnJvciBnZXR0aW5nIGN1cnJlbnQgcG9zaXRpb24uIEdlb2xvY2F0aW9uIG1heSBiZSBkaXNhYmxlZCBvbiB0aGlzIGJyb3dzZXIuJylcbiAgfVxuXG4gIGdldEN1cnJlbnRMb2NhdGlvbihvblN1Y2Nlc3MsIG9uRXJyb3IpXG59XG5cbi8qKlxuICogR2VvY29kZXMgYW4gYWRkcmVzc1xuICovXG5cbmZ1bmN0aW9uIGdlb2NvZGVCeUFkZHJlc3MgKGFkZHJlc3MpIHtcbiAgZ2VvY29kZUFkZHJlc3MoYWRkcmVzcywgZnVuY3Rpb24gKHJlcykge1xuICAgIC8qIGdsb2JhbCBsYXRpdHVkZSwgbG9uZ2l0dWRlICovXG4gICAgaWYgKHJlcyAmJiByZXMucmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gcmVzLnJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb25cblxuICAgICAgbGF0aXR1ZGUgPSByZXN1bHQubGF0XG4gICAgICBsb25naXR1ZGUgPSByZXN1bHQubG5nXG4gICAgICBjaGVja1dpdGhpbkxpbWl0cyhsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICAgIH1cbiAgfSlcbn1cblxuLyoqXG4gKiBPcGVucyBhYm91dCB3aW5kb3dcbiAqL1xuXG5mdW5jdGlvbiBvbkNsaWNrQWJvdXRMaW5rIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuXG4gIGlmIChNb2Rlcm5penIuaGlzdG9yeSkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJ2Fib3V0JywgJz9hYm91dCcpXG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmxvY2F0aW9uID0gJz9hYm91dCdcbiAgfVxuXG4gIGFib3V0T3BlbigpXG59XG5cbmZ1bmN0aW9uIGFib3V0T3BlbiAoKSB7XG4gICQoJyNsb2NhdGlvbi1mb3JtJykuZmFkZU91dCgyMDAsIGZ1bmN0aW9uICgpIHtcbiAgICAkKCcjYWJvdXQnKS5mYWRlSW4oMjAwKVxuICB9KVxufVxuXG4vKipcbiAqIE9wZW5zIGFib3V0IHdpbmRvdywgd2l0aG91dCBhbmltYXRpb25cbiAqL1xuXG5mdW5jdGlvbiBhYm91dE9wZW5JbnN0YW50YW5lb3VzbHkgKCkge1xuICAkKCcjbG9jYXRpb24tZm9ybScpLmhpZGUoKVxuICAkKCcjYWJvdXQnKS5zaG93KClcbn1cblxuLyoqXG4gKiBDbG9zZXMgYWJvdXQgd2luZG93XG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0Fib3V0Q2xvc2UgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHJlc2V0KClcbn1cblxuZnVuY3Rpb24gYWJvdXRDbG9zZSAoKSB7XG4gICQoJyNhYm91dCcpLmZhZGVPdXQoMjAwLCBmdW5jdGlvbiAoKSB7XG4gICAgJCgnI2xvY2F0aW9uLWZvcm0nKS5mYWRlSW4oMjAwKVxuICB9KVxufVxuXG4vKipcbiAqIERldGVybWluZSB3aGF0IG5lZWRzIHRvIGJlIGRvbmUgYmFzZWQgb24gVVJJXG4gKi9cblxucHJlSW5pdCgpXG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSByZWdpb24uanNvbiBmaWxlIGFuZCBpbml0aWFsaXplc1xuICogdGhlIGFwcGxpY2F0aW9uXG4gKi9cblxualF1ZXJ5KGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG4gICQuZ2V0SlNPTihjb25maWcuZmlsZU5hbWUsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaW5pdChkYXRhKVxuICB9KVxufSlcbiIsInZhciBjb25maWcgPSB7XG4gIG5hbWU6ICdMYXMgVmVnYXMnLFxuICBhZGRyZXNzOiAnNDk1IFMuIExhcyBWZWdhcyBCbHZkJyxcbiAgbGF0aXR1ZGU6IDM2LjE4LFxuICBsb25naXR1ZGU6IC0xMTUuMTgsXG4gIGluaXRpYWxab29tOiAxMyxcbiAgZmluYWxab29tOiAxNCxcbiAgZmlsZU5hbWU6ICcvZGF0YS9yZWdpb24uZ2VvanNvbicsXG4gIHRhZ2xpbmU6ICdCZWNhdXNlIHRoZSBjaXR5IGJvdW5kYXJpZXMgYXJlIGEgbG90IHdlaXJkZXIgdGhhbiB5b3UgdGhpbmsuJyxcbiAgYWJvdXQ6ICdMYXMgVmVnYXMgaXMgb25lIG9mIHRoZSBtb3N0IHZpc2l0ZWQgY2l0aWVzIGluIHRoZSB3b3JsZCwgYW5kIHlldCBpdHMgbW9zdCBmYW1vdXMgZGVzdGluYXRpb24mbWRhc2g7YSA2LjhrbSBib3VsZXZhcmQgb2YgZXh0cmF2YWdhbnRseSB0aGVtZWQgY2FzaW5vcyBjb21tb25seSBrbm93biBhcyDigJhUaGUgU3RyaXDigJkmbWRhc2g7aXMgYWN0dWFsbHkgbG9jYXRlZCBvdXRzaWRlIG9mIExhcyBWZWdhcyBjaXR5IGxpbWl0cy4gIFRvIGFkZCB0byB0aGUgY29uZnVzaW9uLCB0aGUgY2l0eeKAmXMgdHJ1ZSBib3JkZXJzIGFyZSBvZnRlbiBqYWdnZWQgYW5kIGZ1bGwgb2Ygc21hbGwgaG9sZXMuICBMb2NhbCByZXNpZGVudHMgbWF5IHN0aWxsIHJlY2VpdmUgbWFpbCBhdCBhIHZhbGlkIExhcyBWZWdhcyBhZGRyZXNzLCBhY2NvcmRpbmcgdG8gdGhlIFUuUy4gUG9zdGFsIFNlcnZpY2UsIGV2ZW4gaWYgdGhleSBhcmUgdW5kZXIgdGhlIGp1cmlzZGljdGlvbiBvZiBvbmUgb2YgdGhlIHN1cnJvdW5kaW5nIHVuaW5jb3Jwb3JhdGVkIGNvbW11bml0aWVzIHRocm91Z2hvdXQgQ2xhcmsgQ291bnR5LiAgQXMgYSByZXN1bHQsIHRoZSBDaXR5IG9mIExhcyBWZWdhcyByZXF1aXJlcyByZXNpZGVudHMgdmVyaWZ5IHRoYXQgdGhleSByZXNpZGUgd2l0aGluIGNpdHkgbGltaXRzIHRvIHJlY2VpdmUgY2l0eSBzZXJ2aWNlcy4nLFxuICByZXNwb25zZVllczogJ1lvdSBhcmUgd2l0aGluIGNpdHkgbGltaXRzIScsXG4gIHJlc3BvbnNlTm86ICdZb3UgYXJlIG5vdCBpbiBMYXMgVmVnYXMhJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbmZpZ1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGdqdSA9IHRoaXMuZ2p1ID0ge307XG5cbiAgLy8gRXhwb3J0IHRoZSBnZW9qc29uIG9iamVjdCBmb3IgKipDb21tb25KUyoqXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ2p1O1xuICB9XG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly93d3cua2V2bGluZGV2LmNvbS9ndWkvbWF0aC9pbnRlcnNlY3Rpb24vSW50ZXJzZWN0aW9uLmpzXG4gIGdqdS5saW5lU3RyaW5nc0ludGVyc2VjdCA9IGZ1bmN0aW9uIChsMSwgbDIpIHtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IGwxLmNvb3JkaW5hdGVzLmxlbmd0aCAtIDI7ICsraSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPD0gbDIuY29vcmRpbmF0ZXMubGVuZ3RoIC0gMjsgKytqKSB7XG4gICAgICAgIHZhciBhMSA9IHtcbiAgICAgICAgICB4OiBsMS5jb29yZGluYXRlc1tpXVsxXSxcbiAgICAgICAgICB5OiBsMS5jb29yZGluYXRlc1tpXVswXVxuICAgICAgICB9LFxuICAgICAgICAgIGEyID0ge1xuICAgICAgICAgICAgeDogbDEuY29vcmRpbmF0ZXNbaSArIDFdWzFdLFxuICAgICAgICAgICAgeTogbDEuY29vcmRpbmF0ZXNbaSArIDFdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICBiMSA9IHtcbiAgICAgICAgICAgIHg6IGwyLmNvb3JkaW5hdGVzW2pdWzFdLFxuICAgICAgICAgICAgeTogbDIuY29vcmRpbmF0ZXNbal1bMF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGIyID0ge1xuICAgICAgICAgICAgeDogbDIuY29vcmRpbmF0ZXNbaiArIDFdWzFdLFxuICAgICAgICAgICAgeTogbDIuY29vcmRpbmF0ZXNbaiArIDFdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICB1YV90ID0gKGIyLnggLSBiMS54KSAqIChhMS55IC0gYjEueSkgLSAoYjIueSAtIGIxLnkpICogKGExLnggLSBiMS54KSxcbiAgICAgICAgICB1Yl90ID0gKGEyLnggLSBhMS54KSAqIChhMS55IC0gYjEueSkgLSAoYTIueSAtIGExLnkpICogKGExLnggLSBiMS54KSxcbiAgICAgICAgICB1X2IgPSAoYjIueSAtIGIxLnkpICogKGEyLnggLSBhMS54KSAtIChiMi54IC0gYjEueCkgKiAoYTIueSAtIGExLnkpO1xuICAgICAgICBpZiAodV9iICE9IDApIHtcbiAgICAgICAgICB2YXIgdWEgPSB1YV90IC8gdV9iLFxuICAgICAgICAgICAgdWIgPSB1Yl90IC8gdV9iO1xuICAgICAgICAgIGlmICgwIDw9IHVhICYmIHVhIDw9IDEgJiYgMCA8PSB1YiAmJiB1YiA8PSAxKSB7XG4gICAgICAgICAgICBpbnRlcnNlY3RzLnB1c2goe1xuICAgICAgICAgICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAgICAgICAgICdjb29yZGluYXRlcyc6IFthMS54ICsgdWEgKiAoYTIueCAtIGExLngpLCBhMS55ICsgdWEgKiAoYTIueSAtIGExLnkpXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpbnRlcnNlY3RzLmxlbmd0aCA9PSAwKSBpbnRlcnNlY3RzID0gZmFsc2U7XG4gICAgcmV0dXJuIGludGVyc2VjdHM7XG4gIH1cblxuICAvLyBCb3VuZGluZyBCb3hcblxuICBmdW5jdGlvbiBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMgKGNvb3Jkcykge1xuICAgIHZhciB4QWxsID0gW10sIHlBbGwgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHNbMF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHhBbGwucHVzaChjb29yZHNbMF1baV1bMV0pXG4gICAgICB5QWxsLnB1c2goY29vcmRzWzBdW2ldWzBdKVxuICAgIH1cblxuICAgIHhBbGwgPSB4QWxsLnNvcnQoZnVuY3Rpb24gKGEsYikgeyByZXR1cm4gYSAtIGIgfSlcbiAgICB5QWxsID0geUFsbC5zb3J0KGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGEgLSBiIH0pXG5cbiAgICByZXR1cm4gWyBbeEFsbFswXSwgeUFsbFswXV0sIFt4QWxsW3hBbGwubGVuZ3RoIC0gMV0sIHlBbGxbeUFsbC5sZW5ndGggLSAxXV0gXVxuICB9XG5cbiAgZ2p1LnBvaW50SW5Cb3VuZGluZ0JveCA9IGZ1bmN0aW9uIChwb2ludCwgYm91bmRzKSB7XG4gICAgcmV0dXJuICEocG9pbnQuY29vcmRpbmF0ZXNbMV0gPCBib3VuZHNbMF1bMF0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMV0gPiBib3VuZHNbMV1bMF0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMF0gPCBib3VuZHNbMF1bMV0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMF0gPiBib3VuZHNbMV1bMV0pIFxuICB9XG5cbiAgLy8gUG9pbnQgaW4gUG9seWdvblxuICAvLyBodHRwOi8vd3d3LmVjc2UucnBpLmVkdS9Ib21lcGFnZXMvd3JmL1Jlc2VhcmNoL1Nob3J0X05vdGVzL3BucG9seS5odG1sI0xpc3RpbmcgdGhlIFZlcnRpY2VzXG5cbiAgZnVuY3Rpb24gcG5wb2x5ICh4LHksY29vcmRzKSB7XG4gICAgdmFyIHZlcnQgPSBbIFswLDBdIF1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICB2ZXJ0LnB1c2goY29vcmRzW2ldW2pdKVxuICAgICAgfVxuXHQgIHZlcnQucHVzaChjb29yZHNbaV1bMF0pXG4gICAgICB2ZXJ0LnB1c2goWzAsMF0pXG4gICAgfVxuXG4gICAgdmFyIGluc2lkZSA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDAsIGogPSB2ZXJ0Lmxlbmd0aCAtIDE7IGkgPCB2ZXJ0Lmxlbmd0aDsgaiA9IGkrKykge1xuICAgICAgaWYgKCgodmVydFtpXVswXSA+IHkpICE9ICh2ZXJ0W2pdWzBdID4geSkpICYmICh4IDwgKHZlcnRbal1bMV0gLSB2ZXJ0W2ldWzFdKSAqICh5IC0gdmVydFtpXVswXSkgLyAodmVydFtqXVswXSAtIHZlcnRbaV1bMF0pICsgdmVydFtpXVsxXSkpIGluc2lkZSA9ICFpbnNpZGVcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zaWRlXG4gIH1cblxuICBnanUucG9pbnRJblBvbHlnb24gPSBmdW5jdGlvbiAocCwgcG9seSkge1xuICAgIHZhciBjb29yZHMgPSAocG9seS50eXBlID09IFwiUG9seWdvblwiKSA/IFsgcG9seS5jb29yZGluYXRlcyBdIDogcG9seS5jb29yZGluYXRlc1xuXG4gICAgdmFyIGluc2lkZUJveCA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChnanUucG9pbnRJbkJvdW5kaW5nQm94KHAsIGJvdW5kaW5nQm94QXJvdW5kUG9seUNvb3Jkcyhjb29yZHNbaV0pKSkgaW5zaWRlQm94ID0gdHJ1ZVxuICAgIH1cbiAgICBpZiAoIWluc2lkZUJveCkgcmV0dXJuIGZhbHNlXG5cbiAgICB2YXIgaW5zaWRlUG9seSA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChwbnBvbHkocC5jb29yZGluYXRlc1sxXSwgcC5jb29yZGluYXRlc1swXSwgY29vcmRzW2ldKSkgaW5zaWRlUG9seSA9IHRydWVcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zaWRlUG9seVxuICB9XG5cbiAgLy8gc3VwcG9ydCBtdWx0aSAoYnV0IG5vdCBkb251dCkgcG9seWdvbnNcbiAgZ2p1LnBvaW50SW5NdWx0aVBvbHlnb24gPSBmdW5jdGlvbiAocCwgcG9seSkge1xuICAgIHZhciBjb29yZHNfYXJyYXkgPSAocG9seS50eXBlID09IFwiTXVsdGlQb2x5Z29uXCIpID8gWyBwb2x5LmNvb3JkaW5hdGVzIF0gOiBwb2x5LmNvb3JkaW5hdGVzXG5cbiAgICB2YXIgaW5zaWRlQm94ID0gZmFsc2VcbiAgICB2YXIgaW5zaWRlUG9seSA9IGZhbHNlXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHNfYXJyYXkubGVuZ3RoOyBpKyspe1xuICAgICAgdmFyIGNvb3JkcyA9IGNvb3Jkc19hcnJheVtpXTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY29vcmRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghaW5zaWRlQm94KXtcbiAgICAgICAgICBpZiAoZ2p1LnBvaW50SW5Cb3VuZGluZ0JveChwLCBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMoY29vcmRzW2pdKSkpIHtcbiAgICAgICAgICAgIGluc2lkZUJveCA9IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghaW5zaWRlQm94KSByZXR1cm4gZmFsc2VcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY29vcmRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghaW5zaWRlUG9seSl7XG4gICAgICAgICAgaWYgKHBucG9seShwLmNvb3JkaW5hdGVzWzFdLCBwLmNvb3JkaW5hdGVzWzBdLCBjb29yZHNbal0pKSB7XG4gICAgICAgICAgICBpbnNpZGVQb2x5ID0gdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbnNpZGVQb2x5XG4gIH1cblxuICBnanUubnVtYmVyVG9SYWRpdXMgPSBmdW5jdGlvbiAobnVtYmVyKSB7XG4gICAgcmV0dXJuIG51bWJlciAqIE1hdGguUEkgLyAxODA7XG4gIH1cblxuICBnanUubnVtYmVyVG9EZWdyZWUgPSBmdW5jdGlvbiAobnVtYmVyKSB7XG4gICAgcmV0dXJuIG51bWJlciAqIDE4MCAvIE1hdGguUEk7XG4gIH1cblxuICAvLyB3cml0dGVuIHdpdGggaGVscCBmcm9tIEB0YXV0b2xvZ2VcbiAgZ2p1LmRyYXdDaXJjbGUgPSBmdW5jdGlvbiAocmFkaXVzSW5NZXRlcnMsIGNlbnRlclBvaW50LCBzdGVwcykge1xuICAgIHZhciBjZW50ZXIgPSBbY2VudGVyUG9pbnQuY29vcmRpbmF0ZXNbMV0sIGNlbnRlclBvaW50LmNvb3JkaW5hdGVzWzBdXSxcbiAgICAgIGRpc3QgPSAocmFkaXVzSW5NZXRlcnMgLyAxMDAwKSAvIDYzNzEsXG4gICAgICAvLyBjb252ZXJ0IG1ldGVycyB0byByYWRpYW50XG4gICAgICByYWRDZW50ZXIgPSBbZ2p1Lm51bWJlclRvUmFkaXVzKGNlbnRlclswXSksIGdqdS5udW1iZXJUb1JhZGl1cyhjZW50ZXJbMV0pXSxcbiAgICAgIHN0ZXBzID0gc3RlcHMgfHwgMTUsXG4gICAgICAvLyAxNSBzaWRlZCBjaXJjbGVcbiAgICAgIHBvbHkgPSBbW2NlbnRlclswXSwgY2VudGVyWzFdXV07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGVwczsgaSsrKSB7XG4gICAgICB2YXIgYnJuZyA9IDIgKiBNYXRoLlBJICogaSAvIHN0ZXBzO1xuICAgICAgdmFyIGxhdCA9IE1hdGguYXNpbihNYXRoLnNpbihyYWRDZW50ZXJbMF0pICogTWF0aC5jb3MoZGlzdClcbiAgICAgICAgICAgICAgKyBNYXRoLmNvcyhyYWRDZW50ZXJbMF0pICogTWF0aC5zaW4oZGlzdCkgKiBNYXRoLmNvcyhicm5nKSk7XG4gICAgICB2YXIgbG5nID0gcmFkQ2VudGVyWzFdICsgTWF0aC5hdGFuMihNYXRoLnNpbihicm5nKSAqIE1hdGguc2luKGRpc3QpICogTWF0aC5jb3MocmFkQ2VudGVyWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGRpc3QpIC0gTWF0aC5zaW4ocmFkQ2VudGVyWzBdKSAqIE1hdGguc2luKGxhdCkpO1xuICAgICAgcG9seVtpXSA9IFtdO1xuICAgICAgcG9seVtpXVsxXSA9IGdqdS5udW1iZXJUb0RlZ3JlZShsYXQpO1xuICAgICAgcG9seVtpXVswXSA9IGdqdS5udW1iZXJUb0RlZ3JlZShsbmcpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgXCJ0eXBlXCI6IFwiUG9seWdvblwiLFxuICAgICAgXCJjb29yZGluYXRlc1wiOiBbcG9seV1cbiAgICB9O1xuICB9XG5cbiAgLy8gYXNzdW1lcyByZWN0YW5nbGUgc3RhcnRzIGF0IGxvd2VyIGxlZnQgcG9pbnRcbiAgZ2p1LnJlY3RhbmdsZUNlbnRyb2lkID0gZnVuY3Rpb24gKHJlY3RhbmdsZSkge1xuICAgIHZhciBiYm94ID0gcmVjdGFuZ2xlLmNvb3JkaW5hdGVzWzBdO1xuICAgIHZhciB4bWluID0gYmJveFswXVswXSxcbiAgICAgIHltaW4gPSBiYm94WzBdWzFdLFxuICAgICAgeG1heCA9IGJib3hbMl1bMF0sXG4gICAgICB5bWF4ID0gYmJveFsyXVsxXTtcbiAgICB2YXIgeHdpZHRoID0geG1heCAtIHhtaW47XG4gICAgdmFyIHl3aWR0aCA9IHltYXggLSB5bWluO1xuICAgIHJldHVybiB7XG4gICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbeG1pbiArIHh3aWR0aCAvIDIsIHltaW4gKyB5d2lkdGggLyAyXVxuICAgIH07XG4gIH1cblxuICAvLyBmcm9tIGh0dHA6Ly93d3cubW92YWJsZS10eXBlLmNvLnVrL3NjcmlwdHMvbGF0bG9uZy5odG1sXG4gIGdqdS5wb2ludERpc3RhbmNlID0gZnVuY3Rpb24gKHB0MSwgcHQyKSB7XG4gICAgdmFyIGxvbjEgPSBwdDEuY29vcmRpbmF0ZXNbMF0sXG4gICAgICBsYXQxID0gcHQxLmNvb3JkaW5hdGVzWzFdLFxuICAgICAgbG9uMiA9IHB0Mi5jb29yZGluYXRlc1swXSxcbiAgICAgIGxhdDIgPSBwdDIuY29vcmRpbmF0ZXNbMV0sXG4gICAgICBkTGF0ID0gZ2p1Lm51bWJlclRvUmFkaXVzKGxhdDIgLSBsYXQxKSxcbiAgICAgIGRMb24gPSBnanUubnVtYmVyVG9SYWRpdXMobG9uMiAtIGxvbjEpLFxuICAgICAgYSA9IE1hdGgucG93KE1hdGguc2luKGRMYXQgLyAyKSwgMikgKyBNYXRoLmNvcyhnanUubnVtYmVyVG9SYWRpdXMobGF0MSkpXG4gICAgICAgICogTWF0aC5jb3MoZ2p1Lm51bWJlclRvUmFkaXVzKGxhdDIpKSAqIE1hdGgucG93KE1hdGguc2luKGRMb24gLyAyKSwgMiksXG4gICAgICBjID0gMiAqIE1hdGguYXRhbjIoTWF0aC5zcXJ0KGEpLCBNYXRoLnNxcnQoMSAtIGEpKTtcbiAgICByZXR1cm4gKDYzNzEgKiBjKSAqIDEwMDA7IC8vIHJldHVybnMgbWV0ZXJzXG4gIH0sXG5cbiAgLy8gY2hlY2tzIGlmIGdlb21ldHJ5IGxpZXMgZW50aXJlbHkgd2l0aGluIGEgY2lyY2xlXG4gIC8vIHdvcmtzIHdpdGggUG9pbnQsIExpbmVTdHJpbmcsIFBvbHlnb25cbiAgZ2p1Lmdlb21ldHJ5V2l0aGluUmFkaXVzID0gZnVuY3Rpb24gKGdlb21ldHJ5LCBjZW50ZXIsIHJhZGl1cykge1xuICAgIGlmIChnZW9tZXRyeS50eXBlID09ICdQb2ludCcpIHtcbiAgICAgIHJldHVybiBnanUucG9pbnREaXN0YW5jZShnZW9tZXRyeSwgY2VudGVyKSA8PSByYWRpdXM7XG4gICAgfSBlbHNlIGlmIChnZW9tZXRyeS50eXBlID09ICdMaW5lU3RyaW5nJyB8fCBnZW9tZXRyeS50eXBlID09ICdQb2x5Z29uJykge1xuICAgICAgdmFyIHBvaW50ID0ge307XG4gICAgICB2YXIgY29vcmRpbmF0ZXM7XG4gICAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PSAnUG9seWdvbicpIHtcbiAgICAgICAgLy8gaXQncyBlbm91Z2ggdG8gY2hlY2sgdGhlIGV4dGVyaW9yIHJpbmcgb2YgdGhlIFBvbHlnb25cbiAgICAgICAgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5jb29yZGluYXRlc1swXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpIGluIGNvb3JkaW5hdGVzKSB7XG4gICAgICAgIHBvaW50LmNvb3JkaW5hdGVzID0gY29vcmRpbmF0ZXNbaV07XG4gICAgICAgIGlmIChnanUucG9pbnREaXN0YW5jZShwb2ludCwgY2VudGVyKSA+IHJhZGl1cykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZ2VvbWV0cnkvcG9seWFyZWEvamF2YXNjcmlwdC50eHRcbiAgZ2p1LmFyZWEgPSBmdW5jdGlvbiAocG9seWdvbikge1xuICAgIHZhciBhcmVhID0gMDtcbiAgICAvLyBUT0RPOiBwb2x5Z29uIGhvbGVzIGF0IGNvb3JkaW5hdGVzWzFdXG4gICAgdmFyIHBvaW50cyA9IHBvbHlnb24uY29vcmRpbmF0ZXNbMF07XG4gICAgdmFyIGogPSBwb2ludHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgcDEsIHAyO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBqID0gaSsrKSB7XG4gICAgICB2YXIgcDEgPSB7XG4gICAgICAgIHg6IHBvaW50c1tpXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2ldWzBdXG4gICAgICB9O1xuICAgICAgdmFyIHAyID0ge1xuICAgICAgICB4OiBwb2ludHNbal1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tqXVswXVxuICAgICAgfTtcbiAgICAgIGFyZWEgKz0gcDEueCAqIHAyLnk7XG4gICAgICBhcmVhIC09IHAxLnkgKiBwMi54O1xuICAgIH1cblxuICAgIGFyZWEgLz0gMjtcbiAgICByZXR1cm4gYXJlYTtcbiAgfSxcblxuICAvLyBhZGFwdGVkIGZyb20gaHR0cDovL3BhdWxib3Vya2UubmV0L2dlb21ldHJ5L3BvbHlhcmVhL2phdmFzY3JpcHQudHh0XG4gIGdqdS5jZW50cm9pZCA9IGZ1bmN0aW9uIChwb2x5Z29uKSB7XG4gICAgdmFyIGYsIHggPSAwLFxuICAgICAgeSA9IDA7XG4gICAgLy8gVE9ETzogcG9seWdvbiBob2xlcyBhdCBjb29yZGluYXRlc1sxXVxuICAgIHZhciBwb2ludHMgPSBwb2x5Z29uLmNvb3JkaW5hdGVzWzBdO1xuICAgIHZhciBqID0gcG9pbnRzLmxlbmd0aCAtIDE7XG4gICAgdmFyIHAxLCBwMjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaiA9IGkrKykge1xuICAgICAgdmFyIHAxID0ge1xuICAgICAgICB4OiBwb2ludHNbaV1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tpXVswXVxuICAgICAgfTtcbiAgICAgIHZhciBwMiA9IHtcbiAgICAgICAgeDogcG9pbnRzW2pdWzFdLFxuICAgICAgICB5OiBwb2ludHNbal1bMF1cbiAgICAgIH07XG4gICAgICBmID0gcDEueCAqIHAyLnkgLSBwMi54ICogcDEueTtcbiAgICAgIHggKz0gKHAxLnggKyBwMi54KSAqIGY7XG4gICAgICB5ICs9IChwMS55ICsgcDIueSkgKiBmO1xuICAgIH1cblxuICAgIGYgPSBnanUuYXJlYShwb2x5Z29uKSAqIDY7XG4gICAgcmV0dXJuIHtcbiAgICAgICd0eXBlJzogJ1BvaW50JyxcbiAgICAgICdjb29yZGluYXRlcyc6IFt5IC8gZiwgeCAvIGZdXG4gICAgfTtcbiAgfSxcblxuICBnanUuc2ltcGxpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBraW5rKSB7IC8qIHNvdXJjZVtdIGFycmF5IG9mIGdlb2pzb24gcG9pbnRzICovXG4gICAgLyoga2lua1x0aW4gbWV0cmVzLCBraW5rcyBhYm92ZSB0aGlzIGRlcHRoIGtlcHQgICovXG4gICAgLyoga2luayBkZXB0aCBpcyB0aGUgaGVpZ2h0IG9mIHRoZSB0cmlhbmdsZSBhYmMgd2hlcmUgYS1iIGFuZCBiLWMgYXJlIHR3byBjb25zZWN1dGl2ZSBsaW5lIHNlZ21lbnRzICovXG4gICAga2luayA9IGtpbmsgfHwgMjA7XG4gICAgc291cmNlID0gc291cmNlLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbG5nOiBvLmNvb3JkaW5hdGVzWzBdLFxuICAgICAgICBsYXQ6IG8uY29vcmRpbmF0ZXNbMV1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBuX3NvdXJjZSwgbl9zdGFjaywgbl9kZXN0LCBzdGFydCwgZW5kLCBpLCBzaWc7XG4gICAgdmFyIGRldl9zcXIsIG1heF9kZXZfc3FyLCBiYW5kX3NxcjtcbiAgICB2YXIgeDEyLCB5MTIsIGQxMiwgeDEzLCB5MTMsIGQxMywgeDIzLCB5MjMsIGQyMztcbiAgICB2YXIgRiA9IChNYXRoLlBJIC8gMTgwLjApICogMC41O1xuICAgIHZhciBpbmRleCA9IG5ldyBBcnJheSgpOyAvKiBhcmF5IG9mIGluZGV4ZXMgb2Ygc291cmNlIHBvaW50cyB0byBpbmNsdWRlIGluIHRoZSByZWR1Y2VkIGxpbmUgKi9cbiAgICB2YXIgc2lnX3N0YXJ0ID0gbmV3IEFycmF5KCk7IC8qIGluZGljZXMgb2Ygc3RhcnQgJiBlbmQgb2Ygd29ya2luZyBzZWN0aW9uICovXG4gICAgdmFyIHNpZ19lbmQgPSBuZXcgQXJyYXkoKTtcblxuICAgIC8qIGNoZWNrIGZvciBzaW1wbGUgY2FzZXMgKi9cblxuICAgIGlmIChzb3VyY2UubGVuZ3RoIDwgMykgcmV0dXJuIChzb3VyY2UpOyAvKiBvbmUgb3IgdHdvIHBvaW50cyAqL1xuXG4gICAgLyogbW9yZSBjb21wbGV4IGNhc2UuIGluaXRpYWxpemUgc3RhY2sgKi9cblxuICAgIG5fc291cmNlID0gc291cmNlLmxlbmd0aDtcbiAgICBiYW5kX3NxciA9IGtpbmsgKiAzNjAuMCAvICgyLjAgKiBNYXRoLlBJICogNjM3ODEzNy4wKTsgLyogTm93IGluIGRlZ3JlZXMgKi9cbiAgICBiYW5kX3NxciAqPSBiYW5kX3NxcjtcbiAgICBuX2Rlc3QgPSAwO1xuICAgIHNpZ19zdGFydFswXSA9IDA7XG4gICAgc2lnX2VuZFswXSA9IG5fc291cmNlIC0gMTtcbiAgICBuX3N0YWNrID0gMTtcblxuICAgIC8qIHdoaWxlIHRoZSBzdGFjayBpcyBub3QgZW1wdHkgIC4uLiAqL1xuICAgIHdoaWxlIChuX3N0YWNrID4gMCkge1xuXG4gICAgICAvKiAuLi4gcG9wIHRoZSB0b3AtbW9zdCBlbnRyaWVzIG9mZiB0aGUgc3RhY2tzICovXG5cbiAgICAgIHN0YXJ0ID0gc2lnX3N0YXJ0W25fc3RhY2sgLSAxXTtcbiAgICAgIGVuZCA9IHNpZ19lbmRbbl9zdGFjayAtIDFdO1xuICAgICAgbl9zdGFjay0tO1xuXG4gICAgICBpZiAoKGVuZCAtIHN0YXJ0KSA+IDEpIHsgLyogYW55IGludGVybWVkaWF0ZSBwb2ludHMgPyAqL1xuXG4gICAgICAgIC8qIC4uLiB5ZXMsIHNvIGZpbmQgbW9zdCBkZXZpYW50IGludGVybWVkaWF0ZSBwb2ludCB0b1xuICAgICAgICBlaXRoZXIgc2lkZSBvZiBsaW5lIGpvaW5pbmcgc3RhcnQgJiBlbmQgcG9pbnRzICovXG5cbiAgICAgICAgeDEyID0gKHNvdXJjZVtlbmRdLmxuZygpIC0gc291cmNlW3N0YXJ0XS5sbmcoKSk7XG4gICAgICAgIHkxMiA9IChzb3VyY2VbZW5kXS5sYXQoKSAtIHNvdXJjZVtzdGFydF0ubGF0KCkpO1xuICAgICAgICBpZiAoTWF0aC5hYnMoeDEyKSA+IDE4MC4wKSB4MTIgPSAzNjAuMCAtIE1hdGguYWJzKHgxMik7XG4gICAgICAgIHgxMiAqPSBNYXRoLmNvcyhGICogKHNvdXJjZVtlbmRdLmxhdCgpICsgc291cmNlW3N0YXJ0XS5sYXQoKSkpOyAvKiB1c2UgYXZnIGxhdCB0byByZWR1Y2UgbG5nICovXG4gICAgICAgIGQxMiA9ICh4MTIgKiB4MTIpICsgKHkxMiAqIHkxMik7XG5cbiAgICAgICAgZm9yIChpID0gc3RhcnQgKyAxLCBzaWcgPSBzdGFydCwgbWF4X2Rldl9zcXIgPSAtMS4wOyBpIDwgZW5kOyBpKyspIHtcblxuICAgICAgICAgIHgxMyA9IHNvdXJjZVtpXS5sbmcoKSAtIHNvdXJjZVtzdGFydF0ubG5nKCk7XG4gICAgICAgICAgeTEzID0gc291cmNlW2ldLmxhdCgpIC0gc291cmNlW3N0YXJ0XS5sYXQoKTtcbiAgICAgICAgICBpZiAoTWF0aC5hYnMoeDEzKSA+IDE4MC4wKSB4MTMgPSAzNjAuMCAtIE1hdGguYWJzKHgxMyk7XG4gICAgICAgICAgeDEzICo9IE1hdGguY29zKEYgKiAoc291cmNlW2ldLmxhdCgpICsgc291cmNlW3N0YXJ0XS5sYXQoKSkpO1xuICAgICAgICAgIGQxMyA9ICh4MTMgKiB4MTMpICsgKHkxMyAqIHkxMyk7XG5cbiAgICAgICAgICB4MjMgPSBzb3VyY2VbaV0ubG5nKCkgLSBzb3VyY2VbZW5kXS5sbmcoKTtcbiAgICAgICAgICB5MjMgPSBzb3VyY2VbaV0ubGF0KCkgLSBzb3VyY2VbZW5kXS5sYXQoKTtcbiAgICAgICAgICBpZiAoTWF0aC5hYnMoeDIzKSA+IDE4MC4wKSB4MjMgPSAzNjAuMCAtIE1hdGguYWJzKHgyMyk7XG4gICAgICAgICAgeDIzICo9IE1hdGguY29zKEYgKiAoc291cmNlW2ldLmxhdCgpICsgc291cmNlW2VuZF0ubGF0KCkpKTtcbiAgICAgICAgICBkMjMgPSAoeDIzICogeDIzKSArICh5MjMgKiB5MjMpO1xuXG4gICAgICAgICAgaWYgKGQxMyA+PSAoZDEyICsgZDIzKSkgZGV2X3NxciA9IGQyMztcbiAgICAgICAgICBlbHNlIGlmIChkMjMgPj0gKGQxMiArIGQxMykpIGRldl9zcXIgPSBkMTM7XG4gICAgICAgICAgZWxzZSBkZXZfc3FyID0gKHgxMyAqIHkxMiAtIHkxMyAqIHgxMikgKiAoeDEzICogeTEyIC0geTEzICogeDEyKSAvIGQxMjsgLy8gc29sdmUgdHJpYW5nbGVcbiAgICAgICAgICBpZiAoZGV2X3NxciA+IG1heF9kZXZfc3FyKSB7XG4gICAgICAgICAgICBzaWcgPSBpO1xuICAgICAgICAgICAgbWF4X2Rldl9zcXIgPSBkZXZfc3FyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXhfZGV2X3NxciA8IGJhbmRfc3FyKSB7IC8qIGlzIHRoZXJlIGEgc2lnLiBpbnRlcm1lZGlhdGUgcG9pbnQgPyAqL1xuICAgICAgICAgIC8qIC4uLiBubywgc28gdHJhbnNmZXIgY3VycmVudCBzdGFydCBwb2ludCAqL1xuICAgICAgICAgIGluZGV4W25fZGVzdF0gPSBzdGFydDtcbiAgICAgICAgICBuX2Rlc3QrKztcbiAgICAgICAgfSBlbHNlIHsgLyogLi4uIHllcywgc28gcHVzaCB0d28gc3ViLXNlY3Rpb25zIG9uIHN0YWNrIGZvciBmdXJ0aGVyIHByb2Nlc3NpbmcgKi9cbiAgICAgICAgICBuX3N0YWNrKys7XG4gICAgICAgICAgc2lnX3N0YXJ0W25fc3RhY2sgLSAxXSA9IHNpZztcbiAgICAgICAgICBzaWdfZW5kW25fc3RhY2sgLSAxXSA9IGVuZDtcbiAgICAgICAgICBuX3N0YWNrKys7XG4gICAgICAgICAgc2lnX3N0YXJ0W25fc3RhY2sgLSAxXSA9IHN0YXJ0O1xuICAgICAgICAgIHNpZ19lbmRbbl9zdGFjayAtIDFdID0gc2lnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvKiAuLi4gbm8gaW50ZXJtZWRpYXRlIHBvaW50cywgc28gdHJhbnNmZXIgY3VycmVudCBzdGFydCBwb2ludCAqL1xuICAgICAgICBpbmRleFtuX2Rlc3RdID0gc3RhcnQ7XG4gICAgICAgIG5fZGVzdCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qIHRyYW5zZmVyIGxhc3QgcG9pbnQgKi9cbiAgICBpbmRleFtuX2Rlc3RdID0gbl9zb3VyY2UgLSAxO1xuICAgIG5fZGVzdCsrO1xuXG4gICAgLyogbWFrZSByZXR1cm4gYXJyYXkgKi9cbiAgICB2YXIgciA9IG5ldyBBcnJheSgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbl9kZXN0OyBpKyspXG4gICAgICByLnB1c2goc291cmNlW2luZGV4W2ldXSk7XG5cbiAgICByZXR1cm4gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IFwiUG9pbnRcIixcbiAgICAgICAgY29vcmRpbmF0ZXM6IFtvLmxuZywgby5sYXRdXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBodHRwOi8vd3d3Lm1vdmFibGUtdHlwZS5jby51ay9zY3JpcHRzL2xhdGxvbmcuaHRtbCNkZXN0UG9pbnRcbiAgZ2p1LmRlc3RpbmF0aW9uUG9pbnQgPSBmdW5jdGlvbiAocHQsIGJybmcsIGRpc3QpIHtcbiAgICBkaXN0ID0gZGlzdC82MzcxOyAgLy8gY29udmVydCBkaXN0IHRvIGFuZ3VsYXIgZGlzdGFuY2UgaW4gcmFkaWFuc1xuICAgIGJybmcgPSBnanUubnVtYmVyVG9SYWRpdXMoYnJuZyk7XG5cbiAgICB2YXIgbG9uMSA9IGdqdS5udW1iZXJUb1JhZGl1cyhwdC5jb29yZGluYXRlc1swXSk7XG4gICAgdmFyIGxhdDEgPSBnanUubnVtYmVyVG9SYWRpdXMocHQuY29vcmRpbmF0ZXNbMV0pO1xuXG4gICAgdmFyIGxhdDIgPSBNYXRoLmFzaW4oIE1hdGguc2luKGxhdDEpKk1hdGguY29zKGRpc3QpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jb3MobGF0MSkqTWF0aC5zaW4oZGlzdCkqTWF0aC5jb3MoYnJuZykgKTtcbiAgICB2YXIgbG9uMiA9IGxvbjEgKyBNYXRoLmF0YW4yKE1hdGguc2luKGJybmcpKk1hdGguc2luKGRpc3QpKk1hdGguY29zKGxhdDEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jb3MoZGlzdCktTWF0aC5zaW4obGF0MSkqTWF0aC5zaW4obGF0MikpO1xuICAgIGxvbjIgPSAobG9uMiszKk1hdGguUEkpICUgKDIqTWF0aC5QSSkgLSBNYXRoLlBJOyAgLy8gbm9ybWFsaXNlIHRvIC0xODAuLisxODDCulxuXG4gICAgcmV0dXJuIHtcbiAgICAgICd0eXBlJzogJ1BvaW50JyxcbiAgICAgICdjb29yZGluYXRlcyc6IFtnanUubnVtYmVyVG9EZWdyZWUobG9uMiksIGdqdS5udW1iZXJUb0RlZ3JlZShsYXQyKV1cbiAgICB9O1xuICB9O1xuXG59KSgpO1xuIiwidmFyIGdldEN1cnJlbnRMb2NhdGlvbiA9IGZ1bmN0aW9uIChzdWNjZXNzLCBlcnJvcikge1xuICB2YXIgZ2VvbG9jYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3IuZ2VvbG9jYXRpb25cbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgZW5hYmxlSGlnaEFjY3VyYWN5OiB0cnVlLFxuICAgIG1heGltdW1BZ2U6IDUwMDBcbiAgfVxuXG4gIGlmIChnZW9sb2NhdG9yKSB7XG4gICAgZ2VvbG9jYXRvci5nZXRDdXJyZW50UG9zaXRpb24oc3VjY2VzcywgZXJyb3IsIG9wdGlvbnMpXG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBnZW9sb2NhdGlvbicpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRDdXJyZW50TG9jYXRpb25cbiIsInZhciBHT09HTEVfTUFQU19VUkwgPSAnaHR0cDovL21hcHMuZ29vZ2xlYXBpcy5jb20vbWFwcy9hcGkvZ2VvY29kZS9qc29uJ1xuXG52YXIgZ2VvY29kZSA9IGZ1bmN0aW9uIChhZGRyZXNzLCBjYWxsYmFjaykge1xuICB2YXIgcGFyYW1zID0ge1xuICAgIGFkZHJlc3M6IGFkZHJlc3MsXG4gICAgc2Vuc29yOiAgZmFsc2VcbiAgfVxuXG4gIHZhciB1cmwgPSBHT09HTEVfTUFQU19VUkwgKyAnPycgKyAkLnBhcmFtKHBhcmFtcylcblxuICAkLmFqYXgodXJsLCB7IHN1Y2Nlc3M6IGNhbGxiYWNrIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VvY29kZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpXG52YXIgTUFQX0FUVFJJQlVUSU9OID0gJ01hcCB0aWxlcyBieSA8YSBocmVmPVwiaHR0cDovL3N0YW1lbi5jb21cIj5TdGFtZW4gRGVzaWduPC9hPiwgdW5kZXIgPGEgaHJlZj1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL2xpY2Vuc2VzL2J5LzMuMFwiPkNDIEJZIDMuMDwvYT4uIERhdGEgYnkgPGEgaHJlZj1cImh0dHA6Ly9vcGVuc3RyZWV0bWFwLm9yZ1wiPk9wZW5TdHJlZXRNYXA8L2E+LCB1bmRlciA8YSBocmVmPVwiaHR0cDovL3d3dy5vcGVuc3RyZWV0bWFwLm9yZy9jb3B5cmlnaHRcIj5PRGJMPC9hPi4nXG52YXIgVElMRV9MQVlFUl9VUkwgPSAnaHR0cDovL3RpbGUuc3RhbWVuLmNvbS90b25lci97en0ve3h9L3t5fS5wbmcnXG5cbi8vIFJldGluYSB0aWxlc1xuaWYgKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID4gMSkge1xuICBUSUxFX0xBWUVSX1VSTCA9ICdodHRwOi8vdGlsZS5zdGFtZW4uY29tL3RvbmVyL3t6fS97eH0ve3l9QDJ4LnBuZydcbn1cblxudmFyIFJFR0lPTl9MQVlFUl9TVFlMRSA9e1xuICBjb2xvcjogJyNmMTEnLFxuICB3ZWlnaHQ6IDUsXG4gIG9wYWNpdHk6IDAuMVxufVxuXG52YXIgTWFwID0gZnVuY3Rpb24gKGpzb24pIHtcbiAgdGhpcy5qc29uID0ganNvblxuXG4gIHRoaXMubWFwID0gTC5tYXAoJ21hcCcsIHtcbiAgICBkcmFnZ2luZzogZmFsc2UsXG4gICAgdG91Y2hab29tOiBmYWxzZSxcbiAgICBzY3JvbGxXaGVlbFpvb206IGZhbHNlLFxuICAgIGRvdWJsZUNsaWNrWm9vbTogZmFsc2UsXG4gICAgYm94Wm9vbTogZmFsc2UsXG4gICAgY2xvc2VQb3B1cE9uQ2xpY2s6IGZhbHNlLFxuICAgIGtleWJvYXJkOiBmYWxzZSxcbiAgICB6b29tQ29udHJvbDogZmFsc2VcbiAgfSlcblxuICB0aGlzLm1hcmtlcnMgPSBbXVxufVxuXG52YXIgbWFya2VySWNvbiA9IEwuaWNvbih7XG4gIGljb25Vcmw6ICcvaW1nL21hcmtlci5zdmcnLFxuICBzaGFkb3dVcmw6ICcvaW1nL21hcmtlcl9zaGFkb3cucG5nJyxcblxuICBpY29uU2l6ZTogICAgIFszNiwgNDNdLCAvLyBzaXplIG9mIHRoZSBpY29uXG4gIHNoYWRvd1NpemU6ICAgWzEwMCwgNTBdLFxuICBpY29uQW5jaG9yOiAgIFsxOCwgNDNdLCAvLyBwb2ludCBvZiB0aGUgaWNvbiB3aGljaCB3aWxsIGNvcnJlc3BvbmQgdG8gbWFya2VyJ3MgbG9jYXRpb25cbiAgc2hhZG93QW5jaG9yOiBbNDAsIDQ0XSxcbiAgcG9wdXBBbmNob3I6ICBbMCwgLTUwXSAvLyBwb2ludCBmcm9tIHdoaWNoIHRoZSBwb3B1cCBzaG91bGQgb3BlbiByZWxhdGl2ZSB0byB0aGUgaWNvbkFuY2hvclxufSlcblxuTWFwLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gIEwudGlsZUxheWVyKFRJTEVfTEFZRVJfVVJMLCB7XG4gICAgYXR0cmlidXRpb246IE1BUF9BVFRSSUJVVElPTixcbiAgICBtYXhab29tOiAyM1xuICB9KS5hZGRUbyh0aGlzLm1hcClcblxuICBMLmdlb0pzb24odGhpcy5qc29uLCB7XG4gICAgc3R5bGU6IFJFR0lPTl9MQVlFUl9TVFlMRVxuICB9KS5hZGRUbyh0aGlzLm1hcClcblxuICB0aGlzLnJlc2V0KClcbn1cblxuTWFwLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5yZW1vdmVNYXJrZXJzKClcbiAgdGhpcy5zZXRMb2NhdGlvbihjb25maWcubGF0aXR1ZGUsIGNvbmZpZy5sb25naXR1ZGUsIGNvbmZpZy5pbml0aWFsWm9vbSlcbiAgdGhpcy5tYXAuY2xvc2VQb3B1cCgpXG4gIHRoaXMubWFwLmRyYWdnaW5nLmRpc2FibGUoKVxufVxuXG5NYXAucHJvdG90eXBlLnNldExvY2F0aW9uID0gZnVuY3Rpb24gKGxhdCwgbG5nLCB6b29tKSB7XG4gIHRoaXMubWFwLnNldFZpZXcoW2xhdCwgbG5nXSwgem9vbSlcbiAgdGhpcy5tYXAuZHJhZ2dpbmcuZW5hYmxlKClcbiAgcmV0dXJuIHRydWVcbn1cblxuTWFwLnByb3RvdHlwZS5jcmVhdGVNYXJrZXIgPSBmdW5jdGlvbiAobGF0LCBsbmcpIHtcbiAgdmFyIG1hcmtlciA9IEwubWFya2VyKFtsYXQsIGxuZ10sIHtcbiAgICBpY29uOiBtYXJrZXJJY29uLFxuICAgIGNsaWNrYWJsZTogZmFsc2VcbiAgfSkuYWRkVG8odGhpcy5tYXApXG4gIHRoaXMubWFya2Vycy5wdXNoKG1hcmtlcilcbiAgcmV0dXJuIHRydWVcbn1cblxuTWFwLnByb3RvdHlwZS5jcmVhdGVQb3B1cCA9IGZ1bmN0aW9uIChsYXQsIGxuZywgYW5zd2VyLCBkZXRhaWwpIHtcbiAgdmFyIHBvcHVwID0gTC5wb3B1cCh7XG4gICAgYXV0b1BhbjogdHJ1ZSxcbiAgICBjbG9zZUJ1dHRvbjogZmFsc2UsXG4gICAgYXV0b1BhblBhZGRpbmc6IFsxMCwxMF1cbiAgfSlcbiAgLnNldExhdExuZyhbbGF0LCBsbmddKVxuICAuc2V0Q29udGVudCgnPGgxPicgKyBhbnN3ZXIgKyAnPC9oMT48cD4nICsgZGV0YWlsICsgJzwvcD48YnV0dG9uIGlkPVwicmVzZXQtYnV0dG9uXCI+QWdhaW4/PC9idXR0b24+JylcbiAgLm9wZW5Pbih0aGlzLm1hcClcbn1cblxuTWFwLnByb3RvdHlwZS5yZW1vdmVNYXJrZXJzID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWFya2Vycy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMubWFwLnJlbW92ZUxheWVyKHRoaXMubWFya2Vyc1tpXSlcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcFxuIl19
