const db = require("../config/database");
const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// The Cognito user pool is the source of truth for accounts (the iOS app signs
// up/in against it). Pool id isn't a secret — it's baked into the app's
// amplifyconfiguration.json — so a hardcoded default is safe.
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "us-east-1_u8tyHoqJi";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

const cognito = new CognitoIdentityProviderClient({ region: AWS_REGION });

/**
 * Look the email up in Cognito. Returns true/false, or null when Cognito
 * couldn't be queried (no credentials / network / permissions) so the caller
 * can fall back to the database check.
 */
async function existsInCognito(email) {
  // Cognito filter values are exact-match; emails are stored lowercased on
  // app signup, but check the original casing too for admin-created users.
  const candidates = [...new Set([email.toLowerCase(), email])];
  try {
    for (const candidate of candidates) {
      const sanitized = candidate.replace(/["\\]/g, "");
      const result = await cognito.send(
        new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          Filter: `email = "${sanitized}"`,
          Limit: 1,
        })
      );
      if ((result.Users || []).length > 0) return true;
    }
    return false;
  } catch (error) {
    console.error("[Auth] Cognito lookup failed (falling back to DB):", error.name, error.message);
    return null;
  }
}

exports.checkPasswordResetEligibility = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ registered: false, error: "Email is required" });
  }

  try {
    // 1) Cognito first — it is the system passwords actually live in. This fixes
    //    the signup/forgot-password contradiction where a Cognito user with no
    //    DB row (e.g. admin-created, never signed in) was told "no account found".
    const cognitoResult = await existsInCognito(email);
    if (cognitoResult !== null) {
      console.log(`[Auth] Password reset eligibility for ${email}: ${cognitoResult} (via Cognito)`);
      return res.status(200).json({ registered: cognitoResult, source: "cognito" });
    }

    // 2) Cognito unreachable → fall back to the previous DB behaviour so this
    //    endpoint is never LESS available than before.
    const result = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const userExists = result.rows.length > 0;

    console.log(`[Auth] Password reset eligibility for ${email}: ${userExists} (via DB fallback)`);

    return res.status(200).json({ registered: userExists, source: "database" });

  } catch (error) {
    console.error("[Auth] Eligibility check failed:", error.message);
    // On error, default to not registered to be safe
    return res.status(500).json({ registered: false, error: "Server error during eligibility check" });
  }
};
