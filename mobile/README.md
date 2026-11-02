# KAPS & Co Office mobile project

This is a separate Capacitor project that builds the existing React application into a native WebView. It shares the web app's source, business logic, accounts, and backend. The mobile build reads the parent project but writes only to `mobile/www` and the native projects in this directory. It does not change the deployed website or database.

The mobile adapter covers native back navigation, exported-file sharing, external links and Android page printing. See [BRIDGE.md](BRIDGE.md) for behavior and important limitations, and [AUDIT.md](AUDIT.md) for the feature and backend review. The existing in-app password reset flow is reused.

## Set up and build

Requirements: Node.js 20 or later, the parent project's npm dependencies, an internet connection for npm packages, and the Android Studio SDK and JDK 21 for Android. iOS builds require a Mac with Xcode and CocoaPods. Android and iOS project scaffolds are included. An Android debug APK was built and its signature verified; it has not been tested on a device. The iOS build remains unverified.

From the project root, install the existing web dependencies if necessary. Then run from this folder:

```sh
npm install
npm run sync
```

Android printing is registered in the included `MainActivity.java`. Its plugin source is `android/app/src/main/java/com/kaps/office/mobile/MobilePrintPlugin.java`.

Run `npm run sync` after changing shared web code or the mobile adapter. Open Android Studio with `npm run android`, or Xcode on a Mac with `npm run ios`. In Android Studio, build a debug APK with **Build > Build Bundle(s) / APK(s) > Build APK(s)**, or use the Gradle wrapper in `android` with `assembleDebug`. The debug APK is for testing only.

## Before release

Verify login, role-based screens, password reset, navigation and back behavior, uploads, exports, PDF opening, sharing, external links, and printing on actual Android and iOS devices against a suitable test account. Web push is not equivalent to native mobile push; iOS page printing is not implemented. Check app icons, launch screens, accessibility, store metadata, privacy disclosures, signing, release configuration, and platform-specific permission behavior before store submission. Device testing, a release build, and an iOS build are still required; this project has not been validated as an app-store release.
