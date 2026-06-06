/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        workspace: '#F5F6FA',
        glass: {
          white: 'rgba(255,255,255,0.88)',
          border: 'rgba(255,255,255,0.28)',
          highlight: 'rgba(255,255,255,0.18)',
        },
        board: {
          base: '#A9B4FF',
          tint: '#B8C1FF',
        },
        col: {
          todo: '#AFC0FF',
          'todo-s': '#C8D3FF',
          'todo-a': '#7E92F8',
          progress: '#F4D34F',
          'progress-s': '#F8E184',
          'progress-a': '#D7A700',
          feedback: '#A86CF2',
          'feedback-s': '#C79CF8',
          'feedback-a': '#7D3FE5',
          done: '#50D162',
          'done-s': '#85E38E',
          'done-a': '#28A745',
          blocked: '#F57D7D',
          'blocked-s': '#F8A8A8',
          'blocked-a': '#D94B4B',
        },
        sidebar: {
          DEFAULT: '#FFFFFF',
          light: 'rgba(169,180,255,0.1)',
          border: 'rgba(169,180,255,0.2)',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        container: '0 12px 32px -4px rgba(0,0,0,0.12)',
        card: '0 6px 18px -2px rgba(0,0,0,0.08)',
        'card-hover': '0 14px 28px -4px rgba(0,0,0,0.16)',
        glass: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s cubic-bezier(0.4,0,0.2,1)',
        'lift': 'lift 0.18s cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        lift: {
          from: { transform: 'translateY(0)', boxShadow: '0 6px 18px -2px rgba(0,0,0,0.08)' },
          to: { transform: 'translateY(-2px)', boxShadow: '0 14px 28px -4px rgba(0,0,0,0.16)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
