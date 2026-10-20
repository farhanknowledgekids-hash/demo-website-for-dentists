/**
 * Every detail below is FICTIONAL demo content. Replace with the real clinic's
 * verified information before using this design for an actual practice.
 */
export const clinic = {
  name: 'Lumière Dental',
  wordmark: 'LUMIÈRE',
  area: 'Bandra West, Mumbai',
  addressLines: ['Sample address: 00 Example Lane', 'Bandra West, Mumbai 400050'],
  phoneDisplay: '+91 22 0000 0000',
  email: 'hello@lumiere-dental.example',
  hours: [
    { days: 'Monday – Friday', time: '9:30 – 19:30' },
    { days: 'Saturday', time: '10:00 – 17:00' },
    { days: 'Sunday', time: 'Closed' },
  ],
} as const;

export const navLinks = [
  { href: '#treatments', label: 'Treatments' },
  { href: '#approach', label: 'Our approach' },
  { href: '#team', label: 'The team' },
  { href: '#experience', label: 'Patient experience' },
  { href: '#contact', label: 'Contact' },
] as const;
