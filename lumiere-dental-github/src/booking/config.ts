/**
 * Reads public/config.js (window.LUMIERE_CONFIG). Kept free of imports so any module can use it.
 */
declare global {
  interface Window {
    LUMIERE_CONFIG?: { bookingEndpoint?: string };
  }
}

const raw = (typeof window !== 'undefined' && window.LUMIERE_CONFIG?.bookingEndpoint) || '';

/** The Google Apps Script web app URL, or '' for demo mode. */
// https:// for Google Apps Script, or http://localhost/... when served by server.js (local spreadsheet mode)
export const BOOKING_ENDPOINT = /^(https:\/\/\S+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/\S*)$/.test(raw.trim()) ? raw.trim() : '';

/** True when bookings are sent to a real Google Sheet. */
export const LIVE = BOOKING_ENDPOINT !== '';
