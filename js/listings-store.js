// Public listings are read from the BBTT app. No browser-local admin inventory.
window.BB_LISTINGS = [];

function getListings() {
  return window.BB_LISTINGS || [];
}

async function loadPublicListings() {
  try {
    const response = await fetch('https://bbtt-app.vercel.app/api/public-objects', { cache: 'no-store' });
    if (!response.ok) throw new Error('Kunne ikke hente tilgjengelige objekter.');
    const payload = await response.json();
    window.BB_LISTINGS = Array.isArray(payload.listings) ? payload.listings : [];
    window.BB_LISTINGS_ERROR = '';
  } catch (error) {
    window.BB_LISTINGS = [];
    window.BB_LISTINGS_ERROR = 'Objektene kunne ikke lastes akkurat nå. Prøv igjen senere.';
    console.error('BBTT public listings:', error);
  }
  document.dispatchEvent(new Event('bb:listings-loaded'));
}
document.addEventListener('DOMContentLoaded', loadPublicListings);
