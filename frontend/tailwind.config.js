/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                yellow: {
                    500: '#FFD700',
                    600: '#E6C200',
                    50: '#FFFDF0',
                },
                gray: {
                    900: '#333333',
                }
            }
        },
    },
    plugins: [],
};
