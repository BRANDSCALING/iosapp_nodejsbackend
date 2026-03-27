const db = require("../config/database");

exports.checkPasswordResetEligibility = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ registered: false, error: "Email is required" });
  }

  try {
    const result = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const userExists = result.rows.length > 0;

    console.log(`[Auth] Password reset eligibility check for ${email}: ${userExists}`);

    return res.status(200).json({ registered: userExists });

  } catch (error) {
    console.error("[Auth] Eligibility check failed:", error.message);
    // On error, default to not registered to be safe
    return res.status(500).json({ registered: false, error: "Server error during eligibility check" });
  }
};
