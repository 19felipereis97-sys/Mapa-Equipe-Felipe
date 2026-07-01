export type Theme = 'light' | 'dark';

export type Status = 'OK' | 'S/M' | 'P' | 'ST-I' | 'ST-C' | 'ABERTO' | 'PREJUIZO' | 'COTA_UNICA';

export type DeadlineAlert = 'overdue' | 'urgent' | 'attention' | 'normal';

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
