/** AlloPro web — tokens mirror the Figma variables (AlloPro Color / Dimensions). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1D4355', light: '#2E5F75', soft: '#E8EEF1' },
        accent: { DEFAULT: '#F08A4B', dark: '#D9702F', soft: '#FEF1E9' },
        teal: { DEFAULT: '#A5C4C4', soft: '#DCEAEA', dark: '#7FA6A6' },
        canvas: '#F4F7F7',
        hair: '#DCE6E6',
        muted: '#607D8B',
        faint: '#90A4AE',
        open: { DEFAULT: '#10B981', soft: '#E7F8F1', ink: '#0B7F5A' },
        wait: { DEFAULT: '#F59E0B', soft: '#FEF5E6', ink: '#A86A05' },
        closed: { DEFAULT: '#EF4444', soft: '#FDECEC', ink: '#C02E2E' },
        whatsapp: { DEFAULT: '#25D366', soft: '#E8F8EE', ink: '#128C4B' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        ar: ['Cairo', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: { btn: '14px', card: '16px', sheet: '28px' },
      height: { btn: '54px' },
      boxShadow: {
        card: '0 4px 10px rgba(29, 67, 85, 0.05)',
        raised: '0 8px 24px rgba(29, 67, 85, 0.10)',
        cta: '0 6px 12px rgba(240, 138, 75, 0.22)',
      },
    },
  },
  plugins: [],
};
