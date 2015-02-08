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
      // TODO: Do not call this on page load since it
      // resets the URL currently
      // reset()
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
