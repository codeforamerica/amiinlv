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
  $('#about-close').on('click', aboutClose);
}

function render () {
  $("head title").html("Am I in " + config.name);
  $("#header h1").html(config.name + '?');
  $("#input-location").attr("placeholder", config.address);
  $("#input-location").focus();
  map.render();
}

/**
 * Resets the application to its initial state
 */

function reset () {
  $("#input-location").val("")
  $('#alert').hide();
  $('#answer').fadeOut(150, function() {
    $('#question').fadeIn(150);
    $('#input-location').focus();
  });

  map.reset();
}

/**
 * Renders the answer and drops the pin on the map
 */

function setAnswer (answer) {
  // Reset #answer to block element so animation will work
  $('#answer').show().animate({opacity: 0, top: '-150px'}, 0);
  $('#question').fadeOut(250, function() {
    $('#answer').animate({opacity: 1, top: '0'}, 150);
  });
  $('#answer h1').html(answer);

  // Include a message providing further information.
  // Currently, it's just a simple restatement of the
  // answer.  See GitHub issue #6.
  if (answer == "Yes") {
    $('#answer p').html('You are within city limits!');
  } else {
    $('#answer p').html('You are not in Las Vegas!')
  }

  map.createMarker(latitude, longitude)
  map.setLocation(latitude, longitude, config.finalZoom);
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
  var $input = $("#input-location"), address = $input.val();
  geocodeByAddress(address);
  return false;
}

/**
 * Submits the form, geocodes the address, and checks
 * whether it is within the limits
 */

function onSubmit (e) {
  e.preventDefault();
  var $input = $("#input-location"), address = $input.val();
  geocodeByAddress(address);
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
  // hiding this sawtooth doesn't work right now.
  $('#plaque:after').hide();
  
  $('#help').hide();
  $('#question').animate({top: '-100px'}, 250);
  $('#about').slideDown(250);
}

/**
 * Closes about window
 */

function aboutClose () {
  $('#about').slideUp(250, function() {
      $('#help').slideDown(0);
  });
  $('#question').animate({top: '0'}, 250);
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

