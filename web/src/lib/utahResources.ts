/* Utah resources. Source: the team's vetted UTAH_RESOURCES.md. Edit here to
   change the Resources tab. Use only what is listed; program details change,
   so the page always says to check the site for current dates and eligibility. */
import type { Profile, Turn } from './store';

export type Group = 'returnship' | 'training' | 'childcare' | 'other';
export type Resource = {
  id: string; name: string; group: Group; offers: string;
  links: { label: string; href?: string }[];
  nextStep: string;
};

export const GROUPS: [Group, string, string][] = [
  ['returnship', 'Return-to-work programs', '🚀'],
  ['training', 'Coaching and training money', '🎓'],
  ['childcare', 'Childcare', '🧸'],
  ['other', 'Other help', '🤝'],
];

const site = (domain: string) => ({ label: domain, href: `https://${domain}` });

export const RESOURCES: Resource[] = [
  { id: 'return-utah', group: 'returnship', name: 'Return Utah',
    offers: 'State-run, 16-week paid returnships in state government for Utah residents with a career break of 2+ years, for any reason. Includes resume, interview, job-search, and LinkedIn workshops. Most participants are women returning after raising children.',
    links: [site('returnutah.utah.gov')], nextStep: 'visit returnutah.utah.gov and check the next cohort date.' },
  { id: 'tech-moms', group: 'returnship', name: 'Tech-Moms',
    offers: '9-week program for women to gain tech-industry skills; 500+ graduates. Free "Better Way Thursdays" virtual workshops.',
    links: [site('tech-moms.org')], nextStep: 'visit tech-moms.org and sign up for a free Better Way Thursdays workshop.' },
  { id: 'wtc-air', group: 'returnship', name: 'Women Tech Council — AI Ready Returnship (AIR)',
    offers: 'Structured relaunch program for experienced professionals re-entering an AI-enabled workplace.',
    links: [site('womentechcouncil.com')], nextStep: 'visit womentechcouncil.com and read the AI Ready Returnship details.' },
  { id: 'uammi', group: 'returnship', name: 'UAMMI Returnship',
    offers: 'Return-to-work hiring and mentoring for women in advanced materials and manufacturing.',
    links: [site('uammi.org')], nextStep: 'visit uammi.org and look up the returnship.' },

  { id: 'dws', group: 'training', name: 'Utah Dept. of Workforce Services (DWS)',
    offers: 'Free one-on-one career coaching; funding for short-term training, certificates, apprenticeships, and degrees for eligible applicants; resume and interview help. Walk-in employment centers statewide.',
    links: [site('jobs.utah.gov')], nextStep: 'visit jobs.utah.gov and find your nearest employment center for free one-on-one coaching.' },
  { id: 'talent-ready', group: 'training', name: 'Talent Ready Utah / Utah Works',
    offers: 'Industry training programs tied to employer needs.',
    links: [site('business.utah.gov')], nextStep: 'visit business.utah.gov and browse the current training programs.' },
  { id: 'apprenticeship', group: 'training', name: 'Apprenticeship Utah',
    offers: 'Paid on-the-job learning plus classroom instruction.',
    links: [site('apprenticeship.utah.gov')], nextStep: 'visit apprenticeship.utah.gov and search apprenticeships near you.' },
  { id: 'library', group: 'training', name: 'Local library systems',
    offers: 'Free LinkedIn Learning access, resume help, career coaching.',
    links: [{ label: 'her county library' }], nextStep: 'ask your county library for a free LinkedIn Learning login.' },

  { id: 'child-care-assistance', group: 'childcare', name: 'Utah Child Care Assistance (DWS Office of Child Care)',
    offers: 'Subsidy for working or studying parents up to 85% of state median income; sliding co-pay. Apply through myCase.',
    links: [{ label: 'jobs.utah.gov/occ', href: 'https://jobs.utah.gov/occ' }, site('mycase.utah.gov')], nextStep: 'visit mycase.utah.gov and start a Child Care Assistance application.' },
  { id: 'kids-in-care', group: 'childcare', name: 'Kids in Care',
    offers: 'Free drop-in childcare for recently unemployed parents while they job hunt; DWS pays for up to 150 hours.',
    links: [site('jobs.utah.gov')], nextStep: 'visit jobs.utah.gov and look up Kids in Care.' },
  { id: 'care-about-childcare', group: 'childcare', name: 'Care About Childcare',
    offers: 'Statewide provider search with profiles and quality ratings.',
    links: [site('careaboutchildcare.utah.gov')], nextStep: 'visit careaboutchildcare.utah.gov and search providers near you.' },

  { id: '211', group: 'other', name: '211 Utah',
    offers: 'Free, confidential, multilingual referrals: food, housing, utilities, healthcare, transportation, legal help, employment, childcare.',
    links: [site('211utah.org'), { label: 'dial 2-1-1', href: 'tel:211' }], nextStep: 'dial 2-1-1 or visit 211utah.org and describe what you need.' },
  { id: 'fep', group: 'other', name: 'Family Employment Program (TANF)',
    offers: 'Temporary cash assistance and employment support for qualifying families with children.',
    links: [site('jobs.utah.gov')], nextStep: 'visit jobs.utah.gov and check eligibility for the Family Employment Program.' },
  { id: 'legal', group: 'other', name: 'Utah Legal Services',
    offers: 'Free civil legal help for low-income Utahns, including divorce and custody.',
    links: [site('utahlegalservices.org')], nextStep: 'visit utahlegalservices.org and request help.' },
  { id: 'community-action', group: 'other', name: 'Utah Community Action',
    offers: 'Housing and rental assistance for low-income families.',
    links: [site('utahca.org')], nextStep: 'visit utahca.org and check housing assistance.' },
];

