/**
 * Internal Compliance Controller
 *
 * Isolated controller for linking external compliance IDs to user email
 * and updating compliance/signature statuses.
 */

const { query } = require('../config/database');

/**
 * POST /api/internal/compliance/link-record
 * Body: { email, amiqus_record_id?, hspsla_submission_id?, tenants_sla_submission_id? }
 */
exports.linkRecordToEmail = async (req, res) => {
  try {
    const { email, amiqus_record_id, hspsla_submission_id, tenants_sla_submission_id } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'email is required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'email is required',
      });
    }

    const sql = `
      INSERT INTO user_compliance (
        user_email,
        amiqus_record_id,
        hspsla_submission_id,
        tenants_sla_submission_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_email)
      DO UPDATE SET
        amiqus_record_id = COALESCE(EXCLUDED.amiqus_record_id, user_compliance.amiqus_record_id),
        hspsla_submission_id = COALESCE(EXCLUDED.hspsla_submission_id, user_compliance.hspsla_submission_id),
        tenants_sla_submission_id = COALESCE(EXCLUDED.tenants_sla_submission_id, user_compliance.tenants_sla_submission_id),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      normalizedEmail,
      amiqus_record_id || null,
      hspsla_submission_id || null,
      tenants_sla_submission_id || null,
    ];

    const result = await query(sql, values);

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ [Compliance] linkRecordToEmail error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to link compliance record to email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/internal/compliance/update-status
 * Body: { amiqus_record_id?, submission_id?, template_id?, status? }
 */
exports.updateStatus = async (req, res) => {
  try {
    const { amiqus_record_id, submission_id, template_id, status } = req.body || {};
    const updates = [];

    if (!amiqus_record_id && !submission_id) {
      return res.status(400).json({
        success: false,
        error: 'Provide at least one of amiqus_record_id or submission_id',
      });
    }

    if (amiqus_record_id) {
      const nextStatus = typeof status === 'string' && status.trim() ? status.trim() : 'completed';
      const amiqusUpdate = await query(
        `
          UPDATE user_compliance
          SET
            kyc_status = $2,
            dbs_status = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE amiqus_record_id = $1
          RETURNING *;
        `,
        [String(amiqus_record_id), nextStatus],
      );

      updates.push({
        type: 'amiqus',
        rowCount: amiqusUpdate.rowCount,
      });
    }

    if (submission_id) {
      const parsedTemplateId = Number(template_id);
      if (parsedTemplateId !== 1 && parsedTemplateId !== 2) {
        return res.status(400).json({
          success: false,
          error: 'template_id must be 1 (HSPSLA) or 2 (TENANTS) when submission_id is provided',
        });
      }

      if (parsedTemplateId === 1) {
        const hspslaUpdate = await query(
          `
            UPDATE user_compliance
            SET
              hspsla_signed = true,
              updated_at = CURRENT_TIMESTAMP
            WHERE hspsla_submission_id = $1
            RETURNING *;
          `,
          [String(submission_id)],
        );

        updates.push({
          type: 'hspsla',
          rowCount: hspslaUpdate.rowCount,
        });
      }

      if (parsedTemplateId === 2) {
        const tenantsUpdate = await query(
          `
            UPDATE user_compliance
            SET
              tenants_sla_signed = true,
              updated_at = CURRENT_TIMESTAMP
            WHERE tenants_sla_submission_id = $1
            RETURNING *;
          `,
          [String(submission_id)],
        );

        updates.push({
          type: 'tenants',
          rowCount: tenantsUpdate.rowCount,
        });
      }
    }

    return res.status(200).json({
      success: true,
      updates,
    });
  } catch (error) {
    console.error('❌ [Compliance] updateStatus error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update compliance status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

