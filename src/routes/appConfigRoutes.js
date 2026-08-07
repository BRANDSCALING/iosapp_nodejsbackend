/**
 * App Config Routes
 *
 * GET /api/app-config/ios
 * GET /api/app-config/android
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
 * The /android endpoint has its OWN env vars (ANDROID_*) so each platform can
 * be gated independently. Until ANDROID_* values are provisioned it falls back
 * to the IOS_* values, which preserves the historical behavior (Android builds
 * up to v1.3 read /ios directly).
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

const DEFAULT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.brandscaling.app';

router.get('/android', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

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

module.exports = router;
