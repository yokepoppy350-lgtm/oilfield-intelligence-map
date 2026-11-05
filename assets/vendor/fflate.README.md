# fflate 0.8.2

`fflate.min.js` is the unmodified UMD build from the official npm package
https://registry.npmjs.org/fflate/-/fflate-0.8.2.tgz (`package/umd/index.js`).
Upstream: https://github.com/101arrowz/fflate/tree/v0.8.2
License: MIT, retained in `fflate.LICENSE`.

Loaded locally by `index.html`; no runtime CDN, backend, or build step.
The importer uses `unzip` with an entry filter to enforce the expanded 6 MiB
limit before extraction, then checks the actual extracted size as well.
