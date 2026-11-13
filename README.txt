AXOM GAMING COMPLETE UI REDESIGN

Replace index.html, style.css, membership.html, membership.css, stock.html, stock.css and axom-logo.jpeg in your website repository. Keep script.js, membership.js and stock.js unchanged. The three JS files in this package are copies of your originals and are included for convenience.

After deployment, test admin login, booking save, live session controls, membership registration/booking, and stock add/edit. Back up your current site first.


AXOM GAMING PWA UPDATE
======================

New files:
- manifest.webmanifest
- service-worker.js
- icon-192.png
- icon-512.png

PWA metadata and service-worker registration have been added to:
- index.html
- membership.html
- stock.html

DEPLOY
1. Back up your current GitHub repository.
2. Upload/replace the contents of this AXOM folder in the repository.
3. Keep the files in the same folder together (do not put them in a new nested folder unless your site is configured for that).
4. Enable GitHub Pages over HTTPS and wait for deployment.
5. Open the deployed site once while online.

INSTALL ON ANDROID
1. Open the website in Chrome.
2. Open the browser menu (three dots).
3. Tap Install app or Add to Home screen.
4. Confirm installation.

INSTALL ON WINDOWS
1. Open the website in Chrome or Edge.
2. Use the install icon in the address bar, or browser menu > Install page as app.
3. Confirm installation.

IMPORTANT LIMITATIONS
- This is an installable PWA, not a Play Store APK.
- The interface shell can load from cache after it has been opened online once.
- Booking, login, memberships, inventory writes, live session updates and other Apps Script operations still need internet.
- GitHub Pages and Google Apps Script are free within their current quotas/terms; lifetime free availability cannot be guaranteed.
- Test all admin flows after deployment. Service-worker caching can briefly serve a cached asset; bump CACHE_NAME in service-worker.js (for example v2) when making a major cache change.
