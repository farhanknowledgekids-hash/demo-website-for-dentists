import type { PhotoKey } from './images';
import type { ServiceId } from '../booking/types';
import { LIVE } from '../booking/config';

export interface Treatment {
  id: string;
  name: string;
  short: string;
  description: string;
  points: string[];
  visit: string;
  photo: PhotoKey;
  service: ServiceId;
}

/* Descriptions avoid promising outcomes: every plan depends on an examination. */
export const treatments: Treatment[] = [
  {
    id: 'general',
    name: 'Check-ups & general dentistry',
    short: 'The foundation of everything else',
    description:
      'A thorough look at your teeth, gums and bite, with time to talk through anything you have noticed. You leave knowing what we found and what, if anything, needs attention.',
    points: ['Examination and any X-rays you need', 'A plain-language summary of findings', 'Fillings and routine treatment'],
    visit: 'About 45 minutes',
    photo: 'checkup',
    service: 'checkup',
  },
  {
    id: 'preventive',
    name: 'Cleaning & preventive care',
    short: 'Small habits, looked after properly',
    description:
      'An unhurried hygiene appointment that cleans what brushing misses, plus practical advice on home care that fits your routine rather than an ideal one.',
    points: ['Scale and polish', 'Gum health check', 'Home-care advice you will actually use'],
    visit: 'About 40 minutes',
    photo: 'preventive',
    service: 'cleaning',
  },
  {
    id: 'cosmetic',
    name: 'Cosmetic dentistry',
    short: 'Changes that still look like you',
    description:
      'A consultation-first approach to bonding, veneers and smile refinements. We explain the options, what is realistic for your teeth, and what each choice involves before anything is decided.',
    points: ['Consultation and photographs', 'Options explained with honest trade-offs', 'Written plan and costs before treatment'],
    visit: 'Consultation, about 60 minutes',
    photo: 'cosmetic',
    service: 'cosmetic',
  },
  {
    id: 'whitening',
    name: 'Teeth whitening',
    short: 'Assessed first, never guessed',
    description:
      'Whitening is not suitable for everyone. We check your teeth and gums first, talk through sensitivity and expectations, and recommend an approach only if it makes sense for you.',
    points: ['Suitability check', 'In-clinic or take-home options discussed', 'Guidance on aftercare'],
    visit: 'Consultation, about 30 minutes',
    photo: 'whitening',
    service: 'whitening',
  },
  {
    id: 'aligners',
    name: 'Clear aligners',
    short: 'Discreet straightening, if it suits you',
    description:
      'We assess whether clear aligners are a good fit for your bite, show you a digital scan, and explain how treatment would work week to week, including what it asks of you.',
    points: ['Bite assessment and digital scan', 'Clear explanation of the process', 'Regular review appointments'],
    visit: 'Consultation, about 45 minutes',
    photo: 'aligners',
    service: 'aligners',
  },
  {
    id: 'restorative',
    name: 'Restorative dentistry',
    short: 'Repairing what has worn or broken',
    description:
      'Crowns, bridges, inlays and implant consultations, planned carefully around how you eat, speak and smile. We walk you through each option and its long-term care.',
    points: ['Crowns, bridges and inlays', 'Implant consultations', 'Options compared side by side'],
    visit: 'Consultation, about 45 minutes',
    photo: 'restorative',
    service: 'restorative',
  },
  {
    id: 'emergency',
    name: 'Emergency appointments',
    short: 'For pain, swelling or a broken tooth',
    description:
      'If something hurts or has broken, a clinic like this would keep time aside each day to see you. In a real emergency, always call the clinic directly rather than booking online.',
    points: ['Same-week appointments where possible', 'Pain relief and a clear next step', 'Follow-up planned before you leave'],
    visit: 'About 30 minutes',
    photo: 'emergency',
    service: 'emergency',
  },
];

export const principles = [
  {
    title: 'Time before treatment',
    body: 'First visits begin with a conversation, not a chair. We want to understand what brought you in and how you feel about dental care.',
  },
  {
    title: 'Everything explained',
    body: 'You see what we see. Findings, options and costs are explained in plain language, and nothing goes ahead until you are comfortable.',
  },
  {
    title: 'Comfort as standard',
    body: 'Quiet rooms, the chance to pause at any point, and a team used to caring for people who find the dentist difficult.',
  },
];

