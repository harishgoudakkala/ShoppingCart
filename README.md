# Smart Store — EMI Product Store

A full-stack React + Express + PostgreSQL implementation of the Smart Store.

## Included features

- `/products` product catalogue page.
- Unique product URLs: `/products/:slug`.
- Dynamic products, colors, storage options, pricing and images from PostgreSQL.
- Each color can have multiple storage variants.
- Product image gallery with arrows, thumbnails and dots.
- EMI plans are stored as **business configuration**, not precomputed monthly payments.
- Backend calculates monthly EMI from the selected variant price, tenure and annual interest rate.
- Financing program metadata (bank/NBFC), EMI type, cashback and processing fee.
- No-cost EMI and regular EMI examples.
- Responsive UI.
- Parameterized SQL and database health check.

## Database setup

Set `DATABASE_URL` in `backend/.env`, then run:

```bash
cd backend
npm install
npm run seed
```

The seed script recreates the demo tables and inserts products, variants, images, financing programs and EMI configurations.

If you prefer to create the schema manually:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Default API: `http://localhost:5000`.

### API endpoints

#### `GET /api/health`

Checks that the API can reach PostgreSQL.

#### `GET /api/products`

Returns catalogue cards with starting price, first image and variant count.

#### `GET /api/products/:slug`

Returns a product, all color/storage variants, image gallery data, and EMI plans for the selected variant.

Optional query parameter:

```text
GET /api/products/iphone-17-pro?variantId=5
```

#### `GET /api/products/:slug/emi-plans?variantId=5`

Returns the financing options for one variant. The monthly payment is calculated by the API.

### EMI calculation

For zero-interest/no-cost plans:

```text
EMI = principal / tenure
```

For regular reducing-balance EMI:

```text
r = annual interest rate / 12 / 100
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
```

The backend rounds the resulting amount to the nearest paise.

Processing fees are kept separate from the monthly installment and included in `totalPayable`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend: `http://localhost:5173`.

Vite proxies `/api` to `http://localhost:5000` during local development.

## Production build

```bash
cd frontend
npm run build
```

## Deployment

### Backend

A Node-compatible service such as Render can run:

```text
Root directory: backend
Build command: npm install
Start command: npm start
```

Set `DATABASE_URL`, `FRONTEND_URL`, and `PORT` as environment variables.

### Frontend

A service such as Vercel can run:

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
```

Set `VITE_API_URL` to the deployed API base URL, including `/api` if you use an absolute API URL.

## Suggested demo walkthrough

1. Open `/products` and show the product catalogue.
2. Open a product's unique URL.
3. Switch color and storage and show price/gallery/EMI options updating from the API.
4. Cycle through the image gallery.
5. Select a no-cost or regular EMI plan.
6. Open DevTools → Network and show the product API response containing a backend-calculated `monthlyPayment`.
7. Show PostgreSQL tables and explain that the database stores EMI rules rather than the derived monthly amount.
8. Show `db/schema.sql`, `backend/src/server.js`, `backend/src/seed.js` and this README.
