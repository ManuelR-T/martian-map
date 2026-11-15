# Vercel static deployment

## Status

- Production: <https://marps.vercel.app>, deployed from `main`.
- Development: <https://martian-map-dev.vercel.app>, deployed from `dev`.
- Pull requests: Vercel posts a preview URL on each one.

## Project settings

The commands are versioned in `vercel.json`.

| Setting | Value |
| --- | --- |
| Root Directory | Repository root (`.`), not `apps/web` |
| Framework Preset | Vite |
| Node.js Version | 24.x, compatible with `engines` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter @marps/web... build` |
| Output Directory | `apps/web/dist` |
| Environment Variables | `ENABLE_EXPERIMENTAL_COREPACK=1` (Production and Preview) |
| Production Branch | `main` |

The pnpm filter with `...` also builds the internal packages the app depends on. `ENABLE_EXPERIMENTAL_COREPACK=1` makes Vercel use the exact pnpm version pinned by `packageManager` (9.15.4); it configures the build, not the client bundle.

The Vercel GitHub integration deploys previews for branches and pull requests, and publishes pushes to `main` to production. No Vercel token is needed in GitHub Actions. Never put a secret in a `VITE_*` variable: these are public in the bundle. `.vercel/` and local `.env*` files are ignored by Git.

## Assets and data

Vite serves the app at the domain root. Static data lives in `apps/web/public/data/` and `apps/web/public/atlas/`, published as `/data/` and `/atlas/`. `data/research/` holds research samples and is **not published**. The app uses hash routes only (for example `#/systeme-design`), so no rewrite is configured.

## Reproducible local check

With Node 24.14.0 and pnpm 9.15.4, from the root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @marps/web... build
pnpm --filter @marps/web preview --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`, then reload.

## Checks on each deployed environment

1. Open `/` in a new session, then reload. The app loads with no console error.
2. With the cache disabled, HTML, JS and CSS return 200 with the right MIME types and no reference to localhost.
3. Data files under `/data/` and `/atlas/` return 200 with JSON or images, not HTML.
4. NASA tiles load over HTTPS with CORS; blocking the tile domain shows a message with a retry action.
5. No secret appears in the code, public files or `VITE_*` variables.

## Rolling back

In the Vercel project, open **Deployments**, pick a previous working production deployment and use **Instant Rollback**. Then reload without cache and repeat the checks. A rollback only reassigns the domain; to keep the fix in Git, open a pull request that reverts the faulty commit, let CI pass, and merge it into `main`.

## Troubleshooting: incompatible versions

If the logs show `ERR_PNPM_UNSUPPORTED_ENGINE` (for example pnpm 9.15.9 instead of 9.15.4, or Node 26 instead of 24):

1. Set Root Directory to the repository root, not `apps/web`.
2. In Settings → Build and Deployment, choose Node.js 24.x.
3. Add `ENABLE_EXPERIMENTAL_COREPACK=1` for Production and Preview.
4. Redeploy without the build cache, from a commit that has `vercel.json` at the root.

Do not disable `engine-strict` to work around these errors.

## References

- [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub integration and previews](https://vercel.com/docs/git/vercel-for-github)
- [Rolling back a production deployment](https://vercel.com/docs/deployments/rollback-production-deployment)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [Corepack on Vercel](https://vercel.com/docs/builds/configure-a-build)
