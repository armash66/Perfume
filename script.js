// =====================
// THEME SETUP
// =====================

const bodyElement = document.body;
const savedTheme = localStorage.getItem('theme') || 'dark';
bodyElement.setAttribute('data-theme', savedTheme);

const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    // Set correct icon on load
    themeToggleBtn.querySelector('i').className =
        savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

    themeToggleBtn.addEventListener('click', () => {
        const current = bodyElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        bodyElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        themeToggleBtn.querySelector('i').className =
            next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// =====================
// MOBILE MENU TOGGLE
// =====================

const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const dropdowns = document.querySelectorAll('.nav-item.dropdown');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when a nav link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Handle dropdown menus on mobile
dropdowns.forEach(item => {
    const link = item.querySelector('.nav-link');
    link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            item.classList.toggle('active');
        }
    });
});

// =====================
// CART FUNCTIONALITY
// =====================

let cartCount = parseInt(localStorage.getItem('cartCount')) || 0;
const cartCountElement = document.querySelector('.cart-count');

if (cartCountElement) {
    cartCountElement.textContent = cartCount;
}

const cartIcon = document.querySelector('.cart-icon');
if (cartIcon) {
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        cartCount++;
        localStorage.setItem('cartCount', cartCount);
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            // Bounce animation
            cartCountElement.style.transform = 'scale(1.4)';
            setTimeout(() => { cartCountElement.style.transform = 'scale(1)'; }, 200);
        }
    });
}

// =====================
// SMOOTH SCROLL
// =====================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// =====================
// FORM SUBMISSION
// =====================

const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name    = contactForm.querySelector('input[type="text"]').value;
        const email   = contactForm.querySelector('input[type="email"]').value;
        const message = contactForm.querySelector('textarea').value;

        if (name && email && message) {
            alert(`Thank you, ${name}! Your message has been sent. We'll get back to you soon.`);
            contactForm.reset();
        } else {
            alert('Please fill in all fields.');
        }
    });
}

// =====================
// SCROLL ANIMATIONS
// =====================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = `fadeUp 0.8s ease-out forwards`;
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.collection-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.animationDelay = `${index * 0.1}s`;
    observer.observe(card);
});

// =====================
// PAGE LOAD FADE-IN
// =====================

window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// =====================
// BUTTON RIPPLE EFFECT
// =====================

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.45);
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    }
    @keyframes rippleEffect {
        to { transform: scale(4); opacity: 0; }
    }
    .cart-count {
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(rippleStyle);

document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const existingRipple = this.querySelector('.ripple');
        if (existingRipple) existingRipple.remove();

        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width  = ripple.style.height = size + 'px';
        ripple.style.left   = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top    = (e.clientY - rect.top  - size / 2) + 'px';
        ripple.classList.add('ripple');
        this.appendChild(ripple);
    });
});

console.log('LUXORA - Premium Fragrances loaded successfully!');