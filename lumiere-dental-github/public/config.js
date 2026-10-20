/*
 * Booking settings — the only file you need to edit after building.
 *
 * bookingEndpoint: paste your Google Apps Script web app URL (it ends in /exec) between the quotes.
 *   With a URL, every booking is saved as a row in your private Google Sheet.
 *   Left empty, the booking flow runs in demo mode and nothing is sent anywhere.
 *   Setup guide: apps-script/SETUP.md
 */
window.LUMIERE_CONFIG = window.LUMIERE_CONFIG || {
  bookingEndpoint: 'https://script.google.com/macros/s/AKfycby29uiO-hsvyG_NOTCQ9wa933ce_MfZbvN1dYX0RNPljM_9a4yfaCx0CYXWFaFCoTvsig/exec',
};
