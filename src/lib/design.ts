// MamaVege HR Design System
// Use these tokens consistently across all pages

export const colors = {
  // Brand
  primary: '#1B4332',
  primaryMid: '#2D6A4F',
  primaryLight: '#52B788',

  // Backgrounds
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  sidebarBg: '#0F172A',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Status
  success: '#059669',
  successBg: '#DCFCE7',
  successText: '#15803D',

  warning: '#D97706',
  warningBg: '#FEF3C7',
  warningText: '#92400E',

  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerText: '#DC2626',

  info: '#2563EB',
  infoBg: '#DBEAFE',
  infoText: '#1D4ED8',

  // Gradients for action cards
  gradients: {
    green:   'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
    teal:    'linear-gradient(135deg, #065F46 0%, #059669 100%)',
    blue:    'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)',
    purple:  'linear-gradient(135deg, #4A1D96 0%, #7C3AED 100%)',
    pink:    'linear-gradient(135deg, #831843 0%, #DB2777 100%)',
    orange:  'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)',
    indigo:  'linear-gradient(135deg, #1e1b4b 0%, #4338CA 100%)',
    cyan:    'linear-gradient(135deg, #164E63 0%, #0891B2 100%)',
  },
}

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
}

export const shadow = {
  card: '0 1px 8px rgba(0,0,0,0.06)',
  cardHover: '0 4px 20px rgba(0,0,0,0.10)',
  banner: '0 4px 24px rgba(27,67,50,0.25)',
  button: '0 2px 8px rgba(0,0,0,0.12)',
}

export const font = {
  xs: '11px',
  sm: '12px',
  base: '13px',
  md: '14px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',
}

// Reusable style objects
export const styles = {
  pageWrapper: {
    minHeight: '100vh' as const,
    background: colors.pageBg,
    padding: '28px 32px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  pageInner: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  card: {
    background: colors.cardBg,
    borderRadius: radius.lg,
    padding: '20px',
    boxShadow: shadow.card,
    border: `1px solid ${colors.borderLight}`,
  },
  sectionLabel: {
    fontSize: font.xs,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 12px',
  },
  pageTitle: {
    fontSize: font['2xl'],
    fontWeight: '800' as const,
    color: colors.textPrimary,
    letterSpacing: '-0.5px',
    margin: '0 0 4px',
  },
  pageSubtitle: {
    fontSize: font.base,
    color: colors.textMuted,
    margin: 0,
  },
  statusBadge: (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      approved:  { bg: colors.successBg, color: colors.successText, label: 'Approved' },
      rejected:  { bg: colors.dangerBg,  color: colors.dangerText,  label: 'Rejected' },
      pending:   { bg: colors.warningBg, color: colors.warningText, label: 'Pending' },
      cancelled: { bg: colors.borderLight, color: colors.textMuted, label: 'Cancelled' },
    }
    return map[status] || map.pending
  },
  primaryButton: {
    background: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: radius.md,
    padding: '10px 20px',
    fontSize: font.base,
    fontWeight: '600' as const,
    cursor: 'pointer',
    boxShadow: shadow.button,
  },
  outlineButton: {
    background: 'white',
    color: colors.primary,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: '10px 20px',
    fontSize: font.base,
    fontWeight: '600' as const,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: font.md,
    color: colors.textPrimary,
    background: 'white',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
}
