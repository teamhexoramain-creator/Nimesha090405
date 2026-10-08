/* HEXORA — Firebase project used by the admin panel and the site.
   These values are not secrets: every Firebase web app shows them in its code.
   Firestore security rules (firestore.rules) decide who can change data.
   Never put a password, the PIN or a private key in this file.

   apiKey / projectId: Firebase console → Project settings → General → Your apps → Web app.
   adminEmail: the Email/Password user made in Authentication (its password is the admin PIN).
   Leave them empty and the site uses assets/js/config.js and services.js. */
window.HX_FIREBASE = {
  apiKey: "AIzaSyAwn3DDg-zDPVuo3n9KhSUdhhemz4dmHLI",
  projectId: "hexora-admin-panel",
  adminEmail: "teamhexoramain@gmail.com"
};
