import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SignatureCollection from './components/SignatureCollection';
import Gifting from './components/Gifting';
import Pricing from './components/Pricing';
import Authenticity from './components/Authenticity';
import PoliciesPage from './components/Policies';
import Footer from './components/Footer';

function App() {
  const getPageFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy'];
    return policies.includes(hash) ? 'policies' : 'home';
  };

  const [activePage, setActivePage] = useState(getPageFromHash);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      <Navbar 
        onNavigate={setActivePage} 
        activePage={activePage} 
        onSelectCategory={setActiveCategory} 
        activeCategory={activeCategory} 
      />
      
      {activePage === 'home' ? (
        <>
          <Hero />
          <div id="collection">
            <SignatureCollection 
              activeCategory={activeCategory} 
              onSelectCategory={setActiveCategory} 
            />
          </div>
          <Gifting />
          <Pricing />
          <Authenticity />
        </>
      ) : (
        <PoliciesPage />
      )}
      
      <Footer onNavigate={setActivePage} />
    </div>
  );
}

export default App;
