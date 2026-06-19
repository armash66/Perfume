import './CategoriesPage.css';

export default function CategoriesPage({ onSelectCategory, collections = [], isLoading, error, onRetry }) {
  const visibleCollections = collections.filter(collection => collection.showInDirectory);

  return (
    <div className="categories-page">
      <div className="categories-bg-grid" />
      
      <div className="categories-container">
        <div className="categories-header">
          <br />
          <h1 className="categories-title" >Shop by Category</h1>
          <p className="categories-subtitle">Curated collections for every preference</p>
          <div className="categories-divider" />
        </div>
        
        {isLoading && <div className="categories-state">Loading curated collections...</div>}
        {!isLoading && error && (
          <div className="categories-state categories-error">
            <span>{error}</span>
            <button type="button" onClick={onRetry}>Retry</button>
          </div>
        )}
        {!isLoading && !error && visibleCollections.length === 0 && (
          <div className="categories-state">No collection pages are currently published.</div>
        )}

        {!isLoading && !error && visibleCollections.length > 0 && (
          <div className="categories-grid">
          {visibleCollections.map((collection) => (
            <div 
              key={collection.id}
              className={`category-card category-${collection.slug}`}
              onClick={() => onSelectCategory(collection.slug)}
            >
              <img 
                src={collection.imageUrl}
                alt={collection.name}
                className="category-card-img" 
                loading="lazy"
              />
              <div className="category-card-overlay" />
              
              <div className="category-card-content">
                {collection.eyebrow && <span className="category-card-eyebrow">{collection.eyebrow}</span>}
                <h2 className="category-card-title">{collection.name}</h2>
                <p className="category-card-desc">{collection.description}</p>
                <span className="category-card-cta">
                  Browse {collection.productCount} Fragrances &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
