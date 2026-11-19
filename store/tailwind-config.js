window.tailwind = window.tailwind || {};
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(0, 0, 0, 0.04), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-active': '0 4px 16px -2px rgba(16, 185, 129, 0.12), 0 2px 6px -1px rgba(16, 185, 129, 0.08)',
        'floating': '0 8px 30px rgba(0, 0, 0, 0.08)',
      }
    }
  }
};
