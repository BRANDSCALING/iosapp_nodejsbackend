/**
 * App Config Routes
 *
 * GET /api/app-config/ios
 * GET /api/app-config/android
 * GET /api/app-config/uces-ios
 *
 * Drives each app's update behavior. The client compares its installed
 * version to the platform's `minimum_supported_*_version`:
 *   - installed < minimum_supported_*_version → required update (no "Later")
 *   - installed < latest_*_version (but >= minimum) → optional update
 *
 * Business rule: we do not want optional updates. To require old users to
 * update once a new store version is live, set both the platform's
 * *_MINIMUM_SUPPORTED_VERSION and *_LATEST_VERSION to the new version.
 *
 * Do NOT set *_FORCE_UPDATE=true for normal releases; force_update=true may
 * block even the latest installed version depending on client logic. For
 * normal required updates, use the minimum version instead.
 *
 * The /android endpoint is shared by TWO production Android apps (both ship
 * it hardcoded): UCES Android (com.allianzhousing.app, 2.x) and the
 * Brandscaling work app (com.brandscaling.app, 1.x; builds up to v1.3 read
 * /ios, v1.4+ read /android). The ANDROID_* env vars hold the UCES values —
 * do NOT point them at work-app numbers. Work-app callers are recognised by
 * their 1.x X-App-Version header and served BRANDSCALING_ANDROID_* values
 * instead; /brandscaling-android serves the same values explicitly for
 * future work-app builds. Callers with no header get the UCES values.
 *
 * The /uces-ios endpoint serves the UCES app (formerly Allianz Housing,
 * bundle com.brandscaling.edna, 2.x numbering) from UCES_IOS_* env vars.
 * NEVER mix the two iOS apps' env vars: bumping IOS_* to a 2.x value would
 * force-lock every Brandscaling work-app user (1.x), and vice versa. Unlike
 * the work app, UCES DOES use optional updates: installed < latest shows a
 * dismissible "Update Available" card (UCES 2.2+ clients only).
 *
 * No authentication. No database access. Driven entirely by env vars so values
 * can be flipped without a deploy of new code.
 */

const express = require('express');
const router = express.Router();

const DEFAULT_IOS_VERSION = '1.8';
const DEFAULT_APP_STORE_URL =
  'https://apps.apple.com/pk/app/allianz-housing/id6758213803';

router.get('/ios', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  // Legacy UCES clients: UCES/Allianz 2.1 predates the /uces-ios route and
  // reads THIS route, but namespaces itself via the X-App-Version header
  // (work app = 1.x, UCES = 2.x; both apps' gate-enabled builds send it).
  // Serve 2.x callers UCES values so they are never judged against work-app
  // numbers. UCES_LEGACY_IOS_MINIMUM stays at its ≤2.1 default (quiet) until
  // a newer UCES version is LIVE on the store; flipping it to that version
  // shows 2.1 installs the required-update modal (2.1 has no optional-card
  // code, so minimum is the only lever it understands). IOS_FORCE_UPDATE is
  // deliberately ignored here — it must never leak from the work app to UCES.
  // Revisit the prefix test if the work app ever reaches 2.x numbering.
  const callerVersion = String(req.get('X-App-Version') || '');
  if (/^2\./.test(callerVersion)) {
    const legacyMin = process.env.UCES_LEGACY_IOS_MINIMUM || '2.1';
    return res.json({
      minimum_supported_ios_version: legacyMin,
      latest_ios_version: legacyMin,
      force_update: false,
      app_store_url:
        process.env.UCES_IOS_APP_STORE_URL || DEFAULT_UCES_APP_STORE_URL,
      update_message: process.env.UCES_IOS_UPDATE_MESSAGE || null,
    });
  }

  res.json({
    minimum_supported_ios_version:
      process.env.IOS_MINIMUM_SUPPORTED_VERSION || DEFAULT_IOS_VERSION,
    latest_ios_version:
      process.env.IOS_LATEST_VERSION || DEFAULT_IOS_VERSION,
    force_update: process.env.IOS_FORCE_UPDATE === 'true',
    app_store_url: process.env.IOS_APP_STORE_URL || DEFAULT_APP_STORE_URL,
    update_message: process.env.IOS_UPDATE_MESSAGE || null,
  });
});

