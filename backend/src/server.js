import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const app = express();
const API_PREFIX = '/api';

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

/**
 * Calculate EMI using the reducing-balance formula.
 *
 * @param {number} principalPaise
 * @param {number} annualRate
 * @param {number} tenureMonths
 * @returns {number}
 */
function calculateEmi(principalPaise, annualRate, tenureMonths) {
  const principal = Number(principalPaise);
  const rate = Number(annualRate);
  const months = Number(tenureMonths);

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(rate) ||
    !Number.isInteger(months) ||
    months <= 0
  ) {
    throw new Error('Invalid EMI calculation inputs');
  }

  // No-cost EMI / zero-interest EMI
  if (rate === 0) {
    return Math.round(principal / months);
  }

  const monthlyRate = rate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);

  return Math.round(
    (principal * monthlyRate * factor) / (factor - 1)
  );
}

/**
 * Convert database EMI plan into API response.
 */
function serializePlan(row, principalPaise) {
  const monthlyPayment = calculateEmi(
    principalPaise,
    row.interestRate,
    row.tenure
  );

  const totalInstallments =
    monthlyPayment * Number(row.tenure);

  const processingFee = Number(row.processingFee);
  const cashback = Number(row.cashback);

  return {
    id: row.id,
    tenure: Number(row.tenure),
    interestRate: Number(row.interestRate),

    // Calculated by backend — NOT stored in DB
    monthlyPayment,
    totalInstallments,

    cashback,
    processingFee,

    // Amount before cashback
    totalPayable: totalInstallments + processingFee,

    emiType: row.emiType,
    label: row.label,

    financingProgram: row.financingProgram,
    providerType: row.providerType,
  };
}

/**
 * Reusable EMI plan query.
 */
const planSelect = `
  SELECT
    e.id,
    e.tenure_months AS tenure,
    e.interest_rate AS "interestRate",
    e.cashback_paise AS cashback,
    e.processing_fee_paise AS "processingFee",
    e.emi_type AS "emiType",
    e.label,
    f.name AS "financingProgram",
    f.provider_type AS "providerType"
  FROM emi_plans e
  JOIN financing_programs f
    ON f.id = e.financing_program_id
  WHERE e.variant_id = $1
    AND e.active = TRUE
    AND f.active = TRUE
  ORDER BY e.tenure_months, e.interest_rate;
`;

/**
 * Health check
 */
app.get(`${API_PREFIX}/health`, async (_req, res) => {
  try {
    await query('SELECT 1');

    res.json({
      success: true,
      message: 'SmartStore API is healthy',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);

    res.status(503).json({
      success: false,
      message: 'SmartStore API is running but database is unavailable',
    });
  }
});

/**
 * Get all products
 */
app.get(`${API_PREFIX}/products`, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        p.id,
        p.slug,
        p.name,
        p.badge,
        p.description,

        MIN(v.price_paise) AS "startingPrice",
        MIN(v.mrp_paise) AS "startingMrp",

        (
          SELECT vi.image_url
          FROM variants vv
          JOIN variant_images vi
            ON vi.variant_id = vv.id
          WHERE vv.product_id = p.id
          ORDER BY vv.id, vi.sort_order
          LIMIT 1
        ) AS "imageUrl",

        COUNT(v.id)::int AS "variantCount"

      FROM products p
      JOIN variants v
        ON v.product_id = p.id

      GROUP BY p.id
      ORDER BY p.id;
    `);

    res.json({
      success: true,

      data: rows.map((row) => ({
        ...row,
        startingPrice: Number(row.startingPrice),
        startingMrp: Number(row.startingMrp),
        variantCount: Number(row.variantCount),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a single product with variants, images and EMI plans.
 *
 * Optional:
 * /api/products/iphone-17-pro?variantId=5
 */
app.get(`${API_PREFIX}/products/:slug`, async (req, res, next) => {
  try {
    const productResult = await query(
      `
        SELECT
          id,
          slug,
          name,
          badge,
          description
        FROM products
        WHERE slug = $1
        LIMIT 1;
      `,
      [req.params.slug]
    );

    if (productResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const product = productResult.rows[0];

    /**
     * Fetch all variants and their images.
     */
    const variantResult = await query(
      `
        SELECT
          v.id,
          v.name,
          v.color,
          v.storage,
          v.mrp_paise AS mrp,
          v.price_paise AS price,

          COALESCE(
            json_agg(
              json_build_object(
                'id', vi.id,
                'imageUrl', vi.image_url,
                'sortOrder', vi.sort_order
              )
              ORDER BY vi.sort_order
            ) FILTER (WHERE vi.id IS NOT NULL),
            '[]'::json
          ) AS images

        FROM variants v

        LEFT JOIN variant_images vi
          ON vi.variant_id = v.id

        WHERE v.product_id = $1

        GROUP BY v.id
        ORDER BY v.id;
      `,
      [product.id]
    );

    const variants = variantResult.rows.map((variant) => ({
      ...variant,
      mrp: Number(variant.mrp),
      price: Number(variant.price),
      images: variant.images || [],
    }));

    if (variants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No variants found for this product',
      });
    }

    /**
     * Select requested variant.
     * If no variantId is supplied, use the first variant.
     */
    const requestedVariantId =
      req.query.variantId === undefined
        ? null
        : Number(req.query.variantId);

    if (
      req.query.variantId !== undefined &&
      !Number.isInteger(requestedVariantId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'variantId must be an integer',
      });
    }

    const selectedVariant =
      requestedVariantId === null
        ? variants[0]
        : variants.find(
            (variant) => variant.id === requestedVariantId
          );

    if (!selectedVariant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variantId for this product',
      });
    }

    /**
     * Fetch EMI configuration from DB.
     *
     * Monthly payment is calculated here,
     * not stored in the database.
     */
    const emiResult = await query(planSelect, [
      selectedVariant.id,
    ]);

    const emiPlans = emiResult.rows.map((row) =>
      serializePlan(row, selectedVariant.price)
    );

    res.json({
      success: true,

      data: {
        ...product,
        variants,
        selectedVariant,
        emiPlans,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get EMI plans for a specific variant.
 *
 * Example:
 * /api/products/iphone-17-pro/emi-plans?variantId=5
 */
app.get(
  `${API_PREFIX}/products/:slug/emi-plans`,
  async (req, res, next) => {
    try {
      const variantId = Number(req.query.variantId);

      if (!Number.isInteger(variantId)) {
        return res.status(400).json({
          success: false,
          message: 'variantId is required',
        });
      }

      /**
       * Verify that the variant belongs to this product.
       */
      const variantResult = await query(
        `
          SELECT
            v.id,
            v.price_paise AS price

          FROM variants v

          JOIN products p
            ON p.id = v.product_id

          WHERE v.id = $1
            AND p.slug = $2

          LIMIT 1;
        `,
        [variantId, req.params.slug]
      );

      if (variantResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found for this product',
        });
      }

      /**
       * Get EMI configuration.
       */
      const { rows } = await query(planSelect, [variantId]);

      /**
       * Calculate EMI on the backend.
       */
      const emiPlans = rows.map((row) =>
        serializePlan(row, variantResult.rows[0].price)
      );

      res.json({
        success: true,
        data: emiPlans,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * Global error handler
 */
app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

/**
 * IMPORTANT:
 *
 * Do NOT use app.listen() when deploying this
 * Express application to Vercel.
 *
 * Vercel imports this Express app as a serverless function.
 */
export default app;