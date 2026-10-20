/**
 * Photography — bundled with the site, so photos show everywhere (offline, file previews, any host).
 * Source: Unsplash (https://unsplash.com/license), pre-cropped and compressed to WebP.
 *
 * To use a clinic's own photos, replace the files in src/assets/photos/ (keep the names),
 * or point an import below at a new file, then run `npm run build`.
 */
import hero from '../assets/photos/hero.webp';
import consultation from '../assets/photos/consultation.webp';
import checkup from '../assets/photos/checkup.webp';
import preventive from '../assets/photos/preventive.webp';
import cosmetic from '../assets/photos/cosmetic.webp';
import whitening from '../assets/photos/whitening.webp';
import aligners from '../assets/photos/aligners.webp';
import restorative from '../assets/photos/restorative.webp';
import emergency from '../assets/photos/emergency.webp';
import hallway from '../assets/photos/hallway.webp';
import operatory from '../assets/photos/operatory.webp';
import closing from '../assets/photos/closing.webp';
import teamAanya from '../assets/photos/teamAanya.webp';
import teamKabir from '../assets/photos/teamKabir.webp';
import teamMeera from '../assets/photos/teamMeera.webp';

export interface Photo {
  src: string;
  alt: string;
  /** focal point (0–1), used as object-position when the frame crops differently */
  fx?: number;
  fy?: number;
}

const p = (src: string, alt: string, fx = 0.5, fy = 0.5): Photo => ({ src, alt, fx, fy });

export const photos = {
  hero: p(hero, 'A woman with dark curly hair laughing in soft daylight, head tilted back', 0.5, 0.62),
  consultation: p(consultation, 'A dentist sitting beside a patient in a bright treatment room, talking before an examination'),
  checkup: p(checkup, 'A dentist pointing to an X-ray on a screen while the patient looks on from the chair'),
  preventive: p(preventive, 'Bamboo toothbrushes in a glass beside sprigs of eucalyptus'),
  cosmetic: p(cosmetic, 'Close-up of a natural, relaxed smile'),
  whitening: p(whitening, 'Side profile of a woman smiling softly'),
  aligners: p(aligners, 'A person fitting a clear aligner over their teeth'),
  restorative: p(restorative, 'A gloved hand holding a model of a dental implant and crown'),
  emergency: p(emergency, 'A calm, daylight-filled treatment room with a white dental chair'),
  hallway: p(hallway, 'A quiet corridor with panelled walls, framed botanical prints and warm lamplight'),
  operatory: p(operatory, 'A bright, uncluttered treatment room with large windows'),
  closing: p(closing, 'A smiling woman with silver hair standing among green leaves', 0.45, 0.3),
  teamAanya: p(teamAanya, 'Portrait of a woman in a white coat against a dark background (sample profile photo)', 0.5, 0.25),
  teamKabir: p(teamKabir, 'Portrait of a smiling man in a dental clinic (sample profile photo)', 0.5, 0.25),
  teamMeera: p(teamMeera, 'Portrait of a smiling woman with glasses, arms crossed (sample profile photo)', 0.5, 0.25),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
