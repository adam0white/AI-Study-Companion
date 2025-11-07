/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern & Playful theme (Purple/Pink) from UX Design spec
        primary: {
          DEFAULT: '#8B5CF6', // Violet-500
          light: '#A78BFA',   // Violet-400
          dark: '#7C3AED',    // Violet-600
        },
        accent: {
          DEFAULT: '#EC4899', // Pink-500
          light: '#F472B6',   // Pink-400
          dark: '#DB2777',    // Pink-600
        },
        success: '#10B981',   // Emerald-500
        error: '#EF4444',     // Red-500
        background: '#FFFFFF',
        surface: '#F9FAFB',   // Gray-50
        text: {
          primary: '#1F2937', // Gray-800
          secondary: '#6B7280', // Gray-500
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}

