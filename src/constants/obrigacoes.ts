// Obligation types placeholder — will be fully defined in Module 1 (Configurações)
export const OBLIGATION_TYPES = [
  'Contábil',
  'Fiscal',
  'Trabalhista',
  'Previdenciário',
  'Societário',
] as const;

export type ObligationType = (typeof OBLIGATION_TYPES)[number];
