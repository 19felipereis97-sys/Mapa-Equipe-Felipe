import type { Status } from '@/types/common';

export const STATUS_LABELS: Record<Status, string> = {
  'OK':     'OK',
  'S/M':    'S/M',
  'P':      'Pendente',
  'ST-I':   'ST-I',
  'ST-C':   'ST-C',
  'ABERTO': 'Aberto',
};

export const STATUS_BADGE_CLASS: Record<Status, string> = {
  'OK':     'badge-ok',
  'S/M':    'badge-sm',
  'P':      'badge-p',
  'ST-I':   'badge-sti',
  'ST-C':   'badge-stc',
  'ABERTO': 'badge-aberto',
};
