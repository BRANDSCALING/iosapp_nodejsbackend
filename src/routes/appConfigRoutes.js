/**
 * App Config Routes
 *
 * GET /api/app-config/ios
 *
 * Drives the iOS app's update behavior. The iOS client compares its installed
 * version to `minimum_supported_ios_version`:
 *   - installed < minimum_supported_ios_version → required update (no "Later")
 *   - installed < latest_ios_version (but >= minimum) → optional update
 *
 * Business rule: we do not want optional updates. To require old users to
 * update once a new App Store version is live, set both
 * IOS_MINIMUM_SUPPORTED_VERSION and IOS_LATEST_VERSION to the new version.
 *
 * Do NOT set IOS_FORCE_UPDATE=true for normal releases; force_update=true may
 * block even the latest installed version depending on iOS logic. For normal
 * required updates, use minimum_supported_ios_version instead.
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

module.exports = router;
