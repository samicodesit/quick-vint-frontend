# Shared translations

Common translation sources belong to quick-vint-api. See that repo's
`docs/shared-translations.md` for the context boundaries and coordinated release
workflow. Extension-specific copy remains here.

After changing canonical copy in quick-vint-api, update this checkout with:

```sh
npm run translations:sync -- --source-root /absolute/path/to/quick-vint-api
AUTOLISTER_TRANSLATIONS_SOURCE_ROOT=/absolute/path/to/quick-vint-api AUTOLISTER_API_PATH=/absolute/path/to/quick-vint-api npm run verify:production
```

Do not edit `lib/shared-ui-copy.js` or `lib/user-model-copy.js` directly. The first
is generated from the common and billing catalogs. The second mirrors the shared
model component. Production builds and packaging reject inconsistent bundles.
The optional source path also detects upstream drift; standalone offline builds
validate their checked-in snapshot without contacting another service.

Keep compact labels, generation actions, marketplace workflows and feature
badges separate when their meaning or placement differs. Do not map the model's
`New` badge to the web app's `Add item` action.

An extension release is required for installed users to receive these bundled
changes. This refactor does not bump a version, package, upload or submit one.
