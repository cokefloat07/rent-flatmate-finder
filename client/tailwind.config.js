/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ────────────────────────────────────────────────────
        primary: {
          DEFAULT: '#2D6A4F', // deep forest green — buttons, links, active states
          light: '#74C69D', // hover states, badges
          dark: '#1B4332', // pressed / dark accent
        },
        secondary: {
          DEFAULT: '#F4A261', // warm terracotta — accent CTAs, highlight scores
          dark: '#E76F51', // hover for secondary
        },
        neutral: {
          900: '#1B1F1D', // headings + body text
          700: '#3D4441', // muted text
          500: '#7A8079', // placeholder / disabled
          300: '#D8DCD6', // borders
          100: '#F7F7F5', // warm off-white — page background
        },
        surface: '#FFFFFF', // card background
        // ── Compatibility score colors ───────────────────────────────────────
        success: '#40916C', // high score (>80)
        warning: '#E9C46A', // medium score (50–80)
        danger: '#E76F51', // low score (<50)
      },

      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        soft: '0 4px 12px rgba(27, 31, 29, 0.06)',
        card: '0 6px 20px rgba(27, 31, 29, 0.08)',
        lift: '0 12px 28px rgba(27, 31, 29, 0.12)',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      keyframes: {
        // Fade + slide up (page/route transitions)
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Score badge count-up pulse
        scorePop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Skeleton shimmer
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        // Chat message slide-in
        slideInBottom: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'fade-slide-up': 'fadeSlideUp 300ms ease-out',
        'score-pop': 'scorePop 500ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        'slide-in-bottom': 'slideInBottom 250ms ease-out',
      },

      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};