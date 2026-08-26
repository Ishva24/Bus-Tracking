# BusTrack Mobile

Dependency-light mobile web app for the BusTrack backend.

## Run

```powershell
npm run start -w mobile
```

Open `http://localhost:5174`. The app defaults to `http://localhost:3000/v1` for the API and can be changed from the Profile screen.

## Implemented

- Login and registration using the backend auth endpoints
- Route and bus search
- Favorite route add/remove
- Route stop details
- ETA calculation form
- API URL setting persisted in browser storage

The original screen and API contract reference remains in `src/appBlueprint.ts`.
