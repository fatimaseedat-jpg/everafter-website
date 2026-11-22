import { mountGallery } from './gallery.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const enquiryDialog = document.querySelector('#enquiry-dialog');
const serviceDialog = document.querySelector('#service-dialog');
const enquiryForm = document.querySelector('#enquiry-form');
const enquiryReview = document.querySelector('#enquiry-review');
const enquiryTitle = document.querySelector('#enquiry-title');
const eventDate = document.querySelector('#event-date');
let returnFocus;

function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
  navigation.classList.toggle('is-open', open);
}

menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!header.contains(event.target)) setMenu(false);
});
window.matchMedia('(min-width: 701px)').addEventListener('change', () => setMenu(false));

const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
document.querySelector('#year').textContent = new Date().getFullYear();

const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
eventDate.min = localDate;

function openDialog(dialog, trigger) {
  returnFocus = trigger || document.activeElement;
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

function closeDialogOnBackdrop(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]')) {
      document.body.classList.remove('dialog-open');
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
  });
}

function showEnquiryForm() {
  enquiryForm.hidden = false;
  enquiryReview.hidden = true;
  enquiryTitle.textContent = 'Tell us your little idea.';
}

function openEnquiry(occasion, trigger) {
  setMenu(false);
  showEnquiryForm();
  if (occasion) {
    const input = [...enquiryForm.elements.occasion].find((radio) => radio.value === occasion);
    if (input) input.checked = true;
  }
  openDialog(enquiryDialog, trigger);
}

document.querySelectorAll('[data-enquire]').forEach((button) => {
  button.addEventListener('click', () => openEnquiry(button.dataset.enquire || undefined, button));
});
document.querySelector('[data-close-enquiry]').addEventListener('click', () => enquiryDialog.close());
closeDialogOnBackdrop(enquiryDialog);
closeDialogOnBackdrop(serviceDialog);

const services = {
  weddings: {
    title: 'Your beautiful beginning.',
    note: 'Weddings & destination weddings',
    description: 'An intimate ceremony, a room full of your favourite people, or a celebration somewhere extraordinary. We bring your vision together so you can be fully present for every part of it.',
    image: 'assets/images/wedding.jpg',
    alt: 'An outdoor wedding aisle with white floral arrangements',
    occasion: 'Wedding',
    inclusions: ['Full, partial or on-the-day planning', 'Venue sourcing & supplier coordination', 'Event design, florals & thoughtful styling'],
  },
  celebrations: {
    title: 'More reasons to come together.',
    note: 'Birthdays, anniversaries & bridal showers',
    description: 'Some moments deserve more than a date in the diary. From a milestone birthday to a beautiful bridal shower, we create a celebration that feels personal, joyful and entirely yours.',
    image: 'assets/images/celebration.jpg',
    alt: 'Children laughing together at a birthday party',
    occasion: 'Celebration',
    inclusions: ['A personal event concept & styling', 'Venue & supplier management', 'Planning & on-the-day coordination'],
  },
  corporate: {
    title: 'Good people. Great connections.',
    note: 'Corporate events & brand occasions',
    description: 'A gala, a private dinner, a branded activation. We balance creative thinking with careful execution to create an occasion that reflects your business and brings people together.',
    image: 'assets/images/corporate.jpg',
    alt: 'Microphones arranged for a corporate event',
    occasion: 'Corporate event',
    inclusions: ['Event concept, design & production', 'Venue sourcing & supplier management', 'Full-service planning & on-the-day management'],
  },
  styling: {
    title: 'The details make the feeling.',
    note: 'Décor, florals & event accessories',
    description: 'The flowers, the palette, the little finishing touches. Our event design and styling brings your ideas into focus with a considered collection of décor, floral concepts and accessories.',
    image: 'assets/images/bride.jpg',
    alt: 'Turquoise bridal flowers with thoughtful decorative details',
    occasion: 'Décor & styling',
    inclusions: ['Personalised event design & styling', 'Luxury décor & floral concepts', 'Curated event accessories'],
  },
};
let selectedService;
let serviceTrigger;

document.querySelectorAll('[data-service]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedService = services[button.dataset.service];
    if (!selectedService) return;
    serviceTrigger = button;
    const image = document.querySelector('#service-image');
    image.src = selectedService.image;
    image.alt = selectedService.alt;
    document.querySelector('#service-title').textContent = selectedService.title;
    document.querySelector('#service-note').textContent = selectedService.note;
    document.querySelector('#service-description').textContent = selectedService.description;
    document.querySelector('#service-inclusions').replaceChildren(...selectedService.inclusions.map((inclusion) => {
      const item = document.createElement('li');
      item.textContent = inclusion;
      return item;
    }));
    openDialog(serviceDialog, button);
  });
});
document.querySelector('[data-close-service]').addEventListener('click', () => serviceDialog.close());
document.querySelector('#service-enquire').addEventListener('click', () => {
  serviceDialog.close();
  openEnquiry(selectedService.occasion, serviceTrigger);
});

enquiryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(enquiryForm);
  const name = String(data.get('name')).trim();
  const email = String(data.get('email')).trim();
  // Native validation checks email/date; reject whitespace-only names as well.
  const nameInput = enquiryForm.elements.namedItem('name');
  nameInput.setCustomValidity(name ? '' : 'Please enter your name.');
  if (!enquiryForm.reportValidity()) return;
  const occasion = String(data.get('occasion'));
  const dateValue = String(data.get('date'));
  const date = dateValue ? new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${dateValue}T12:00:00`)) : 'Still finding the perfect date';
  const guests = String(data.get('guests'));
  const vision = String(data.get('vision')).trim();
  const summary = [
    `Occasion: ${occasion}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Date: ${date}`,
    `Guests: ${guests}`,
    ...(vision ? ['', `Our little idea: ${vision}`] : []),
  ].join('\n');
  const message = `Hello Ever After Events! I'd love to plan something beautiful.\n\n${summary}`;
  document.querySelector('#enquiry-summary').textContent = summary;
  document.querySelector('#enquiry-whatsapp').href = `https://wa.me/27715047936?text=${encodeURIComponent(message)}`;
  document.querySelector('#enquiry-email').href = `mailto:info@everafterevents.online?subject=${encodeURIComponent(`${occasion} enquiry — ${name}`)}&body=${encodeURIComponent(message)}`;
  enquiryForm.hidden = true;
  enquiryReview.hidden = false;
  enquiryTitle.textContent = 'A beautiful beginning.';
  enquiryDialog.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  document.querySelector('#enquiry-whatsapp').focus({ preventScroll: true });
});
enquiryForm.elements.namedItem('name').addEventListener('input', (event) => event.target.setCustomValidity(''));
document.querySelector('#edit-enquiry').addEventListener('click', () => {
  showEnquiryForm();
  enquiryForm.elements.namedItem('name').focus({ preventScroll: true });
});

mountGallery();
// Keep the page still while a photo is open, including on touch devices.
const galleryDialog = document.querySelector('#gallery-dialog');
new MutationObserver(() => {
  document.body.classList.toggle('dialog-open', Boolean(document.querySelector('dialog[open]')));
}).observe(galleryDialog, { attributes: true, attributeFilter: ['open'] });

// The illustrated opening enhances ordinary document flow; the poster stays useful without WebGL.
const opening = document.querySelector('.world-experience');
import('./world.js').then(({ mountCelebrationWorld }) => mountCelebrationWorld(opening)).catch(() => {
  opening.classList.remove('world-ready', 'world-enhanced');
});
