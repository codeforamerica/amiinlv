// Vendor
//@codekit-prepend "bootstrap"
//@codekit-prepend "../vendor/underscore-min.js"
//@codekit-prepend "../vendor/backbone-min.js"
//@codekit-prepend "../vendor/ICanHaz.min.js"

// Config
//@codekit-append "./config.js"

// Models
//@codekit-append "./models/location.js"

// Views
//@codekit-append "./views/main.js"
//@codekit-append "./views/map.js"
//@codekit-append "./views/question.js"
//@codekit-append "./views/answer.js"

jQuery(function() {
  if ($("#main").length > 0) {
    window.userLocation = new App.Models.Location();
    window.view         = new App.Views.Main();
    window.view.render();
  }
});

window.App = {
  Routers: {},
  Views: {},
  Models: {},
  Collections: {},
  Config: {}
};
