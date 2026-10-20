import type { Dentist, Service } from './types';
import { team } from '../data/content';

export const services: Service[] = [
  { id: 'checkup', name: 'Dental check-up', duration: '45 min', detail: 'Examination, X-rays if needed, and a clear summary.' },
  { id: 'cleaning', name: 'Hygiene clean', duration: '40 min', detail: 'Scale, polish and home-care advice.' },
  { id: 'cosmetic', name: 'Cosmetic consultation', duration: '60 min', detail: 'Talk through bonding, veneers and options.' },
  { id: 'whitening', name: 'Whitening consultation', duration: '30 min', detail: 'Suitability check before any whitening.' },
  { id: 'aligners', name: 'Clear aligner consultation', duration: '45 min', detail: 'Bite assessment and digital scan.' },
  { id: 'restorative', name: 'Restorative consultation', duration: '45 min', detail: 'Crowns, bridges and implant options.' },
  { id: 'emergency', name: 'Emergency enquiry', duration: '30 min', detail: 'For pain, swelling or a broken tooth.' },
];

export const dentists: Dentist[] = team.map((m) => ({ id: m.id, name: m.name, focus: m.focus }));

export const serviceById = (id: string) => services.find((s) => s.id === id);
export const dentistById = (id: string) => dentists.find((d) => d.id === id);
