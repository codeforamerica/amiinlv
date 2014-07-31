(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var guj = require("geojson-utils"),
    geocodeAddress = require("./geocode"),
    getCurrentLocation = require("./current_location"),
    Map = require("./map"),
    config = require("../config");

var json = {},
    map,
    latitude,
    longitude;

//--------------------
// MAP VARIABLES
//--------------------


/**
 * Initializes the application and sets
 * event listeners
 */

function init (data) {
  json = data, map = new Map(data);

  $("#input-target").on("click", onGetCurrentLocation);
  $("#input-go").on("click", onGo);
  $("#location-form").on("submit", onSubmit);
  $(document).keydown(function (e) {
    if (e.which == 27 && e.ctrlKey == false && e.metaKey == false) reset();
  });
  $('#about-link').on('click', aboutOpen);
  $('#about-close').on('click', reset);

  // Looks for what to do based on URL
  // incomplete. -louh
  var q = window.location.search.substr(1);
  switch(q) {
    case 'about':
      aboutOpen();
      break;
    case 'locate':
      onGetCurrentLocation();
      break;
    case 'find':
      // /find=x where x is the address to geocode
      // this is totally broken because switch case matching isn't done on partial string
      var findgeo = q.substr(q.indexOf('='));
      if (findgeo) {
        geocodeByAddress(findgeo);        
        break;
      }
    default:
      reset();
  }

}

function render () {
  $('head title').html('Am I in ' + config.name);
  $('#header h1').html(config.name + '?');
  $('#header p').html(config.tagline);
  $('#about p:first').html(config.about);
  $('#input-location').attr('placeholder', config.address);
  $('#input-location').focus();
  map.render();
}

/**
 * Resets the application to its initial state
 */

function reset () {
  $('#input-location').val('')
  $('#alert').hide();
  aboutClose();
  $('#question').fadeIn(150);
  $('#input-location').focus();

  map.reset();
}

/**
 * Renders the answer and drops the pin on the map
 */

function setAnswer (answer) {
  // Include a message providing further information.
  // Currently, it's just a simple restatement of the
  // answer.  See GitHub issue #6.
  var detail;
  if (answer == 'Yes') {
    detail = config.responseYes
  } else {
    detail = config.responseNo
  }

  map.createMarker(latitude, longitude);
  map.createPopup(latitude, longitude, answer, detail)
  map.setLocation(latitude, longitude, config.finalZoom);

//  $('.leaflet-popup-content-wrapper').show().animate({opacity: 0, top: '-150px'}, 0);
  $('#question').fadeOut(250, function() {
//    $('.leaflet-popup-content-wrapper').animate({opacity: 1, top: '0'}, 150);
  });

}

/**
 * Checks to see whether a latitude and longitude
 * fall within the limits provided in region.json
 * @param {String} [latitude] the latitude
 * @param {String} [longitude] the longitude
 */

function checkWithinLimits (latitude, longitude) {
  var point   = { type: "Point", coordinates: [ longitude, latitude ] };
  var polygon = json.features[0].geometry;
  var withinLimits = guj.pointInPolygon(point, polygon);

  if (withinLimits) {
    onWithinLimits()
  } else {
    onOutsideLimits();
  }
}

/**
 * Displays an answer that specifies that the location
 * is within the limits
 */

function onWithinLimits () {
  setAnswer("Yes");
}

/**
 * Displays an answer that specifies that the location
 * is not within the limits
 */

function onOutsideLimits () {
  setAnswer("No");
}

/**
 * Gets the current location, and checks whether
 * it is within the limits
 */

function onGetCurrentLocation () {
  geocodeByCurrentLocation();
  return false;
}

/**
 * Submits the form, geocodes the address, and checks
 * whether it is within the limits
 */

function onGo () {
  submitLocation();
}

/**
 * Submits the form, geocodes the address, and checks
 * whether it is within the limits
 */

function onSubmit (e) {
  e.preventDefault();
  submitLocation();
}

/**
 * Submits form
 */
function submitLocation () {
  var $input = $("#input-location"), address = $input.val();
  if (address != '') {
    geocodeByAddress(address);    
  }
  else {
    $('#input-location').focus();
    for (var i = 0; i < 3; i++) {
      $('#input-location').animate({backgroundColor: '#fee'}, 100).animate({backgroundColor: '#fff'}, 100);
    }
    $('#alert').html('Please enter an address').slideDown(100);
  }
  return false;  
}

/**
 * Gets the current location and checks whether it is
 * within the limits
 */

function geocodeByCurrentLocation () {
  var onSuccess = function (position) {
    latitude = position.coords.latitude, longitude = position.coords.longitude;
    checkWithinLimits(latitude, longitude);
  }

  var onError = function (err) {
    alert("Error getting current position");
  }

  getCurrentLocation(onSuccess, onError);
 }

/**
 * Geocodes an address
 */ 

function geocodeByAddress (address) {
  geocodeAddress(address, function (res) {
    if (res && res.results.length > 0) {
      var result = res.results[0].geometry.location;
      latitude = result.lat, longitude = result.lng
      checkWithinLimits(latitude, longitude);
    }
  });
}

/**
 * Opens about window
 */

function aboutOpen () {
  $('#location-form').fadeOut(200, function (){
    $('#about').fadeIn(200);
  });
}

/**
 * Closes about window
 */

function aboutClose () {
  $('#about').fadeOut(200, function () {
    $('#location-form').fadeIn(200);
  });
}

/**
 * Retrieves the region.json file and initializes
 * the application
 */ 

jQuery(document).ready(function () {
  $.getJSON(config.fileName, function (data) {
    init(data);
    render();
  });
});


},{"../config":2,"./current_location":4,"./geocode":5,"./map":6,"geojson-utils":3}],2:[function(require,module,exports){
var config = {
  name: "Las Vegas",
  address: "495 S. Las Vegas Blvd",
  latitude: 36.18,
  longitude: -115.18,
  initialZoom: 13,
  finalZoom: 14,
  fileName: "/data/region.geojson",
  tagline: "Because the city boundaries are a lot weirder than you think.",
  about: "Las Vegas is one of the most visited cities in the world, and yet its most famous destination&mdash;a 6.8km boulevard of enormous themed casinos commonly known as \"The Strip\"&mdash;is not actually located inside Las Vegas but rather south of the city limits.  To add to the confusion, the city's true borders are often jagged and full of small holes.  It is a common misconception even amongst residents (who may still hold a valid Las Vegas address, according to the U.S. Postal Service!) that they are under the jurisdiction of Las Vegas when in fact they live in surrounding communities of unincorporated Clark County.  Many services provided by the City of Las Vegas require that a resident actually be within city limits; this site provides an easy way to check.",
  responseYes: "You are within city limits!",
  responseNo: "You are not in Las Vegas!"
}

module.exports = config;

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

    var lat1 = gju.numberToRadius(pt.coordinates[0]);
    var lon1 = gju.numberToRadius(pt.coordinates[1]);

    var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) +
                          Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
    var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1),
                                 Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
    lon2 = (lon2+3*Math.PI) % (2*Math.PI) - Math.PI;  // normalise to -180..+180º

    return {
      'type': 'Point',
      'coordinates': [gju.numberToDegree(lat2), gju.numberToDegree(lon2)]
    };
  };

})();

},{}],4:[function(require,module,exports){
var getCurrentLocation = function (success, error) {
  var geolocator = window.navigator.geolocation;
  if (geolocator) {
    geolocator.getCurrentPosition(success, error);
  } else {
    alert("Browser does not support geolocation");
  }
}

module.exports = getCurrentLocation;

},{}],5:[function(require,module,exports){
var GOOGLE_MAPS_URL = "http://maps.googleapis.com/maps/api/geocode/json";

var geocode = function (address, callback) {
  var params = {
    address: address,
    sensor:  false
  }

  var url = GOOGLE_MAPS_URL + "?" + $.param(params);

  $.ajax(url, { success: callback });
}

module.exports = geocode;

},{}],6:[function(require,module,exports){
var config = require("../config");
var MAP_ATTRIBUTION = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
var TILE_LAYER_URL = 'http://tile.stamen.com/toner/{z}/{x}/{y}.png';
//var MAP_ATTRIBUTION = "©2012 Nokia <a href=\"http://here.net/services/terms\">Terms of Use</a>"
//var TILE_LAYER_URL  = "https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?lg=eng&token=61YWYROufLu_f8ylE0vn0Q&app_id=qIWDkliFCtLntLma2e6O"

var REGION_LAYER_STYLE ={
  color: "#F11",
  weight: 5,
  opacity: 0.1
}

var Map = function (json) {
  this.json = json;

  this.map = L.map("map", {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    closePopupOnClick: false,
    keyboard: false,
    zoomControl: false
  });

  this.markers = [];
}

var markerIcon = L.icon({
    iconUrl: '../img/marker.svg',
    shadowUrl: '../img/marker_shadow.png',

    iconSize:     [36, 43], // size of the icon
    shadowSize:   [100, 50], 
    iconAnchor:   [18, 43], // point of the icon which will correspond to marker's location
    shadowAnchor: [40, 44],
    popupAnchor:  [0, -50] // point from which the popup should open relative to the iconAnchor
});

Map.prototype.render = function () {
  L.tileLayer(TILE_LAYER_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 23
  }).addTo(this.map);

  L.geoJson(this.json, {
    style: REGION_LAYER_STYLE
  }).addTo(this.map);

  this.reset();
}

Map.prototype.reset = function () {
  this.removeMarkers();
  this.setLocation(config.latitude, config.longitude, config.initialZoom);
  this.map.closePopup();
  this.map.dragging.disable();
}

Map.prototype.setLocation = function (lat, lng, zoom) {
  this.map.setView([lat, lng], zoom);
  this.map.dragging.enable();
  return true;
}

Map.prototype.createMarker = function (lat, lng) {
  var marker = L.marker([lat, lng], {
    icon: markerIcon,
    clickable: false
  }).addTo(this.map);
  this.markers.push(marker);
  return true;
}

Map.prototype.createPopup = function (lat, lng, answer, detail) {
  var popup = L.popup({
    autoPan: true,
    closeButton: false,
    autoPanPadding: [10,10]
  })
  .setLatLng([lat, lng])
  .setContent('<a id="answer-back" href=""></a><h1>' + answer + '</h1><p>' + detail + '</p>')
  .openOn(this.map);
//  $('#answer-back').on('click', reset);
}

Map.prototype.removeMarkers = function () {
  for (var i = 0; i < this.markers.length; i++) {
    this.map.removeLayer(this.markers[i]);
  };
  return true;
}

module.exports = Map;

},{"../config":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9zcmMvYXBwbGljYXRpb24uanMiLCIuLi8uLi9jb25maWcuanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvZ2VvanNvbi11dGlscy9nZW9qc29uLXV0aWxzLmpzIiwiLi4vLi4vc3JjL2N1cnJlbnRfbG9jYXRpb24uanMiLCIuLi8uLi9zcmMvZ2VvY29kZS5qcyIsIi4uLy4uL3NyYy9tYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBndWogPSByZXF1aXJlKFwiZ2VvanNvbi11dGlsc1wiKSxcbiAgICBnZW9jb2RlQWRkcmVzcyA9IHJlcXVpcmUoXCIuL2dlb2NvZGVcIiksXG4gICAgZ2V0Q3VycmVudExvY2F0aW9uID0gcmVxdWlyZShcIi4vY3VycmVudF9sb2NhdGlvblwiKSxcbiAgICBNYXAgPSByZXF1aXJlKFwiLi9tYXBcIiksXG4gICAgY29uZmlnID0gcmVxdWlyZShcIi4uL2NvbmZpZ1wiKTtcblxudmFyIGpzb24gPSB7fSxcbiAgICBtYXAsXG4gICAgbGF0aXR1ZGUsXG4gICAgbG9uZ2l0dWRlO1xuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNQVAgVkFSSUFCTEVTXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgYXBwbGljYXRpb24gYW5kIHNldHNcbiAqIGV2ZW50IGxpc3RlbmVyc1xuICovXG5cbmZ1bmN0aW9uIGluaXQgKGRhdGEpIHtcbiAganNvbiA9IGRhdGEsIG1hcCA9IG5ldyBNYXAoZGF0YSk7XG5cbiAgJChcIiNpbnB1dC10YXJnZXRcIikub24oXCJjbGlja1wiLCBvbkdldEN1cnJlbnRMb2NhdGlvbik7XG4gICQoXCIjaW5wdXQtZ29cIikub24oXCJjbGlja1wiLCBvbkdvKTtcbiAgJChcIiNsb2NhdGlvbi1mb3JtXCIpLm9uKFwic3VibWl0XCIsIG9uU3VibWl0KTtcbiAgJChkb2N1bWVudCkua2V5ZG93bihmdW5jdGlvbiAoZSkge1xuICAgIGlmIChlLndoaWNoID09IDI3ICYmIGUuY3RybEtleSA9PSBmYWxzZSAmJiBlLm1ldGFLZXkgPT0gZmFsc2UpIHJlc2V0KCk7XG4gIH0pO1xuICAkKCcjYWJvdXQtbGluaycpLm9uKCdjbGljaycsIGFib3V0T3Blbik7XG4gICQoJyNhYm91dC1jbG9zZScpLm9uKCdjbGljaycsIHJlc2V0KTtcblxuICAvLyBMb29rcyBmb3Igd2hhdCB0byBkbyBiYXNlZCBvbiBVUkxcbiAgLy8gaW5jb21wbGV0ZS4gLWxvdWhcbiAgdmFyIHEgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKTtcbiAgc3dpdGNoKHEpIHtcbiAgICBjYXNlICdhYm91dCc6XG4gICAgICBhYm91dE9wZW4oKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xvY2F0ZSc6XG4gICAgICBvbkdldEN1cnJlbnRMb2NhdGlvbigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZmluZCc6XG4gICAgICAvLyAvZmluZD14IHdoZXJlIHggaXMgdGhlIGFkZHJlc3MgdG8gZ2VvY29kZVxuICAgICAgLy8gdGhpcyBpcyB0b3RhbGx5IGJyb2tlbiBiZWNhdXNlIHN3aXRjaCBjYXNlIG1hdGNoaW5nIGlzbid0IGRvbmUgb24gcGFydGlhbCBzdHJpbmdcbiAgICAgIHZhciBmaW5kZ2VvID0gcS5zdWJzdHIocS5pbmRleE9mKCc9JykpO1xuICAgICAgaWYgKGZpbmRnZW8pIHtcbiAgICAgICAgZ2VvY29kZUJ5QWRkcmVzcyhmaW5kZ2VvKTsgICAgICAgIFxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICBkZWZhdWx0OlxuICAgICAgcmVzZXQoKTtcbiAgfVxuXG59XG5cbmZ1bmN0aW9uIHJlbmRlciAoKSB7XG4gICQoJ2hlYWQgdGl0bGUnKS5odG1sKCdBbSBJIGluICcgKyBjb25maWcubmFtZSk7XG4gICQoJyNoZWFkZXIgaDEnKS5odG1sKGNvbmZpZy5uYW1lICsgJz8nKTtcbiAgJCgnI2hlYWRlciBwJykuaHRtbChjb25maWcudGFnbGluZSk7XG4gICQoJyNhYm91dCBwOmZpcnN0JykuaHRtbChjb25maWcuYWJvdXQpO1xuICAkKCcjaW5wdXQtbG9jYXRpb24nKS5hdHRyKCdwbGFjZWhvbGRlcicsIGNvbmZpZy5hZGRyZXNzKTtcbiAgJCgnI2lucHV0LWxvY2F0aW9uJykuZm9jdXMoKTtcbiAgbWFwLnJlbmRlcigpO1xufVxuXG4vKipcbiAqIFJlc2V0cyB0aGUgYXBwbGljYXRpb24gdG8gaXRzIGluaXRpYWwgc3RhdGVcbiAqL1xuXG5mdW5jdGlvbiByZXNldCAoKSB7XG4gICQoJyNpbnB1dC1sb2NhdGlvbicpLnZhbCgnJylcbiAgJCgnI2FsZXJ0JykuaGlkZSgpO1xuICBhYm91dENsb3NlKCk7XG4gICQoJyNxdWVzdGlvbicpLmZhZGVJbigxNTApO1xuICAkKCcjaW5wdXQtbG9jYXRpb24nKS5mb2N1cygpO1xuXG4gIG1hcC5yZXNldCgpO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGFuc3dlciBhbmQgZHJvcHMgdGhlIHBpbiBvbiB0aGUgbWFwXG4gKi9cblxuZnVuY3Rpb24gc2V0QW5zd2VyIChhbnN3ZXIpIHtcbiAgLy8gSW5jbHVkZSBhIG1lc3NhZ2UgcHJvdmlkaW5nIGZ1cnRoZXIgaW5mb3JtYXRpb24uXG4gIC8vIEN1cnJlbnRseSwgaXQncyBqdXN0IGEgc2ltcGxlIHJlc3RhdGVtZW50IG9mIHRoZVxuICAvLyBhbnN3ZXIuICBTZWUgR2l0SHViIGlzc3VlICM2LlxuICB2YXIgZGV0YWlsO1xuICBpZiAoYW5zd2VyID09ICdZZXMnKSB7XG4gICAgZGV0YWlsID0gY29uZmlnLnJlc3BvbnNlWWVzXG4gIH0gZWxzZSB7XG4gICAgZGV0YWlsID0gY29uZmlnLnJlc3BvbnNlTm9cbiAgfVxuXG4gIG1hcC5jcmVhdGVNYXJrZXIobGF0aXR1ZGUsIGxvbmdpdHVkZSk7XG4gIG1hcC5jcmVhdGVQb3B1cChsYXRpdHVkZSwgbG9uZ2l0dWRlLCBhbnN3ZXIsIGRldGFpbClcbiAgbWFwLnNldExvY2F0aW9uKGxhdGl0dWRlLCBsb25naXR1ZGUsIGNvbmZpZy5maW5hbFpvb20pO1xuXG4vLyAgJCgnLmxlYWZsZXQtcG9wdXAtY29udGVudC13cmFwcGVyJykuc2hvdygpLmFuaW1hdGUoe29wYWNpdHk6IDAsIHRvcDogJy0xNTBweCd9LCAwKTtcbiAgJCgnI3F1ZXN0aW9uJykuZmFkZU91dCgyNTAsIGZ1bmN0aW9uKCkge1xuLy8gICAgJCgnLmxlYWZsZXQtcG9wdXAtY29udGVudC13cmFwcGVyJykuYW5pbWF0ZSh7b3BhY2l0eTogMSwgdG9wOiAnMCd9LCAxNTApO1xuICB9KTtcblxufVxuXG4vKipcbiAqIENoZWNrcyB0byBzZWUgd2hldGhlciBhIGxhdGl0dWRlIGFuZCBsb25naXR1ZGVcbiAqIGZhbGwgd2l0aGluIHRoZSBsaW1pdHMgcHJvdmlkZWQgaW4gcmVnaW9uLmpzb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBbbGF0aXR1ZGVdIHRoZSBsYXRpdHVkZVxuICogQHBhcmFtIHtTdHJpbmd9IFtsb25naXR1ZGVdIHRoZSBsb25naXR1ZGVcbiAqL1xuXG5mdW5jdGlvbiBjaGVja1dpdGhpbkxpbWl0cyAobGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICB2YXIgcG9pbnQgICA9IHsgdHlwZTogXCJQb2ludFwiLCBjb29yZGluYXRlczogWyBsb25naXR1ZGUsIGxhdGl0dWRlIF0gfTtcbiAgdmFyIHBvbHlnb24gPSBqc29uLmZlYXR1cmVzWzBdLmdlb21ldHJ5O1xuICB2YXIgd2l0aGluTGltaXRzID0gZ3VqLnBvaW50SW5Qb2x5Z29uKHBvaW50LCBwb2x5Z29uKTtcblxuICBpZiAod2l0aGluTGltaXRzKSB7XG4gICAgb25XaXRoaW5MaW1pdHMoKVxuICB9IGVsc2Uge1xuICAgIG9uT3V0c2lkZUxpbWl0cygpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGxheXMgYW4gYW5zd2VyIHRoYXQgc3BlY2lmaWVzIHRoYXQgdGhlIGxvY2F0aW9uXG4gKiBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uV2l0aGluTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKFwiWWVzXCIpO1xufVxuXG4vKipcbiAqIERpc3BsYXlzIGFuIGFuc3dlciB0aGF0IHNwZWNpZmllcyB0aGF0IHRoZSBsb2NhdGlvblxuICogaXMgbm90IHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25PdXRzaWRlTGltaXRzICgpIHtcbiAgc2V0QW5zd2VyKFwiTm9cIik7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiwgYW5kIGNoZWNrcyB3aGV0aGVyXG4gKiBpdCBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uR2V0Q3VycmVudExvY2F0aW9uICgpIHtcbiAgZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uKCk7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBTdWJtaXRzIHRoZSBmb3JtLCBnZW9jb2RlcyB0aGUgYWRkcmVzcywgYW5kIGNoZWNrc1xuICogd2hldGhlciBpdCBpcyB3aXRoaW4gdGhlIGxpbWl0c1xuICovXG5cbmZ1bmN0aW9uIG9uR28gKCkge1xuICBzdWJtaXRMb2NhdGlvbigpO1xufVxuXG4vKipcbiAqIFN1Ym1pdHMgdGhlIGZvcm0sIGdlb2NvZGVzIHRoZSBhZGRyZXNzLCBhbmQgY2hlY2tzXG4gKiB3aGV0aGVyIGl0IGlzIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gb25TdWJtaXQgKGUpIHtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICBzdWJtaXRMb2NhdGlvbigpO1xufVxuXG4vKipcbiAqIFN1Ym1pdHMgZm9ybVxuICovXG5mdW5jdGlvbiBzdWJtaXRMb2NhdGlvbiAoKSB7XG4gIHZhciAkaW5wdXQgPSAkKFwiI2lucHV0LWxvY2F0aW9uXCIpLCBhZGRyZXNzID0gJGlucHV0LnZhbCgpO1xuICBpZiAoYWRkcmVzcyAhPSAnJykge1xuICAgIGdlb2NvZGVCeUFkZHJlc3MoYWRkcmVzcyk7ICAgIFxuICB9XG4gIGVsc2Uge1xuICAgICQoJyNpbnB1dC1sb2NhdGlvbicpLmZvY3VzKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICQoJyNpbnB1dC1sb2NhdGlvbicpLmFuaW1hdGUoe2JhY2tncm91bmRDb2xvcjogJyNmZWUnfSwgMTAwKS5hbmltYXRlKHtiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJ30sIDEwMCk7XG4gICAgfVxuICAgICQoJyNhbGVydCcpLmh0bWwoJ1BsZWFzZSBlbnRlciBhbiBhZGRyZXNzJykuc2xpZGVEb3duKDEwMCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlOyAgXG59XG5cbi8qKlxuICogR2V0cyB0aGUgY3VycmVudCBsb2NhdGlvbiBhbmQgY2hlY2tzIHdoZXRoZXIgaXQgaXNcbiAqIHdpdGhpbiB0aGUgbGltaXRzXG4gKi9cblxuZnVuY3Rpb24gZ2VvY29kZUJ5Q3VycmVudExvY2F0aW9uICgpIHtcbiAgdmFyIG9uU3VjY2VzcyA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xuICAgIGxhdGl0dWRlID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLCBsb25naXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xuICAgIGNoZWNrV2l0aGluTGltaXRzKGxhdGl0dWRlLCBsb25naXR1ZGUpO1xuICB9XG5cbiAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYWxlcnQoXCJFcnJvciBnZXR0aW5nIGN1cnJlbnQgcG9zaXRpb25cIik7XG4gIH1cblxuICBnZXRDdXJyZW50TG9jYXRpb24ob25TdWNjZXNzLCBvbkVycm9yKTtcbiB9XG5cbi8qKlxuICogR2VvY29kZXMgYW4gYWRkcmVzc1xuICovIFxuXG5mdW5jdGlvbiBnZW9jb2RlQnlBZGRyZXNzIChhZGRyZXNzKSB7XG4gIGdlb2NvZGVBZGRyZXNzKGFkZHJlc3MsIGZ1bmN0aW9uIChyZXMpIHtcbiAgICBpZiAocmVzICYmIHJlcy5yZXN1bHRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhciByZXN1bHQgPSByZXMucmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbjtcbiAgICAgIGxhdGl0dWRlID0gcmVzdWx0LmxhdCwgbG9uZ2l0dWRlID0gcmVzdWx0LmxuZ1xuICAgICAgY2hlY2tXaXRoaW5MaW1pdHMobGF0aXR1ZGUsIGxvbmdpdHVkZSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBPcGVucyBhYm91dCB3aW5kb3dcbiAqL1xuXG5mdW5jdGlvbiBhYm91dE9wZW4gKCkge1xuICAkKCcjbG9jYXRpb24tZm9ybScpLmZhZGVPdXQoMjAwLCBmdW5jdGlvbiAoKXtcbiAgICAkKCcjYWJvdXQnKS5mYWRlSW4oMjAwKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQ2xvc2VzIGFib3V0IHdpbmRvd1xuICovXG5cbmZ1bmN0aW9uIGFib3V0Q2xvc2UgKCkge1xuICAkKCcjYWJvdXQnKS5mYWRlT3V0KDIwMCwgZnVuY3Rpb24gKCkge1xuICAgICQoJyNsb2NhdGlvbi1mb3JtJykuZmFkZUluKDIwMCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgcmVnaW9uLmpzb24gZmlsZSBhbmQgaW5pdGlhbGl6ZXNcbiAqIHRoZSBhcHBsaWNhdGlvblxuICovIFxuXG5qUXVlcnkoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgJC5nZXRKU09OKGNvbmZpZy5maWxlTmFtZSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpbml0KGRhdGEpO1xuICAgIHJlbmRlcigpO1xuICB9KTtcbn0pO1xuXG4iLCJ2YXIgY29uZmlnID0ge1xuICBuYW1lOiBcIkxhcyBWZWdhc1wiLFxuICBhZGRyZXNzOiBcIjQ5NSBTLiBMYXMgVmVnYXMgQmx2ZFwiLFxuICBsYXRpdHVkZTogMzYuMTgsXG4gIGxvbmdpdHVkZTogLTExNS4xOCxcbiAgaW5pdGlhbFpvb206IDEzLFxuICBmaW5hbFpvb206IDE0LFxuICBmaWxlTmFtZTogXCIvZGF0YS9yZWdpb24uZ2VvanNvblwiLFxuICB0YWdsaW5lOiBcIkJlY2F1c2UgdGhlIGNpdHkgYm91bmRhcmllcyBhcmUgYSBsb3Qgd2VpcmRlciB0aGFuIHlvdSB0aGluay5cIixcbiAgYWJvdXQ6IFwiTGFzIFZlZ2FzIGlzIG9uZSBvZiB0aGUgbW9zdCB2aXNpdGVkIGNpdGllcyBpbiB0aGUgd29ybGQsIGFuZCB5ZXQgaXRzIG1vc3QgZmFtb3VzIGRlc3RpbmF0aW9uJm1kYXNoO2EgNi44a20gYm91bGV2YXJkIG9mIGVub3Jtb3VzIHRoZW1lZCBjYXNpbm9zIGNvbW1vbmx5IGtub3duIGFzIFxcXCJUaGUgU3RyaXBcXFwiJm1kYXNoO2lzIG5vdCBhY3R1YWxseSBsb2NhdGVkIGluc2lkZSBMYXMgVmVnYXMgYnV0IHJhdGhlciBzb3V0aCBvZiB0aGUgY2l0eSBsaW1pdHMuICBUbyBhZGQgdG8gdGhlIGNvbmZ1c2lvbiwgdGhlIGNpdHkncyB0cnVlIGJvcmRlcnMgYXJlIG9mdGVuIGphZ2dlZCBhbmQgZnVsbCBvZiBzbWFsbCBob2xlcy4gIEl0IGlzIGEgY29tbW9uIG1pc2NvbmNlcHRpb24gZXZlbiBhbW9uZ3N0IHJlc2lkZW50cyAod2hvIG1heSBzdGlsbCBob2xkIGEgdmFsaWQgTGFzIFZlZ2FzIGFkZHJlc3MsIGFjY29yZGluZyB0byB0aGUgVS5TLiBQb3N0YWwgU2VydmljZSEpIHRoYXQgdGhleSBhcmUgdW5kZXIgdGhlIGp1cmlzZGljdGlvbiBvZiBMYXMgVmVnYXMgd2hlbiBpbiBmYWN0IHRoZXkgbGl2ZSBpbiBzdXJyb3VuZGluZyBjb21tdW5pdGllcyBvZiB1bmluY29ycG9yYXRlZCBDbGFyayBDb3VudHkuICBNYW55IHNlcnZpY2VzIHByb3ZpZGVkIGJ5IHRoZSBDaXR5IG9mIExhcyBWZWdhcyByZXF1aXJlIHRoYXQgYSByZXNpZGVudCBhY3R1YWxseSBiZSB3aXRoaW4gY2l0eSBsaW1pdHM7IHRoaXMgc2l0ZSBwcm92aWRlcyBhbiBlYXN5IHdheSB0byBjaGVjay5cIixcbiAgcmVzcG9uc2VZZXM6IFwiWW91IGFyZSB3aXRoaW4gY2l0eSBsaW1pdHMhXCIsXG4gIHJlc3BvbnNlTm86IFwiWW91IGFyZSBub3QgaW4gTGFzIFZlZ2FzIVwiXG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnO1xuIiwiKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGdqdSA9IHRoaXMuZ2p1ID0ge307XG5cbiAgLy8gRXhwb3J0IHRoZSBnZW9qc29uIG9iamVjdCBmb3IgKipDb21tb25KUyoqXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ2p1O1xuICB9XG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly93d3cua2V2bGluZGV2LmNvbS9ndWkvbWF0aC9pbnRlcnNlY3Rpb24vSW50ZXJzZWN0aW9uLmpzXG4gIGdqdS5saW5lU3RyaW5nc0ludGVyc2VjdCA9IGZ1bmN0aW9uIChsMSwgbDIpIHtcbiAgICB2YXIgaW50ZXJzZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDw9IGwxLmNvb3JkaW5hdGVzLmxlbmd0aCAtIDI7ICsraSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPD0gbDIuY29vcmRpbmF0ZXMubGVuZ3RoIC0gMjsgKytqKSB7XG4gICAgICAgIHZhciBhMSA9IHtcbiAgICAgICAgICB4OiBsMS5jb29yZGluYXRlc1tpXVsxXSxcbiAgICAgICAgICB5OiBsMS5jb29yZGluYXRlc1tpXVswXVxuICAgICAgICB9LFxuICAgICAgICAgIGEyID0ge1xuICAgICAgICAgICAgeDogbDEuY29vcmRpbmF0ZXNbaSArIDFdWzFdLFxuICAgICAgICAgICAgeTogbDEuY29vcmRpbmF0ZXNbaSArIDFdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICBiMSA9IHtcbiAgICAgICAgICAgIHg6IGwyLmNvb3JkaW5hdGVzW2pdWzFdLFxuICAgICAgICAgICAgeTogbDIuY29vcmRpbmF0ZXNbal1bMF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGIyID0ge1xuICAgICAgICAgICAgeDogbDIuY29vcmRpbmF0ZXNbaiArIDFdWzFdLFxuICAgICAgICAgICAgeTogbDIuY29vcmRpbmF0ZXNbaiArIDFdWzBdXG4gICAgICAgICAgfSxcbiAgICAgICAgICB1YV90ID0gKGIyLnggLSBiMS54KSAqIChhMS55IC0gYjEueSkgLSAoYjIueSAtIGIxLnkpICogKGExLnggLSBiMS54KSxcbiAgICAgICAgICB1Yl90ID0gKGEyLnggLSBhMS54KSAqIChhMS55IC0gYjEueSkgLSAoYTIueSAtIGExLnkpICogKGExLnggLSBiMS54KSxcbiAgICAgICAgICB1X2IgPSAoYjIueSAtIGIxLnkpICogKGEyLnggLSBhMS54KSAtIChiMi54IC0gYjEueCkgKiAoYTIueSAtIGExLnkpO1xuICAgICAgICBpZiAodV9iICE9IDApIHtcbiAgICAgICAgICB2YXIgdWEgPSB1YV90IC8gdV9iLFxuICAgICAgICAgICAgdWIgPSB1Yl90IC8gdV9iO1xuICAgICAgICAgIGlmICgwIDw9IHVhICYmIHVhIDw9IDEgJiYgMCA8PSB1YiAmJiB1YiA8PSAxKSB7XG4gICAgICAgICAgICBpbnRlcnNlY3RzLnB1c2goe1xuICAgICAgICAgICAgICAndHlwZSc6ICdQb2ludCcsXG4gICAgICAgICAgICAgICdjb29yZGluYXRlcyc6IFthMS54ICsgdWEgKiAoYTIueCAtIGExLngpLCBhMS55ICsgdWEgKiAoYTIueSAtIGExLnkpXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpbnRlcnNlY3RzLmxlbmd0aCA9PSAwKSBpbnRlcnNlY3RzID0gZmFsc2U7XG4gICAgcmV0dXJuIGludGVyc2VjdHM7XG4gIH1cblxuICAvLyBCb3VuZGluZyBCb3hcblxuICBmdW5jdGlvbiBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMgKGNvb3Jkcykge1xuICAgIHZhciB4QWxsID0gW10sIHlBbGwgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb29yZHNbMF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHhBbGwucHVzaChjb29yZHNbMF1baV1bMV0pXG4gICAgICB5QWxsLnB1c2goY29vcmRzWzBdW2ldWzBdKVxuICAgIH1cblxuICAgIHhBbGwgPSB4QWxsLnNvcnQoZnVuY3Rpb24gKGEsYikgeyByZXR1cm4gYSAtIGIgfSlcbiAgICB5QWxsID0geUFsbC5zb3J0KGZ1bmN0aW9uIChhLGIpIHsgcmV0dXJuIGEgLSBiIH0pXG5cbiAgICByZXR1cm4gWyBbeEFsbFswXSwgeUFsbFswXV0sIFt4QWxsW3hBbGwubGVuZ3RoIC0gMV0sIHlBbGxbeUFsbC5sZW5ndGggLSAxXV0gXVxuICB9XG5cbiAgZ2p1LnBvaW50SW5Cb3VuZGluZ0JveCA9IGZ1bmN0aW9uIChwb2ludCwgYm91bmRzKSB7XG4gICAgcmV0dXJuICEocG9pbnQuY29vcmRpbmF0ZXNbMV0gPCBib3VuZHNbMF1bMF0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMV0gPiBib3VuZHNbMV1bMF0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMF0gPCBib3VuZHNbMF1bMV0gfHwgcG9pbnQuY29vcmRpbmF0ZXNbMF0gPiBib3VuZHNbMV1bMV0pIFxuICB9XG5cbiAgLy8gUG9pbnQgaW4gUG9seWdvblxuICAvLyBodHRwOi8vd3d3LmVjc2UucnBpLmVkdS9Ib21lcGFnZXMvd3JmL1Jlc2VhcmNoL1Nob3J0X05vdGVzL3BucG9seS5odG1sI0xpc3RpbmcgdGhlIFZlcnRpY2VzXG5cbiAgZnVuY3Rpb24gcG5wb2x5ICh4LHksY29vcmRzKSB7XG4gICAgdmFyIHZlcnQgPSBbIFswLDBdIF1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvb3Jkc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICB2ZXJ0LnB1c2goY29vcmRzW2ldW2pdKVxuICAgICAgfVxuICAgICAgdmVydC5wdXNoKFswLDBdKVxuICAgIH1cblxuICAgIHZhciBpbnNpZGUgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdmVydC5sZW5ndGggLSAxOyBpIDwgdmVydC5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIGlmICgoKHZlcnRbaV1bMF0gPiB5KSAhPSAodmVydFtqXVswXSA+IHkpKSAmJiAoeCA8ICh2ZXJ0W2pdWzFdIC0gdmVydFtpXVsxXSkgKiAoeSAtIHZlcnRbaV1bMF0pIC8gKHZlcnRbal1bMF0gLSB2ZXJ0W2ldWzBdKSArIHZlcnRbaV1bMV0pKSBpbnNpZGUgPSAhaW5zaWRlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVxuICB9XG5cbiAgZ2p1LnBvaW50SW5Qb2x5Z29uID0gZnVuY3Rpb24gKHAsIHBvbHkpIHtcbiAgICB2YXIgY29vcmRzID0gKHBvbHkudHlwZSA9PSBcIlBvbHlnb25cIikgPyBbIHBvbHkuY29vcmRpbmF0ZXMgXSA6IHBvbHkuY29vcmRpbmF0ZXNcblxuICAgIHZhciBpbnNpZGVCb3ggPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZ2p1LnBvaW50SW5Cb3VuZGluZ0JveChwLCBib3VuZGluZ0JveEFyb3VuZFBvbHlDb29yZHMoY29vcmRzW2ldKSkpIGluc2lkZUJveCA9IHRydWVcbiAgICB9XG4gICAgaWYgKCFpbnNpZGVCb3gpIHJldHVybiBmYWxzZVxuXG4gICAgdmFyIGluc2lkZVBvbHkgPSBmYWxzZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocG5wb2x5KHAuY29vcmRpbmF0ZXNbMV0sIHAuY29vcmRpbmF0ZXNbMF0sIGNvb3Jkc1tpXSkpIGluc2lkZVBvbHkgPSB0cnVlXG4gICAgfVxuXG4gICAgcmV0dXJuIGluc2lkZVBvbHlcbiAgfVxuXG4gIGdqdS5udW1iZXJUb1JhZGl1cyA9IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICByZXR1cm4gbnVtYmVyICogTWF0aC5QSSAvIDE4MDtcbiAgfVxuXG4gIGdqdS5udW1iZXJUb0RlZ3JlZSA9IGZ1bmN0aW9uIChudW1iZXIpIHtcbiAgICByZXR1cm4gbnVtYmVyICogMTgwIC8gTWF0aC5QSTtcbiAgfVxuXG4gIC8vIHdyaXR0ZW4gd2l0aCBoZWxwIGZyb20gQHRhdXRvbG9nZVxuICBnanUuZHJhd0NpcmNsZSA9IGZ1bmN0aW9uIChyYWRpdXNJbk1ldGVycywgY2VudGVyUG9pbnQsIHN0ZXBzKSB7XG4gICAgdmFyIGNlbnRlciA9IFtjZW50ZXJQb2ludC5jb29yZGluYXRlc1sxXSwgY2VudGVyUG9pbnQuY29vcmRpbmF0ZXNbMF1dLFxuICAgICAgZGlzdCA9IChyYWRpdXNJbk1ldGVycyAvIDEwMDApIC8gNjM3MSxcbiAgICAgIC8vIGNvbnZlcnQgbWV0ZXJzIHRvIHJhZGlhbnRcbiAgICAgIHJhZENlbnRlciA9IFtnanUubnVtYmVyVG9SYWRpdXMoY2VudGVyWzBdKSwgZ2p1Lm51bWJlclRvUmFkaXVzKGNlbnRlclsxXSldLFxuICAgICAgc3RlcHMgPSBzdGVwcyB8fCAxNSxcbiAgICAgIC8vIDE1IHNpZGVkIGNpcmNsZVxuICAgICAgcG9seSA9IFtbY2VudGVyWzBdLCBjZW50ZXJbMV1dXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ZXBzOyBpKyspIHtcbiAgICAgIHZhciBicm5nID0gMiAqIE1hdGguUEkgKiBpIC8gc3RlcHM7XG4gICAgICB2YXIgbGF0ID0gTWF0aC5hc2luKE1hdGguc2luKHJhZENlbnRlclswXSkgKiBNYXRoLmNvcyhkaXN0KVxuICAgICAgICAgICAgICArIE1hdGguY29zKHJhZENlbnRlclswXSkgKiBNYXRoLnNpbihkaXN0KSAqIE1hdGguY29zKGJybmcpKTtcbiAgICAgIHZhciBsbmcgPSByYWRDZW50ZXJbMV0gKyBNYXRoLmF0YW4yKE1hdGguc2luKGJybmcpICogTWF0aC5zaW4oZGlzdCkgKiBNYXRoLmNvcyhyYWRDZW50ZXJbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jb3MoZGlzdCkgLSBNYXRoLnNpbihyYWRDZW50ZXJbMF0pICogTWF0aC5zaW4obGF0KSk7XG4gICAgICBwb2x5W2ldID0gW107XG4gICAgICBwb2x5W2ldWzFdID0gZ2p1Lm51bWJlclRvRGVncmVlKGxhdCk7XG4gICAgICBwb2x5W2ldWzBdID0gZ2p1Lm51bWJlclRvRGVncmVlKGxuZyk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBcInR5cGVcIjogXCJQb2x5Z29uXCIsXG4gICAgICBcImNvb3JkaW5hdGVzXCI6IFtwb2x5XVxuICAgIH07XG4gIH1cblxuICAvLyBhc3N1bWVzIHJlY3RhbmdsZSBzdGFydHMgYXQgbG93ZXIgbGVmdCBwb2ludFxuICBnanUucmVjdGFuZ2xlQ2VudHJvaWQgPSBmdW5jdGlvbiAocmVjdGFuZ2xlKSB7XG4gICAgdmFyIGJib3ggPSByZWN0YW5nbGUuY29vcmRpbmF0ZXNbMF07XG4gICAgdmFyIHhtaW4gPSBiYm94WzBdWzBdLFxuICAgICAgeW1pbiA9IGJib3hbMF1bMV0sXG4gICAgICB4bWF4ID0gYmJveFsyXVswXSxcbiAgICAgIHltYXggPSBiYm94WzJdWzFdO1xuICAgIHZhciB4d2lkdGggPSB4bWF4IC0geG1pbjtcbiAgICB2YXIgeXdpZHRoID0geW1heCAtIHltaW47XG4gICAgcmV0dXJuIHtcbiAgICAgICd0eXBlJzogJ1BvaW50JyxcbiAgICAgICdjb29yZGluYXRlcyc6IFt4bWluICsgeHdpZHRoIC8gMiwgeW1pbiArIHl3aWR0aCAvIDJdXG4gICAgfTtcbiAgfVxuXG4gIC8vIGZyb20gaHR0cDovL3d3dy5tb3ZhYmxlLXR5cGUuY28udWsvc2NyaXB0cy9sYXRsb25nLmh0bWxcbiAgZ2p1LnBvaW50RGlzdGFuY2UgPSBmdW5jdGlvbiAocHQxLCBwdDIpIHtcbiAgICB2YXIgbG9uMSA9IHB0MS5jb29yZGluYXRlc1swXSxcbiAgICAgIGxhdDEgPSBwdDEuY29vcmRpbmF0ZXNbMV0sXG4gICAgICBsb24yID0gcHQyLmNvb3JkaW5hdGVzWzBdLFxuICAgICAgbGF0MiA9IHB0Mi5jb29yZGluYXRlc1sxXSxcbiAgICAgIGRMYXQgPSBnanUubnVtYmVyVG9SYWRpdXMobGF0MiAtIGxhdDEpLFxuICAgICAgZExvbiA9IGdqdS5udW1iZXJUb1JhZGl1cyhsb24yIC0gbG9uMSksXG4gICAgICBhID0gTWF0aC5wb3coTWF0aC5zaW4oZExhdCAvIDIpLCAyKSArIE1hdGguY29zKGdqdS5udW1iZXJUb1JhZGl1cyhsYXQxKSlcbiAgICAgICAgKiBNYXRoLmNvcyhnanUubnVtYmVyVG9SYWRpdXMobGF0MikpICogTWF0aC5wb3coTWF0aC5zaW4oZExvbiAvIDIpLCAyKSxcbiAgICAgIGMgPSAyICogTWF0aC5hdGFuMihNYXRoLnNxcnQoYSksIE1hdGguc3FydCgxIC0gYSkpO1xuICAgIHJldHVybiAoNjM3MSAqIGMpICogMTAwMDsgLy8gcmV0dXJucyBtZXRlcnNcbiAgfSxcblxuICAvLyBjaGVja3MgaWYgZ2VvbWV0cnkgbGllcyBlbnRpcmVseSB3aXRoaW4gYSBjaXJjbGVcbiAgLy8gd29ya3Mgd2l0aCBQb2ludCwgTGluZVN0cmluZywgUG9seWdvblxuICBnanUuZ2VvbWV0cnlXaXRoaW5SYWRpdXMgPSBmdW5jdGlvbiAoZ2VvbWV0cnksIGNlbnRlciwgcmFkaXVzKSB7XG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ1BvaW50Jykge1xuICAgICAgcmV0dXJuIGdqdS5wb2ludERpc3RhbmNlKGdlb21ldHJ5LCBjZW50ZXIpIDw9IHJhZGl1cztcbiAgICB9IGVsc2UgaWYgKGdlb21ldHJ5LnR5cGUgPT0gJ0xpbmVTdHJpbmcnIHx8IGdlb21ldHJ5LnR5cGUgPT0gJ1BvbHlnb24nKSB7XG4gICAgICB2YXIgcG9pbnQgPSB7fTtcbiAgICAgIHZhciBjb29yZGluYXRlcztcbiAgICAgIGlmIChnZW9tZXRyeS50eXBlID09ICdQb2x5Z29uJykge1xuICAgICAgICAvLyBpdCdzIGVub3VnaCB0byBjaGVjayB0aGUgZXh0ZXJpb3IgcmluZyBvZiB0aGUgUG9seWdvblxuICAgICAgICBjb29yZGluYXRlcyA9IGdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29vcmRpbmF0ZXMgPSBnZW9tZXRyeS5jb29yZGluYXRlcztcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGkgaW4gY29vcmRpbmF0ZXMpIHtcbiAgICAgICAgcG9pbnQuY29vcmRpbmF0ZXMgPSBjb29yZGluYXRlc1tpXTtcbiAgICAgICAgaWYgKGdqdS5wb2ludERpc3RhbmNlKHBvaW50LCBjZW50ZXIpID4gcmFkaXVzKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9wYXVsYm91cmtlLm5ldC9nZW9tZXRyeS9wb2x5YXJlYS9qYXZhc2NyaXB0LnR4dFxuICBnanUuYXJlYSA9IGZ1bmN0aW9uIChwb2x5Z29uKSB7XG4gICAgdmFyIGFyZWEgPSAwO1xuICAgIC8vIFRPRE86IHBvbHlnb24gaG9sZXMgYXQgY29vcmRpbmF0ZXNbMV1cbiAgICB2YXIgcG9pbnRzID0gcG9seWdvbi5jb29yZGluYXRlc1swXTtcbiAgICB2YXIgaiA9IHBvaW50cy5sZW5ndGggLSAxO1xuICAgIHZhciBwMSwgcDI7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGogPSBpKyspIHtcbiAgICAgIHZhciBwMSA9IHtcbiAgICAgICAgeDogcG9pbnRzW2ldWzFdLFxuICAgICAgICB5OiBwb2ludHNbaV1bMF1cbiAgICAgIH07XG4gICAgICB2YXIgcDIgPSB7XG4gICAgICAgIHg6IHBvaW50c1tqXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2pdWzBdXG4gICAgICB9O1xuICAgICAgYXJlYSArPSBwMS54ICogcDIueTtcbiAgICAgIGFyZWEgLT0gcDEueSAqIHAyLng7XG4gICAgfVxuXG4gICAgYXJlYSAvPSAyO1xuICAgIHJldHVybiBhcmVhO1xuICB9LFxuXG4gIC8vIGFkYXB0ZWQgZnJvbSBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZ2VvbWV0cnkvcG9seWFyZWEvamF2YXNjcmlwdC50eHRcbiAgZ2p1LmNlbnRyb2lkID0gZnVuY3Rpb24gKHBvbHlnb24pIHtcbiAgICB2YXIgZiwgeCA9IDAsXG4gICAgICB5ID0gMDtcbiAgICAvLyBUT0RPOiBwb2x5Z29uIGhvbGVzIGF0IGNvb3JkaW5hdGVzWzFdXG4gICAgdmFyIHBvaW50cyA9IHBvbHlnb24uY29vcmRpbmF0ZXNbMF07XG4gICAgdmFyIGogPSBwb2ludHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgcDEsIHAyO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2ludHMubGVuZ3RoOyBqID0gaSsrKSB7XG4gICAgICB2YXIgcDEgPSB7XG4gICAgICAgIHg6IHBvaW50c1tpXVsxXSxcbiAgICAgICAgeTogcG9pbnRzW2ldWzBdXG4gICAgICB9O1xuICAgICAgdmFyIHAyID0ge1xuICAgICAgICB4OiBwb2ludHNbal1bMV0sXG4gICAgICAgIHk6IHBvaW50c1tqXVswXVxuICAgICAgfTtcbiAgICAgIGYgPSBwMS54ICogcDIueSAtIHAyLnggKiBwMS55O1xuICAgICAgeCArPSAocDEueCArIHAyLngpICogZjtcbiAgICAgIHkgKz0gKHAxLnkgKyBwMi55KSAqIGY7XG4gICAgfVxuXG4gICAgZiA9IGdqdS5hcmVhKHBvbHlnb24pICogNjtcbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW3kgLyBmLCB4IC8gZl1cbiAgICB9O1xuICB9LFxuXG4gIGdqdS5zaW1wbGlmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGtpbmspIHsgLyogc291cmNlW10gYXJyYXkgb2YgZ2VvanNvbiBwb2ludHMgKi9cbiAgICAvKiBraW5rXHRpbiBtZXRyZXMsIGtpbmtzIGFib3ZlIHRoaXMgZGVwdGgga2VwdCAgKi9cbiAgICAvKiBraW5rIGRlcHRoIGlzIHRoZSBoZWlnaHQgb2YgdGhlIHRyaWFuZ2xlIGFiYyB3aGVyZSBhLWIgYW5kIGItYyBhcmUgdHdvIGNvbnNlY3V0aXZlIGxpbmUgc2VnbWVudHMgKi9cbiAgICBraW5rID0ga2luayB8fCAyMDtcbiAgICBzb3VyY2UgPSBzb3VyY2UubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsbmc6IG8uY29vcmRpbmF0ZXNbMF0sXG4gICAgICAgIGxhdDogby5jb29yZGluYXRlc1sxXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5fc291cmNlLCBuX3N0YWNrLCBuX2Rlc3QsIHN0YXJ0LCBlbmQsIGksIHNpZztcbiAgICB2YXIgZGV2X3NxciwgbWF4X2Rldl9zcXIsIGJhbmRfc3FyO1xuICAgIHZhciB4MTIsIHkxMiwgZDEyLCB4MTMsIHkxMywgZDEzLCB4MjMsIHkyMywgZDIzO1xuICAgIHZhciBGID0gKE1hdGguUEkgLyAxODAuMCkgKiAwLjU7XG4gICAgdmFyIGluZGV4ID0gbmV3IEFycmF5KCk7IC8qIGFyYXkgb2YgaW5kZXhlcyBvZiBzb3VyY2UgcG9pbnRzIHRvIGluY2x1ZGUgaW4gdGhlIHJlZHVjZWQgbGluZSAqL1xuICAgIHZhciBzaWdfc3RhcnQgPSBuZXcgQXJyYXkoKTsgLyogaW5kaWNlcyBvZiBzdGFydCAmIGVuZCBvZiB3b3JraW5nIHNlY3Rpb24gKi9cbiAgICB2YXIgc2lnX2VuZCA9IG5ldyBBcnJheSgpO1xuXG4gICAgLyogY2hlY2sgZm9yIHNpbXBsZSBjYXNlcyAqL1xuXG4gICAgaWYgKHNvdXJjZS5sZW5ndGggPCAzKSByZXR1cm4gKHNvdXJjZSk7IC8qIG9uZSBvciB0d28gcG9pbnRzICovXG5cbiAgICAvKiBtb3JlIGNvbXBsZXggY2FzZS4gaW5pdGlhbGl6ZSBzdGFjayAqL1xuXG4gICAgbl9zb3VyY2UgPSBzb3VyY2UubGVuZ3RoO1xuICAgIGJhbmRfc3FyID0ga2luayAqIDM2MC4wIC8gKDIuMCAqIE1hdGguUEkgKiA2Mzc4MTM3LjApOyAvKiBOb3cgaW4gZGVncmVlcyAqL1xuICAgIGJhbmRfc3FyICo9IGJhbmRfc3FyO1xuICAgIG5fZGVzdCA9IDA7XG4gICAgc2lnX3N0YXJ0WzBdID0gMDtcbiAgICBzaWdfZW5kWzBdID0gbl9zb3VyY2UgLSAxO1xuICAgIG5fc3RhY2sgPSAxO1xuXG4gICAgLyogd2hpbGUgdGhlIHN0YWNrIGlzIG5vdCBlbXB0eSAgLi4uICovXG4gICAgd2hpbGUgKG5fc3RhY2sgPiAwKSB7XG5cbiAgICAgIC8qIC4uLiBwb3AgdGhlIHRvcC1tb3N0IGVudHJpZXMgb2ZmIHRoZSBzdGFja3MgKi9cblxuICAgICAgc3RhcnQgPSBzaWdfc3RhcnRbbl9zdGFjayAtIDFdO1xuICAgICAgZW5kID0gc2lnX2VuZFtuX3N0YWNrIC0gMV07XG4gICAgICBuX3N0YWNrLS07XG5cbiAgICAgIGlmICgoZW5kIC0gc3RhcnQpID4gMSkgeyAvKiBhbnkgaW50ZXJtZWRpYXRlIHBvaW50cyA/ICovXG5cbiAgICAgICAgLyogLi4uIHllcywgc28gZmluZCBtb3N0IGRldmlhbnQgaW50ZXJtZWRpYXRlIHBvaW50IHRvXG4gICAgICAgIGVpdGhlciBzaWRlIG9mIGxpbmUgam9pbmluZyBzdGFydCAmIGVuZCBwb2ludHMgKi9cblxuICAgICAgICB4MTIgPSAoc291cmNlW2VuZF0ubG5nKCkgLSBzb3VyY2Vbc3RhcnRdLmxuZygpKTtcbiAgICAgICAgeTEyID0gKHNvdXJjZVtlbmRdLmxhdCgpIC0gc291cmNlW3N0YXJ0XS5sYXQoKSk7XG4gICAgICAgIGlmIChNYXRoLmFicyh4MTIpID4gMTgwLjApIHgxMiA9IDM2MC4wIC0gTWF0aC5hYnMoeDEyKTtcbiAgICAgICAgeDEyICo9IE1hdGguY29zKEYgKiAoc291cmNlW2VuZF0ubGF0KCkgKyBzb3VyY2Vbc3RhcnRdLmxhdCgpKSk7IC8qIHVzZSBhdmcgbGF0IHRvIHJlZHVjZSBsbmcgKi9cbiAgICAgICAgZDEyID0gKHgxMiAqIHgxMikgKyAoeTEyICogeTEyKTtcblxuICAgICAgICBmb3IgKGkgPSBzdGFydCArIDEsIHNpZyA9IHN0YXJ0LCBtYXhfZGV2X3NxciA9IC0xLjA7IGkgPCBlbmQ7IGkrKykge1xuXG4gICAgICAgICAgeDEzID0gc291cmNlW2ldLmxuZygpIC0gc291cmNlW3N0YXJ0XS5sbmcoKTtcbiAgICAgICAgICB5MTMgPSBzb3VyY2VbaV0ubGF0KCkgLSBzb3VyY2Vbc3RhcnRdLmxhdCgpO1xuICAgICAgICAgIGlmIChNYXRoLmFicyh4MTMpID4gMTgwLjApIHgxMyA9IDM2MC4wIC0gTWF0aC5hYnMoeDEzKTtcbiAgICAgICAgICB4MTMgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbaV0ubGF0KCkgKyBzb3VyY2Vbc3RhcnRdLmxhdCgpKSk7XG4gICAgICAgICAgZDEzID0gKHgxMyAqIHgxMykgKyAoeTEzICogeTEzKTtcblxuICAgICAgICAgIHgyMyA9IHNvdXJjZVtpXS5sbmcoKSAtIHNvdXJjZVtlbmRdLmxuZygpO1xuICAgICAgICAgIHkyMyA9IHNvdXJjZVtpXS5sYXQoKSAtIHNvdXJjZVtlbmRdLmxhdCgpO1xuICAgICAgICAgIGlmIChNYXRoLmFicyh4MjMpID4gMTgwLjApIHgyMyA9IDM2MC4wIC0gTWF0aC5hYnMoeDIzKTtcbiAgICAgICAgICB4MjMgKj0gTWF0aC5jb3MoRiAqIChzb3VyY2VbaV0ubGF0KCkgKyBzb3VyY2VbZW5kXS5sYXQoKSkpO1xuICAgICAgICAgIGQyMyA9ICh4MjMgKiB4MjMpICsgKHkyMyAqIHkyMyk7XG5cbiAgICAgICAgICBpZiAoZDEzID49IChkMTIgKyBkMjMpKSBkZXZfc3FyID0gZDIzO1xuICAgICAgICAgIGVsc2UgaWYgKGQyMyA+PSAoZDEyICsgZDEzKSkgZGV2X3NxciA9IGQxMztcbiAgICAgICAgICBlbHNlIGRldl9zcXIgPSAoeDEzICogeTEyIC0geTEzICogeDEyKSAqICh4MTMgKiB5MTIgLSB5MTMgKiB4MTIpIC8gZDEyOyAvLyBzb2x2ZSB0cmlhbmdsZVxuICAgICAgICAgIGlmIChkZXZfc3FyID4gbWF4X2Rldl9zcXIpIHtcbiAgICAgICAgICAgIHNpZyA9IGk7XG4gICAgICAgICAgICBtYXhfZGV2X3NxciA9IGRldl9zcXI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1heF9kZXZfc3FyIDwgYmFuZF9zcXIpIHsgLyogaXMgdGhlcmUgYSBzaWcuIGludGVybWVkaWF0ZSBwb2ludCA/ICovXG4gICAgICAgICAgLyogLi4uIG5vLCBzbyB0cmFuc2ZlciBjdXJyZW50IHN0YXJ0IHBvaW50ICovXG4gICAgICAgICAgaW5kZXhbbl9kZXN0XSA9IHN0YXJ0O1xuICAgICAgICAgIG5fZGVzdCsrO1xuICAgICAgICB9IGVsc2UgeyAvKiAuLi4geWVzLCBzbyBwdXNoIHR3byBzdWItc2VjdGlvbnMgb24gc3RhY2sgZm9yIGZ1cnRoZXIgcHJvY2Vzc2luZyAqL1xuICAgICAgICAgIG5fc3RhY2srKztcbiAgICAgICAgICBzaWdfc3RhcnRbbl9zdGFjayAtIDFdID0gc2lnO1xuICAgICAgICAgIHNpZ19lbmRbbl9zdGFjayAtIDFdID0gZW5kO1xuICAgICAgICAgIG5fc3RhY2srKztcbiAgICAgICAgICBzaWdfc3RhcnRbbl9zdGFjayAtIDFdID0gc3RhcnQ7XG4gICAgICAgICAgc2lnX2VuZFtuX3N0YWNrIC0gMV0gPSBzaWc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7IC8qIC4uLiBubyBpbnRlcm1lZGlhdGUgcG9pbnRzLCBzbyB0cmFuc2ZlciBjdXJyZW50IHN0YXJ0IHBvaW50ICovXG4gICAgICAgIGluZGV4W25fZGVzdF0gPSBzdGFydDtcbiAgICAgICAgbl9kZXN0Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogdHJhbnNmZXIgbGFzdCBwb2ludCAqL1xuICAgIGluZGV4W25fZGVzdF0gPSBuX3NvdXJjZSAtIDE7XG4gICAgbl9kZXN0Kys7XG5cbiAgICAvKiBtYWtlIHJldHVybiBhcnJheSAqL1xuICAgIHZhciByID0gbmV3IEFycmF5KCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuX2Rlc3Q7IGkrKylcbiAgICAgIHIucHVzaChzb3VyY2VbaW5kZXhbaV1dKTtcblxuICAgIHJldHVybiByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJQb2ludFwiLFxuICAgICAgICBjb29yZGluYXRlczogW28ubG5nLCBvLmxhdF1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIGh0dHA6Ly93d3cubW92YWJsZS10eXBlLmNvLnVrL3NjcmlwdHMvbGF0bG9uZy5odG1sI2Rlc3RQb2ludFxuICBnanUuZGVzdGluYXRpb25Qb2ludCA9IGZ1bmN0aW9uIChwdCwgYnJuZywgZGlzdCkge1xuICAgIGRpc3QgPSBkaXN0LzYzNzE7ICAvLyBjb252ZXJ0IGRpc3QgdG8gYW5ndWxhciBkaXN0YW5jZSBpbiByYWRpYW5zXG4gICAgYnJuZyA9IGdqdS5udW1iZXJUb1JhZGl1cyhicm5nKTtcblxuICAgIHZhciBsYXQxID0gZ2p1Lm51bWJlclRvUmFkaXVzKHB0LmNvb3JkaW5hdGVzWzBdKTtcbiAgICB2YXIgbG9uMSA9IGdqdS5udW1iZXJUb1JhZGl1cyhwdC5jb29yZGluYXRlc1sxXSk7XG5cbiAgICB2YXIgbGF0MiA9IE1hdGguYXNpbiggTWF0aC5zaW4obGF0MSkqTWF0aC5jb3MoZGlzdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhsYXQxKSpNYXRoLnNpbihkaXN0KSpNYXRoLmNvcyhicm5nKSApO1xuICAgIHZhciBsb24yID0gbG9uMSArIE1hdGguYXRhbjIoTWF0aC5zaW4oYnJuZykqTWF0aC5zaW4oZGlzdCkqTWF0aC5jb3MobGF0MSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNvcyhkaXN0KS1NYXRoLnNpbihsYXQxKSpNYXRoLnNpbihsYXQyKSk7XG4gICAgbG9uMiA9IChsb24yKzMqTWF0aC5QSSkgJSAoMipNYXRoLlBJKSAtIE1hdGguUEk7ICAvLyBub3JtYWxpc2UgdG8gLTE4MC4uKzE4MMK6XG5cbiAgICByZXR1cm4ge1xuICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgJ2Nvb3JkaW5hdGVzJzogW2dqdS5udW1iZXJUb0RlZ3JlZShsYXQyKSwgZ2p1Lm51bWJlclRvRGVncmVlKGxvbjIpXVxuICAgIH07XG4gIH07XG5cbn0pKCk7XG4iLCJ2YXIgZ2V0Q3VycmVudExvY2F0aW9uID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gIHZhciBnZW9sb2NhdG9yID0gd2luZG93Lm5hdmlnYXRvci5nZW9sb2NhdGlvbjtcbiAgaWYgKGdlb2xvY2F0b3IpIHtcbiAgICBnZW9sb2NhdG9yLmdldEN1cnJlbnRQb3NpdGlvbihzdWNjZXNzLCBlcnJvcik7XG4gIH0gZWxzZSB7XG4gICAgYWxlcnQoXCJCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgZ2VvbG9jYXRpb25cIik7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRDdXJyZW50TG9jYXRpb247XG4iLCJ2YXIgR09PR0xFX01BUFNfVVJMID0gXCJodHRwOi8vbWFwcy5nb29nbGVhcGlzLmNvbS9tYXBzL2FwaS9nZW9jb2RlL2pzb25cIjtcblxudmFyIGdlb2NvZGUgPSBmdW5jdGlvbiAoYWRkcmVzcywgY2FsbGJhY2spIHtcbiAgdmFyIHBhcmFtcyA9IHtcbiAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgIHNlbnNvcjogIGZhbHNlXG4gIH1cblxuICB2YXIgdXJsID0gR09PR0xFX01BUFNfVVJMICsgXCI/XCIgKyAkLnBhcmFtKHBhcmFtcyk7XG5cbiAgJC5hamF4KHVybCwgeyBzdWNjZXNzOiBjYWxsYmFjayB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZW9jb2RlO1xuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuLi9jb25maWdcIik7XG52YXIgTUFQX0FUVFJJQlVUSU9OID0gJ01hcCB0aWxlcyBieSA8YSBocmVmPVwiaHR0cDovL3N0YW1lbi5jb21cIj5TdGFtZW4gRGVzaWduPC9hPiwgdW5kZXIgPGEgaHJlZj1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL2xpY2Vuc2VzL2J5LzMuMFwiPkNDIEJZIDMuMDwvYT4uIERhdGEgYnkgPGEgaHJlZj1cImh0dHA6Ly9vcGVuc3RyZWV0bWFwLm9yZ1wiPk9wZW5TdHJlZXRNYXA8L2E+LCB1bmRlciA8YSBocmVmPVwiaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbGljZW5zZXMvYnktc2EvMy4wXCI+Q0MgQlkgU0E8L2E+LidcbnZhciBUSUxFX0xBWUVSX1VSTCA9ICdodHRwOi8vdGlsZS5zdGFtZW4uY29tL3RvbmVyL3t6fS97eH0ve3l9LnBuZyc7XG4vL3ZhciBNQVBfQVRUUklCVVRJT04gPSBcIsKpMjAxMiBOb2tpYSA8YSBocmVmPVxcXCJodHRwOi8vaGVyZS5uZXQvc2VydmljZXMvdGVybXNcXFwiPlRlcm1zIG9mIFVzZTwvYT5cIlxuLy92YXIgVElMRV9MQVlFUl9VUkwgID0gXCJodHRwczovL21hcHMubmxwLm5va2lhLmNvbS9tYXB0aWxlci92Mi9tYXB0aWxlL25ld2VzdC9ub3JtYWwuZGF5L3t6fS97eH0ve3l9LzI1Ni9wbmc4P2xnPWVuZyZ0b2tlbj02MVlXWVJPdWZMdV9mOHlsRTB2bjBRJmFwcF9pZD1xSVdEa2xpRkN0TG50TG1hMmU2T1wiXG5cbnZhciBSRUdJT05fTEFZRVJfU1RZTEUgPXtcbiAgY29sb3I6IFwiI0YxMVwiLFxuICB3ZWlnaHQ6IDUsXG4gIG9wYWNpdHk6IDAuMVxufVxuXG52YXIgTWFwID0gZnVuY3Rpb24gKGpzb24pIHtcbiAgdGhpcy5qc29uID0ganNvbjtcblxuICB0aGlzLm1hcCA9IEwubWFwKFwibWFwXCIsIHtcbiAgICBkcmFnZ2luZzogZmFsc2UsXG4gICAgdG91Y2hab29tOiBmYWxzZSxcbiAgICBzY3JvbGxXaGVlbFpvb206IGZhbHNlLFxuICAgIGRvdWJsZUNsaWNrWm9vbTogZmFsc2UsXG4gICAgYm94Wm9vbTogZmFsc2UsXG4gICAgY2xvc2VQb3B1cE9uQ2xpY2s6IGZhbHNlLFxuICAgIGtleWJvYXJkOiBmYWxzZSxcbiAgICB6b29tQ29udHJvbDogZmFsc2VcbiAgfSk7XG5cbiAgdGhpcy5tYXJrZXJzID0gW107XG59XG5cbnZhciBtYXJrZXJJY29uID0gTC5pY29uKHtcbiAgICBpY29uVXJsOiAnLi4vaW1nL21hcmtlci5zdmcnLFxuICAgIHNoYWRvd1VybDogJy4uL2ltZy9tYXJrZXJfc2hhZG93LnBuZycsXG5cbiAgICBpY29uU2l6ZTogICAgIFszNiwgNDNdLCAvLyBzaXplIG9mIHRoZSBpY29uXG4gICAgc2hhZG93U2l6ZTogICBbMTAwLCA1MF0sIFxuICAgIGljb25BbmNob3I6ICAgWzE4LCA0M10sIC8vIHBvaW50IG9mIHRoZSBpY29uIHdoaWNoIHdpbGwgY29ycmVzcG9uZCB0byBtYXJrZXIncyBsb2NhdGlvblxuICAgIHNoYWRvd0FuY2hvcjogWzQwLCA0NF0sXG4gICAgcG9wdXBBbmNob3I6ICBbMCwgLTUwXSAvLyBwb2ludCBmcm9tIHdoaWNoIHRoZSBwb3B1cCBzaG91bGQgb3BlbiByZWxhdGl2ZSB0byB0aGUgaWNvbkFuY2hvclxufSk7XG5cbk1hcC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICBMLnRpbGVMYXllcihUSUxFX0xBWUVSX1VSTCwge1xuICAgIGF0dHJpYnV0aW9uOiBNQVBfQVRUUklCVVRJT04sXG4gICAgbWF4Wm9vbTogMjNcbiAgfSkuYWRkVG8odGhpcy5tYXApO1xuXG4gIEwuZ2VvSnNvbih0aGlzLmpzb24sIHtcbiAgICBzdHlsZTogUkVHSU9OX0xBWUVSX1NUWUxFXG4gIH0pLmFkZFRvKHRoaXMubWFwKTtcblxuICB0aGlzLnJlc2V0KCk7XG59XG5cbk1hcC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucmVtb3ZlTWFya2VycygpO1xuICB0aGlzLnNldExvY2F0aW9uKGNvbmZpZy5sYXRpdHVkZSwgY29uZmlnLmxvbmdpdHVkZSwgY29uZmlnLmluaXRpYWxab29tKTtcbiAgdGhpcy5tYXAuY2xvc2VQb3B1cCgpO1xuICB0aGlzLm1hcC5kcmFnZ2luZy5kaXNhYmxlKCk7XG59XG5cbk1hcC5wcm90b3R5cGUuc2V0TG9jYXRpb24gPSBmdW5jdGlvbiAobGF0LCBsbmcsIHpvb20pIHtcbiAgdGhpcy5tYXAuc2V0VmlldyhbbGF0LCBsbmddLCB6b29tKTtcbiAgdGhpcy5tYXAuZHJhZ2dpbmcuZW5hYmxlKCk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5NYXAucHJvdG90eXBlLmNyZWF0ZU1hcmtlciA9IGZ1bmN0aW9uIChsYXQsIGxuZykge1xuICB2YXIgbWFya2VyID0gTC5tYXJrZXIoW2xhdCwgbG5nXSwge1xuICAgIGljb246IG1hcmtlckljb24sXG4gICAgY2xpY2thYmxlOiBmYWxzZVxuICB9KS5hZGRUbyh0aGlzLm1hcCk7XG4gIHRoaXMubWFya2Vycy5wdXNoKG1hcmtlcik7XG4gIHJldHVybiB0cnVlO1xufVxuXG5NYXAucHJvdG90eXBlLmNyZWF0ZVBvcHVwID0gZnVuY3Rpb24gKGxhdCwgbG5nLCBhbnN3ZXIsIGRldGFpbCkge1xuICB2YXIgcG9wdXAgPSBMLnBvcHVwKHtcbiAgICBhdXRvUGFuOiB0cnVlLFxuICAgIGNsb3NlQnV0dG9uOiBmYWxzZSxcbiAgICBhdXRvUGFuUGFkZGluZzogWzEwLDEwXVxuICB9KVxuICAuc2V0TGF0TG5nKFtsYXQsIGxuZ10pXG4gIC5zZXRDb250ZW50KCc8YSBpZD1cImFuc3dlci1iYWNrXCIgaHJlZj1cIlwiPjwvYT48aDE+JyArIGFuc3dlciArICc8L2gxPjxwPicgKyBkZXRhaWwgKyAnPC9wPicpXG4gIC5vcGVuT24odGhpcy5tYXApO1xuLy8gICQoJyNhbnN3ZXItYmFjaycpLm9uKCdjbGljaycsIHJlc2V0KTtcbn1cblxuTWFwLnByb3RvdHlwZS5yZW1vdmVNYXJrZXJzID0gZnVuY3Rpb24gKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWFya2Vycy5sZW5ndGg7IGkrKykge1xuICAgIHRoaXMubWFwLnJlbW92ZUxheWVyKHRoaXMubWFya2Vyc1tpXSk7XG4gIH07XG4gIHJldHVybiB0cnVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcDtcbiJdfQ==
