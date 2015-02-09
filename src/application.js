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
  }

  var onError = function (err) {
    alert('Unable to retrieve current position. Geolocation may be disabled on this browser or unavailable on this system.')
    resetCurrentLocationButton()
  }

  getCurrentLocation(onSuccess, onError)
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
