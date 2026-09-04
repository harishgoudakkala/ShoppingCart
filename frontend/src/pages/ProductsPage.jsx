import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load products');
        return payload.data;
      })
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="page">
        <div className="listing-heading">
          <div>
            <span className="eyebrow">SMARTSTORE</span>
            <h1>Choose a product</h1>
            <p>Compare products and choose an EMI plan that fits your budget.</p>
          </div>
          <span className="catalog-count">{products.length} products</span>
        </div>

        {loading && <div className="state-card">Loading products...</div>}
        {error && <div className="state-card error-state">{error}</div>}

        {!loading && !error && (
          <section className="product-grid">
            {products.map((product) => (
              <Link className="product-card" to={`/products/${product.slug}`} key={product.id}>
                <div className="product-card-image">
                  <img src={product.imageUrl} alt={product.name} />
                </div>
                <div className="product-card-body">
                  <span className="product-badge">{product.badge}</span>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <div className="card-price-row">
                    <strong>From {formatINR(product.startingPrice)}</strong>
                    <span>{product.variantCount} variants</span>
                  </div>
                  <span className="card-cta">View product →</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
