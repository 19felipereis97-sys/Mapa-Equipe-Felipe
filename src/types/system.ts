export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemConfigKey =
  | 'app_name'
  | 'app_version'
  | 'active_year'
  | 'theme_default';
