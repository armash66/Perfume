import './CategoriesPage.css';

const categoriesData = [
  {
    id: 'summer',
    title: 'Summer Perfumes',
    desc: 'Discover fresh, citrusy, and aquatic fragrances perfect for hot Indian summers. Explore summer perfume...',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'winter',
    title: 'Winter Perfumes',
    desc: 'Explore warm, spicy, vanilla, and woody fragrances that perform exceptionally well in colder weather. Find th...',
    image: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&w=600&q=80'
  },
  // {
  //   id: 'office',
  //   title: 'Office Perfumes',
  //   desc: 'Professional, versatile, and crowd-pleasing fragrances ideal for work environments. Discover office-safe...',
  //   image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80'
  // },
  // {
  //   id: 'gym',
  //   title: 'Gym Perfumes',
  //   desc: 'Stay fresh and confident through every workout with clean, energetic, and refreshing fragrances. Explore...',
  //   image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80'
  // },
  // {
  //   id: 'datenight',
  //   title: 'Date Night Perfumes',
  //   desc: 'Turn heads with seductive and memorable fragrances crafted for special moments. Explore date night...',
  //   image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80'
  // },
  // {
  //   id: 'party',
  //   title: 'Party Perfumes',
  //   desc: 'Bold, attention-grabbing scents designed to stand out in any crowd. Find powerful party perfume decants...',
  //   image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  // },
  {
    id: 'her',
    title: 'For Her',
    desc: "Whether she's into soft florals, sweet notes, or bold statement scents, this is where you find a gift that fee...",
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'him',
    title: 'For Him',
    desc: 'From fresh everyday scents to bold, attention-grabbing fragrances, find something that actually...',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'bestsellers',
    title: 'Best Sellers',
    desc: 'Discover our most popular fragrances that never go out of style. Find the scents that keep customers coming back for more.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  }
];

export default function CategoriesPage({ onSelectCategory }) {
  return (
    <div className="categories-page">
      <div className="categories-bg-grid" />
      
      <div className="categories-container">
        <div className="categories-header">
          <h1 className="categories-title" >Shop by Category</h1>
          <p className="categories-subtitle">Curated collections for every preference</p>
          <div className="categories-divider" />
        </div>
        
        <div className="categories-grid">
          {categoriesData.map((category) => (
            <div 
              key={category.id} 
              className={`category-card category-${category.id}`}
              onClick={() => onSelectCategory(category.id)}
            >
              <img 
                src={category.image} 
                alt={category.title} 
                className="category-card-img" 
                loading="lazy"
              />
              <div className="category-card-overlay" />
              
              <div className="category-card-content">
                <h2 className="category-card-title">{category.title}</h2>
                <p className="category-card-desc">{category.desc}</p>
                <span className="category-card-cta">
                  Browse Collection &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
