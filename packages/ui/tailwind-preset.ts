import type { Config } from 'tailwindcss';

// CiMA design tokens (docs/ui-overhaul-spec.md §4).
// Brand lime sampled from the CiMA logo/banner (#8FB72A); warm stone neutrals;
// ink (near-black) primary actions. Consumed by both apps via
// `presets: [cimaPreset]` in their tailwind.config.ts.
export const cimaPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Page background — soft sage paper (palette v2, 2026-07-10): tinted
        // enough that white cards clearly pop against it.
        canvas: '#F0F2E7',
        surface: '#FFFFFF',
        // Headline/near-black actions (stone-900).
        ink: '#1C1917',
        // CiMA lime. 500 is the logo green — accent/decorative only (white
        // text on it fails contrast); 700+ are readable on tints.
        brand: {
          50: '#F6F9EB',
          100: '#EAF2D2',
          200: '#D6E7A7',
          300: '#BDD877',
          400: '#A5C94B',
          500: '#8FB72A',
          600: '#7AA021',
          700: '#5D7D19',
          800: '#486114',
          900: '#3A4D12',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 25, 23, 0.04)',
        'card-hover': '0 4px 12px rgba(28, 25, 23, 0.08)',
      },
    },
  },
};

export default cimaPreset;
