/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.html"
    ],
    theme: {
        extend: {
            colors: {
                // Custom colors for bookmark folders
                folder: {
                    pink: 'rgba(255, 179, 186, 0.15)',
                    peach: 'rgba(255, 223, 186, 0.15)',
                    yellow: 'rgba(255, 255, 186, 0.15)',
                    green: 'rgba(186, 255, 201, 0.15)',
                    blue: 'rgba(186, 225, 255, 0.15)',
                    lavender: 'rgba(186, 200, 255, 0.15)',
                    purple: 'rgba(228, 186, 255, 0.15)',
                    magenta: 'rgba(255, 186, 255, 0.15)',
                    mint: 'rgba(200, 255, 248, 0.15)',
                    orange: 'rgba(255, 213, 145, 0.15)',
                    sky: 'rgba(173, 216, 230, 0.15)',
                    lightgreen: 'rgba(144, 238, 144, 0.15)',
                }
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-in-out',
                'slide-down': 'slideDown 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            }
        },
    },
    plugins: [],
    darkMode: 'class',
} 