# Vercel static deployment

## State

The repository configuration is ready in `vercel.json`. The publication and
Git connection remains to be made: Vercel access available during the
preparation returned `403 Not authorized`.

- Production URL: **unassigned**, replace here with the domain displayed
in Vercel after the first successful deployment from `main`.
- PR previews: not checked until Git integration is connected.
- Deployed browser and WMTS recipe: pending. The current base does not contain
no card, no WMTS request, no router; do not declare these checks successful.

## Import repository

In [New Project](https://vercel.com/new), connect the authorized GitHub account to
read `ManuelR-T/martian-map`, then import this repository.

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`.`), not `apps/web` |
| Framework Preset | Quick |
| Node.js Version | 24.x, compatible with `engines` |
| Install Command | `pnpm install --frozen-lockfile` |
| BuildCommand | `pnpm --filter @marps/web... build` |
| Output Directory | `apps/web/dist` |
| Environment Variables | `ENABLE_EXPERIMENTAL_COREPACK=1` (Production and Preview) |
| Production Branch | `main` |

All three commands/directories are versioned in `vercel.json`. The filter
pnpm with `...` includes internal application dependencies: packages
Shared files are checked before the Vite build. `packageManager` fixed pnpm 9.15.4.
Enable `ENABLE_EXPERIMENTAL_COREPACK=1` in Production and
Preview so that Vercel respects this exact version, rather than his version
pnpm 9.x by default. This variable configures the build, not the client bundle.
Check these versions in the logs of the first build.

In the project's Git settings, check the repository connection and branch
production `main`. The Vercel integration for GitHub creates deployments of
preview for branches and PR; she publishes the pushes of `main` in production.
Open a PR, check the Vercel status and visit its preview URL. After
merge, verify that the production deployment matches the SHA of `main`,
then report its stable domain in the Status section. GitHub controls
Actions remain distinct: configure their obligation in the rules of
branch if you want to block a merge in case of failure.

No Vercel token is needed in GitHub Actions with this integration.
Do not add a secret in `VITE_*`: these variables are public in the
bundle. `.vercel/` and local `.env*` files are ignored by Git.

## Assets and data

Vite serves the application at the root of the domain (`base` by default `/`); THE
Generated JS/CSS references point to `/assets/`. TypeScript exports of
Shared packages are transformed and integrated into the bundle.

Catalog `@marps/data` is currently empty. `data/research/` contains the
research sources and **is not published**. To integrate a static file,
place it in `apps/web/public/data/` (published as `/data/`) or import it from
the code for Vite to process. Do not reference a file path
repository local from the browser. Check each data URL once
its integration carried out; do not copy the entire search folder.

There is currently no router: only `/` should load the application.
No global rewrite is configured. If a router using History API
is added, add the rewrites of the application routes to `/index.html`
preserving 404 errors from missing assets and data, then checking
direct access and reloading of each road.

## Reproducible local demonstration

With Node 24.14.0 and pnpm 9.15.4, from the root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @marps/web... build
pnpm --filter @marps/web preview --host 127.0.0.1 --port 4173 --strictPort
```

Visit `http://127.0.0.1:4173/`, then reload. The Jezero text, the calculation of
60 seconds and the styled panel confirm the imports of the three packages
shared. This command serves the built bundle; the Vite preview server
is for local verification only.

## Recipe on each deployed environment

1. Open `/` directly in a new session, then reload. Check
the display of the base and the absence of errors in the console.
2. In Network, deactivate the cache then reload: HTML, JS and CSS must
respond 200 with their correct MIME types, without reference to localhost.
3. When data will be integrated, check their URLs and content,
attributions and the absence of 404 errors or HTML responses instead of JSON.
4. When the WMTS card is integrated, check from the preview **and** the
production capabilities and tiles on the NASA domain used: HTTPS,
CORS authorizing reading from the site, HTTP codes and expected images.
A simple download from the terminal does not validate CORS.
5. Block tile domain in browser tools and reload:
verify that a visible message explains the network failure and allows you to try again.
This behavior must be implemented with the card, which is absent from the current base.
6. Verify that no secrets have been added to code, public files, or
`VITE_*` variables of the project.

Log URL, SHA, date, browser and results in section
State ; leave missing controls pending.

## Return to a previous version

In the Vercel project, open **Deployments**, choose a deployment
Previous production known as working and using **Instant Rollback**
(if available for the account). Check production domain, reload
without cache and repeat the recipe above. Rollback reassigns the domain
to existing deployment; it doesn't patch the Git branch.

To keep the correction in Git, then open a PR which undoes the
faulty commit, pass the CI then merge into `main`. If the rollback
is not available, this PR and its new deployment constitute the
fallback procedure. Do not delete old working deployments.

## References

- [Configuration vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub integration and previews](https://vercel.com/docs/git/vercel-for-github)
- [Revert to a previous deployment](https://vercel.com/docs/deployments/rollback-production-deployment)
- [Vite](https://vite.dev/guide/static-deploy.html) static deployment

## Troubleshooting: incompatible versions

If the logs show `ERR_PNPM_UNSUPPORTED_ENGINE`, for example pnpm 9.15.9
instead of 9.15.4 and Node 26 instead of 24:

1. Set Root Directory to the root of the repository, not `apps/web`.
2. In Settings → Build and Deployment, choose Node.js 24.x.
3. Add `ENABLE_EXPERIMENTAL_COREPACK=1` in project variables
for Production and Preview.
4. Check the commands in the table above then redeploy without reusing
the build cache. The deployment must use a commit containing
`vercel.json` at the root.

Do not disable `engine-strict` to work around these errors.

Reference: [Corepack on Vercel](https://vercel.com/docs/builds/configure-a-build).
