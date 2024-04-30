const withMT = require("@material-tailwind/react/utils/withMT")

/** @type {import('tailwindcss').Config} */
module.exports = withMT({
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      fontFamily: {
        "helvetica-now": ['"Helvetica Now Text"'],
        "helvetica-micro": ['"Helvetica Now Micro"'],
        "libre-franklin": ["Libre Franklin", "sans-serif"],
        inter: ["Inter", "sans-serif"]
      },
      colors: {
        pixelspace: {
          white: "#FFFFFF",
          "gray-3": "#F6F6F6",
          "gray-10": "#E6E4E5",
          "gray-20": "#CDC8C9",
          "gray-30": "#ADA6A7",
          "gray-40": "#8C8484",
          "gray-50": "#544C4F",
          "gray-55": "#494A59",
          "gray-60": "#2F2C2D",
          "gray-70": "#201D1E",
          "gray-80": "#191617",
          "gray-90": "#110E0F",
          "blue-50": "#EFF6FF",
          "blue-700": "#1D4ED8",
          "blue-800": "#1e40af",
          "teal-50": "#F0FDFA",
          "teal-500": "#14B8A6",
          "teal-800": "#115E59",
          "red-400": "#F87171",
          "red-500": "#EF4444",
          pink: "#FF005E",
          cyan: "#00FFFF"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")]
})
