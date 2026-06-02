// Browser-facing integration note:
// the runtime implementation is exported through window.DB.MediaRefinery in db.js.
// Cloud Functions use functions/media-refinery.js.

const MEDIA_REFINERY_ALLOWED_STATUSES = [
  'REFINED',
  'TAGGED',
  'PUBLISH_READY',
  'HERO_ASSET',
];

if (typeof window !== 'undefined') {
  window.MEDIA_REFINERY_ALLOWED_STATUSES = MEDIA_REFINERY_ALLOWED_STATUSES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MEDIA_REFINERY_ALLOWED_STATUSES };
}
