# media-refinery

MVP implementation lives in `functions/media-refinery.js` and is exposed by the Cloud Function `mediaRefineryApi`.

Core gate:

```txt
raw asset -> ingest -> classify/score -> refine -> QA -> publish-ready search
```

Content automation must only use assets with one of these statuses:

```txt
REFINED
TAGGED
PUBLISH_READY
HERO_ASSET
```

Primary endpoints:

```txt
POST /mediaRefineryApi/ingest
GET  /mediaRefineryApi/assets
GET  /mediaRefineryApi/assets/:id
POST /mediaRefineryApi/assets/:id/score
POST /mediaRefineryApi/assets/:id/refine
POST /mediaRefineryApi/assets/:id/qa
GET  /mediaRefineryApi/search
GET  /mediaRefineryApi/publish-ready
POST /mediaRefineryApi/create-brief
```

The POS client can call the same API through `window.DB.MediaRefinery`.