// ---------------------------------------------------------------------------
// UCES (formerly Allianz Housing) — separate app, separate 2.x numbering.
// Defaults match the first gate-enabled release (2.2 build 9): no popup for
// anyone until UCES_IOS_* env vars are raised for a newer release.
// ---------------------------------------------------------------------------

const DEFAULT_UCES_IOS_VERSION = '2.2';
const DEFAULT_UCES_APP_STORE_URL = 'https://apps.apple.com/gb/app/id6758213803';

router.get('/uces-ios', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  res.json({
    minimum_supported_ios_version:
      process.env.UCES_IOS_MINIMUM_SUPPORTED_VERSION || DEFAULT_UCES_IOS_VERSION,
    latest_ios_version:
      process.env.UCES_IOS_LATEST_VERSION || DEFAULT_UCES_IOS_VERSION,
    force_update: process.env.UCES_IOS_FORCE_UPDATE === 'true',
    app_store_url:
      process.env.UCES_IOS_APP_STORE_URL || DEFAULT_UCES_APP_STORE_URL,
    update_message: process.env.UCES_IOS_UPDATE_MESSAGE || null,
  });
});

const DEFAULT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.brandscaling.app';

// Brandscaling work app on Android (1.x line). Falls back to the IOS_* values
// (the two work apps release in lockstep) so a missing env still serves sane
// numbers; the message default is Play-flavored because the IOS_* one says
// "App Store".
const DEFAULT_BRANDSCALING_ANDROID_VERSION = '1.4';

function brandscalingAndroidPayload() {
  return {
    minimum_supported_android_version:
      process.env.BRANDSCALING_ANDROID_MINIMUM_SUPPORTED_VERSION ||
      process.env.IOS_MINIMUM_SUPPORTED_VERSION ||
      DEFAULT_BRANDSCALING_ANDROID_VERSION,
    latest_android_version:
      process.env.BRANDSCALING_ANDROID_LATEST_VERSION ||
      process.env.IOS_LATEST_VERSION ||
      DEFAULT_BRANDSCALING_ANDROID_VERSION,
    force_update: process.env.BRANDSCALING_ANDROID_FORCE_UPDATE === 'true',
    play_store_url:
      process.env.BRANDSCALING_ANDROID_PLAY_STORE_URL ||
      DEFAULT_PLAY_STORE_URL,
    update_message:
      process.env.BRANDSCALING_ANDROID_UPDATE_MESSAGE ||
      'This version is no longer supported. Please update from Google Play to continue.',
  };
}

router.get('/android', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  // Work-app callers (1.x) — see the header comment. UCES Android (2.x) and
  // callers without the header fall through to the UCES values below, exactly
  // as before this branch existed. Revisit the prefix test if the work app
  // ever reaches 2.x numbering.
  const callerVersion = String(req.get('X-App-Version') || '');
  if (/^1\./.test(callerVersion)) {
    return res.json(brandscalingAndroidPayload());
  }

  res.json({
    minimum_supported_android_version:
      process.env.ANDROID_MINIMUM_SUPPORTED_VERSION ||
      process.env.IOS_MINIMUM_SUPPORTED_VERSION ||
      DEFAULT_IOS_VERSION,
    latest_android_version:
      process.env.ANDROID_LATEST_VERSION ||
      process.env.IOS_LATEST_VERSION ||
      DEFAULT_IOS_VERSION,
    force_update: process.env.ANDROID_FORCE_UPDATE === 'true',
    play_store_url:
      process.env.ANDROID_PLAY_STORE_URL || DEFAULT_PLAY_STORE_URL,
    update_message:
      process.env.ANDROID_UPDATE_MESSAGE ||
      process.env.IOS_UPDATE_MESSAGE ||
      null,
  });
});

// Explicit, unambiguous leaf for the Brandscaling work app on Android, so its
// next release can stop sharing /android with UCES entirely.
router.get('/brandscaling-android', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  res.json(brandscalingAndroidPayload());
});

module.exports = router;
