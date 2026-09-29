/** Product layout utilities; Element Plus owns interactive controls. */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(['border', 'input', 'ring', 'background', 'foreground'].map(name => [name, 'hsl(var(--' + name + ') / <alpha-value>)'])),
        ...Object.fromEntries(['primary', 'secondary', 'destructive', 'muted', 'accent', 'card'].map(name => [name, {
          DEFAULT: 'hsl(var(--' + name + ') / <alpha-value>)',
          foreground: 'hsl(var(--' + name + '-foreground) / <alpha-value>)',
        }])),
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [],
}
