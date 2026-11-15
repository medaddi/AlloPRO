/**
 * AlloPro — NativeWind v4 / Tailwind config
 * Values mirror src/constants/theme.ts (single source of truth for JS-side styles).
 * If you change a color here, change it in theme.ts too.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D4355', // Deep Slate Blue
          light: '#2E5F75',
          dark: '#132D39',
          50: '#E8EEF1',
        },
        accent: {
          DEFAULT: '#F08A4B', // Vibrant Coral Orange
          light: '#F6AD80',
          dark: '#D9702F',
          50: '#FEF1E9',
        },
        secondary: {
          teal: '#A5C4C4', // Soft Mint Teal
          tealLight: '#DCEAEA',
          tealDark: '#7FA6A6',
        },
        background: {
          main: '#F4F7F7',
          surface: '#FFFFFF',
        },
        text: {
          primary: '#1D4355',
          secondary: '#607D8B',
          muted: '#90A4AE',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#DCE6E6',
          strong: '#C5D4D4',
        },
        status: {
          online: '#10B981',
          onlineSoft: '#E7F8F1',
          busy: '#F59E0B',
          busySoft: '#FEF5E6',
          offline: '#EF4444',
          offlineSoft: '#FDECEC',
          closed: '#9AA9B0',
        },
      },
      fontFamily: {
        // French / LTR
        jakarta: ['PlusJakartaSans_500Medium'],
        'jakarta-semibold': ['PlusJakartaSans_600SemiBold'],
        'jakarta-bold': ['PlusJakartaSans_700Bold'],
        // Arabic / RTL
        cairo: ['Cairo_500Medium'],
        'cairo-semibold': ['Cairo_600SemiBold'],
        'cairo-bold': ['Cairo_700Bold'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        body: ['15px', { lineHeight: '22px' }],
        title: ['18px', { lineHeight: '24px' }],
        headline: ['24px', { lineHeight: '30px' }],
        display: ['34px', { lineHeight: '40px' }],
        ticket: ['72px', { lineHeight: '80px' }],
      },
      borderRadius: {
        btn: '16px',
        card: '20px',
        sheet: '28px',
        pill: '999px',
      },
      height: {
        btn: '54px',
        input: '52px',
      },
      minHeight: {
        btn: '54px',
        touch: '44px',
      },
      spacing: {
        gutter: '20px',
        'thumb-zone': '96px',
      },
    },
  },
  plugins: [],
};
