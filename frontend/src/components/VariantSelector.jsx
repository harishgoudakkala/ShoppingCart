import { useMemo } from 'react';

export default function VariantSelector({ variants, selectedId, onSelect }) {
  const selected = variants.find((variant) => variant.id === selectedId);
  const colors = useMemo(() => [...new Set(variants.map((variant) => variant.color))], [variants]);
  const storageOptions = useMemo(() => {
    if (!selected) return [];
    return variants
      .filter((variant) => variant.color === selected.color)
      .map((variant) => variant.storage);
  }, [variants, selected]);

  const colorVariant = (color) => variants.find((variant) => variant.color === color);

  return (
    <div className="variant-section">
      <div className="section-label">Color</div>
      <div className="variant-list">
        {colors.map((color) => {
          const variant = colorVariant(color);
          return (
            <button
              type="button"
              key={color}
              className={`variant-chip ${selected?.color === color ? 'active' : ''}`}
              onClick={() => onSelect(variant.id)}
            >
              <span className="variant-dot" />
              <span>{color}</span>
            </button>
          );
        })}
      </div>

      <div className="section-label sub-label">Storage</div>
      <div className="variant-list">
        {storageOptions.map((storage) => {
          const variant = variants.find((item) => item.color === selected.color && item.storage === storage);
          return (
            <button
              type="button"
              key={storage}
              className={`storage-chip ${variant.id === selectedId ? 'active' : ''}`}
              onClick={() => onSelect(variant.id)}
            >
              {storage}
            </button>
          );
        })}
      </div>
    </div>
  );
}
