"use client";

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import SignatureCollection from '@/components/SignatureCollection';
import Gifting from '@/components/Gifting';
import Pricing from '@/components/Pricing';
import Authenticity from '@/components/Authenticity';
import PoliciesPage from '@/components/Policies';
import Footer from '@/components/Footer';
import ProductPage from '@/components/ProductPage';
import CartPage from '@/components/CartPage';
import CategoriesPage from '@/components/CategoriesPage';
import { collectionsData } from '@/components/SignatureCollection/CollectionData';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    const handleHashChange = () => {
      const getPageFromHash = () => {
        const hash = window.location.hash.replace('#', '');
        const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy'];
        if (policies.includes(hash)) return 'policies';
        if (hash === 'shop' || hash === 'collection') return 'shop';
        if (hash === 'cart') return 'cart';
        if (hash === 'categories') return 'categories';
        if (hash.startsWith('product-')) return 'product';
        return 'home';
      };

      const page = getPageFromHash();
      setActivePage(page);

      // Parse selected product if hash is product-
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('product-')) {
        const id = hash.replace('product-', '');
        const foundProduct = collectionsData.find(p => p.id === id);
        if (foundProduct) {
          setSelectedProduct(foundProduct);
        }
      }
    };

    // Initialize on load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync scroll on page transition
  useEffect(() => {
    if (mounted) {
      window.scrollTo(0, 0);
    }
  }, [activePage, mounted]);

  const defaultLayout = (
    <div className="flex flex-col gap-0 min-h-screen">
      <Navbar 
        onNavigate={setActivePage} 
        activePage="home" 
        onSelectCategory={setActiveCategory} 
        activeCategory="all" 
      />
      <Hero />
      <Gifting 
        onSelectCategory={setActiveCategory} 
        onNavigate={setActivePage} 
      />
      <Pricing />
      <Authenticity />
      <Footer onNavigate={setActivePage} />
    </div>
  );

  if (!mounted) {
    return defaultLayout;
  }

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      <Navbar 
        onNavigate={setActivePage} 
        activePage={activePage} 
        onSelectCategory={setActiveCategory} 
        activeCategory={activeCategory} 
      />
      
      {activePage === 'home' && (
        <>
          <Hero />
          <Gifting 
            onSelectCategory={setActiveCategory} 
            onNavigate={setActivePage} 
          />
          <Pricing />
          <Authenticity />
        </>
      )}

      {activePage === 'shop' && (
        <SignatureCollection 
          activeCategory={activeCategory} 
          onSelectCategory={setActiveCategory} 
        />
      )}

      {activePage === 'product' && (
        <ProductPage 
          product={selectedProduct} 
          onBackToShop={() => {
            window.location.hash = 'shop';
          }}
        />
      )}

      {activePage === 'cart' && (
        <CartPage 
          onBackToShop={() => {
            window.location.hash = 'shop';
          }}
        />
      )}

      {activePage === 'policies' && (
        <PoliciesPage />
      )}

      {activePage === 'categories' && (
        <CategoriesPage 
          onSelectCategory={(categoryKey) => {
            setActiveCategory(categoryKey);
            setActivePage('shop');
            window.location.hash = 'collection';
          }}
        />
      )}
      
      <Footer onNavigate={setActivePage} />
    </div>
  );
}
