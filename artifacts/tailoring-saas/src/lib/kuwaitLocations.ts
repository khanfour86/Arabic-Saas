type Lang = 'ar' | 'en';

export interface KuwaitArea {
  value: string;
  labelAr: string;
  labelEn: string;
}

export interface KuwaitGovernorate {
  value: string;
  labelAr: string;
  labelEn: string;
  areas: KuwaitArea[];
}

function area(value: string, labelEn: string): KuwaitArea {
  return { value, labelAr: value, labelEn };
}

function areaAr(value: string): KuwaitArea {
  return { value, labelAr: value, labelEn: value };
}

export const KUWAIT_GOVERNORATES: KuwaitGovernorate[] = [
  {
    value: 'العاصمة',
    labelAr: 'العاصمة',
    labelEn: 'Capital',
    areas: [
      area('الشرق', 'Sharq'),
      area('القبلة', 'Qibla'),
      area('المرقاب', 'Mirqab'),
      area('الصالحية', 'Salhiya'),
      area('الشامية', 'Shamiya'),
      area('الروضة', 'Rawda'),
      area('كيفان', 'Kaifan'),
      area('الدسمة', 'Dasma'),
      area('الدعية', 'Daiya'),
      area('قرطبة', 'Cordoba'),
      area('الفيحاء', 'Faiha'),
      area('النزهة', 'Nuzha'),
      area('العديلية', 'Adailiya'),
      area('الخالدية', 'Khaldiya'),
      area('اليرموك', 'Yarmouk'),
      area('الشويخ الصناعية', 'Shuwaikh'),
      area('جابر الأحمد', 'Jaber Al Ahmad'),
      area('السرة', 'Surra'),
      area('المنصورية', 'Mansouriya'),
      area('ضاحية عبدالله السالم', 'Abdullah Al Salem'),
      area('غرناطة', 'Granada'),
      area('الشويخ السكنية', 'Shuwaikh Residential')
    ],
  },
  {
    value: 'حولي',
    labelAr: 'حولي',
    labelEn: 'Hawalli',
    areas: [
      area('حولي', 'Hawalli'),
      area('السالمية', 'Salmiya'),
      area('الجابرية', 'Jabriya'),
      area('مشرف', 'Mishref'),
      area('بيان', 'Bayan'),
      area('الرميثية', 'Rumaithiya'),
      area('سلوى', 'Salwa'),
      area('الشعب', 'Shaab'),
      area('الزهراء', 'Zahra'),
      area('الصديق', 'Siddiq'),
      area('السلام', 'Salam'),
      area('حطين', 'Hittin'),
      area('الشهداء', 'Shuhada'),
      area('النقرة', 'Nugra'),
      area('الأندلس', 'Andalous'),
      area('البدع', 'Bidaa'),
      area('ميدان حولي', 'Maidan Hawalli'),
    ],
  },
  {
    value: 'الفروانية',
    labelAr: 'الفروانية',
    labelEn: 'Farwaniya',
    areas: [
      area('الفروانية', 'Farwaniya'),
      area('خيطان', 'Khaitan'),
      area('جليب الشيوخ', 'Jleeb Al-Shuyoukh'),
      area('العارضية', 'Ardiya'),
      area('العمرية', 'Omariya'),
      area('الرحاب', 'Rehab'),
      area('إشبيلية', 'Ishbiliya'),
      area('الفردوس', 'Ferdous'),
      area('صباح الناصر', 'Sabah Al Nasser'),
      area('عبدالله المبارك', 'Abdullah Al Mubarak'),
      area('الرابية', 'Rabia'),
      area('أنديلس', 'Andalous'),
      area('الضجيج', 'Dajeej'),
      area('النهضة', 'Nahda'),
    ],
  },
  {
    value: 'الأحمدي',
    labelAr: 'الأحمدي',
    labelEn: 'Ahmadi',
    areas: [
      area('الأحمدي', 'Ahmadi'),
      area('الفحيحيل', 'Fahaheel'),
      area('المنقف', 'Mangaf'),
      area('أبو حليفة', 'Abu Halifa'),
      area('العقيلة', 'Egaila'),
      area('هدية', 'Hadiya'),
      area('الرقة', 'Riqqa'),
      area('الصباحية', 'Sabahiya'),
      area('الظهر', 'Dhaher'),
      area('الفنطاس', 'Fintas'),
      area('المهبولة', 'Mahboula'),
      area('صباح الأحمد', 'Sabah Al Ahmad'),
      area('الوفرة', 'Wafra'),
    ],
  },
  {
    value: 'الجهراء',
    labelAr: 'الجهراء',
    labelEn: 'Jahra',
    areas: [
      area('الجهراء', 'Jahra'),
      area('الواحة', 'Waha'),
      area('القصر', 'Qasr'),
      area('النسيم', 'Naseem'),
      area('تيماء', 'Taima'),
      area('العيون', 'Oyoun'),
      area('سعد العبدالله', 'Saad Al Abdullah'),
      area('كبد', 'Kabd'),
      area('العبدلي', 'Abdali'),
      area('الصليبية', 'Sulaibiya'),
      area('قصر', 'Qasr'),
    ],
  },
  {
    value: 'مبارك الكبير',
    labelAr: 'مبارك الكبير',
    labelEn: 'Mubarak Al-Kabeer',
    areas: [
      area('صباح السالم', 'Sabah Al Salem'),
      area('المسيلة', 'Messila'),
      area('أبو فطيرة', 'Abu Fatira'),
      area('العدان', 'Adan'),
      area('القصور', 'Qusour'),
      area('القرين', 'Qurain'),
      area('مبارك الكبير', 'Mubarak Al-Kabeer'),
      area('فنيطيس', 'Fnaitees'),
    ],
  },
];

export function getAreasByGovernorate(governorate: string): KuwaitArea[] {
  const gov = KUWAIT_GOVERNORATES.find(g => g.value === governorate);
  return gov?.areas ?? [];
}

export function getGovernorateLabel(value: string, lang: Lang): string {
  const gov = KUWAIT_GOVERNORATES.find(g => g.value === value);
  if (!gov) return value;
  return lang === 'en' ? gov.labelEn : gov.labelAr;
}

export function getAreaLabel(value: string, lang: Lang): string {
  for (const gov of KUWAIT_GOVERNORATES) {
    const a = gov.areas.find(a => a.value === value);
    if (a) return lang === 'en' ? a.labelEn : a.labelAr;
  }
  return value;
}

export function getLocationLabel(governorate: string, areaValue: string, lang: Lang): string {
  const govLabel = getGovernorateLabel(governorate, lang);
  const areaLabel = getAreaLabel(areaValue, lang);
  return `${areaLabel} - ${govLabel}`;
}
