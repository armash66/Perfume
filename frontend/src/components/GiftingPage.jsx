import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GiftingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const waitlistRef = useRef(null);

  const scrollToWaitlist = (e) => {
    if (e) e.preventDefault();
    waitlistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleExplore = (e) => {
    e.preventDefault();
    window.location.hash = 'collection';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setStatus('submitting');
    
    // Simulate luxury brand API delay
    setTimeout(() => {
      try {
        const currentWaitlist = JSON.parse(localStorage.getItem('gifting_waitlist') || '[]');
        if (!currentWaitlist.includes(email)) {
          currentWaitlist.push(email);
          localStorage.setItem('gifting_waitlist', JSON.stringify(currentWaitlist));
        }
        setStatus('success');
        setMessage('Thank you for joining our exclusive circle. We will notify you when the collection unveils.');
        setEmail('');
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    }, 1500);
  };

  // Luxury feature cards metadata with custom minimalist thin-line gold SVGs
  const features = [
    {
      title: 'Gift Discovery Sets',
      description: 'Explore the olfactory journey with our hand-poured premium sample sets.',
      icon: (
        <svg className="w-6 h-6 text-amber-700 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        </svg>
      )
    },
    {
      title: 'Luxury Gift Wrapping',
      description: 'Encased in signature textured linen boxes wrapped with black silk ribbon.',
      icon: (
        <svg className="w-6 h-6 text-amber-700 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="8" width="18" height="14" rx="2" />
          <path d="M12 5a3 3 0 10-3 3h3zm0 0a3 3 0 113 3h-3zm0 3v14M3 12h18" />
        </svg>
      )
    },
    {
      title: 'Personalized Gift Notes',
      description: 'Add a bespoke touch with a handwritten wax-sealed calligraphic card.',
      icon: (
        <svg className="w-6 h-6 text-amber-700 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      )
    },
    {
      title: 'Corporate Gifting',
      description: 'Elegant presentations tailored for high-end professional and executive networks.',
      icon: (
        <svg className="w-6 h-6 text-amber-700 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    },
    {
      title: 'Seasonal Collections',
      description: 'Curated seasonal selections celebrating the essence of global celebrations.',
      icon: (
        <svg className="w-6 h-6 text-amber-700 stroke-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
  ];

  // Animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="bg-[#F8F6F2] text-[#1C1B18] min-h-screen font-body selection:bg-amber-700 selection:text-white">
      
      {/* Main Campaign Container */}
      <main className="w-full">

        {/* 1. Hero Section Wrapper */}
        <section className="px-5 md:px-8 lg:px-12 max-w-[1600px] mx-auto pt-24 lg:pt-32">
          <motion.div 
            className="w-full"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Full-width editorial image container */}
            <motion.div 
              className="w-full h-[50vh] md:h-[75vh] xl:h-[85vh] rounded-[40px] overflow-hidden shadow-lg relative z-10 border border-neutral-200/20 bg-white"
              variants={itemVariants}
            >
              <img 
                src="/images/luxury_gifting_hero.png" 
                alt="Luxury fragrance discovery set campaign" 
                className="w-full h-full object-cover object-center scale-100 hover:scale-[1.02] transition-transform duration-[1200ms] ease-out select-none"
              />
            </motion.div>

            {/* Overlapping floating content card */}
            <motion.div 
              className="mt-[-80px] sm:mt-[-120px] md:mt-[-150px] relative z-20 px-4 w-full"
              variants={itemVariants}
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 md:p-12 lg:p-16 max-w-[720px] mx-auto text-center border border-neutral-100/50">
                
                {/* Coming Soon Eyebrow */}
                <span className="inline-block rounded-full border border-amber-600 px-4 py-1.5 tracking-[0.25em] uppercase text-amber-700 text-[10px] md:text-xs font-semibold mb-6 select-none">
                  COMING SOON
                </span>

                {/* Sub-label */}
                <span className="block text-xs font-bold tracking-[0.35em] uppercase text-neutral-400 mb-3 select-none">
                  DECANT ATELIER — L'ART DU CADEAU
                </span>

                {/* Campaign Main Title */}
                <h1 className="font-heading font-light text-4xl md:text-5xl lg:text-6xl xl:text-7.5xl text-neutral-900 leading-tight mb-6 max-w-xl mx-auto">
                  The Art of Fragrance Gifting
                </h1>

                {/* Campaign Description */}
                <p className="max-w-xl text-neutral-600 font-light leading-relaxed text-sm md:text-base mb-10 mx-auto">
                  Thoughtfully curated fragrance gifts designed to celebrate every occasion. From discovery sets and personalized notes to luxury wrapping and bespoke gifting experiences, our collection is crafted to leave a lasting impression.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap justify-center items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={handleExplore}
                    className="w-full sm:w-auto bg-[#1C1B18] font-body text-xs font-semibold tracking-widest uppercase py-4 px-8 rounded-full cursor-pointer hover:bg-amber-700 transition-all duration-500 shadow-md hover:shadow-lg select-none"
                    style={{ color: '#FEFCF9' }}
                  >
                    Discover Fragrances
                  </button>
                  
                  {/* <button 
                    onClick={}
                    className="w-full sm:w-auto bg-transparent text-[#1C1B18] border border-neutral-300 font-body text-xs font-semibold tracking-widest uppercase py-4 px-8 rounded-full cursor-pointer hover:bg-[#1C1B18] hover:text-[#FEFCF9] hover:border-[#1C1B18] transition-all duration-500 select-none"
                  >
                    Discover Fragrances
                  </button> */}
                </div>

              </div>
            </motion.div>

          </motion.div>
        </section>

        {/* 2. Feature Section (below overlapping card) */}
        <section className="bg-[#FAF8F5] border-t border-b border-neutral-200/30 mt-16 md:mt-24 py-20 lg:py-28 px-5 md:px-8 lg:px-12">
          <div className="max-w-[1600px] mx-auto">
            
            {/* Header */}
            <div className="text-center mb-16 select-none">
              <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-neutral-400 font-body block mb-3">EXQUISITE HIGHLIGHTS</span>
              <h2 className="font-heading font-light text-3xl md:text-4xl lg:text-5xl text-neutral-800">What’s Coming</h2>
            </div>

            {/* Grid of cards */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-5 lg:gap-6 w-full"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={cardContainerVariants}
            >
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  className="group flex flex-col justify-start items-center text-center p-8 bg-white border border-neutral-100 rounded-3xl hover:-translate-y-2 hover:shadow-xl transition-all duration-500 ease-out select-none"
                  variants={cardVariants}
                >
                  <div className="w-14 h-14 rounded-full border border-neutral-100 flex items-center justify-center mb-6 bg-[#F8F6F2] group-hover:bg-amber-50 group-hover:border-amber-200/50 transition-all duration-500 shadow-inner">
                    {feature.icon}
                  </div>
                  
                  <h3 className="font-heading font-medium text-lg text-neutral-800 mb-3 group-hover:text-amber-700 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="font-body font-light text-xs md:text-sm leading-relaxed text-neutral-500">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </section>

        {/* 3. Dedicated Waitlist Section */}
        {/* <section 
          ref={waitlistRef}
          id="waitlist-section"
          className="py-20 lg:py-28 px-5 md:px-8 lg:px-12 max-w-[1600px] mx-auto text-center"
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            
            <span className="text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase text-amber-700 font-body mb-4 select-none block">
              EXCLUSIVE ACCESS
            </span>
            
            <h2 className="font-heading font-light text-3xl md:text-4xl lg:text-5xl text-neutral-900 mb-4 select-none">
              Join the Waitlist
            </h2>
            
            <p className="font-body font-light text-sm md:text-base text-neutral-600 leading-relaxed mb-10 max-w-md">
              Be the first to experience our curated fragrance selections, bespoke packaging, and seasonal releases.
            </p>

            <div className="w-full max-w-md px-2">
              <AnimatePresence mode="wait">
                {status !== 'success' ? (
                  <motion.form 
                    key="waitlist-form-redesign"
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row items-center gap-3 w-full bg-white p-2 rounded-3xl sm:rounded-full border border-neutral-200 shadow-sm focus-within:border-amber-600/50 focus-within:shadow-md transition-all duration-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === 'error') setStatus('idle');
                      }}
                      disabled={status === 'submitting'}
                      className="w-full bg-transparent px-5 py-3 text-sm font-body font-light tracking-wide outline-none text-[#1C1B18] placeholder-neutral-400 focus:placeholder-neutral-500 rounded-full text-center sm:text-left"
                      required
                    />
                    
                    <button 
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full sm:w-auto bg-[#1C1B18] font-body text-xs font-semibold tracking-widest uppercase py-3.5 px-8 rounded-full cursor-pointer hover:bg-amber-700 transition-all duration-500 disabled:opacity-50 select-none whitespace-nowrap inline-flex items-center justify-center min-h-[46px] shadow-sm"
                      style={{ color: '#FEFCF9' }}
                    >
                      {status === 'submitting' ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : 'Notify Me'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="success-message-redesign"
                    className="bg-white p-8 rounded-3xl border border-amber-600/30 shadow-md text-center flex flex-col items-center justify-center w-full"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-12 h-12 rounded-full border border-amber-600/30 flex items-center justify-center mb-4 bg-amber-50">
                      <svg className="w-6 h-6 text-amber-700 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    
                    <p className="font-body text-xs font-semibold uppercase tracking-[0.25em] text-amber-700 mb-2">Access Reserved</p>
                    <p className="font-body font-light text-sm text-neutral-700 leading-relaxed max-w-sm">
                      {message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Feedback */}
              {/* {status === 'error' && (
                <motion.p 
                  className="text-red-600 font-body text-xs tracking-wider mt-3 select-none"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {message}
                </motion.p>
              )}

            </div>

          </div>
        </section> */}

      </main>

      {/* 4. Editorial Footer Note */}
      {/* <footer className="w-full border-t border-neutral-200/30 py-8 px-5 text-center select-none bg-[#FAF8F5]">
        <p className="font-body text-[10px] md:text-xs font-light tracking-[0.2em] text-neutral-400 uppercase max-w-4xl mx-auto leading-relaxed">
          Launching soon for festive gifting, special occasions, and fragrance enthusiasts.
        </p>
      </footer> */}

      {/* Tailwind Responsive Title Limitation Overrides */}
      <style>{`
        .text-7-5xl {
          font-size: clamp(2.25rem, 5.5vw, 4.25rem); /* Prevents over-sizing */
        }
      `}</style>

    </div>
  );
}
