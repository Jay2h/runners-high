# Android trial
Offline WebView wrapper; source assets come from ../dist at build time.
Android 8+ with an up-to-date Android System WebView required.
Build: JDK 17, Android SDK 35, Gradle 8.11.1; run gradle -p android assembleDebug.
GitHub Actions runs engine tests, Android lint, and publishes a debug-signed prerelease APK.
No internet permission, native JS bridge, or external file access.
Progress is stored in this app's WebView localStorage. Website saves are separate.
This trial uses a separate .trial application ID. CI debug keys are temporary: future builds may need uninstalling the previous trial, which deletes its saves. Establish a securely stored release signing key and save export/import before a persistent production rollout.
Manual device acceptance: launch offline, race and boost, finish five training races, enter stadium, background/resume without a time jump, force-close/reopen and verify coins/levels/history, run balance lab worker, check top/bottom system bars.
No real-device validation has yet been performed.
