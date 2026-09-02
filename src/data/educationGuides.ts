export interface WasteCategoryGuide {
  category: string;
  color: string;
  icon: string;
  allowedItems: string[];
  prohibitedItems: string[];
  ghanaContextTip: string;
  carbonSavings: string;
}

export const WASTE_GUIDES: WasteCategoryGuide[] = [
  {
    category: 'Plastics & Sachets',
    color: '#38bdf8', // Blue
    icon: 'Recycle',
    allowedItems: [
      'PET drink bottles',
      'Pure water sachets (Rubber)',
      'Clean food containers',
      'Bottle caps',
      'Detergent bottles'
    ],
    prohibitedItems: [
      'Dirty/greasy plastic wrap',
      'Medical syringes',
      'Styrofoam food packs',
      'Ceramics'
    ],
    ghanaContextTip: 'Over 280 million pure water sachets are consumed monthly in Ghana. Proper segregation prevents gutter blockages during rainy seasons.',
    carbonSavings: '1.8 kg CO2 saved per kg recycled'
  },
  {
    category: 'Organic & Food Waste',
    color: '#10b981', // Green
    icon: 'Apple',
    allowedItems: [
      'Plantain and cassava peels',
      'Vegetable leftovers',
      'Eggshells & fruit waste',
      'Yard trimmings and leaves',
      'Coffee grounds'
    ],
    prohibitedItems: [
      'Plastic bags',
      'Fats and excessive oils',
      'Animal bones',
      'Treated wood'
    ],
    ghanaContextTip: 'Organic waste accounts for ~60% of municipal solid waste in Accra and can be converted into rich compost for local urban farming.',
    carbonSavings: '0.9 kg CO2 equivalent per kg composted'
  },
  {
    category: 'Paper & Cardboard',
    color: '#fbbf24', // Amber
    icon: 'FileText',
    allowedItems: [
      'Newspapers & office paper',
      'Cardboard boxes (flattened)',
      'School notebooks (staples removed)',
      'Paper bags'
    ],
    prohibitedItems: [
      'Oily pizza boxes',
      'Wax-coated cups',
      'Tissue paper and serviettes'
    ],
    ghanaContextTip: 'Flatten cardboard boxes before disposal to optimize bin capacity by up to 40%.',
    carbonSavings: '1.4 kg CO2 saved per kg paper recycled'
  },
  {
    category: 'E-Waste & Batteries',
    color: '#a855f7', // Purple
    icon: 'Cpu',
    allowedItems: [
      'AA/AAA & Lithium batteries',
      'Old phone chargers & cables',
      'Broken smartphone components',
      'Computer motherboards & chips'
    ],
    prohibitedItems: [
      'Leaking car lead-acid batteries',
      'CRTs without casing',
      'Household general rubbish'
    ],
    ghanaContextTip: 'E-waste contains valuable rare metals but also hazardous lead and mercury. Proper collection at designated smart hubs protects our soil and water table.',
    carbonSavings: '12.5 kg CO2 + heavy metal containment per kg'
  }
];

export const GHANA_WASTE_FACTS = [
  "Accra generates approximately 3,000 metric tonnes of municipal solid waste daily.",
  "Only about 15% of plastic waste in Ghana is currently recycled—SmartBins help increase source separation.",
  "Ultrasonic fill sensors help waste collection trucks reduce fuel consumption and CO2 emissions by up to 35% through dynamic routing.",
  "Automated lids prevent flies, pests, foul odor emissions, and rain water accumulation in tropical climates."
];
