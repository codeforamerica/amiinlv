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