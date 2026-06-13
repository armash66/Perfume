import midnightEleganceImg from '../../assets/midnight_elegance.png';
import goldenHourImg from '../../assets/golden_hour.png';
import velvetCrownImg from '../../assets/velvet_crown.png';
import crystalSerenityImg from '../../assets/crystal_serenity.png';

export const collectionsData = [
  {
    id: 'midnight-elegance',
    name: 'Midnight Elegance',
    tagline: 'Captivating & Sophisticated',
    description: 'A dark, magnetic blend of natural Cambodian oud, warm black amber, and creamy Mysore sandalwood. Perfect for evening sophistication.',
    price: '185',
    category: 'Niche Oud',
    image: midnightEleganceImg,
    notes: ['Cambodian Oud', 'Black Amber', 'Mysore Sandalwood'],
    pyramid: {
      top: 'Cardamom, Cinnamon Bark, Saffron',
      heart: 'Cambodian Oud, Midnight Rose, Tuscan Leather',
      base: 'Black Amber, Mysore Sandalwood, Patchouli, Vetiver'
    },
    sizes: [
      { size: '2ml Sample', price: '15', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '32', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '58', label: 'Best value' },
      { size: '30ml Decant', price: '145', label: 'Collector size' }
    ]
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    tagline: 'Warm & Radiating',
    description: 'Bask in warm Madagascar vanilla, rich golden honey, and rare exotic floral blooms. A luxurious daily companion that glows on your skin.',
    price: '165',
    category: 'Gourmand Floral',
    image: goldenHourImg,
    notes: ['Madagascar Vanilla', 'Wild Honey', 'Ylang-Ylang'],
    pyramid: {
      top: 'Calabrian Bergamot, Sweet Neroli, Wild Honey',
      heart: 'Madagascar Vanilla, Jasmine Grandiflorum, Ylang-Ylang',
      base: 'Golden Amber, White Musk, Siam Benzoin, Sandalwood'
    },
    sizes: [
      { size: '2ml Sample', price: '12', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '28', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '48', label: 'Best value' },
      { size: '30ml Decant', price: '120', label: 'Collector size' }
    ]
  },
  {
    id: 'velvet-crown',
    name: 'Velvet Crown',
    tagline: 'Intoxicating & Royal',
    description: 'A royal affair of damask rose petals, warm musk, and polished Tuscan leather. Creates a mysterious, enveloping luxury aura.',
    price: '195',
    category: 'Luxury Leather',
    image: velvetCrownImg,
    notes: ['Damask Rose', 'Tuscan Leather', 'Warm Musk'],
    pyramid: {
      top: 'Saffron, Black Pepper, Red Currant',
      heart: 'Damask Rose, Red Carnation, Violet Leaf, Tuscan Leather',
      base: 'Warm Musk, Cedarwood, Amberwood, Creamy Amber'
    },
    sizes: [
      { size: '2ml Sample', price: '16', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '36', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '64', label: 'Best value' },
      { size: '30ml Decant', price: '155', label: 'Collector size' }
    ]
  },
  {
    id: 'crystal-serenity',
    name: 'Crystal Serenity',
    tagline: 'Fresh & Crisp',
    description: 'Crisp sun-ripened citrus, sparkling marine accords, and hints of white musk. Refreshingly elegant and clean for daytime wear.',
    price: '155',
    category: 'Fresh Marine',
    image: crystalSerenityImg,
    notes: ['Calabrian Bergamot', 'Sea Salt Accord', 'White Musk'],
    pyramid: {
      top: 'Calabrian Bergamot, Lemon Zest, Grapefruit',
      heart: 'Sea Salt Accord, Water Lily, Jasmine Tea, Mint',
      base: 'White Musk, Ambergris, Vetiver, Cedar'
    },
    sizes: [
      { size: '2ml Sample', price: '10', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '24', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '42', label: 'Best value' },
      { size: '30ml Decant', price: '110', label: 'Collector size' }
    ]
  },
  {
    id: 'imperial-oud',
    name: 'Imperial Oud',
    tagline: 'Regal & Majestic',
    description: 'A majestic statement blending precious dark oudwood, smokey tobacco leaf, and spiced labdanum. Refined power in a bottle.',
    price: '220',
    category: 'Majestic Oud',
    image: midnightEleganceImg,
    notes: ['Dark Oudwood', 'Tobacco Leaf', 'Spiced Labdanum'],
    pyramid: {
      top: 'Pink Pepper, Bergamot, Saffron',
      heart: 'Dark Oudwood, Turkish Rose, Tobacco Leaf, Incense',
      base: 'Spiced Labdanum, Vetiver, Mysore Sandalwood, Patchouli'
    },
    sizes: [
      { size: '2ml Sample', price: '18', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '40', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '72', label: 'Best value' },
      { size: '30ml Decant', price: '175', label: 'Collector size' }
    ]
  },
  {
    id: 'rose-nectar',
    name: 'Rose Nectar',
    tagline: 'Soft & Seductive',
    description: 'Turkish rose blooms combined with sweet peach nectar and warm cashmere woods. A soft, whispering romantic fragrance.',
    price: '175',
    category: 'Romantic Floral',
    image: velvetCrownImg,
    notes: ['Turkish Rose', 'Peach Nectar', 'Cashmere Woods'],
    pyramid: {
      top: 'White Peach, Green Mandarin, Bergamot',
      heart: 'Turkish Rose, Jasmine Sambac, Pink Peony',
      base: 'Cashmere Woods, White Musk, Amberwood, Vanilla Pods'
    },
    sizes: [
      { size: '2ml Sample', price: '14', label: 'Perfect for testing' },
      { size: '5ml Travel Spray', price: '30', label: 'Popular choice' },
      { size: '10ml Luxury Atomizer', price: '54', label: 'Best value' },
      { size: '30ml Decant', price: '135', label: 'Collector size' }
    ]
  }
];
