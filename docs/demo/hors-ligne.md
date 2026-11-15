# Prepare Jezero for offline use before the pitch (#24)

Use the production build (`pnpm build`, then `pnpm --filter @marps/web preview`), over HTTPS or on localhost, in a browser that supports service workers and Cache Storage. Development mode does not prepare offline use.

1. While online, open the download menu in the header. It shows the real size of the bundle before downloading, and the **64 MiB** cap. Choose **Prepare / verify Jezero** and wait for "Ready offline". The counter follows the files; an interrupted download does not validate the sector, and a new attempt resumes from the files already stored.
2. Open Jezero. The mission sector is the one in the manifest: 77.395–77.412° E, 18.445–18.465° N. The download includes the HiRISE extracts at zoom 12–16, THEMIS at zoom 9, sites and site sheets, elevation, slope and hillshade grids, geology, annotations, the rover traverse and the frozen MEDA measurements. The app, fonts and translations are local. The atlas orientation files shipped with the build are included; no download of every global tile is started.
3. Also explore beyond the initial extract while online. Successful HiRISE responses (CORS) are kept in a separate cache capped at **16 MiB**, in download order. The oldest are evicted to free space. This cache can never remove the mission sector. Remote layers other than HiRISE are not kept.
4. Cut the network, reload, and check the sites, the relief, the frozen weather and the explored tiles. Also test an area never downloaded: it must stay unavailable. Global exploration needs internet; the "Open Jezero" button stays available. Neither the whole of Mars nor the whole HiRISE mosaic is promised offline.
5. Before the pitch, repeat this check on the target tablet, including after closing the browser. Keep the prepared build during the presentation.

The browser may delete storage: the state is checked on load, when returning to the tab and when the network drops, and the full preparation can be checked again with the button. A quota or download error shows a failure, never "ready". Free some space and try again online. Clearing browser data also deletes saved missions.

Each build versions its caches by a fingerprint of the worker and the files. Activation replaces the old versions and reloads an already controlled page, so an old version of the app is never shown silently. **After a deployment, prepare the sector again**: installing the new shell does not mean the data is ready. Extra tiles from the old build are also invalidated.

Automated validation: the worker runs against a simulated Cache Storage, with network cut and navigation reload, resume after failure, insufficient quota, lost storage, extra tiles found and missing, eviction without losing the sector, and a changed fingerprint after a data or HTML change. This simulation does not replace a manual check in a production browser or tablet after a real deployment.
