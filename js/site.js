var cartoJSON = "http://cfa.cartodb.com/api/v1/viz/25045/viz.json";
var mapAttrib = 'CartoDB <a href="http://cartodb.com/attributions">attribution</a>, &copy;2012 Nokia <a href="http://here.net/services/terms">Terms of use</a>';


var cdb = {};
function getCartoDB(data) {
    cdb = data;
}

$(document).ready(function() {

    $('#input-location').focus();

    // RETRIEVE CARTODB JSONP FILE
    $.ajax({
        url: cartoJSON + '?callback=getCartoDB',
        async: false,
        dataType: 'jsonp',
        success: function(data) {
            getCartoDB(data);
            makeMap();
            $('a.leaflet-control-zoom-in').contents().replaceWith('');
        }
    });

    $('#input-target').click(function() {
        $('#alert').slideDown(200);
    });
    $('#alert button').click(function() {
        $('#alert').slideUp(200);
    });

    $('#input-go').click(function() {
        $('#marker').css('display', 'block');
        $('#marker').animate({ opacity: 0 }, 0);
        $('#marker').animate( {opacity: 1, top: '200'}, 250);
        $('#question').fadeOut(250, function() {
            $('#answer').fadeIn(250);
        });
    })

    $(document).keydown(function (e) {
        // Press Escape to reset
        if (e.which == 27 && e.ctrlKey == false && e.metaKey == false) {
            $('#marker').animate( {opacity: 0, top: '0'}, 0);
            $('#answer').fadeOut(150, function() {
                $('#question').fadeIn(150);
            });
        }
    });

});

function makeMap() {
    var mapTileset = cdb.layers[0].options.urlTemplate;

    var map = L.map('map', { 
        center: new L.LatLng(36.18, -115.14),
        zoom: 12,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false
    })
    L.tileLayer(mapTileset, {
        attribution: mapAttrib,
        maxZoom: 18
    }).addTo(map);

}