export const journey = [
  { title: 'A conversation', body: 'We start by listening: your concerns, your history, and what you would like from your teeth.' },
  { title: 'A careful examination', body: 'A thorough check of teeth, gums and bite, with images on screen so you can see what we see.' },
  { title: 'Your plan, in writing', body: 'Options explained with honest trade-offs, timings and costs, so you can decide without pressure.' },
  { title: 'Care that continues', body: 'Treatment at a pace that suits you, followed by regular reviews to keep things on track.' },
];

export interface TeamMember {
  id: 'aanya' | 'kabir' | 'meera';
  name: string;
  focus: string;
  note: string;
  photo: PhotoKey;
}

/* Fictional clinicians. Names, roles and photos are placeholders for the demo. */
export const team: TeamMember[] = [
  {
    id: 'aanya',
    name: 'Dr. Aanya Mehra',
    focus: 'General & preventive dentistry',
    note: 'Known for first visits that feel like a conversation rather than an appointment.',
    photo: 'teamAanya',
  },
  {
    id: 'kabir',
    name: 'Dr. Kabir Rao',
    focus: 'Restorative care & implant consultations',
    note: 'Plans complex treatment in small, clearly explained steps.',
    photo: 'teamKabir',
  },
  {
    id: 'meera',
    name: 'Dr. Meera Iyer',
    focus: 'Cosmetic dentistry & clear aligners',
    note: 'Believes the best cosmetic work is the kind nobody notices.',
    photo: 'teamMeera',
  },
];

export const comforts = [
  { title: 'Quiet, private rooms', body: 'Treatment rooms with daylight and closed doors, never an open-plan bay.' },
  { title: 'Pause whenever you need', body: 'Agree a signal before we begin. Raise a hand and we stop.' },
  { title: 'Headphones and blankets', body: 'Your own music, a weighted blanket, or simply silence. Ask for whatever helps.' },
  { title: 'Step-free entrance', body: 'Level access from the street, with a ground-floor treatment room.' },
];

/* Illustrative testimonials written for the demo. Not real patient reviews. */
export const testimonials = [
  {
    quote: 'I had avoided the dentist for years. Nobody rushed me, and for the first time I understood exactly what was happening and why.',
    who: 'Illustrative patient',
    context: 'First visit after a long gap',
  },
  {
    quote: 'They showed me my scan, explained three options and the cost of each, then let me go home and think. No pressure at all.',
    who: 'Illustrative patient',
    context: 'Clear aligner consultation',
  },
  {
    quote: 'Booking took a minute, the reminder was clear, and I was in the chair on time. It felt more like a calm studio than a clinic.',
    who: 'Illustrative patient',
    context: 'Routine check-up and clean',
  },
];

export const faqs = [
  {
    q: 'How do I book an appointment?',
    a: LIVE
      ? 'Use any “Book a visit” button to choose a treatment, a dentist (or no preference), a date and a time, then add your contact details. Your request goes straight to the clinic’s booking list, and the team contacts you to confirm.'
      : 'Use any “Book a visit” button to choose a treatment, a dentist (or no preference), a date and a time, then add your contact details. On this demo site the booking stays in your browser and is not sent anywhere. A real clinic would connect this flow to its own scheduling system.',
  },
  {
    q: 'What happens at a first visit?',
    a: 'Expect about 45 minutes. We begin with a short conversation about your history and any concerns, then a gentle examination and any X-rays you need. You leave with a plain-language summary and, if treatment is needed, a written plan with costs.',
  },
  {
    q: 'Can I reschedule or cancel?',
    a: 'Yes. A real clinic would let you reschedule from your confirmation email or by phone, ideally with 24 hours’ notice so the time can be offered to someone else. This demo does not send emails.',
  },
  {
    q: 'Do I need a consultation before cosmetic treatment, whitening or aligners?',
    a: 'Yes. Every cosmetic or orthodontic treatment starts with a consultation so we can check suitability, explain the options and agree a plan. Nothing is decided on the day unless you want it to be.',
  },
  {
    q: 'I get very anxious about the dentist. Can you help?',
    a: 'Tell us when you book or when you arrive. We can plan a longer first appointment, agree a stop signal, explain each step before it happens, and keep the room as quiet as you like.',
  },
  {
    q: 'Is the clinic accessible?',
    a: 'The fictional clinic is described with a step-free entrance and a ground-floor treatment room. This website is built to be usable with a keyboard and screen reader, and respects reduced-motion settings.',
  },
  {
    q: 'How can I contact the clinic?',
    a: 'Contact details on this page are demo placeholders. A real clinic would list its phone number, email and WhatsApp here. For dental pain or swelling, a real patient should always phone the clinic directly.',
  },
];
