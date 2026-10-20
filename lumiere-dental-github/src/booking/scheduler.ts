/**
 * Chooses where bookings go.
 *  - public/config.js has a bookingEndpoint → bookings are saved to the Google Sheet (LIVE mode)
 *  - otherwise → the front-end demo scheduler (nothing leaves the browser)
 */
import { BOOKING_ENDPOINT, LIVE } from './config';
import { mockScheduler } from './mockScheduler';
import { createSheetScheduler } from './sheetScheduler';

export { LIVE };
export const scheduler = LIVE ? createSheetScheduler(BOOKING_ENDPOINT) : mockScheduler;
