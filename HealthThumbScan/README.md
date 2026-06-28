# Health Thumb Scan

An Expo (React Native + TypeScript) app that estimates your heart rate by
having you cover the rear camera and flash with your fingertip, then derives
a rough blood pressure estimate and BMI from that reading plus a short health
profile (age, sex, height, weight, blood type) you provide.

## ⚠️ Medical disclaimer

**This app is not a medical device.** A phone camera cannot measure blood
pressure directly — that requires an inflatable cuff (or an invasive arterial
line). What this app actually does:

- **Heart rate**: estimated from a photoplethysmography (PPG) style signal —
  the camera watches your fingertip's brightness change slightly with each
  heartbeat as blood volume changes. This is the same principle smartwatches
  use, but far less precise: no stabilized optics, lower frame rate, and no
  filtering hardware.
- **Blood pressure**: a **non-clinical estimate** computed from the measured
  heart rate plus your age and BMI, using simple population-trend heuristics.
  It is illustrative only and can be meaningfully wrong for any individual.
- **BMI**: a standard, real calculation from your entered height and weight.
- **Blood type**: user-entered; it cannot be detected by camera or any
  sensor in this app.

Do not use this app to make medical decisions. Use a validated blood
pressure cuff for real readings, and consult a healthcare professional for
any health concerns. The full disclaimer is also shown in the app on the
results screen.

## Getting started

```bash
npm install
npm start
```

Then open the project in Expo Go (scan the QR code) on a physical iOS or
Android device, or run `npm run android` / `npm run ios` with a simulator —
note that **camera-based scanning requires a physical device with a flash**;
simulators have no camera/flash and the scan will not produce a real signal.

## How the scan works

1. **Profile** (`src/screens/ProfileScreen.tsx`): on first launch you enter
   age, sex, height, weight, and blood type. Stored locally only
   (`@react-native-async-storage/async-storage`), never sent anywhere.
2. **Scan** (`src/screens/ScanScreen.tsx`): turns on the rear camera's torch
   and repeatedly captures low-quality JPEG frames
   (`CameraView.takePictureAsync`) for ~16 seconds while you hold your
   fingertip over the lens.
3. **Frame analysis** (`src/lib/frameAnalysis.ts`): each JPEG frame is
   decoded in pure JS (`jpeg-js`) and reduced to the mean red-channel
   intensity of the central region — this is the raw PPG sample.
4. **Heart rate estimation** (`src/lib/ppg.ts`): the brightness samples are
   smoothed, detrended (to cancel slow drift from finger pressure or ambient
   light), and peak-detected with a refractory period to find individual
   heartbeats. The median of the resulting beat-to-beat intervals gives the
   BPM; consistency between intervals determines a `good` / `fair` / `poor`
   signal-quality label. If too few clean beats are found, the scan reports
   a failure and asks the user to retry rather than show a fabricated number.
5. **Blood pressure estimate** (`src/lib/bpEstimate.ts`) and **BMI**
   (`src/lib/bmi.ts`) are derived from the heart rate and profile, as
   described in the disclaimer above.
6. **Results & history** (`ResultsScreen.tsx`, `HistoryScreen.tsx`): results
   are shown with the disclaimer and saved to local history
   (`src/lib/storage.ts`), capped at the 50 most recent scans.

## Known limitations

- `takePictureAsync` is not a true real-time frame stream, so the effective
  sample rate (roughly 5–8 fps) is on the low end for clean PPG capture.
  Expect more failed/poor-quality scans on lower-end devices.
- No motion or contact-pressure sensing — moving the phone or pressing too
  hard/lightly is the most common cause of a poor reading.
- The blood pressure formula is a heuristic for demonstration purposes, not
  a peer-reviewed clinical model.

## Project structure

```
App.tsx                       # Providers + navigator
src/
  theme.ts                    # Shared colors/spacing
  navigation/
    types.ts                  # Stack param list
    RootNavigator.tsx         # Stack navigator, onboarding routing
  screens/
    ProfileScreen.tsx
    HomeScreen.tsx
    ScanScreen.tsx
    ResultsScreen.tsx
    HistoryScreen.tsx
  lib/
    types.ts                  # Profile / ScanResult types
    storage.ts                 # AsyncStorage persistence
    ProfileContext.tsx         # Profile state shared across screens
    bmi.ts
    bpEstimate.ts
    ppg.ts                     # PPG signal processing -> heart rate
    frameAnalysis.ts           # JPEG frame -> brightness sample
    id.ts
```
