import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/config.js';

/**
 * Helper to dynamically create/update meta tags in document head.
 */
function updateMetaTag(propertyOrName, value, content) {
  if (!content) return;
  const attribute = propertyOrName.startsWith('og:') ? 'property' : 'name';
  let element = document.querySelector(`meta[${attribute}="${propertyOrName}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, propertyOrName);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Helper to update canonical link in document head.
 */
function updateCanonicalLink(url) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

/**
 * Helper to update JSON-LD scripts in document head.
 */
function updateJsonLd(id, schemaData) {
  let element = document.getElementById(id);
  if (schemaData) {
    if (!element) {
      element = document.createElement('script');
      element.id = id;
      element.type = 'application/ld+json';
      document.head.appendChild(element);
    }
    element.text = JSON.stringify(schemaData);
  } else {
    if (element) {
      element.remove();
    }
  }
}

const CATEGORY_TITLES = {
  bestsellers: 'Best Sellers',
  newarrivals: 'New Arrivals',
  decants: 'Perfume Decants',
  sets: 'Gift Sets',
  fullbottles: 'Full Bottles',
  summer: 'Summer Fragrances',
  winter: 'Winter Fragrances',
  'for-him': 'Fragrances for Him',
  him: 'Fragrances for Him',
  'for-her': 'Fragrances for Her',
  her: 'Fragrances for Her',
  luxury: 'Luxury Collection'
};

export default function SEO({ activePage, activeCategory, selectedProduct, products = [] }) {
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setDbCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories in SEO:', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    let title = 'Decant Atelier | Luxury Perfume Decants in India';
    let description = 'Buy authentic luxury perfume decants in India. Explore Dior, Chanel, Tom Ford, Maison Francis Kurkdjian, Creed and more.';
    let canonical = 'https://decantatelier.in/';
    let ogType = 'website';
    let ogImage = 'https://decantatelier.in/og-image.png';

    // JSON-LD schema containers
    let websiteSchema = null;
    let organizationSchema = null;
    let localBusinessSchema = null;
    let productSchema = null;
    let breadcrumbSchema = null;
    let collectionSchema = null;

    // Organization details
    const organizationData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://decantatelier.in/#organization',
      'name': 'Decant Atelier',
      'url': 'https://decantatelier.in/',
      'logo': 'https://decantatelier.in/decantatelierlogo.png',
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+91-98205-83776',
        'contactType': 'customer support',
        'email': 'faheem@decantatelier.in',
        'areaServed': 'IN',
        'availableLanguage': ['en', 'hi']
      }
    };

    // Website details
    const websiteData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': 'https://decantatelier.in/#website',
      'name': 'Decant Atelier',
      'url': 'https://decantatelier.in/',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': 'https://decantatelier.in/shop?search={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    };

    // LocalBusiness details (targeting India location/currency)
    const localBusinessData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': 'https://decantatelier.in/#localbusiness',
      'name': 'Decant Atelier',
      'image': 'https://decantatelier.in/og-image.png',
      'url': 'https://decantatelier.in/',
      'telephone': '+91-98205-83776',
      'email': 'faheem@decantatelier.in',
      'priceRange': '₹₹',
      'address': {
        '@type': 'PostalAddress',
        'addressCountry': 'IN',
        'addressLocality': 'Mumbai',
        'addressRegion': 'Maharashtra'
      },
      'currenciesAccepted': 'INR',
      'paymentAccepted': 'UPI, Credit Card, Debit Card, Net Banking'
    };

    if (activePage === 'home') {
      title = 'Luxury Perfume Decants in India | Decant Atelier';
      description = 'Buy authentic luxury perfume decants in India. Explore Dior, Chanel, Tom Ford, Maison Francis Kurkdjian, Creed and more with proportional fair pricing.';
      canonical = 'https://decantatelier.in/';
      
      websiteSchema = websiteData;
      organizationSchema = organizationData;
      localBusinessSchema = localBusinessData;

    } else if (activePage === 'shop') {
      const catKey = (activeCategory || 'all').toLowerCase();
      if (catKey !== 'all') {
        const catTitle = CATEGORY_TITLES[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1);
        title = `${catTitle} Collection | Decant Atelier`;
        description = `Explore our premium ${catTitle} collection at Decant Atelier. Genuine hand-poured decants and luxury fragrance options in India.`;
        canonical = `https://decantatelier.in/shop?category=${catKey}`;
      } else {
        title = 'Shop Luxury Perfume Decants | Decant Atelier';
        description = 'Browse our full catalogue of authentic designer and niche perfume decants. Hand-poured in sterile conditions with fast delivery across India.';
        canonical = 'https://decantatelier.in/shop';
      }

      // Dynamic CollectionPage & ItemList JSON-LD Generation
      let filteredProducts = products && products.length > 0 ? [...products] : [];
      if (catKey !== 'all') {
        const primaryCategories = ['decants', 'full-bottles', 'fullbottles', 'sets'];
        if (primaryCategories.includes(catKey)) {
          const targetSlug = catKey === 'fullbottles' ? 'full-bottles' : catKey;
          const matchedCat = dbCategories.find(c => c.slug === targetSlug);
          if (matchedCat) {
            filteredProducts = filteredProducts.filter(item => item.categoryId === matchedCat.id || item.category === matchedCat.slug);
          } else {
            filteredProducts = filteredProducts.filter(item => item.category === catKey || (catKey === 'full-bottles' && (item.category === 'fullbottles' || item.category === 'full-bottles')));
          }
        } else {
          let tagToSearch = catKey;
          if (catKey === 'for-him' || catKey === 'him') tagToSearch = 'him';
          else if (catKey === 'for-her' || catKey === 'her') tagToSearch = 'her';
          else if (catKey === 'newarrivals' || catKey === 'new-arrivals') tagToSearch = 'new-arrival';
          else if (catKey === 'bestsellers' || catKey === 'best-sellers') tagToSearch = 'featured';

          filteredProducts = filteredProducts.filter(item => {
            if (item.tags && item.tags.includes(tagToSearch)) return true;
            if (tagToSearch === 'new-arrival' && item.featured) return true;
            if (tagToSearch === 'featured' && item.featured) return true;
            return false;
          });
        }
      }

      filteredProducts.sort((a, b) => {
        const aFeat = a.tags && a.tags.includes('featured') ? 1 : 0;
        const bFeat = b.tags && b.tags.includes('featured') ? 1 : 0;
        return bFeat - aFeat;
      });

      const collectionUrl = catKey === 'all' 
        ? 'https://decantatelier.in/shop' 
        : `https://decantatelier.in/shop?category=${catKey}`;

      const itemListElement = filteredProducts.map((prod, idx) => {
        const defaultVariant = prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : null;
        const price = defaultVariant ? defaultVariant.price : (prod.price || 0);
        const isOutOfStock = defaultVariant ? defaultVariant.stock === 0 : (prod.tags && prod.tags.includes('out-of-stock'));
        const prodSlug = prod.slug || prod.id;
        const prodUrl = `https://decantatelier.in/product/${prodSlug}`;
        
        return {
          '@type': 'ListItem',
          'position': idx + 1,
          'url': prodUrl,
          'item': {
            '@type': 'Product',
            'url': prodUrl,
            'name': prod.name,
            'image': prod.image ? (prod.image.startsWith('http') ? prod.image : `https://decantatelier.in${prod.image}`) : 'https://decantatelier.in/decantatelierlogo.png',
            'offers': {
              '@type': 'Offer',
              'price': price,
              'priceCurrency': 'INR',
              'availability': isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
              'url': prodUrl
            }
          }
        };
      });

      const catTitle = CATEGORY_TITLES[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1);

      collectionSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${collectionUrl}#collectionpage`,
        'name': catKey === 'all' ? 'Shop Luxury Perfume Decants | Decant Atelier' : `${catTitle} Collection | Decant Atelier`,
        'description': catKey === 'all' 
          ? 'Browse our full catalogue of authentic designer and niche perfume decants.'
          : `Explore our premium ${catTitle} collection at Decant Atelier. Genuine hand-poured decants and luxury fragrance options in India.`,
        'url': collectionUrl,
        'mainEntity': {
          '@type': 'ItemList',
          'name': catKey === 'all' ? 'Decant Atelier Product Catalog' : `${catTitle} Fragrances`,
          'numberOfItems': filteredProducts.length,
          'itemListElement': itemListElement
        }
      };

    } else if (activePage === 'product' && selectedProduct) {
      title = `${selectedProduct.name} | Decant Atelier`;
      
      const cleanDesc = selectedProduct.description 
        ? selectedProduct.description.replace(/\r?\n|\r/g, ' ') 
        : 'Buy authentic luxury perfume decants in India.';
      description = `Buy authentic decants of ${selectedProduct.name} by ${selectedProduct.brand || 'Premium Brand'} online in India. ${cleanDesc.substring(0, 110)}...`;
      
      const productSlug = selectedProduct.slug || selectedProduct.id;
      canonical = `https://decantatelier.in/product/${productSlug}`;
      ogType = 'product';
      
      if (selectedProduct.image) {
        ogImage = selectedProduct.image.startsWith('http') 
          ? selectedProduct.image 
          : `https://decantatelier.in${selectedProduct.image}`;
      }

      // Generate dynamic Product schema directly from live database properties
      const defaultVariant = selectedProduct.sizes && selectedProduct.sizes.length > 0 
        ? selectedProduct.sizes[0] 
        : null;
      const productPrice = defaultVariant ? defaultVariant.price : (selectedProduct.price || 0);
      const isOutOfStock = defaultVariant && defaultVariant.stock === 0;

      productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `https://decantatelier.in/product/${selectedProduct.slug || selectedProduct.id}#product`,
        'name': selectedProduct.name,
        'image': ogImage,
        'description': cleanDesc,
        'brand': {
          '@type': 'Brand',
          'name': selectedProduct.brand || 'Luxury Fragrances'
        },
        'sku': defaultVariant?.sku || `DA-${selectedProduct.id.toUpperCase()}`,
        'offers': {
          '@type': 'Offer',
          'price': productPrice,
          'priceCurrency': 'INR',
          'availability': isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          'url': canonical,
          'priceValidUntil': '2027-12-31'
        }
      };

      // Rich Breadcrumb List schema
      breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://decantatelier.in/'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Shop',
            'item': 'https://decantatelier.in/shop'
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': selectedProduct.brand || 'Brands',
            'item': `https://decantatelier.in/shop?category=${(selectedProduct.brand || '').toLowerCase().replace(/\s+/g, '-')}`
          },
          {
            '@type': 'ListItem',
            'position': 4,
            'name': selectedProduct.name,
            'item': canonical
          }
        ]
      };

    } else if (activePage === 'wishlist') {
      title = 'Wishlist | Decant Atelier';
      description = 'View your curated collection of favorite luxury perfumes and decants at Decant Atelier.';
      canonical = 'https://decantatelier.in/wishlist';

    } else if (activePage === 'cart') {
      title = 'Shopping Cart | Decant Atelier';
      description = 'Review your luxury perfume decants and proceed to secure checkout at Decant Atelier.';
      canonical = 'https://decantatelier.in/cart';

    } else if (activePage === 'profile') {
      title = 'My Account | Decant Atelier';
      description = 'Manage your profile, order history, and account settings at Decant Atelier.';
      canonical = 'https://decantatelier.in/profile';

    } else if (activePage === 'admin') {
      title = 'Admin Console | Decant Atelier';
      description = 'Manage products, orders, users, and shop settings.';
      canonical = 'https://decantatelier.in/admin';

    } else if (activePage === 'categories') {
      title = 'Fragrance Categories | Decant Atelier';
      description = 'Explore luxury fragrances by category, gender, season, and scent family.';
      canonical = 'https://decantatelier.in/categories';

    } else if (activePage === 'gifting') {
      title = 'Luxury Scent Gifting | Decant Atelier';
      description = 'Discover our handpicked luxury perfume gifting sets and custom curated options.';
      canonical = 'https://decantatelier.in/gifting';

    } else if (activePage === 'policies') {
      const pathName = window.location.pathname.replace('/', '');
      if (pathName === 'privacy') {
        title = 'Privacy Policy | Decant Atelier';
        description = 'Read our privacy policy to understand how Decant Atelier collects, uses, and safeguards your personal information.';
        canonical = 'https://decantatelier.in/privacy';
      } else if (pathName === 'refund') {
        title = 'Refund Policy | Decant Atelier';
        description = 'Read our return and refund policy to understand eligibility, damaged orders, and cancellations at Decant Atelier.';
        canonical = 'https://decantatelier.in/refund';
      } else if (pathName === 'shipping') {
        title = 'Shipping Policy | Decant Atelier';
        description = 'Read our shipping policy regarding processing times, packaging standards, and tracking for domestic shipping in India.';
        canonical = 'https://decantatelier.in/shipping';
      } else if (pathName === 'terms') {
        title = 'Terms & Conditions | Decant Atelier';
        description = 'Read our terms and conditions governing purchases, pricing, intellectual property, and liability at Decant Atelier.';
        canonical = 'https://decantatelier.in/terms';
      } else if (pathName === 'about') {
        title = 'About Us | Decant Atelier';
        description = 'Learn about Decant Atelier\'s story, our values, and our uncompromising standards for authentic hand-poured perfume decants in India.';
        canonical = 'https://decantatelier.in/about';
      } else if (pathName === 'authenticity') {
        title = 'Authenticity & Sourcing | Decant Atelier';
        description = 'Learn how we source, verify, and decant our luxury fragrances to guarantee 100% authenticity.';
        canonical = 'https://decantatelier.in/authenticity';
      } else {
        title = 'Our Policies | Decant Atelier';
        description = 'Transparency, integrity, and care — the pillars of every interaction with Decant Atelier.';
        canonical = 'https://decantatelier.in/about';
      }
    }

    // Apply head changes dynamically
    document.title = title;
    updateMetaTag('description', description);
    updateCanonicalLink(canonical);
    
    // Open Graph
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:image:secure_url', ogImage);
    updateMetaTag('og:image:type', 'image/png');
    updateMetaTag('og:url', canonical);
    updateMetaTag('og:type', ogType);

    if (activePage === 'product' && selectedProduct) {
      updateMetaTag('og:image:width', '600');
      updateMetaTag('og:image:height', '600');
      updateMetaTag('og:image:alt', `${selectedProduct.name} - Decant Atelier`);
    } else {
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:image:alt', 'Decant Atelier - Luxury Perfume Decants');
    }

    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:image', ogImage);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', activePage === 'home' || activePage === 'shop'
      ? 'Buy authentic luxury perfume decants from premium designer and Middle Eastern brands.'
      : description
    );

    // Apply JSON-LD structured schemas
    updateJsonLd('seo-website-jsonld', websiteSchema);
    updateJsonLd('seo-organization-jsonld', organizationSchema);
    updateJsonLd('seo-localbusiness-jsonld', localBusinessSchema);
    updateJsonLd('seo-product-jsonld', productSchema);
    updateJsonLd('seo-breadcrumb-jsonld', breadcrumbSchema);
    updateJsonLd('seo-collection-jsonld', collectionSchema);

  }, [activePage, activeCategory, selectedProduct, products, dbCategories]);

  return null;
}
