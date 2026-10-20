# Send bookings to your private Google Sheet

Takes about 10 minutes and is free. You need a Google account (Gmail works).

When it's set up:
- Every booking on the website becomes a new row in your Google Sheet: reference, treatment, dentist, date, time, name, email, phone, note.
- **Only you can open the sheet.** It stays private in your Google Drive. Visitors never get access. The website can only *add* bookings and ask which times are taken; it can never read names or contact details.
- A time that someone has booked is greyed out for every other visitor, on every device.
- Optional: you get an email for every new booking.

---

## Step 1: Create the sheet

1. Go to **sheets.google.com** and make a **Blank spreadsheet**.
2. Name it something like **Lumière bookings** (top left).

## Step 2: Add the booking script

1. In the sheet, open **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete everything in the editor (the empty `function myFunction() {}`).
3. Open `apps-script/Code.gs` from this project folder in Notepad, copy **all** of it, and paste it into the editor.
4. Optional, for email alerts: near the top, change `ADMIN_EMAIL: ''` to your email, for example `ADMIN_EMAIL: 'you@gmail.com'`.
5. Click the **Save** icon (💾).

## Step 3: Prepare the sheet (run once)

1. In the toolbar's function menu, choose **setup**, then click **▶ Run**.
2. Google asks for permission the first time:
   - Click **Review permissions** and choose your account.
   - You may see "Google hasn't verified this app". That's normal for your own script. Click **Advanced → Go to (project name) (unsafe)**.
   - Click **Allow**. The script can only edit *this* spreadsheet and send email as you. It cannot see your other files.
3. Go back to the sheet tab. A **Bookings** tab now has green column headers.

## Step 4: Publish the script as a web app

1. In the Apps Script tab, click **Deploy → New deployment**.
2. Click the ⚙️ gear next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** Bookings
   - **Execute as:** **Me** (your email)
   - **Who has access:** **Anyone**
4. Click **Deploy**, then copy the **Web app URL**. It looks like
   `https://script.google.com/macros/s/AKfycb…long…/exec`

> "Anyone" means anyone can *send a booking* to the script, which is what a website needs. It does **not** share your spreadsheet. The script runs as you, writes to your sheet, and has spam protection built in: it limits repeat bookings, re-checks every field, and silently rejects bots.

## Step 5: Connect the website

1. In the project folder, open **`dist/config.js`** in Notepad.
2. Paste your URL between the quotes:
   ```js
   window.LUMIERE_CONFIG = window.LUMIERE_CONFIG || {
     bookingEndpoint: 'https://script.google.com/macros/s/AKfycb…/exec',
   };
   ```
3. Save. That's it, no rebuild needed. (If you later run `npm run build`, edit `public/config.js` the same way, because the build copies it into `dist/`.)

## Step 6: Test it

1. Open `dist/index.html` (or your live site) and make a booking.
2. Your sheet should show a new row within a few seconds, with status **New**.
3. Start the booking again for the same dentist and day. The time you just took is greyed out.

---

## Managing bookings in the sheet

- **Status column:** pick New, Confirmed, Completed, Cancelled or No-show from the dropdown.
- **Cancelled frees the slot**, so the time becomes bookable again on the website right away.
- **Phone bookings:** add a row by hand to block that time online. Fill in Status, Date (`2026-10-25` format), Time (`10:15` format, exactly as the website shows it in 24-hour form) and Dentist id (`aanya`, `kabir` or `meera`).
- Want a receptionist to see bookings too? Use the sheet's **Share** button and add their email. Only people you add can open it.

## If something goes wrong

| What you see | Fix |
|---|---|
| Website says "could not reach the booking system" | Check the URL in `config.js` ends in `/exec`, and that **Who has access** is **Anyone**. |
| Bookings don't appear | Open Apps Script → **Executions** (left sidebar) to see errors. Make sure you ran **setup** once. |
| You changed `Code.gs` but nothing changed | Click **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same. |
| "Too many booking attempts" | Spam protection: max 3 bookings per email in 10 minutes. Adjust `MAX_PER_EMAIL_PER_10_MIN` in `Code.gs`. |

## Changing hours, treatments or dentists

The website and the script must agree. If you change times, treatments or dentists, update both:
- website: `src/booking/schedule.ts` (times), `src/booking/catalog.ts` (treatments), `src/data/content.ts` (team)
- script: `WEEKDAY_TIMES`, `SATURDAY_TIMES`, `SERVICES` and `DENTISTS` at the top of `Code.gs`, then redeploy a **New version**.

## Privacy note for a real clinic

Patient names, emails and phone numbers are personal data (in India, covered by the DPDP Act). Keep the sheet shared only with staff who need it, turn on 2-step verification for the Google account, and delete old rows you no longer need.
