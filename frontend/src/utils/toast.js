// Custom luxury toast notifications utility for Decant Atelier
export const showToast = (message, type = 'success') => {
  // Find or create toast container
  let container = document.getElementById('decant-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'decant-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '30px';
    container.style.right = '30px';
    container.style.zIndex = '99999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.pointerEvents = 'auto';
  toast.style.padding = '14px 24px';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '400px';
  toast.style.fontFamily = "'Inter', sans-serif";
  toast.style.fontSize = '0.75rem';
  toast.style.fontWeight = '500';
  toast.style.textTransform = 'uppercase';
  toast.style.letterSpacing = '1.5px';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
  toast.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  
  // Luxury branding color styles
  if (type === 'error') {
    toast.style.background = '#8C2A2A'; // deep burgundy
    toast.style.color = '#FEFCF9';
    toast.style.border = '1px solid rgba(255,255,255,0.1)';
  } else if (type === 'warning') {
    toast.style.background = '#B08A50'; // warm gold
    toast.style.color = '#FEFCF9';
    toast.style.border = '1px solid rgba(255,255,255,0.1)';
  } else {
    toast.style.background = '#1C1B18'; // luxury charcoal
    toast.style.color = '#FEFCF9';
    toast.style.border = '1px solid rgba(255,255,255,0.15)';
  }

  // Inject content with custom premium diamond symbol
  toast.innerText = '✦ ' + message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Fade and clean up
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
      if (container.children.length === 0 && container.parentNode) {
        document.body.removeChild(container);
      }
    }, 400);
  }, 3500);
};
