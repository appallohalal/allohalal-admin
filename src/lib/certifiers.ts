export interface KnownCertifier {
  id: string;
  name: string;
  shortName: string;
  country: string;
  trustTier: 'GOLD' | 'VERIFIED' | 'STANDARD';
  keywords: string[];
}

export const KNOWN_CERTIFIERS: KnownCertifier[] = [
  {
    id: 'avs',
    name: 'AVS (À Votre Service)',
    shortName: 'AVS',
    country: 'France',
    trustTier: 'GOLD',
    keywords: ['avs', 'a.v.s', 'à votre service', 'a votre service'],
  },
  {
    id: 'achahada',
    name: 'Achahada',
    shortName: 'Achahada',
    country: 'France',
    trustTier: 'GOLD',
    keywords: ['achahada', 'chahada', 'ach-chahada'],
  },
  {
    id: 'argml',
    name: 'ARGML (Grande Mosquée de Lyon)',
    shortName: 'ARGML',
    country: 'France',
    trustTier: 'GOLD',
    keywords: [
      'argml',
      'mosquée de lyon',
      'mosquee de lyon',
      'grande mosquée de lyon',
      'isla delice',
      'isla délice',
    ],
  },
  {
    id: 'sfcvh',
    name: 'SFCVH (Grande Mosquée de Paris)',
    shortName: 'Mosquée de Paris',
    country: 'France',
    trustTier: 'VERIFIED',
    keywords: ['sfcvh', 'mosquée de paris', 'mosquee de paris', 'grande mosquée de paris'],
  },
  {
    id: 'halal_services',
    name: 'Halal Services',
    shortName: 'Halal Services',
    country: 'France',
    trustTier: 'VERIFIED',
    keywords: ['halal services', 'halalservices'],
  },
  {
    id: 'halal_correct',
    name: 'Halal Correct (TQ HC)',
    shortName: 'Halal Correct',
    country: 'Netherlands / EU',
    trustTier: 'VERIFIED',
    keywords: ['halal correct', 'total quality halal correct', 'tq hc'],
  },
  {
    id: 'halal_control',
    name: 'Halal Control',
    shortName: 'Halal Control',
    country: 'Germany / EU',
    trustTier: 'VERIFIED',
    keywords: ['halal control', 'halalcontrol'],
  },
  {
    id: 'hmc',
    name: 'HMC (Halal Monitoring Committee)',
    shortName: 'HMC',
    country: 'United Kingdom',
    trustTier: 'GOLD',
    keywords: ['hmc', 'halal monitoring committee'],
  },
  {
    id: 'hfa',
    name: 'HFA (Halal Food Authority)',
    shortName: 'HFA',
    country: 'United Kingdom',
    trustTier: 'VERIFIED',
    keywords: ['hfa', 'halal food authority'],
  },
  {
    id: 'jakim',
    name: 'JAKIM',
    shortName: 'JAKIM',
    country: 'Malaysia',
    trustTier: 'GOLD',
    keywords: ['jakim', 'halal malaysia'],
  },
  {
    id: 'mui_bpjph',
    name: 'MUI / BPJPH',
    shortName: 'MUI / BPJPH',
    country: 'Indonesia',
    trustTier: 'GOLD',
    keywords: ['mui', 'bpjph', 'majelis ulama indonesia', 'halal indonesia'],
  },
  {
    id: 'cicot',
    name: 'CICOT',
    shortName: 'CICOT',
    country: 'Thailand',
    trustTier: 'STANDARD',
    keywords: ['cicot'],
  },
  {
    id: 'muis',
    name: 'MUIS',
    shortName: 'MUIS',
    country: 'Singapore',
    trustTier: 'GOLD',
    keywords: ['muis'],
  },
];

/**
 * Detects known certifier from labels, text, ingredients, or brand
 */
export function detectCertifierFromText(input: {
  labels?: string[];
  name?: string;
  brand?: string;
  ingredients?: string;
}): { certifierName: string; certifierId: string } | null {
  const combined = [
    ...(input.labels || []),
    input.name || '',
    input.brand || '',
    input.ingredients || '',
  ]
    .join(' ')
    .toLowerCase();

  for (const cert of KNOWN_CERTIFIERS) {
    for (const kw of cert.keywords) {
      const regex = new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i');
      if (regex.test(combined)) {
        return {
          certifierName: cert.name,
          certifierId: cert.id,
        };
      }
    }
  }

  // Also check if generic "halal" is in labels without specific certifier
  if (combined.includes('en:halal') || combined.includes('fr:halal') || combined.includes('halal certifié')) {
    return {
      certifierName: 'Organisme Halal Certifié',
      certifierId: 'generic_halal',
    };
  }

  return null;
}

