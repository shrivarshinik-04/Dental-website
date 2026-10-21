// ===================== Services =====================
// Each service has a section on /services (anchor = slug).
export const services = [
  { id: 1, title: 'Dental Implants', slug: 'dental-implants', summary: 'Replacing missing teeth with a titanium post and a crown that looks and works like a natural tooth.' },
  { id: 2, title: 'Root Canal Treatment', slug: 'root-canal-treatment', summary: 'Removing infected pulp, cleaning and sealing the tooth so it can be kept.' },
  { id: 3, title: 'Cavity Filling', slug: 'cavity-filling', summary: 'Removing decay and restoring the tooth with a tooth-coloured filling.' },
  { id: 4, title: 'Orthodontics', slug: 'orthodontics', summary: 'Straightening teeth and correcting the bite with braces or aligners.' },
  { id: 5, title: 'Teeth Whitening', slug: 'teeth-whitening', summary: 'Professional whitening to lighten stains and discolouration.' },
  { id: 6, title: 'Wisdom Tooth Surgery', slug: 'wisdom-tooth-surgery', summary: 'Assessing and removing wisdom teeth that are impacted or causing problems.' },
  { id: 7, title: 'Crown & Bridges', slug: 'crown-and-bridges', summary: 'Covering damaged teeth with crowns and replacing missing teeth with bridges.' },
  { id: 8, title: 'Pediatric Dentistry', slug: 'pediatric-dentistry', summary: 'Check-ups and gentle treatment for children, with a parent or guardian present.' }
].map((service) => ({ ...service, href: `/services#${service.slug}` }));

// ===================== Useful Links =====================
export const usefulLinks = [
  { id: 1, title: 'Home', href: '/' },
  { id: 2, title: 'About Us', href: '/about' },
  { id: 3, title: 'Services', href: '/services' },
  { id: 7, title: 'Gallery', href: '/gallery' },
  { id: 4, title: 'Contact Us', href: '/contact' },
  { id: 5, title: 'Book Appointment', href: '/book-appointment' },
  { id: 6, title: 'Sitemap', href: '/sitemap' }
];

// ===================== Gallery =====================
// Stock photos (Unsplash License) served from /public/img/gallery; see CREDITS.md there.
export const gallery = [
  { id: 1, src: '/img/gallery/treatment-room.webp', title: 'Treatment room', alt: 'Bright dental treatment room with a patient chair, overhead light and cabinets', photographer: 'Benyamin Bohlouli', source: 'https://unsplash.com/photos/e7MJLM5VGjY' },
  { id: 2, src: '/img/gallery/waiting-room.webp', title: 'Waiting area', alt: 'Waiting area wall with an olive tree and a sign reading "Smile like you mean it"', photographer: 'Amy Vosters', source: 'https://unsplash.com/photos/pxOQ-P97sA8' },
  { id: 3, src: '/img/gallery/dental-chair.webp', title: 'Dental chair', alt: 'Orange dental chair with an overhead lamp in a sunlit surgery', photographer: 'Atikah Akhtar', source: 'https://unsplash.com/photos/XJptUS8nbhs' },
  { id: 4, src: '/img/gallery/consultation.webp', title: 'Consultation', alt: 'Dentist talking with a smiling patient seated in the dental chair', photographer: 'Harold Hisona', source: 'https://unsplash.com/photos/Bg81yWKZlMg' },
  { id: 5, src: '/img/gallery/instruments.webp', title: 'Sterile instruments', alt: 'Gloved hand holding a dental mirror, probe and tweezers', photographer: 'Katarzyna Zygnerska', source: 'https://unsplash.com/photos/98eodnv1abo' },
  { id: 6, src: '/img/gallery/implant-model.webp', title: 'Implant model', alt: 'Model showing a dental implant between two natural teeth', photographer: 'Jonathan Borba', source: 'https://unsplash.com/photos/W9YEY6G8LVM' },
  { id: 7, src: '/img/gallery/procedure.webp', title: 'Treatment in progress', alt: 'Dentist and assistant in protective gowns treating a patient', photographer: 'Jonathan Borba', source: 'https://unsplash.com/photos/hl6uG9cHW5A' },
  { id: 8, src: '/img/gallery/x-ray-review.webp', title: '3D scan review', alt: 'Dentist reviewing 3D dental scans on a light box', photographer: 'Jonathan Borba', source: 'https://unsplash.com/photos/v_2FRXEba94' }
];

// ===================== Privacy & Legal (DPDP Act 2023) =====================
export const legalLinks = [
  { id: 1, title: 'Privacy Policy', href: '/privacy-policy' },
  { id: 2, title: 'Cookie Policy', href: '/cookie-policy' },
  { id: 3, title: 'Your Data Rights', href: '/data-rights' },
  { id: 4, title: 'Raise a Grievance', href: '/grievance' }
];

// ===================== About List =====================
export const aboutList1 = [
  ['sit amet consectetur adipisicing elit quam.', 'Beatae esse distinctio modi aperiam!'],
  ['exercitationem ipsa iste quam, molestiae.', 'architecto atque numquam.']
];

// ===================== Stats / Facts =====================
export const factList1 = [
  {
    id: 1,
    number: 20000,
    title: "Patient's Treated",
    src: '/img/icons/patient-treatment.webp'
  },
  {
    id: 2,
    number: 13000,
    title: 'Root Canal Treatment',
    src: '/img/icons/root-canal-treatment.webp'
  },
  {
    id: 3,
    number: 350,
    title: 'Dental Implants',
    src: '/img/icons/dental-implants.webp'
  }
];

export const factList2 = [
  {
    id: 4,
    number: 300,
    title: 'Orthodontic Treatment',
    src: '/img/icons/orthodontic-treatments.webp'
  },
  {
    id: 5,
    number: 1000,
    title: 'Smile Makeovers',
    src: '/img/icons/smile-mackovers.webp'
  },
  {
    id: 6,
    number: 4000,
    title: 'Pulpectomy For Pediatric Patients',
    src: '/img/icons/pulpectomy-for-pediatric-patients.webp'
  }
];
