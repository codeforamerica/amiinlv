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

  // Element created by map popup code
  $('body').on('click', '.reset-button', onClickPopupBack)
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

function render () {
  $('head title').text('Am I in ' + config.name + '?')
  $('#header-city').text(config.name + '?')
  $('#header-tagline').text(config.tagline)
  $('#about p:first').html(config.about)
  $('#input-location').attr('placeholder', config.address)
  $('#input-location').focus()
  map.render()
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

  // Reset URL
  if (window.history) {
    window.history.pushState({}, 'home', '/')
  } else {
    window.location = '/'
  }

  // Reset map if initialized
  if (map) {
    map.reset()
  }
}

function onClickPopupBack (e) {
  // TODO: This is broken
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

//  $('.leaflet-popup-content-wrapper').show().animate({opacity: 0, top: '-150px'}, 0);
  $('#question').fadeOut(250, function () {
//    $('.leaflet-popup-content-wrapper').animate({opacity: 1, top: '0'}, 150);
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

    if (window.history) {
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

  var onError = function () {
    $('html').removeClass('geolocation').addClass('no-geolocation')
  }

  getCurrentLocation(onSuccess, onError)
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

  if (window.history) {
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
    render()
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
  about: 'Las Vegas is one of the most visited cities in the world, and yet its most famous destination&mdash;a 6.8km boulevard of extravagantly themed casinos commonly known as ‘The Strip’&mdash;is actually located south of Las Vegas city limits.  To add to the confusion, the city’s true borders are often jagged and full of small holes.  Local residents may still receive mail at a valid Las Vegas address, according to the U.S. Postal Service, even if they are under the jurisdiction of one of the surrounding unincorporated communities throughout Clark County.  As a result, the City of Las Vegas requires residents verify that they reside within city limits to receive city services.',
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
  .setContent('<a class="reset-button" href="/"></a><h1>' + answer + '</h1><p>' + detail + '</p>')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9zcmMvYXBwbGljYXRpb24uanMiLCIuLi8uLi9jb25maWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi11dGlscy9nZW9qc29uLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2N1cnJlbnRfbG9jYXRpb24uanMiLCIuLi8uLi9zcmMvZ2VvY29kZS5qcyIsIi4uLy4uL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBnanUgPSByZXF1aXJlKCdnZW9qc29uLXV0aWxzJylcbnZhciBnZW9jb2RlQWRkcmVzcyA9IHJlcXVpcmUoJy4vZ2VvY29kZScpXG52YXIgZ2V0Q3VycmVudExvY2F0aW9uID0gcmVxdWlyZSgnLi9jdXJyZW50X2xvY2F0aW9uJylcbnZhciBNYXAgPSByZXF1aXJlKCcuL21hcCcpXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJylcblxudmFyIGpzb24gPSB7fVxudmFyIG1hcFxudmFyIGxhdGl0dWRlXG52YXIgbG9uZ2l0dWRlXG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE1BUCBWQVJJQUJMRVNcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgYXBwbGljYXRpb24gYW5kIHNldHNcbiAqIGV2ZW50IGxpc3RlbmVyc1xuICovXG5cbmZ1bmN0aW9uIHByZUluaXQgKCkge1xuICByb3V0ZXIoKVxuXG4gIC8vIFJlcXVlc3RzIGJyb3dzZXIncyBwZXJtaXNzaW9uIHRvIHVzZVxuICAvLyBnZW9sb2NhdG9yIHVwb24gcGFnZSBsb2FkLCBpZiBuZWNlc3NhcnlcbiAgY2FjaGVDdXJyZW50TG9jYXRpb24oKVxufVxuXG5mdW5jdGlvbiBpbml0IChkYXRhKSB7XG4gIC8qIGdsb2JhbCBqc29uLCBtYXAgKi9cbiAganNvbiA9IGRhdGFcbiAgbWFwID0gbmV3IE1hcChkYXRhKVxuXG4gICQoJyNpbnB1dC10YXJnZXQnKS5vbignY2xpY2snLCBvbkdldEN1cnJlbnRMb2NhdGlvbilcbiAgJCgnI2lucHV0LWdvJykub24oJ2NsaWNrJywgb25HbylcbiAgJCgnI2xvY2F0aW9uLWZvcm0nKS5vbignc3VibWl0Jywgb25TdWJtaXQpXG4gICQoZG9jdW1lbnQpLmtleWRvd24oZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS53aGljaCA9PSAyNyAmJiBlLmN0cmxLZXkgPT0gZmFsc2UgJiYgZS5tZXRhS2V5ID09IGZhbHNlKSByZXNldCgpXG4gIH0pXG4gICQoJyNhYm91dC1saW5rJykub24oJ2NsaWNrJywgb25DbGlja0Fib3V0TGluaylcbiAgJCgnI2Fib3V0LWNsb3NlJykub24oJ2NsaWNrJywgb25DbGlja0Fib3V0Q2xvc2UpXG5cbiAgLy8gRWxlbWVudCBjcmVhdGVkIGJ5IG1hcCBwb3B1cCBjb2RlXG4gICQoJ2JvZHknKS5vbignY2xpY2snLCAnLnJlc2V0LWJ1dHRvbicsIG9uQ2xpY2tQb3B1cEJhY2spXG59XG5cbi8qKlxuICogQ2hlY2tzIHBhZ2Ugcm91dGUgYW5kIGFjdHMgYWNjb3JkaW5nbHlcbiAqL1xuXG5mdW5jdGlvbiByb3V0ZXIgKCkge1xuICB2YXIgcSA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpXG5cbiAgc3dpdGNoIChxKSB7XG4gICAgY2FzZSAnYWJvdXQnOlxuICAgICAgYWJvdXRPcGVuSW5zdGFudGFuZW91c2x5KClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnbG9jYXRlJzpcbiAgICAgIG9uR2V0Q3VycmVudExvY2F0aW9uKClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAncXVlcnknOlxuICAgICAgLy8gL3F1ZXJ5PXggd2hlcmUgeCBpcyB0aGUgYWRkcmVzcyB0byBnZW9jb2RlXG4gICAgICAvLyB0aGlzIGlzIHRvdGFsbHkgYnJva2VuIGJlY2F1c2Ugc3dpdGNoIGNhc2UgbWF0Y2hpbmcgaXNuJ3QgZG9uZSBvbiBwYXJ0aWFsIHN0cmluZ1xuICAgICAgdmFyIGZpbmRnZW8gPSBxLnN1YnN0cihxLmluZGV4T2YoJz0nKSlcbiAgICAgIGlmIChmaW5kZ2VvKSB7XG4gICAgICAgIGdlb2NvZGVCeUFkZHJlc3MoZmluZGdlbylcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgcmVzZXQoKVxuICAgICAgYnJlYWtcbiAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXIgKCkge1xuICAkKCdoZWFkIHRpdGxlJykudGV4dCgnQW0gSSBpbiAnICsgY29uZmlnLm5hbWUgKyAnPycpXG4gICQoJyNoZWFkZXItY2l0eScpLnRleHQoY29uZmlnLm5hbWUgKyAnPycpXG4gICQoJyNoZWFkZXItdGFnbGluZScpLnRleHQoY29uZmlnLnRhZ2xpbmUpXG4gICQoJyNhYm91dCBwOmZpcnN0JykuaHRtbChjb25maWcuYWJvdXQpXG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLmF0dHIoJ3BsYWNlaG9sZGVyJywgY29uZmlnLmFkZHJlc3MpXG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKClcbiAgbWFwLnJlbmRlcigpXG59XG5cbi8qKlxuICogUmVzZXRzIHRoZSBhcHBsaWNhdGlvbiB0byBpdHMgaW5pdGlhbCBzdGF0ZVxuICovXG5cbmZ1bmN0aW9uIHJlc2V0ICgpIHtcbiAgJCgnI2lucHV0LWxvY2F0aW9uJykudmFsKCcnKVxuICAkKCcjYWxlcnQnKS5oaWRlKClcbiAgYWJvdXRDbG9zZSgpXG4gICQoJyNxdWVzdGlvbicpLmZhZGVJbigxNTApXG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKClcblxuICAvLyBSZXNldCBVUkxcbiAgaWYgKHdpbmRvdy5oaXN0b3J5KSB7XG4gICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCAnaG9tZScsICcvJylcbiAgfSBlbHNlIHtcbiAgICB3aW5kb3cubG9jYXRpb24gPSAnLydcbiAgfVxuXG4gIC8vIFJlc2V0IG1hcCBpZiBpbml0aWFsaXplZFxuICBpZiAobWFwKSB7XG4gICAgbWFwLnJlc2V0KClcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkNsaWNrUG9wdXBCYWNrIChlKSB7XG4gIC8vIFRPRE86IFRoaXMgaXMgYnJva2VuXG4gIGUucHJldmVudERlZmF1bHQoKVxuICByZXNldCgpXG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgYW5zd2VyIGFuZCBkcm9wcyB0aGUgcGluIG9uIHRoZSBtYXBcbiAqL1xuXG5mdW5jdGlvbiBzZXRBbnN3ZXIgKGFuc3dlcikge1xuICAvLyBJbmNsdWRlIGEgbWVzc2FnZSBwcm92aWRpbmcgZnVydGhlciBpbmZvcm1hdGlvbi5cbiAgLy8gQ3VycmVudGx5LCBpdCdzIGp1c3QgYSBzaW1wbGUgcmVzdGF0ZW1lbnQgb2YgdGhlXG4gIC8vIGFuc3dlci4gIFNlZSBHaXRIdWIgaXNzdWUgIzYuXG4gIHZhciBkZXRhaWxcbiAgaWYgKGFuc3dlciA9PSAnWWVzJykge1xuICAgIGRldGFpbCA9IGNvbmZpZy5yZXNwb25zZVllc1xuICB9IGVsc2Uge1xuICAgIGRldGFpbCA9IGNvbmZpZy5yZXNwb25zZU5vXG4gIH1cblxuICBtYXAuY3JlYXRlTWFya2VyKGxhdGl0dWRlLCBsb25naXR1ZGUpXG4gIG1hcC5jcmVhdGVQb3B1cChsYXRpdHVkZSwgbG9uZ2l0dWRlLCBhbnN3ZXIsIGRldGFpbClcbiAgbWFwLnNldExvY2F0aW9uKGxhdGl0dWRlLCBsb25naXR1ZGUsIGNvbmZpZy5maW5hbFpvb20pXG5cbi8vICAkKCcubGVhZmxldC1wb3B1cC1jb250ZW50LXdyYXBwZXInKS5zaG93KCkuYW5pbWF0ZSh7b3BhY2l0eTogMCwgdG9wOiAnLTE1MHB4J30sIDApO1xuICAkKCcjcXVlc3Rpb24nKS5mYWRlT3V0KDI1MCwgZnVuY3Rpb24gKCkge1xuLy8gICAgJCgnLmxlYWZsZXQtcG9wdXAtY29udGVudC13cmFwcGVyJykuYW5pbWF0ZSh7b3BhY2l0eTogMSwgdG9wOiAnMCd9LCAxNTApO1xuICB9KVxufVxuXG4vKipcbiAqIENoZWNrcyB0byBzZWUgd2hldGhlciBhIGxhdGl0dWRlIGFuZCBsb25naXR1ZGVcbiAqIGZhbGwgd2l0aGluIHRoZSBsaW1pdHMgcHJvdmlkZWQgaW4gcmVnaW9uLmpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBbbGF0aXR1ZGVdIHRoZSBsYXRpdHVkZVxuICogQHBhcmFtIHtTdHJpbmd9IFtsb25naXR1ZGVdIHRoZSBsb25naXR1ZGVcbiAqL1xuXG5mdW5jdGlvbiBjaGVja1dpdGhpbkxpbWl0cyAobGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICB2YXIgcG9pbnQgPSB7XG4gICAgdHlwZTogJ1BvaW50JyxcbiAgICBjb29yZGluYXRlczogWyBsb25naXR1ZGUsIGxhdGl0dWRlIF1cbiAgfVxuICB2YXIgcG9seWdvbiA9IGpzb24uZmVhdHVyZXNbMF0uZ2VvbWV0cnlcbiAgdmFyIHdpdGhpbkxpbWl0cyA9IGdqdS5wb2ludEluUG9seWdvbihwb2ludCwgcG9seWdvbilcblxuICBpZiAod2l0aGluTGltaXRzKSB7XG4gICAgb25XaXRoaW5MaW1pdHMoKVxuICB9IGVsc2Uge1xuICAgIG9uT3V0c2lkZUxpbWl0cygpXG4gIH1cbn1cblxuLyoqXG4gKiBEaXNwbGF5cyBhbiBhbnN3ZXIgdGhhdCBzcGVjaWZpZXMgdGhhdCB0aGUgbG9jYXRpb25cbiAqIGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25XaXRoaW5MaW1pdHMgKCkge1xuICBzZXRBbnN3ZXIoJ1llcycpXG59XG5cbi8qKlxuICogRGlzcGxheXMgYW4gYW5zd2VyIHRoYXQgc3BlY2lmaWVzIHRoYXQgdGhlIGxvY2F0aW9uXG4gKiBpcyBub3Qgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvbk91dHNpZGVMaW1pdHMgKCkge1xuICBzZXRBbnN3ZXIoJ05vJylcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBjdXJyZW50IGxvY2F0aW9uLCBhbmQgY2hlY2tzIHdoZXRoZXJcbiAqIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25HZXRDdXJyZW50TG9jYXRpb24gKCkge1xuICBnZW9jb2RlQnlDdXJyZW50TG9jYXRpb24oKVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBTdWJtaXRzIHRoZSBmb3JtLCBnZW9jb2RlcyB0aGUgYWRkcmVzcywgYW5kIGNoZWNrc1xuICogd2hldGhlciBpdCBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uR28gKCkge1xuICBzdWJtaXRMb2NhdGlvbigpXG59XG5cbi8qKlxuICogU3VibWl0cyB0aGUgZm9ybSwgZ2VvY29kZXMgdGhlIGFkZHJlc3MsIGFuZCBjaGVja3NcbiAqIHdoZXRoZXIgaXQgaXMgd2l0aGluIHRoZSBsaW1pdHNcbiAqL1xuXG5mdW5jdGlvbiBvblN1Ym1pdCAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcbiAgc3VibWl0TG9jYXRpb24oKVxufVxuXG4vKipcbiAqIFN1Ym1pdHMgZm9ybVxuICovXG5mdW5jdGlvbiBzdWJtaXRMb2NhdGlvbiAoKSB7XG4gIHZhciAkaW5wdXQgPSAkKCcjaW5wdXQtbG9jYXRpb24nKVxuICB2YXIgYWRkcmVzcyA9ICRpbnB1dC52YWwoKVxuICBpZiAoYWRkcmVzcyAhPSAnJykge1xuICAgIGdlb2NvZGVCeUFkZHJlc3MoYWRkcmVzcylcblxuICAgIGlmICh3aW5kb3cuaGlzdG9yeSkge1xuICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHt9LCAncXVlcnknLCAnLz9xdWVyeT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGFkZHJlc3MpKVxuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24gPSAnLz9xdWVyeT0nICsgZW5jb2RlVVJJY29tcG9uZW50KGFkZHJlc3MpXG4gICAgfVxuXG4gIH0gZWxzZSB7XG4gICAgJCgnI2lucHV0LWxvY2F0aW9uJykuZm9jdXMoKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAkKCcjaW5wdXQtbG9jYXRpb24nKS5hbmltYXRlKHtiYWNrZ3JvdW5kQ29sb3I6ICcjZmVlJ30sIDEwMCkuYW5pbWF0ZSh7YmFja2dyb3VuZENvbG9yOiAnI2ZmZid9LCAxMDApXG4gICAgfVxuICAgICQoJyNhbGVydCcpLmh0bWwoJ1BsZWFzZSBlbnRlciBhbiBhZGRyZXNzJykuc2xpZGVEb3duKDEwMClcbiAgfVxuICByZXR1cm4gZmFsc2Vcbn1cblxuLyoqXG4gKiBJbml0aWFsIGN1cnJlbnQgbG9jYXRpb24gY2FjaGVcbiAqL1xuXG5mdW5jdGlvbiBjYWNoZUN1cnJlbnRMb2NhdGlvbiAoKSB7XG4gIHZhciBvblN1Y2Nlc3MgPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcbiAgICAvKiBnbG9iYWwgbGF0aXR1ZGUsIGxvbmdpdHVkZSAqL1xuICAgIGxhdGl0dWRlID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlXG4gICAgbG9uZ2l0dWRlID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuICB9XG5cbiAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgJCgnaHRtbCcpLnJlbW92ZUNsYXNzKCdnZW9sb2NhdGlvbicpLmFkZENsYXNzKCduby1nZW9sb2NhdGlvbicpXG4gIH1cblxuICBnZXRDdXJyZW50TG9jYXRpb24ob25TdWNjZXNzLCBvbkVycm9yKVxufVxuXG4vKipcbiAqIEdldHMgdGhlIGN1cnJlbnQgbG9jYXRpb24gYW5kIGNoZWNrcyB3aGV0aGVyIGl0IGlzXG4gKiB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIGdlb2NvZGVCeUN1cnJlbnRMb2NhdGlvbiAoKSB7XG4gIHZhciBvblN1Y2Nlc3MgPSBmdW5jdGlvbiAocG9zaXRpb24pIHtcbiAgICAvKiBnbG9iYWwgbGF0aXR1ZGUsIGxvbmdpdHVkZSAqL1xuICAgIGxhdGl0dWRlID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlXG4gICAgbG9uZ2l0dWRlID0gcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuICAgIGNoZWNrV2l0aGluTGltaXRzKGxhdGl0dWRlLCBsb25naXR1ZGUpXG4gIH1cblxuICB2YXIgb25FcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICBhbGVydCgnRXJyb3IgZ2V0dGluZyBjdXJyZW50IHBvc2l0aW9uLiBHZW9sb2NhdGlvbiBtYXkgYmUgZGlzYWJsZWQgb24gdGhpcyBicm93c2VyLicpXG4gIH1cblxuICBnZXRDdXJyZW50TG9jYXRpb24ob25TdWNjZXNzLCBvbkVycm9yKVxufVxuXG4vKipcbiAqIEdlb2NvZGVzIGFuIGFkZHJlc3NcbiAqL1xuXG5mdW5jdGlvbiBnZW9jb2RlQnlBZGRyZXNzIChhZGRyZXNzKSB7XG4gIGdlb2NvZGVBZGRyZXNzKGFkZHJlc3MsIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAvKiBnbG9iYWwgbGF0aXR1ZGUsIGxvbmdpdHVkZSAqL1xuICAgIGlmIChyZXMgJiYgcmVzLnJlc3VsdHMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHJlcy5yZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uXG5cbiAgICAgIGxhdGl0dWRlID0gcmVzdWx0LmxhdFxuICAgICAgbG9uZ2l0dWRlID0gcmVzdWx0LmxuZ1xuICAgICAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSlcbiAgICB9XG4gIH0pXG59XG5cbi8qKlxuICogT3BlbnMgYWJvdXQgd2luZG93XG4gKi9cblxuZnVuY3Rpb24gb25DbGlja0Fib3V0TGluayAoZSkge1xuICBlLnByZXZlbnREZWZhdWx0KClcblxuICBpZiAod2luZG93Lmhpc3RvcnkpIHtcbiAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoe30sICdhYm91dCcsICc/YWJvdXQnKVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5sb2NhdGlvbiA9ICc/YWJvdXQnXG4gIH1cblxuICBhYm91dE9wZW4oKVxufVxuXG5mdW5jdGlvbiBhYm91dE9wZW4gKCkge1xuICAkKCcjbG9jYXRpb24tZm9ybScpLmZhZGVPdXQoMjAwLCBmdW5jdGlvbiAoKSB7XG4gICAgJCgnI2Fib3V0JykuZmFkZUluKDIwMClcbiAgfSlcbn1cblxuLyoqXG4gKiBPcGVucyBhYm91dCB3aW5kb3csIHdpdGhvdXQgYW5pbWF0aW9uXG4gKi9cblxuZnVuY3Rpb24gYWJvdXRPcGVuSW5zdGFudGFuZW91c2x5ICgpIHtcbiAgJCgnI2xvY2F0aW9uLWZvcm0nKS5oaWRlKClcbiAgJCgnI2Fib3V0Jykuc2hvdygpXG59XG5cbi8qKlxuICogQ2xvc2VzIGFib3V0IHdpbmRvd1xuICovXG5cbmZ1bmN0aW9uIG9uQ2xpY2tBYm91dENsb3NlIChlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKVxuICByZXNldCgpXG59XG5cbmZ1bmN0aW9uIGFib3V0Q2xvc2UgKCkge1xuICAkKCcjYWJvdXQnKS5mYWRlT3V0KDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICQoJyNsb2NhdGlvbi1mb3JtJykuZmFkZUluKDIwMClcbiAgfSlcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hhdCBuZWVkcyB0byBiZSBkb25lIGJhc2VkIG9uIFVSSVxuICovXG5cbnByZUluaXQoKVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgcmVnaW9uLmpzb24gZmlsZSBhbmQgaW5pdGlhbGl6ZXNcbiAqIHRoZSBhcHBsaWNhdGlvblxuICovXG5cbmpRdWVyeShkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuICAkLmdldEpTT04oY29uZmlnLmZpbGVOYW1lLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGluaXQoZGF0YSlcbiAgICByZW5kZXIoKVxuICB9KVxufSlcbiIsInZhciBjb25maWcgPSB7XG4gIG5hbWU6ICdMYXMgVmVnYXMnLFxuICBhZGRyZXNzOiAnNDk1IFMuIExhcyBWZWdhcyBCbHZkJyxcbiAgbGF0aXR1ZGU6IDM2LjE4LFxuICBsb25naXR1ZGU6IC0xMTUuMTgsXG4gIGluaXRpYWxab29tOiAxMyxcbiAgZmluYWxab29tOiAxNCxcbiAgZmlsZU5hbWU6ICcvZGF0YS9yZWdpb24uZ2VvanNvbicsXG4gIHRhZ2xpbmU6ICdCZWNhdXNlIHRoZSBjaXR5IGJvdW5kYXJpZXMgYXJlIGEgbG90IHdlaXJkZXIgdGhhbiB5b3UgdGhpbmsuJyxcbiAgYWJvdXQ6ICdMYXMgVmVnYXMgaXMgb25lIG9mIHRoZSBtb3N0IHZpc2l0ZWQgY2l0aWVzIGluIHRoZSB3b3JsZCwgYW5kIHlldCBpdHMgbW9zdCBmYW1vdXMgZGVzdGluYXRpb24mbWRhc2g7YSA2LjhrbSBib3VsZXZhcmQgb2YgZXh0cmF2YWdhbnRseSB0aGVtZWQgY2FzaW5vcyBjb21tb25seSBrbm93biBhcyDigJhUaGUgU3RyaXDigJkmbWRhc2g7aXMgYWN0dWFsbHkgbG9jYXRlZCBzb3V0aCBvZiBMYXMgVmVnYXMgY2l0eSBsaW1pdHMuICBUbyBhZGQgdG8gdGhlIGNvbmZ1c2lvbiwgdGhlIGNpdHnigJlzIHRydWUgYm9yZGVycyBhcmUgb2Z0ZW4gamFnZ2VkIGFuZCBmdWxsIG9mIHNtYWxsIGhvbGVzLiAgTG9jYWwgcmVzaWRlbnRzIG1heSBzdGlsbCByZWNlaXZlIG1haWwgYXQgYSB2YWxpZCBMYXMgVmVnYXMgYWRkcmVzcywgYWNjb3JkaW5nIHRvIHRoZSBVLlMuIFBvc3RhbCBTZXJ2aWNlLCBldmVuIGlmIHRoZXkgYXJlIHVuZGVyIHRoZSBqdXJpc2RpY3Rpb24gb2Ygb25lIG9mIHRoZSBzdXJyb3VuZGluZyB1bmluY29ycG9yYXRlZCBjb21tdW5pdGllcyB0aHJvdWdob3V0IENsYXJrIENvdW50eS4gIEFzIGEgcmVzdWx0LCB0aGUgQ2l0eSBvZiBMYXMgVmVnYXMgcmVxdWlyZXMgcmVzaWRlbnRzIHZlcmlmeSB0aGF0IHRoZXkgcmVzaWRlIHdpdGhpbiBjaXR5IGxpbWl0cyB0byByZWNlaXZlIGNpdHkgc2VydmljZXMuJyxcbiAgcmVzcG9uc2VZZXM6ICdZb3UgYXJlIHdpdGhpbiBjaXR5IGxpbWl0cyEnLFxuICByZXNwb25zZU5vOiAnWW91IGFyZSBub3QgaW4gTGFzIFZlZ2FzISdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWdcbiIsIihmdW5jdGlvbiAoKSB7XG4gIHZhciBnanUgPSB0aGlzLmdqdSA9IHt9O1xuXG4gIC8vIEV4cG9ydCB0aGUgZ2VvanNvbiBvYmplY3QgZm9yICoqQ29tbW9uSlMqKlxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdqdTtcbiAgfVxuXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwOi8vd3d3LmtldmxpbmRldi5jb20vZ3VpL21hdGgvaW50ZXJzZWN0aW9uL0ludGVyc2VjdGlvbi5qc1xuICBnanUubGluZVN0cmluZ3NJbnRlcnNlY3QgPSBmdW5jdGlvbiAobDEsIGwyKSB7XG4gICAgdmFyIGludGVyc2VjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBsMS5jb29yZGluYXRlcy5sZW5ndGggLSAyOyArK2kpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDw9IGwyLmNvb3JkaW5hdGVzLmxlbmd0aCAtIDI7ICsraikge1xuICAgICAgICB2YXIgYTEgPSB7XG4gICAgICAgICAgeDogbDEuY29vcmRpbmF0ZXNbaV1bMV0sXG4gICAgICAgICAgeTogbDEuY29vcmRpbmF0ZXNbaV1bMF1cbiAgICAgICAgfSxcbiAgICAgICAgICBhMiA9IHtcbiAgICAgICAgICAgIHg6IGwxLmNvb3JkaW5hdGVzW2kgKyAxXVsxXSxcbiAgICAgICAgICAgIHk6IGwxLmNvb3JkaW5hdGVzW2kgKyAxXVswXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYjEgPSB7XG4gICAgICAgICAgICB4OiBsMi5jb29yZGluYXRlc1tqXVsxXSxcbiAgICAgICAgICAgIHk6IGwyLmNvb3JkaW5hdGVzW2pdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICBiMiA9IHtcbiAgICAgICAgICAgIHg6IGwyLmNvb3JkaW5hdGVzW2ogKyAxXVsxXSxcbiAgICAgICAgICAgIHk6IGwyLmNvb3JkaW5hdGVzW2ogKyAxXVswXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgdWFfdCA9IChiMi54IC0gYjEueCkgKiAoYTEueSAtIGIxLnkpIC0gKGIyLnkgLSBiMS55KSAqIChhMS54IC0gYjEueCksXG4gICAgICAgICAgdWJfdCA9IChhMi54IC0gYTEueCkgKiAoYTEueSAtIGIxLnkpIC0gKGEyLnkgLSBhMS55KSAqIChhMS54IC0gYjEueCksXG4gICAgICAgICAgdV9iID0gKGIyLnkgLSBiMS55KSAqIChhMi54IC0gYTEueCkgLSAoYjIueCAtIGIxLngpICogKGEyLnkgLSBhMS55KTtcbiAgICAgICAgaWYgKHVfYiAhPSAwKSB7XG4gICAgICAgICAgdmFyIHVhID0gdWFfdCAvIHVfYixcbiAgICAgICAgICAgIHViID0gdWJfdCAvIHVfYjtcbiAgICAgICAgICBpZiAoMCA8PSB1YSAmJiB1YSA8PSAxICYmIDAgPD0gdWIgJiYgdWIgPD0gMSkge1xuICAgICAgICAgICAgaW50ZXJzZWN0cy5wdXNoKHtcbiAgICAgICAgICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgICAgICAgICAnY29vcmRpbmF0ZXMnOiBbYTEueCArIHVhICogKGEyLnggLSBhMS54KSwgYTEueSArIHVhICogKGEyLnkgLSBhMS55KV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaW50ZXJzZWN0cy5sZW5ndGggPT0gMCkgaW50ZXJzZWN0cyA9IGZhbHNlO1xuICAgIHJldHVybiBpbnRlcnNlY3RzO1xuICB9XG5cbiAgLy8gQm91bmRpbmcgQm94XG5cbiAgZnVuY3Rpb24gYm91bmRpbmdCb3hBcm91bmRQb2x5Q29vcmRzIChjb29yZHMpIHtcbiAgICB2YXIgeEFsbCA9IFtdLCB5QWxsID0gW11cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzWzBdLmxlbmd0aDsgaSsrKSB7XG4gICAgICB4QWxsLnB1c2goY29vcmRzWzBdW2ldWzFdKVxuICAgICAgeUFsbC5wdXNoKGNvb3Jkc1swXVtpXVswXSlcbiAgICB9XG5cbiAgICB4QWxsID0geEFsbC5zb3J0KGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGEgLSBiIH0pXG4gICAgeUFsbCA9IHlBbGwuc29ydChmdW5jdGlvbiAoYSxiKSB7IHJldHVybiBhIC0gYiB9KVxuXG4gICAgcmV0dXJuIFsgW3hBbGxbMF0sIHlBbGxbMF1dLCBbeEFsbFt4QWxsLmxlbmd0aCAtIDFdLCB5QWxsW3lBbGwubGVuZ3RoIC0gMV1dIF1cbiAgfVxuXG4gIGdqdS5wb2ludEluQm91bmRpbmdCb3ggPSBmdW5jdGlvbiAocG9pbnQsIGJvdW5kcykge1xuICAgIHJldHVybiAhKHBvaW50LmNvb3JkaW5hdGVzWzFdIDwgYm91bmRzWzBdWzBdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzFdID4gYm91bmRzWzFdWzBdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzBdIDwgYm91bmRzWzBdWzFdIHx8IHBvaW50LmNvb3JkaW5hdGVzWzBdID4gYm91bmRzWzFdWzFdKSBcbiAgfVxuXG4gIC8vIFBvaW50IGluIFBvbHlnb25cbiAgLy8gaHR0cDovL3d3dy5lY3NlLnJwaS5lZHUvSG9tZXBhZ2VzL3dyZi9SZXNlYXJjaC9TaG9ydF9Ob3Rlcy9wbnBvbHkuaHRtbCNMaXN0aW5nIHRoZSBWZXJ0aWNlc1xuXG4gIGZ1bmN0aW9uIHBucG9seSAoeCx5LGNvb3Jkcykge1xuICAgIHZhciB2ZXJ0ID0gWyBbMCwwXSBdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvb3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjb29yZHNbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmVydC5wdXNoKGNvb3Jkc1tpXVtqXSlcbiAgICAgIH1cblx0ICB2ZXJ0LnB1c2goY29vcmRzW2ldWzBdKVxuICAgICAgdmVydC5wdXNoKFswLDBdKVxuICAgIH1cblxuICAgIHZhciBpbnNpZGUgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdmVydC5sZW5ndGggLSAxOyBpIDwgdmVydC5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIGlmICgoKHZlcnRbaV1bMF0gPiB5KSAhPSAodmVydFtqXVswXSA+IHkpKSAmJiAoeCA8ICh2ZXJ0W2pdWzFdIC0gdmVydFtpXVsxXSkgKiAoeSAtIHZlcnRbaV1bMF0pIC8gKHZlcnRbal1bMF0gLSB2ZXJ0W2ldWzBdKSArIHZlcnRbaV1bMV0pKSBpbnNpZGUgPSAhaW5zaWRlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVxuICB9XG5cbiAgZ2p1LnBvaW50SW5Qb2x5Z29uID0gZnVuY3Rpb24gKHAsIHBvbHkpIHtcbiAgICB2YXIgY29vcmRzID0gKHBvbHkudHlwZSA9PSBcIlBvbHlnb25cIikgPyBbIHBvbHkuY29vcmRpbmF0ZXMgXSA6IHBvbHkuY29vcmRpbmF0ZXNcblxuICAgIHZhciBpbnNpZGVCb3ggPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZ2p1LnBvaW50SW5Cb3VuZGluZ0JveChwLCBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMoY29vcmRzW2ldKSkpIGluc2lkZUJveCA9IHRydWVcbiAgICB9XG4gICAgaWYgKCFpbnNpZGVCb3gpIHJldHVybiBmYWxzZVxuXG4gICAgdmFyIGluc2lkZVBvbHkgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocG5wb2x5KHAuY29vcmRpbmF0ZXNbMV0sIHAuY29vcmRpbmF0ZXNbMF0sIGNvb3Jkc1tpXSkpIGluc2lkZVBvbHkgPSB0cnVlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVBvbHlcbiAgfVxuXG4gIC8vIHN1cHBvcnQgbXVsdGkgKGJ1dCBub3QgZG9udXQpIHBvbHlnb25zXG4gIGdqdS5wb2ludEluTXVsdGlQb2x5Z29uID0gZnVuY3Rpb24gKHAsIHBvbHkpIHtcbiAgICB2YXIgY29vcmRzX2FycmF5ID0gKHBvbHkudHlwZSA9PSBcIk11bHRpUG9seWdvblwiKSA/IFsgcG9seS5jb29yZGluYXRlcyBdIDogcG9seS5jb29yZGluYXRlc1xuXG4gICAgdmFyIGluc2lkZUJveCA9IGZhbHNlXG4gICAgdmFyIGluc2lkZVBvbHkgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzX2FycmF5Lmxlbmd0aDsgaSsrKXtcbiAgICAgIHZhciBjb29yZHMgPSBjb29yZHNfYXJyYXlbaV07XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIWluc2lkZUJveCl7XG4gICAgICAgICAgaWYgKGdqdS5wb2ludEluQm91bmRpbmdCb3gocCwgYm91bmRpbmdCb3hBcm91bmRQb2x5Q29vcmRzKGNvb3Jkc1tqXSkpKSB7XG4gICAgICAgICAgICBpbnNpZGVCb3ggPSB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWluc2lkZUJveCkgcmV0dXJuIGZhbHNlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIWluc2lkZVBvbHkpe1xuICAgICAgICAgIGlmIChwbnBvbHkocC5jb29yZGluYXRlc1sxXSwgcC5jb29yZGluYXRlc1swXSwgY29vcmRzW2pdKSkge1xuICAgICAgICAgICAgaW5zaWRlUG9seSA9IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5zaWRlUG9seVxuICB9XG5cbiAgZ2p1Lm51bWJlclRvUmFkaXVzID0gZnVuY3Rpb24gKG51bWJlcikge1xuICAgIHJldHVybiBudW1iZXIgKiBNYXRoLlBJIC8gMTgwO1xuICB9XG5cbiAgZ2p1Lm51bWJlclRvRGVncmVlID0gZnVuY3Rpb24gKG51bWJlcikge1xuICAgIHJldHVybiBudW1iZXIgKiAxODAgLyBNYXRoLlBJO1xuICB9XG5cbiAgLy8gd3JpdHRlbiB3aXRoIGhlbHAgZnJvbSBAdGF1dG9sb2dlXG4gIGdqdS5kcmF3Q2lyY2xlID0gZnVuY3Rpb24gKHJhZGl1c0luTWV0ZXJzLCBjZW50ZXJQb2ludCwgc3RlcHMpIHtcbiAgICB2YXIgY2VudGVyID0gW2NlbnRlclBvaW50LmNvb3JkaW5hdGVzWzFdLCBjZW50ZXJQb2ludC5jb29yZGluYXRlc1swXV0sXG4gICAgICBkaXN0ID0gKHJhZGl1c0luTWV0ZXJzIC8gMTAwMCkgLyA2MzcxLFxuICAgICAgLy8gY29udmVydCBtZXRlcnMgdG8gcmFkaWFudFxuICAgICAgcmFkQ2VudGVyID0gW2dqdS5udW1iZXJUb1JhZGl1cyhjZW50ZXJbMF0pLCBnanUubnVtYmVyVG9SYWRpdXMoY2VudGVyWzFdKV0sXG4gICAgICBzdGVwcyA9IHN0ZXBzIHx8IDE1LFxuICAgICAgLy8gMTUgc2lkZWQgY2lyY2xlXG4gICAgICBwb2x5ID0gW1tjZW50ZXJbMF0sIGNlbnRlclsxXV1dO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RlcHM7IGkrKykge1xuICAgICAgdmFyIGJybmcgPSAyICogTWF0aC5QSSAqIGkgLyBzdGVwcztcbiAgICAgIHZhciBsYXQgPSBNYXRoLmFzaW4oTWF0aC5zaW4ocmFkQ2VudGVyWzBdKSAqIE1hdGguY29zKGRpc3QpXG4gICAgICAgICAgICAgICsgTWF0aC5jb3MocmFkQ2VudGVyWzBdKSAqIE1hdGguc2luKGRpc3QpICogTWF0aC5jb3MoYnJuZykpO1xuICAgICAgdmFyIGxuZyA9IHJhZENlbnRlclsxXSArIE1hdGguYXRhbjIoTWF0aC5zaW4oYnJuZykgKiBNYXRoLnNpbihkaXN0KSAqIE1hdGguY29zKHJhZENlbnRlclswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhkaXN0KSAtIE1hdGguc2luKHJhZENlbnRlclswXSkgKiBNYXRoLnNpbihsYXQpKTtcbiAgICAgIHBvbHlbaV0gPSBbXTtcbiAgICAgIHBvbHlbaV1bMV0gPSBnanUubnVtYmVyVG9EZWdyZWUobGF0KTtcbiAgICAgIHBvbHlbaV1bMF0gPSBnanUubnVtYmVyVG9EZWdyZWUobG5nKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIFwidHlwZVwiOiBcIlBvbHlnb25cIixcbiAgICAgIFwiY29vcmRpbmF0ZXNcIjogW3BvbHldXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFzc3VtZXMgcmVjdGFuZ2xlIHN0YXJ0cyBhdCBsb3dlciBsZWZ0IHBvaW50XG4gIGdqdS5yZWN0YW5nbGVDZW50cm9pZCA9IGZ1bmN0aW9uIChyZWN0YW5nbGUpIHtcbiAgICB2YXIgYmJveCA9IHJlY3RhbmdsZS5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgeG1pbiA9IGJib3hbMF1bMF0sXG4gICAgICB5bWluID0gYmJveFswXVsxXSxcbiAgICAgIHhtYXggPSBiYm94WzJdWzBdLFxuICAgICAgeW1heCA9IGJib3hbMl1bMV07XG4gICAgdmFyIHh3aWR0aCA9IHhtYXggLSB4bWluO1xuICAgIHZhciB5d2lkdGggPSB5bWF4IC0geW1pbjtcbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW3htaW4gKyB4d2lkdGggLyAyLCB5bWluICsgeXdpZHRoIC8gMl1cbiAgICB9O1xuICB9XG5cbiAgLy8gZnJvbSBodHRwOi8vd3d3Lm1vdmFibGUtdHlwZS5jby51ay9zY3JpcHRzL2xhdGxvbmcuaHRtbFxuICBnanUucG9pbnREaXN0YW5jZSA9IGZ1bmN0aW9uIChwdDEsIHB0Mikge1xuICAgIHZhciBsb24xID0gcHQxLmNvb3JkaW5hdGVzWzBdLFxuICAgICAgbGF0MSA9IHB0MS5jb29yZGluYXRlc1sxXSxcbiAgICAgIGxvbjIgPSBwdDIuY29vcmRpbmF0ZXNbMF0sXG4gICAgICBsYXQyID0gcHQyLmNvb3JkaW5hdGVzWzFdLFxuICAgICAgZExhdCA9IGdqdS5udW1iZXJUb1JhZGl1cyhsYXQyIC0gbGF0MSksXG4gICAgICBkTG9uID0gZ2p1Lm51bWJlclRvUmFkaXVzKGxvbjIgLSBsb24xKSxcbiAgICAgIGEgPSBNYXRoLnBvdyhNYXRoLnNpbihkTGF0IC8gMiksIDIpICsgTWF0aC5jb3MoZ2p1Lm51bWJlclRvUmFkaXVzKGxhdDEpKVxuICAgICAgICAqIE1hdGguY29zKGdqdS5udW1iZXJUb1JhZGl1cyhsYXQyKSkgKiBNYXRoLnBvdyhNYXRoLnNpbihkTG9uIC8gMiksIDIpLFxuICAgICAgYyA9IDIgKiBNYXRoLmF0YW4yKE1hdGguc3FydChhKSwgTWF0aC5zcXJ0KDEgLSBhKSk7XG4gICAgcmV0dXJuICg2MzcxICogYykgKiAxMDAwOyAvLyByZXR1cm5zIG1ldGVyc1xuICB9LFxuXG4gIC8vIGNoZWNrcyBpZiBnZW9tZXRyeSBsaWVzIGVudGlyZWx5IHdpdGhpbiBhIGNpcmNsZVxuICAvLyB3b3JrcyB3aXRoIFBvaW50LCBMaW5lU3RyaW5nLCBQb2x5Z29uXG4gIGdqdS5nZW9tZXRyeVdpdGhpblJhZGl1cyA9IGZ1bmN0aW9uIChnZW9tZXRyeSwgY2VudGVyLCByYWRpdXMpIHtcbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PSAnUG9pbnQnKSB7XG4gICAgICByZXR1cm4gZ2p1LnBvaW50RGlzdGFuY2UoZ2VvbWV0cnksIGNlbnRlcikgPD0gcmFkaXVzO1xuICAgIH0gZWxzZSBpZiAoZ2VvbWV0cnkudHlwZSA9PSAnTGluZVN0cmluZycgfHwgZ2VvbWV0cnkudHlwZSA9PSAnUG9seWdvbicpIHtcbiAgICAgIHZhciBwb2ludCA9IHt9O1xuICAgICAgdmFyIGNvb3JkaW5hdGVzO1xuICAgICAgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIC8vIGl0J3MgZW5vdWdoIHRvIGNoZWNrIHRoZSBleHRlcmlvciByaW5nIG9mIHRoZSBQb2x5Z29uXG4gICAgICAgIGNvb3JkaW5hdGVzID0gZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmNvb3JkaW5hdGVzO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaSBpbiBjb29yZGluYXRlcykge1xuICAgICAgICBwb2ludC5jb29yZGluYXRlcyA9IGNvb3JkaW5hdGVzW2ldO1xuICAgICAgICBpZiAoZ2p1LnBvaW50RGlzdGFuY2UocG9pbnQsIGNlbnRlcikgPiByYWRpdXMpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBhZGFwdGVkIGZyb20gaHR0cDovL3BhdWxib3Vya2UubmV0L2dlb21ldHJ5L3BvbHlhcmVhL2phdmFzY3JpcHQudHh0XG4gIGdqdS5hcmVhID0gZnVuY3Rpb24gKHBvbHlnb24pIHtcbiAgICB2YXIgYXJlYSA9IDA7XG4gICAgLy8gVE9ETzogcG9seWdvbiBob2xlcyBhdCBjb29yZGluYXRlc1sxXVxuICAgIHZhciBwb2ludHMgPSBwb2x5Z29uLmNvb3JkaW5hdGVzWzBdO1xuICAgIHZhciBqID0gcG9pbnRzLmxlbmd0aCAtIDE7XG4gICAgdmFyIHAxLCBwMjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaiA9IGkrKykge1xuICAgICAgdmFyIHAxID0ge1xuICAgICAgICB4OiBwb2ludHNbaV1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tpXVswXVxuICAgICAgfTtcbiAgICAgIHZhciBwMiA9IHtcbiAgICAgICAgeDogcG9pbnRzW2pdWzFdLFxuICAgICAgICB5OiBwb2ludHNbal1bMF1cbiAgICAgIH07XG4gICAgICBhcmVhICs9IHAxLnggKiBwMi55O1xuICAgICAgYXJlYSAtPSBwMS55ICogcDIueDtcbiAgICB9XG5cbiAgICBhcmVhIC89IDI7XG4gICAgcmV0dXJuIGFyZWE7XG4gIH0sXG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9wYXVsYm91cmtlLm5ldC9nZW9tZXRyeS9wb2x5YXJlYS9qYXZhc2NyaXB0LnR4dFxuICBnanUuY2VudHJvaWQgPSBmdW5jdGlvbiAocG9seWdvbikge1xuICAgIHZhciBmLCB4ID0gMCxcbiAgICAgIHkgPSAwO1xuICAgIC8vIFRPRE86IHBvbHlnb24gaG9sZXMgYXQgY29vcmRpbmF0ZXNbMV1cbiAgICB2YXIgcG9pbnRzID0gcG9seWdvbi5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgaiA9IHBvaW50cy5sZW5ndGggLSAxO1xuICAgIHZhciBwMSwgcDI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIHZhciBwMSA9IHtcbiAgICAgICAgeDogcG9pbnRzW2ldWzFdLFxuICAgICAgICB5OiBwb2ludHNbaV1bMF1cbiAgICAgIH07XG4gICAgICB2YXIgcDIgPSB7XG4gICAgICAgIHg6IHBvaW50c1tqXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2pdWzBdXG4gICAgICB9O1xuICAgICAgZiA9IHAxLnggKiBwMi55IC0gcDIueCAqIHAxLnk7XG4gICAgICB4ICs9IChwMS54ICsgcDIueCkgKiBmO1xuICAgICAgeSArPSAocDEueSArIHAyLnkpICogZjtcbiAgICB9XG5cbiAgICBmID0gZ2p1LmFyZWEocG9seWdvbikgKiA2O1xuICAgIHJldHVybiB7XG4gICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbeSAvIGYsIHggLyBmXVxuICAgIH07XG4gIH0sXG5cbiAgZ2p1LnNpbXBsaWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwga2luaykgeyAvKiBzb3VyY2VbXSBhcnJheSBvZiBnZW9qc29uIHBvaW50cyAqL1xuICAgIC8qIGtpbmtcdGluIG1ldHJlcywga2lua3MgYWJvdmUgdGhpcyBkZXB0aCBrZXB0ICAqL1xuICAgIC8qIGtpbmsgZGVwdGggaXMgdGhlIGhlaWdodCBvZiB0aGUgdHJpYW5nbGUgYWJjIHdoZXJlIGEtYiBhbmQgYi1jIGFyZSB0d28gY29uc2VjdXRpdmUgbGluZSBzZWdtZW50cyAqL1xuICAgIGtpbmsgPSBraW5rIHx8IDIwO1xuICAgIHNvdXJjZSA9IHNvdXJjZS5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxuZzogby5jb29yZGluYXRlc1swXSxcbiAgICAgICAgbGF0OiBvLmNvb3JkaW5hdGVzWzFdXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbl9zb3VyY2UsIG5fc3RhY2ssIG5fZGVzdCwgc3RhcnQsIGVuZCwgaSwgc2lnO1xuICAgIHZhciBkZXZfc3FyLCBtYXhfZGV2X3NxciwgYmFuZF9zcXI7XG4gICAgdmFyIHgxMiwgeTEyLCBkMTIsIHgxMywgeTEzLCBkMTMsIHgyMywgeTIzLCBkMjM7XG4gICAgdmFyIEYgPSAoTWF0aC5QSSAvIDE4MC4wKSAqIDAuNTtcbiAgICB2YXIgaW5kZXggPSBuZXcgQXJyYXkoKTsgLyogYXJheSBvZiBpbmRleGVzIG9mIHNvdXJjZSBwb2ludHMgdG8gaW5jbHVkZSBpbiB0aGUgcmVkdWNlZCBsaW5lICovXG4gICAgdmFyIHNpZ19zdGFydCA9IG5ldyBBcnJheSgpOyAvKiBpbmRpY2VzIG9mIHN0YXJ0ICYgZW5kIG9mIHdvcmtpbmcgc2VjdGlvbiAqL1xuICAgIHZhciBzaWdfZW5kID0gbmV3IEFycmF5KCk7XG5cbiAgICAvKiBjaGVjayBmb3Igc2ltcGxlIGNhc2VzICovXG5cbiAgICBpZiAoc291cmNlLmxlbmd0aCA8IDMpIHJldHVybiAoc291cmNlKTsgLyogb25lIG9yIHR3byBwb2ludHMgKi9cblxuICAgIC8qIG1vcmUgY29tcGxleCBjYXNlLiBpbml0aWFsaXplIHN0YWNrICovXG5cbiAgICBuX3NvdXJjZSA9IHNvdXJjZS5sZW5ndGg7XG4gICAgYmFuZF9zcXIgPSBraW5rICogMzYwLjAgLyAoMi4wICogTWF0aC5QSSAqIDYzNzgxMzcuMCk7IC8qIE5vdyBpbiBkZWdyZWVzICovXG4gICAgYmFuZF9zcXIgKj0gYmFuZF9zcXI7XG4gICAgbl9kZXN0ID0gMDtcbiAgICBzaWdfc3RhcnRbMF0gPSAwO1xuICAgIHNpZ19lbmRbMF0gPSBuX3NvdXJjZSAtIDE7XG4gICAgbl9zdGFjayA9IDE7XG5cbiAgICAvKiB3aGlsZSB0aGUgc3RhY2sgaXMgbm90IGVtcHR5ICAuLi4gKi9cbiAgICB3aGlsZSAobl9zdGFjayA+IDApIHtcblxuICAgICAgLyogLi4uIHBvcCB0aGUgdG9wLW1vc3QgZW50cmllcyBvZmYgdGhlIHN0YWNrcyAqL1xuXG4gICAgICBzdGFydCA9IHNpZ19zdGFydFtuX3N0YWNrIC0gMV07XG4gICAgICBlbmQgPSBzaWdfZW5kW25fc3RhY2sgLSAxXTtcbiAgICAgIG5fc3RhY2stLTtcblxuICAgICAgaWYgKChlbmQgLSBzdGFydCkgPiAxKSB7IC8qIGFueSBpbnRlcm1lZGlhdGUgcG9pbnRzID8gKi9cblxuICAgICAgICAvKiAuLi4geWVzLCBzbyBmaW5kIG1vc3QgZGV2aWFudCBpbnRlcm1lZGlhdGUgcG9pbnQgdG9cbiAgICAgICAgZWl0aGVyIHNpZGUgb2YgbGluZSBqb2luaW5nIHN0YXJ0ICYgZW5kIHBvaW50cyAqL1xuXG4gICAgICAgIHgxMiA9IChzb3VyY2VbZW5kXS5sbmcoKSAtIHNvdXJjZVtzdGFydF0ubG5nKCkpO1xuICAgICAgICB5MTIgPSAoc291cmNlW2VuZF0ubGF0KCkgLSBzb3VyY2Vbc3RhcnRdLmxhdCgpKTtcbiAgICAgICAgaWYgKE1hdGguYWJzKHgxMikgPiAxODAuMCkgeDEyID0gMzYwLjAgLSBNYXRoLmFicyh4MTIpO1xuICAgICAgICB4MTIgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbZW5kXS5sYXQoKSArIHNvdXJjZVtzdGFydF0ubGF0KCkpKTsgLyogdXNlIGF2ZyBsYXQgdG8gcmVkdWNlIGxuZyAqL1xuICAgICAgICBkMTIgPSAoeDEyICogeDEyKSArICh5MTIgKiB5MTIpO1xuXG4gICAgICAgIGZvciAoaSA9IHN0YXJ0ICsgMSwgc2lnID0gc3RhcnQsIG1heF9kZXZfc3FyID0gLTEuMDsgaSA8IGVuZDsgaSsrKSB7XG5cbiAgICAgICAgICB4MTMgPSBzb3VyY2VbaV0ubG5nKCkgLSBzb3VyY2Vbc3RhcnRdLmxuZygpO1xuICAgICAgICAgIHkxMyA9IHNvdXJjZVtpXS5sYXQoKSAtIHNvdXJjZVtzdGFydF0ubGF0KCk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHgxMykgPiAxODAuMCkgeDEzID0gMzYwLjAgLSBNYXRoLmFicyh4MTMpO1xuICAgICAgICAgIHgxMyAqPSBNYXRoLmNvcyhGICogKHNvdXJjZVtpXS5sYXQoKSArIHNvdXJjZVtzdGFydF0ubGF0KCkpKTtcbiAgICAgICAgICBkMTMgPSAoeDEzICogeDEzKSArICh5MTMgKiB5MTMpO1xuXG4gICAgICAgICAgeDIzID0gc291cmNlW2ldLmxuZygpIC0gc291cmNlW2VuZF0ubG5nKCk7XG4gICAgICAgICAgeTIzID0gc291cmNlW2ldLmxhdCgpIC0gc291cmNlW2VuZF0ubGF0KCk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKHgyMykgPiAxODAuMCkgeDIzID0gMzYwLjAgLSBNYXRoLmFicyh4MjMpO1xuICAgICAgICAgIHgyMyAqPSBNYXRoLmNvcyhGICogKHNvdXJjZVtpXS5sYXQoKSArIHNvdXJjZVtlbmRdLmxhdCgpKSk7XG4gICAgICAgICAgZDIzID0gKHgyMyAqIHgyMykgKyAoeTIzICogeTIzKTtcblxuICAgICAgICAgIGlmIChkMTMgPj0gKGQxMiArIGQyMykpIGRldl9zcXIgPSBkMjM7XG4gICAgICAgICAgZWxzZSBpZiAoZDIzID49IChkMTIgKyBkMTMpKSBkZXZfc3FyID0gZDEzO1xuICAgICAgICAgIGVsc2UgZGV2X3NxciA9ICh4MTMgKiB5MTIgLSB5MTMgKiB4MTIpICogKHgxMyAqIHkxMiAtIHkxMyAqIHgxMikgLyBkMTI7IC8vIHNvbHZlIHRyaWFuZ2xlXG4gICAgICAgICAgaWYgKGRldl9zcXIgPiBtYXhfZGV2X3Nxcikge1xuICAgICAgICAgICAgc2lnID0gaTtcbiAgICAgICAgICAgIG1heF9kZXZfc3FyID0gZGV2X3NxcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF4X2Rldl9zcXIgPCBiYW5kX3NxcikgeyAvKiBpcyB0aGVyZSBhIHNpZy4gaW50ZXJtZWRpYXRlIHBvaW50ID8gKi9cbiAgICAgICAgICAvKiAuLi4gbm8sIHNvIHRyYW5zZmVyIGN1cnJlbnQgc3RhcnQgcG9pbnQgKi9cbiAgICAgICAgICBpbmRleFtuX2Rlc3RdID0gc3RhcnQ7XG4gICAgICAgICAgbl9kZXN0Kys7XG4gICAgICAgIH0gZWxzZSB7IC8qIC4uLiB5ZXMsIHNvIHB1c2ggdHdvIHN1Yi1zZWN0aW9ucyBvbiBzdGFjayBmb3IgZnVydGhlciBwcm9jZXNzaW5nICovXG4gICAgICAgICAgbl9zdGFjaysrO1xuICAgICAgICAgIHNpZ19zdGFydFtuX3N0YWNrIC0gMV0gPSBzaWc7XG4gICAgICAgICAgc2lnX2VuZFtuX3N0YWNrIC0gMV0gPSBlbmQ7XG4gICAgICAgICAgbl9zdGFjaysrO1xuICAgICAgICAgIHNpZ19zdGFydFtuX3N0YWNrIC0gMV0gPSBzdGFydDtcbiAgICAgICAgICBzaWdfZW5kW25fc3RhY2sgLSAxXSA9IHNpZztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLyogLi4uIG5vIGludGVybWVkaWF0ZSBwb2ludHMsIHNvIHRyYW5zZmVyIGN1cnJlbnQgc3RhcnQgcG9pbnQgKi9cbiAgICAgICAgaW5kZXhbbl9kZXN0XSA9IHN0YXJ0O1xuICAgICAgICBuX2Rlc3QrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiB0cmFuc2ZlciBsYXN0IHBvaW50ICovXG4gICAgaW5kZXhbbl9kZXN0XSA9IG5fc291cmNlIC0gMTtcbiAgICBuX2Rlc3QrKztcblxuICAgIC8qIG1ha2UgcmV0dXJuIGFycmF5ICovXG4gICAgdmFyIHIgPSBuZXcgQXJyYXkoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5fZGVzdDsgaSsrKVxuICAgICAgci5wdXNoKHNvdXJjZVtpbmRleFtpXV0pO1xuXG4gICAgcmV0dXJuIHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcIlBvaW50XCIsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbby5sbmcsIG8ubGF0XVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gaHR0cDovL3d3dy5tb3ZhYmxlLXR5cGUuY28udWsvc2NyaXB0cy9sYXRsb25nLmh0bWwjZGVzdFBvaW50XG4gIGdqdS5kZXN0aW5hdGlvblBvaW50ID0gZnVuY3Rpb24gKHB0LCBicm5nLCBkaXN0KSB7XG4gICAgZGlzdCA9IGRpc3QvNjM3MTsgIC8vIGNvbnZlcnQgZGlzdCB0byBhbmd1bGFyIGRpc3RhbmNlIGluIHJhZGlhbnNcbiAgICBicm5nID0gZ2p1Lm51bWJlclRvUmFkaXVzKGJybmcpO1xuXG4gICAgdmFyIGxvbjEgPSBnanUubnVtYmVyVG9SYWRpdXMocHQuY29vcmRpbmF0ZXNbMF0pO1xuICAgIHZhciBsYXQxID0gZ2p1Lm51bWJlclRvUmFkaXVzKHB0LmNvb3JkaW5hdGVzWzFdKTtcblxuICAgIHZhciBsYXQyID0gTWF0aC5hc2luKCBNYXRoLnNpbihsYXQxKSpNYXRoLmNvcyhkaXN0KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGxhdDEpKk1hdGguc2luKGRpc3QpKk1hdGguY29zKGJybmcpICk7XG4gICAgdmFyIGxvbjIgPSBsb24xICsgTWF0aC5hdGFuMihNYXRoLnNpbihicm5nKSpNYXRoLnNpbihkaXN0KSpNYXRoLmNvcyhsYXQxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY29zKGRpc3QpLU1hdGguc2luKGxhdDEpKk1hdGguc2luKGxhdDIpKTtcbiAgICBsb24yID0gKGxvbjIrMypNYXRoLlBJKSAlICgyKk1hdGguUEkpIC0gTWF0aC5QSTsgIC8vIG5vcm1hbGlzZSB0byAtMTgwLi4rMTgwwrpcblxuICAgIHJldHVybiB7XG4gICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAnY29vcmRpbmF0ZXMnOiBbZ2p1Lm51bWJlclRvRGVncmVlKGxvbjIpLCBnanUubnVtYmVyVG9EZWdyZWUobGF0MildXG4gICAgfTtcbiAgfTtcblxufSkoKTtcbiIsInZhciBnZXRDdXJyZW50TG9jYXRpb24gPSBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgdmFyIGdlb2xvY2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yLmdlb2xvY2F0aW9uXG4gIHZhciBvcHRpb25zID0ge1xuICAgIGVuYWJsZUhpZ2hBY2N1cmFjeTogdHJ1ZSxcbiAgICBtYXhpbXVtQWdlOiA1MDAwXG4gIH1cblxuICBpZiAoZ2VvbG9jYXRvcikge1xuICAgIGdlb2xvY2F0b3IuZ2V0Q3VycmVudFBvc2l0aW9uKHN1Y2Nlc3MsIGVycm9yLCBvcHRpb25zKVxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgZ2VvbG9jYXRpb24nKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0Q3VycmVudExvY2F0aW9uXG4iLCJ2YXIgR09PR0xFX01BUFNfVVJMID0gJ2h0dHA6Ly9tYXBzLmdvb2dsZWFwaXMuY29tL21hcHMvYXBpL2dlb2NvZGUvanNvbidcblxudmFyIGdlb2NvZGUgPSBmdW5jdGlvbiAoYWRkcmVzcywgY2FsbGJhY2spIHtcbiAgdmFyIHBhcmFtcyA9IHtcbiAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgIHNlbnNvcjogIGZhbHNlXG4gIH1cblxuICB2YXIgdXJsID0gR09PR0xFX01BUFNfVVJMICsgJz8nICsgJC5wYXJhbShwYXJhbXMpXG5cbiAgJC5hamF4KHVybCwgeyBzdWNjZXNzOiBjYWxsYmFjayB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlb2NvZGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKVxudmFyIE1BUF9BVFRSSUJVVElPTiA9ICdNYXAgdGlsZXMgYnkgPGEgaHJlZj1cImh0dHA6Ly9zdGFtZW4uY29tXCI+U3RhbWVuIERlc2lnbjwvYT4sIHVuZGVyIDxhIGhyZWY9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS8zLjBcIj5DQyBCWSAzLjA8L2E+LiBEYXRhIGJ5IDxhIGhyZWY9XCJodHRwOi8vb3BlbnN0cmVldG1hcC5vcmdcIj5PcGVuU3RyZWV0TWFwPC9hPiwgdW5kZXIgPGEgaHJlZj1cImh0dHA6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvY29weXJpZ2h0XCI+T0RiTDwvYT4uJ1xudmFyIFRJTEVfTEFZRVJfVVJMID0gJ2h0dHA6Ly90aWxlLnN0YW1lbi5jb20vdG9uZXIve3p9L3t4fS97eX0ucG5nJ1xuXG4vLyBSZXRpbmEgdGlsZXNcbmlmICh3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+IDEpIHtcbiAgVElMRV9MQVlFUl9VUkwgPSAnaHR0cDovL3RpbGUuc3RhbWVuLmNvbS90b25lci97en0ve3h9L3t5fUAyeC5wbmcnXG59XG5cbnZhciBSRUdJT05fTEFZRVJfU1RZTEUgPXtcbiAgY29sb3I6ICcjZjExJyxcbiAgd2VpZ2h0OiA1LFxuICBvcGFjaXR5OiAwLjFcbn1cblxudmFyIE1hcCA9IGZ1bmN0aW9uIChqc29uKSB7XG4gIHRoaXMuanNvbiA9IGpzb25cblxuICB0aGlzLm1hcCA9IEwubWFwKCdtYXAnLCB7XG4gICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgIHRvdWNoWm9vbTogZmFsc2UsXG4gICAgc2Nyb2xsV2hlZWxab29tOiBmYWxzZSxcbiAgICBkb3VibGVDbGlja1pvb206IGZhbHNlLFxuICAgIGJveFpvb206IGZhbHNlLFxuICAgIGNsb3NlUG9wdXBPbkNsaWNrOiBmYWxzZSxcbiAgICBrZXlib2FyZDogZmFsc2UsXG4gICAgem9vbUNvbnRyb2w6IGZhbHNlXG4gIH0pXG5cbiAgdGhpcy5tYXJrZXJzID0gW11cbn1cblxudmFyIG1hcmtlckljb24gPSBMLmljb24oe1xuICBpY29uVXJsOiAnL2ltZy9tYXJrZXIuc3ZnJyxcbiAgc2hhZG93VXJsOiAnL2ltZy9tYXJrZXJfc2hhZG93LnBuZycsXG5cbiAgaWNvblNpemU6ICAgICBbMzYsIDQzXSwgLy8gc2l6ZSBvZiB0aGUgaWNvblxuICBzaGFkb3dTaXplOiAgIFsxMDAsIDUwXSxcbiAgaWNvbkFuY2hvcjogICBbMTgsIDQzXSwgLy8gcG9pbnQgb2YgdGhlIGljb24gd2hpY2ggd2lsbCBjb3JyZXNwb25kIHRvIG1hcmtlcidzIGxvY2F0aW9uXG4gIHNoYWRvd0FuY2hvcjogWzQwLCA0NF0sXG4gIHBvcHVwQW5jaG9yOiAgWzAsIC01MF0gLy8gcG9pbnQgZnJvbSB3aGljaCB0aGUgcG9wdXAgc2hvdWxkIG9wZW4gcmVsYXRpdmUgdG8gdGhlIGljb25BbmNob3Jcbn0pXG5cbk1hcC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICBMLnRpbGVMYXllcihUSUxFX0xBWUVSX1VSTCwge1xuICAgIGF0dHJpYnV0aW9uOiBNQVBfQVRUUklCVVRJT04sXG4gICAgbWF4Wm9vbTogMjNcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgTC5nZW9Kc29uKHRoaXMuanNvbiwge1xuICAgIHN0eWxlOiBSRUdJT05fTEFZRVJfU1RZTEVcbiAgfSkuYWRkVG8odGhpcy5tYXApXG5cbiAgdGhpcy5yZXNldCgpXG59XG5cbk1hcC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucmVtb3ZlTWFya2VycygpXG4gIHRoaXMuc2V0TG9jYXRpb24oY29uZmlnLmxhdGl0dWRlLCBjb25maWcubG9uZ2l0dWRlLCBjb25maWcuaW5pdGlhbFpvb20pXG4gIHRoaXMubWFwLmNsb3NlUG9wdXAoKVxuICB0aGlzLm1hcC5kcmFnZ2luZy5kaXNhYmxlKClcbn1cblxuTWFwLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIChsYXQsIGxuZywgem9vbSkge1xuICB0aGlzLm1hcC5zZXRWaWV3KFtsYXQsIGxuZ10sIHpvb20pXG4gIHRoaXMubWFwLmRyYWdnaW5nLmVuYWJsZSgpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlTWFya2VyID0gZnVuY3Rpb24gKGxhdCwgbG5nKSB7XG4gIHZhciBtYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsbmddLCB7XG4gICAgaWNvbjogbWFya2VySWNvbixcbiAgICBjbGlja2FibGU6IGZhbHNlXG4gIH0pLmFkZFRvKHRoaXMubWFwKVxuICB0aGlzLm1hcmtlcnMucHVzaChtYXJrZXIpXG4gIHJldHVybiB0cnVlXG59XG5cbk1hcC5wcm90b3R5cGUuY3JlYXRlUG9wdXAgPSBmdW5jdGlvbiAobGF0LCBsbmcsIGFuc3dlciwgZGV0YWlsKSB7XG4gIHZhciBwb3B1cCA9IEwucG9wdXAoe1xuICAgIGF1dG9QYW46IHRydWUsXG4gICAgY2xvc2VCdXR0b246IGZhbHNlLFxuICAgIGF1dG9QYW5QYWRkaW5nOiBbMTAsMTBdXG4gIH0pXG4gIC5zZXRMYXRMbmcoW2xhdCwgbG5nXSlcbiAgLnNldENvbnRlbnQoJzxhIGNsYXNzPVwicmVzZXQtYnV0dG9uXCIgaHJlZj1cIi9cIj48L2E+PGgxPicgKyBhbnN3ZXIgKyAnPC9oMT48cD4nICsgZGV0YWlsICsgJzwvcD4nKVxuICAub3Blbk9uKHRoaXMubWFwKVxufVxuXG5NYXAucHJvdG90eXBlLnJlbW92ZU1hcmtlcnMgPSBmdW5jdGlvbiAoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXJrZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5tYXAucmVtb3ZlTGF5ZXIodGhpcy5tYXJrZXJzW2ldKVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwXG4iXX0=
