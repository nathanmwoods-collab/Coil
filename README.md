# Coil

An original best-ball fantasy football app: snake drafts, tournaments, and lineups that set themselves.

> Mock currency only. Player ADP and projections are placeholder data until a licensed feed is wired in.

## Stack
- Expo SDK 58, React Native, TypeScript, expo-router, zustand (persisted with AsyncStorage)
- `src/engine`: pure TS draft engine (snake order, queue-driven autopick, bot drafters, best-ball optimal lineups, exposure)
- `src/data`: mock player pool (261 players), lobby contests, seeded season simulator
- `src/app`: screens (Lobby, Drafts, Exposure, Account, draft room, results)
- `src/theme/brands.ts`: brand themes; `ACTIVE_BRAND` switches the whole app

## Run
```bash
npm install
npx expo start          # press w for web, or scan with Expo Go
npm test                # vitest
npx tsc --noEmit        # typecheck
```
