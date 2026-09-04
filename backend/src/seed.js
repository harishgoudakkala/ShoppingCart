import dotenv from 'dotenv';
import fs from 'node:fs/promises';
dotenv.config();

import { pool, query } from './db.js';

const image = (product, color, view) => `/images/${product}-${color}-${view}.svg`;

const products = [
  {
    slug: 'iphone-17-pro',
    name: 'iPhone 17 Pro',
    badge: 'NEW',
    description: 'Pro performance with a premium titanium-style finish.',
    variants: [
      { color: 'Silver', storages: [{ storage: '128GB', mrp: 12990000, price: 11990000 }, { storage: '256GB', mrp: 13490000, price: 12740000 }, { storage: '512GB', mrp: 15490000, price: 14690000 }] },
      { color: 'Orange', storages: [{ storage: '128GB', mrp: 12990000, price: 11990000 }, { storage: '256GB', mrp: 13490000, price: 12740000 }, { storage: '512GB', mrp: 15490000, price: 14690000 }] },
      { color: 'Deep Blue', storages: [{ storage: '128GB', mrp: 12990000, price: 11990000 }, { storage: '256GB', mrp: 13490000, price: 12740000 }, { storage: '512GB', mrp: 15490000, price: 14690000 }] }
    ]
  },
  {
    slug: 'samsung-s24-ultra',
    name: 'Samsung S24 Ultra',
    badge: 'BESTSELLER',
    description: 'A large-format flagship with a vivid display and pro-grade camera.',
    variants: [
      { color: 'Titanium Gray', storages: [{ storage: '256GB', mrp: 12999900, price: 10999900 }, { storage: '512GB', mrp: 13999900, price: 11999900 }, { storage: '1TB', mrp: 15999900, price: 13999900 }] },
      { color: 'Titanium Violet', storages: [{ storage: '256GB', mrp: 12999900, price: 10999900 }, { storage: '512GB', mrp: 13999900, price: 11999900 }, { storage: '1TB', mrp: 15999900, price: 13999900 }] },
      { color: 'Titanium Black', storages: [{ storage: '256GB', mrp: 12999900, price: 10999900 }, { storage: '512GB', mrp: 13999900, price: 11999900 }, { storage: '1TB', mrp: 15999900, price: 13999900 }] }
    ]
  },
  {
    slug: 'oneplus-13',
    name: 'OnePlus 13',
    badge: 'LIMITED OFFER',
    description: 'Fast, clean and powerful flagship hardware for everyday use.',
    variants: [
      { color: 'Midnight', storages: [{ storage: '256GB', mrp: 7499900, price: 6999900 }, { storage: '512GB', mrp: 8499900, price: 7899900 }] },
      { color: 'Arctic', storages: [{ storage: '256GB', mrp: 7499900, price: 6999900 }, { storage: '512GB', mrp: 8499900, price: 7899900 }] }
    ]
  }
];

const financingPrograms = [
  { name: 'XYZ Partner Bank', providerType: 'BANK' },
  { name: 'XYZ Finance', providerType: 'NBFC' }
];

const planRules = [
  { tenure: 3, rate: 0, cashback: 75000, fee: 0, type: 'NO_COST', program: 'XYZ Partner Bank' },
  { tenure: 6, rate: 0, cashback: 75000, fee: 0, type: 'NO_COST', program: 'XYZ Partner Bank' },
  { tenure: 12, rate: 0, cashback: 100000, fee: 0, type: 'NO_COST', program: 'XYZ Partner Bank' },
  { tenure: 24, rate: 0, cashback: 100000, fee: 0, type: 'NO_COST', program: 'XYZ Partner Bank' },
  { tenure: 36, rate: 10.5, cashback: 0, fee: 99900, type: 'REGULAR', program: 'XYZ Finance' },
  { tenure: 48, rate: 10.5, cashback: 0, fee: 99900, type: 'REGULAR', program: 'XYZ Finance' },
  { tenure: 60, rate: 10.5, cashback: 0, fee: 99900, type: 'REGULAR', program: 'XYZ Finance' }
];

async function seed() {
  const schemaPath = new URL('../../db/schema.sql', import.meta.url);
  const schemaSql = await fs.readFile(schemaPath, 'utf8');
  await query(schemaSql);


  const programIds = new Map();
  for (const program of financingPrograms) {
    const result = await query(`
      INSERT INTO financing_programs (name, provider_type)
      VALUES ($1, $2)
      RETURNING id;
    `, [program.name, program.providerType]);
    programIds.set(program.name, result.rows[0].id);
  }

  for (const product of products) {
    const productResult = await query(`
      INSERT INTO products (slug, name, badge, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [product.slug, product.name, product.badge, product.description]);

    const productId = productResult.rows[0].id;
    console.log(`Seeded product: ${product.name}`);

    for (const colorGroup of product.variants) {
      for (const option of colorGroup.storages) {
        const variantName = `${colorGroup.color} ${option.storage}`;
        const variantResult = await query(`
          INSERT INTO variants (product_id, name, color, storage, mrp_paise, price_paise)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `, [productId, variantName, colorGroup.color, option.storage, option.mrp, option.price]);

        const variantId = variantResult.rows[0].id;
        const slugBase = `${product.slug.split('-')[0]}-${colorGroup.color.toLowerCase().replaceAll(' ', '-')}`;

        for (const view of ['front', 'back', 'detail']) {
          await query(`
            INSERT INTO variant_images (variant_id, image_url, sort_order)
            VALUES ($1, $2, $3);
          `, [variantId, image(product.slug.split('-')[0], colorGroup.color.toLowerCase().replaceAll(' ', '-'), view), ['front', 'back', 'detail'].indexOf(view)]);
        }

        for (const plan of planRules) {
          await query(`
            INSERT INTO emi_plans
              (variant_id, financing_program_id, tenure_months, interest_rate, cashback_paise, processing_fee_paise, emi_type, label)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
          `, [
            variantId,
            programIds.get(plan.program),
            plan.tenure,
            plan.rate,
            plan.cashback,
            plan.fee,
            plan.type,
            plan.type === 'NO_COST' ? 'No Cost EMI' : `${plan.rate}% interest`
          ]);
        }
      }
    }
  }

  console.log('Seed completed successfully.');
}

try {
  await seed();
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
