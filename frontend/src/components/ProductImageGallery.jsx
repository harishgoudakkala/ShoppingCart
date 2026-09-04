import { useEffect, useState } from 'react';

export default function ProductImageGallery({ productName, variant }) {
  const images = variant.images?.length ? variant.images : [{ id: 0, imageUrl: '/images/iphone-silver.svg' }];
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [variant.id]);

  const previous = () => setIndex((current) => (current - 1 + images.length) % images.length);
  const next = () => setIndex((current) => (current + 1) % images.length);

  return (
    <div className="gallery">
      <div className="product-image-wrap">
        <button type="button" className="gallery-arrow left" onClick={previous} aria-label="Previous product image">‹</button>
        <img
          src={images[index].imageUrl}
          alt={`${productName} ${variant.color} ${variant.storage}`}
          className="product-image"
        />
        <button type="button" className="gallery-arrow right" onClick={next} aria-label="Next product image">›</button>
      </div>

      <div className="gallery-controls">
        {images.map((item, itemIndex) => (
          <button
            type="button"
            key={item.id}
            className={`gallery-thumb ${itemIndex === index ? 'active' : ''}`}
            onClick={() => setIndex(itemIndex)}
            aria-label={`Show image ${itemIndex + 1}`}
          >
            <img src={item.imageUrl} alt="" />
          </button>
        ))}
      </div>
      <div className="gallery-dots" aria-hidden="true">
        {images.map((item, itemIndex) => <span key={item.id} className={itemIndex === index ? 'active' : ''} />)}
      </div>
    </div>
  );
}
