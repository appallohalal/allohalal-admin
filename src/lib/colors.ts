/**
 * Application Theme Colors
 * Synchronized directly with the mobile client AppTheme (scanner/lib/theme/app_theme.dart)
 */
export const APP_COLORS = {
  // Primary Brand Color: #088839 (Allo Halal Official Logo Green)
  primary: '#088839',
  primaryDark: '#066D2E',
  primaryLight: '#E6F4EB',

  // Status Compliance Colors
  halal: '#2E7D32',
  halalLight: '#E8F5E9',
  haram: '#D32F2F',
  haramLight: '#FFEBEE',
  doubtful: '#F57C00',
  doubtfulLight: '#FFF3E0',

  // Consistent Tailwind CSS class utility map
  classes: {
    primaryBg: 'bg-[#088839]',
    primaryBgHover: 'hover:bg-[#066d2e]',
    primaryText: 'text-[#088839]',
    primaryBorder: 'border-[#088839]',
    primaryLightBg: 'bg-[#e6f4eb]',
    primaryLightText: 'text-[#066d2e]',
    primaryLightBorder: 'border-[#b5e0c5]',
    primaryFocus: 'focus:border-[#088839] focus:ring-[#088839]/10',
    primaryActiveTab: 'bg-[#e6f4eb] text-[#066d2e] border-[#b5e0c5] shadow-xs',
    primaryBadge: 'bg-[#e6f4eb] text-[#066d2e] border-[#b5e0c5]',
    primaryGradient: 'bg-gradient-to-tr from-[#088839] to-[#0aa344]',
  },
} as const;