/** The team's "match by what she says" rules, applied to her answers.
    Returns at most three resources, each with the reason it was suggested. */
export function suggest(profile: Profile, turns: Turn[]): { resource: Resource; why: string }[] {
  const text = turns.map((t) => `${t.question} ${t.answer}`).join(' ').toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  const away = /^(\d{4})-(\d{2})/.exec(profile.awayDate || '');
  const yearsAway = away ? (Date.now() - new Date(+away[1], +away[2] - 1, 1).getTime()) / (365.25 * 864e5) : 0;
  const out: { id: string; why: string }[] = [];
  const add = (id: string, why: string) => { if (!out.some((o) => o.id === id)) out.push({ id, why }); };

  if (has('divorce', 'urgent', 'right away', 'asap', 'lost my', 'loss', 'widow', 'need income', 'need money now')) {
    add('dws', 'You need a way back that moves quickly. DWS is the place to start.');
    add('211', 'For anything urgent alongside work: food, housing, utilities or legal help.');
    if (has('divorce', 'custody')) add('legal', 'Free legal help if custody or divorce is involved.');
    else add('fep', 'Temporary support for families while you get back to work.');
  }
  if (has('tech', 'software', 'coding', 'computer', ' ai ', 'ai tools', 'data')) add('tech-moms', 'You are interested in tech, and this program is built for moms moving into it.');
  if (has('manufactur', 'materials')) add('uammi', 'You are interested in manufacturing or materials.');
  if (yearsAway >= 2) add('return-utah', `You have been away about ${Math.floor(yearsAway)} years, and this paid returnship is for career breaks of 2+ years.`);
  if (has('childcare', 'child care', 'daycare', 'day care', 'babysit', 'school hours', 'pickup', 'kids home')) {
    add('child-care-assistance', 'Childcare is part of the puzzle, and this helps with the cost.');
    add('care-about-childcare', 'To find a provider near you, with quality ratings.');
  }
  if (has('certificate', 'training', 'course', 'class') && has('cost', 'afford', 'expensive', 'money', 'free', 'budget')) {
    add('dws', 'You want training but cost is a worry: DWS offers free coaching and training funding.');
    add('library', 'Free LinkedIn Learning courses through your library.');
  }
  if (!out.length) add('dws', 'Not sure where to start? Free one-on-one coaching at a DWS employment center.');

  return out.slice(0, 3).map(({ id, why }) => ({ resource: RESOURCES.find((r) => r.id === id)!, why }));
}
