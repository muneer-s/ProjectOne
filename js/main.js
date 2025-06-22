$(document).ready(function () {
  // Check if niceSelect plugin is available before calling it
  if ($.fn.niceSelect) {
    $('select').niceSelect();
  } else {
    console.warn("niceSelect plugin is not loaded.");
  }
});
