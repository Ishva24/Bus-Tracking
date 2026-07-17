# Deployment

This repository now includes the project scaffolding for a CI and release flow.

## Automated checks

- Pull requests and `main` pushes run install, build, and test in GitHub Actions.
- Version tags matching `v*` run the same verification steps and publish a GitHub Release.

## Production wiring still needed

- Pick a production host for the backend and simulator.
- Provision managed MySQL and Redis or equivalent services.
- Set the production environment variables from the example files in `backend/.env.example` and `simulator/.env.example`.
- Add the mobile app runtime dependencies and native build targets once the final device stack is chosen.
