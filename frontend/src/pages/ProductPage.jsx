import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import VariantSelector from '../components/VariantSelector';
import EmiPlanCard from '../components/EmiPlanCard';
import ProductImageGallery from '../components/ProductImageGallery';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingVariant, setSwitchingVariant] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSubmitted(false);

    fetch(`${API_URL}/api/products/${slug}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load product');
        return payload.data;
      })
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSelectedVariantId(data.selectedVariant.id);
        setSelectedPlanId(data.emiPlans[0]?.id ?? null);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!product || !selectedVariantId || selectedVariantId === product.selectedVariant.id) return;

    let cancelled = false;
    setSwitchingVariant(true);
    setError('');

    fetch(`${API_URL}/api/products/${slug}?variantId=${selectedVariantId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load EMI plans');
        return payload.data;
      })
      .then((data) => {
        if (cancelled) return;
        setProduct((current) => current ? { ...current, selectedVariant: data.selectedVariant, emiPlans: data.emiPlans } : current);
        setSelectedPlanId(data.emiPlans[0]?.id ?? null);
        setSubmitted(false);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setSwitchingVariant(false); });

    return () => { cancelled = true; };
  }, [selectedVariantId, slug, product?.selectedVariant?.id]);

  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.id === selectedVariantId),
    [product, selectedVariantId]
  );
  const selectedPlan = product?.emiPlans.find((plan) => plan.id === selectedPlanId);

  if (loading) return <><Header /><main className="page"><div className="state-card">Loading product...</div></main></>;
  if (error || !product || !selectedVariant) return <><Header /><main className="page"><div className="state-card error-state">{error || 'Product not found.'}</div></main></>;

  const discount = selectedVariant.mrp > 0 ? Math.round((1 - selectedVariant.price / selectedVariant.mrp) * 100) : 0;

  return (
    <>
      <Header />
      <main className="page">
        <div className="breadcrumb"><Link to="/products">Products</Link><span>/</span><span>{product.name}</span></div>

        <section className="product-layout">
          <div className="product-panel">
            <ProductImageGallery productName={product.name} variant={selectedVariant} />
            <div className="product-meta">
              <div className="product-badge">{product.badge}</div>
              <h1>{product.name}</h1>
              <p>{product.description}</p>
              <div className="selected-variant">{selectedVariant.color} · {selectedVariant.storage}</div>
            </div>
            <VariantSelector variants={product.variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} />
          </div>

          <div className="emi-panel">
            <div className="price-block">
              <div className="price-row">
                <strong>{formatINR(selectedVariant.price)}</strong>
                <span className="mrp">{formatINR(selectedVariant.mrp)}</span>
                {discount > 0 && <span className="discount">SAVE {discount}%</span>}
              </div>
              <div className="price-caption">EMI plans backed by mutual funds · calculated by the backend</div>
            </div>

            <div className="plan-header">
              <div><h2>Select an EMI plan</h2><p>Choose a financing program and tenure.</p></div>
              <span className="plan-count">{product.emiPlans.length} plans</span>
            </div>

            {switchingVariant && <div className="inline-loading">Updating financing options...</div>}
            <div className="emi-list">
              {product.emiPlans.map((plan) => (
                <EmiPlanCard key={plan.id} plan={plan} selected={plan.id === selectedPlanId} onSelect={setSelectedPlanId} />
              ))}
            </div>

            <button className="proceed-button" type="button" disabled={!selectedPlan || switchingVariant} onClick={() => setSubmitted(true)}>
              {submitted ? 'Plan selected ✓' : `Proceed with ${selectedPlan ? `${selectedPlan.tenure}-month` : ''} plan`}
            </button>

            {submitted && selectedPlan && (
              <div className="success-message">
                You selected {selectedPlan.tenure} months at {Number(selectedPlan.interestRate)}% interest with a monthly payment of {formatINR(selectedPlan.monthlyPayment)}. Processing fee: {formatINR(selectedPlan.processingFee)}.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
