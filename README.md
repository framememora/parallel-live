# parallel-live

An Android app that simulates being live on camera. It opens your real camera,
then runs a fake broadcast over it: a viewer count that climbs and stalls the way
a real one does, followers arriving behind it, comments landing in a feed, hearts
floating up the right edge.

Nothing is streamed anywhere. There is no server, no audience, and no account —
the numbers come from local simulation curves, and the comments come from a bank
of templates on the device. The one exception is opt-in and clearly marked: with
an Anthropic API key, comments can be generated from what the camera actually
sees.

Built with Expo SDK 57 and React Native 0.86. Android only in practice — the
screen recorder and the camera snapshot both take Android-specific paths.

## Running it

```sh
npm install
npx expo start
```

That serves JavaScript to a development build over the network, so the machine
running it has to stay awake. For an app that runs on its own:

```sh
npx eas build --profile preview --platform android
```

The `preview` profile is a release build with the JavaScript embedded in the APK,
so it runs with no computer involved at all. The difference is checkable: a
`preview` APK contains `assets/index.android.bundle` and a `development` one
contains no JavaScript whatsoever.

Once a `preview` build is installed, JavaScript changes no longer need a rebuild:

```sh
npx eas update --channel preview --message "what changed"
```

The runtime version policy is `fingerprint`, so an update only reaches builds
whose native layer matches it. Adding or removing a native module changes that
fingerprint and requires a new build — which is the intended behaviour, not an
obstacle.

## Layout

| Path | What lives there |
| --- | --- |
| `src/engines/` | The simulation. Viewer and follower curves, the comment bank and scheduler, heart timing, milestones. No UI, no I/O — all pure and unit-tested. |
| `src/screens/LiveCameraScreen/` | The live screen: camera preview, header, action rail, comment feed, composer. |
| `src/services/` | Everything that talks to the device or the network — camera roll, photo library, permissions, screen recording, and the Claude vision call. |
| `src/components/icons/` | The icon set, drawn with Skia primitives over authored path data. |
| `src/state/` | zustand stores. Settings persist to `expo-secure-store`; session state does not. |

## Settings

Reachable by tapping the avatar while idle. Handle, profile photo, starting
follower count, whether to screen-record the session, whether that recording
captures microphone audio, and the AI comment options.

These persist across restarts in a single `expo-secure-store` key. That matters
most for the API key: the Settings field is the only place one can come from, and
it is held in the Keystore-backed store rather than in the bundle.

That is enforced rather than merely conventional. An `EXPO_PUBLIC_ANTHROPIC_API_KEY`
fallback used to back the field and was removed, because Metro inlines every
`EXPO_PUBLIC_*` variable into the JS bundle in cleartext at build time — so a
build made on a machine that happened to have it exported would have shipped a
live key inside an APK that anyone can unpack. Setting that variable now does
nothing.

## AI comments

Off by default. Turning it on sends a camera frame to `api.anthropic.com` every
20 seconds and asks a model to write comments about what it sees. This uploads
pictures of you and your surroundings to a third party, which is why it is opt-in
and why the setting says so.

Haiku 4.5 is the default at roughly $0.25 an hour of broadcast. Sonnet 5 and
Opus 5 are selectable and cost about 4x and 10x that.

With no key, no connection, or the feature off, the template comment bank runs
the session instead. That is a designed fallback, not a degraded mode — it is
what the app does by default.

## Tests

```sh
npm test          # jest
npx tsc --noEmit  # typecheck
```

The suites cover the simulation engines, the comment generator, icon rendering
and settings persistence. Several were written by breaking the code first and
confirming the test caught it, since the interesting failures here are silent
ones — a missing icon case renders an invisible glyph without a type error, and a
dropped field in `partialize` would quietly stop persisting a setting.

## Status

Personal project, not shipped. Known gaps before it could be: there is no privacy
policy for the camera upload path, which becomes mandatory before distribution;
iOS is unfinished; and OTA updates aren't code-signed, covered below.

### OTA updates are not code-signed

`npx eas update` pushes JavaScript to installed builds with trust anchored to the
EAS account and CDN rather than a certificate pinned in the app. An account
compromise means arbitrary code onto every install, against permissions the user
has already granted to the camera and microphone.

This is unfixed **by decision, not oversight**: EAS Update code signing requires
an EAS Production or Enterprise plan, and enabling it also costs a new native
build and a device reinstall. That isn't proportionate for a personal build that
only ever reaches one phone. It becomes necessary the moment this goes wider.

If that day comes, three things are non-obvious enough to be worth writing down:

- **`.gitignore` has a bare `*.pem`**, which would silently exclude
  `certs/certificate.pem`. That file has to be committed — EAS Build reads it at
  prebuild time — so it needs a `!certs/certificate.pem` negation or the build
  fails with `File not found at 'updates.codeSigningCertificate' path`. Only the
  private key stays out of the repo.
- **Order matters, and getting it wrong fails silently.** An already-installed
  build has no certificate in its manifest, so it ignores signatures entirely
  rather than rejecting them. Meanwhile adding the certificate to `app.json`
  changes the `fingerprint` runtime version, so a signed update publishes
  successfully and reaches nothing. Configure, rebuild, reinstall, *then* update.
  Once a signed build is out, every later update must be signed or it is refused.
- **`eas update` needs `--private-key-path` passed explicitly, every time.** The
  flag's own help text claims it defaults to a key beside the certificate; the
  CLI implements no such default and throws instead. There is no `eas.json` field
  for it, so it belongs in a `package.json` script rather than config.
