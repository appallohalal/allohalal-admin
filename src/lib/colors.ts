/**
 * Application Theme Colors
 * Synchronized directly with the mobile client AppTheme (scanner/lib/theme/app_theme.dart)
 */
export const APP_COLORS = {
  // Primary Brand Color: 0xFF2563EB (Tailwind blue-600)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',

  // Status Compliance Colors
  halal: '#2E7D32',
  halalLight: '#E8F5E9',
  haram: '#D32F2F',
  haramLight: '#FFEBEE',
  doubtful: '#F57C00',
  doubtfulLight: '#FFF3E0',

  // Consistent Tailwind CSS class utility map
  classes: {
    primaryBg: 'bg-blue-600',
    primaryBgHover: 'hover:bg-blue-700',
    primaryText: 'text-blue-600',
    primaryBorder: 'border-blue-600',
    primaryLightBg: 'bg-blue-50',
    primaryLightText: 'text-blue-700',
    primaryLightBorder: 'border-blue-200',
    primaryFocus: 'focus:border-blue-500 focus:ring-blue-500/10',
    primaryActiveTab: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs',
    primaryBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    primaryGradient: 'bg-gradient-to-tr from-blue-600 to-blue-500',
  },
} as const;
