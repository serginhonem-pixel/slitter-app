export const INITIAL_INOX_BLANK_PRODUCTS = [
  {
    id: 'FUNDO_BALDE_15_20_L',
    name: 'Fundo Balde 15 / 20 L',
    inoxGrade: 'A1S1 430',
    weight: 0.6722,
    thickness: 0.33,
    width: 865,
    length: 300,
    measuresLabel: '0,33 x 865 x 300',
  },
  {
    id: 'FUNDO_BALDE_5_10_L',
    name: 'Fundo Balde 5 / 10 L',
    inoxGrade: 'A1S1 430',
    weight: 0.6088,
    thickness: 0.33,
    width: 940,
    length: 250,
    measuresLabel: '0,33 x 940 x 250',
  },
  {
    id: 'CORPO_BALDE_5',
    name: 'Corpo Balde 5',
    inoxGrade: 'A1S1 430 - WA',
    weight: 2.2922,
    thickness: 0.4,
    width: 1000,
    length: 730,
    measuresLabel: '0,4 x 1000 x 730',
  },
  {
    id: 'CORPO_BALDE_10',
    name: 'Corpo Balde 10',
    inoxGrade: 'A1S1 430 - WA',
    weight: 2.8668,
    thickness: 0.4,
    width: 1100,
    length: 830,
    measuresLabel: '0,4 x 1100 x 830',
  },
  {
    id: 'CORPO_BALDE_15',
    name: 'Corpo Balde 15',
    inoxGrade: 'A1S1 430 - WA',
    weight: 3.4195,
    thickness: 0.4,
    width: 990,
    length: 1100,
    measuresLabel: '0,4 x 990 x 1100',
  },
  {
    id: 'CORPO_BALDE_20',
    name: 'Corpo Balde 20',
    inoxGrade: 'A1S1 430 - WA',
    weight: 9.106,
    thickness: 0.4,
    width: 1000,
    length: 2900,
    measuresLabel: '0,4 x 1000 x 2900',
  },
  {
    id: 'ORELHA_DE_BALDE',
    name: 'Orelha de Balde',
    inoxGrade: 'A1S1 430 (OREL BALD)',
    weight: 23.3616,
    thickness: 1.2,
    width: 1240,
    length: 2000,
    measuresLabel: '1,2 x 1240 x 2000',
  },
  {
    id: 'CUBA_C1R',
    name: 'Cuba C1R',
    inoxGrade: 'A1S1 430 (C1R)',
    weight: 1.0569,
    thickness: 0.4,
    width: 510,
    length: 660,
    measuresLabel: '0,4 x 510 x 660',
  },
  {
    id: 'CUBA_C2R',
    name: 'Cuba C2R',
    inoxGrade: 'A1S1 430 (C2R)',
    weight: 1.2953,
    thickness: 0.4,
    width: 550,
    length: 750,
    measuresLabel: '0,4 x 550 x 750',
  },
  {
    id: 'CUBA_C1F',
    name: 'Cuba C1F',
    inoxGrade: 'A1S1 430 (C1F)',
    weight: 1.3113,
    thickness: 0.4,
    width: 580,
    length: 720,
    measuresLabel: '0,4 x 580 x 720',
  },
  {
    id: 'CUBA_C2F',
    name: 'Cuba C2F',
    inoxGrade: 'A1S1 430 (C2F)',
    weight: 1.5964,
    thickness: 0.4,
    width: 620,
    length: 820,
    measuresLabel: '0,4 x 620 x 820',
  },
  {
    id: 'C1F_304',
    name: 'C1F (304)',
    inoxGrade: 'A1S1 304',
    weight: 1.3113,
    thickness: 0.4,
    width: 580,
    length: 720,
    measuresLabel: '0,4 x 580 x 720',
  },
  {
    id: 'C2F_304',
    name: 'C2F (304)',
    inoxGrade: 'A1S1 304',
    weight: 1.5964,
    thickness: 0.4,
    width: 620,
    length: 820,
    measuresLabel: '0,4 x 620 x 820',
  },
  {
    id: 'CUBA_C1F_17CM',
    name: 'Cuba C1F',
    inoxGrade: 'A1S1 430 (C1F 17CM)',
    weight: 1.4796,
    thickness: 0.4,
    width: 620,
    length: 760,
    measuresLabel: '0,4 x 620 x 760',
  },
  {
    id: 'CUBA_C2F_17CM',
    name: 'Cuba C2F',
    inoxGrade: 'A1S1 430 (C2F 17 CM)',
    weight: 1.6994,
    thickness: 0.4,
    width: 660,
    length: 820,
    measuresLabel: '0,4 x 660 x 820',
  },
];

const normalizeMeasureNumber = (value) => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseInoxMeasuresFromText = (text) => {
  if (!text) return null;
  const normalized = String(text).toLowerCase().replace(/[,]/g, ".").replace(/\s+/g, " ");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const thickness = normalizeMeasureNumber(match[1]);
  const width = normalizeMeasureNumber(match[2]);
  const length = normalizeMeasureNumber(match[3]);
  if (thickness === null || width === null || length === null) return null;
  return { thickness, width, length };
};

const buildMeasureKey = ({ thickness, width, length }) => {
  const t = thickness != null ? Number(thickness).toFixed(2) : "0.00";
  const w = width != null ? String(Math.round(Number(width))) : "0";
  const l = length != null ? String(Math.round(Number(length))) : "0";
  return `${t}|${w}|${l}`;
};

export const matchInoxProductByMeasures = (text, products = INITIAL_INOX_BLANK_PRODUCTS) => {
  const measures = parseInoxMeasuresFromText(text);
  if (!measures) return null;
  const key = buildMeasureKey(measures);
  const catalog = Array.isArray(products) ? products : [];
  return (
    catalog.find((item) => {
      const fromLabel = parseInoxMeasuresFromText(item.measuresLabel);
      const fromFields = {
        thickness: normalizeMeasureNumber(item.thickness),
        width: normalizeMeasureNumber(item.width),
        length: normalizeMeasureNumber(item.length),
      };
      const candidate = fromLabel || fromFields;
      if (!candidate) return false;
      return buildMeasureKey(candidate) === key;
    }) || null
  );
};
