/** @type {import('tailwindcss').Config} */
module.exports = {
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
      colors: {
        /* shadcn HSL-backed tokens */
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
        },

        /* ---- Editorial palette (Shadow AI scientific-editorial) ----
           All colors use `<alpha-value>` so Tailwind `color/opacity` works. */
        paper: {
          DEFAULT: "hsl(var(--paper-hsl) / <alpha-value>)",
          2: "hsl(var(--paper-2-hsl) / <alpha-value>)",
          3: "hsl(var(--paper-3-hsl) / <alpha-value>)"
        },
        surface: "hsl(var(--surface-hsl) / <alpha-value>)",
        line: {
          DEFAULT: "hsl(var(--line-hsl) / <alpha-value>)",
          strong: "hsl(var(--line-strong-hsl) / <alpha-value>)"
        },
        ink: {
          DEFAULT: "hsl(var(--ink-hsl) / <alpha-value>)",
          2: "hsl(var(--ink-2-hsl) / <alpha-value>)",
          3: "hsl(var(--ink-3-hsl) / <alpha-value>)",
          4: "hsl(var(--ink-4-hsl) / <alpha-value>)",
          /* Legacy numeric aliases - retained until PR 5 */
          900: "hsl(var(--ink-hsl) / <alpha-value>)",
          700: "hsl(var(--ink-2-hsl) / <alpha-value>)",
          500: "hsl(var(--ink-3-hsl) / <alpha-value>)",
          400: "hsl(var(--ink-4-hsl) / <alpha-value>)",
          200: "hsl(var(--line-strong-hsl) / <alpha-value>)",
          100: "hsl(var(--paper-3-hsl) / <alpha-value>)",
          50: "hsl(var(--paper-2-hsl) / <alpha-value>)"
        },
        rust: {
          DEFAULT: "hsl(var(--rust-hsl) / <alpha-value>)",
          soft: "hsl(var(--rust-soft-hsl) / <alpha-value>)",
          ink: "hsl(var(--rust-ink-hsl) / <alpha-value>)"
        },

        /* Phase tints - used sparingly for stage identity */
        phase: {
          overview: "var(--p-overview)",
          problem: "var(--p-problem)",
          lit: "var(--p-lit)",
          hyp: "var(--p-hyp)",
          design: "var(--p-design)"
        },

        /* Semantic */
        success: "var(--success)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        info: "var(--info)",

        /* ---- Legacy JourneyMaker aliases (kept so pre-redesign callsites
           don't render blank during the phased migration). These map to the
           nearest editorial token. Removed once PR 5 migrates every usage. */
        brick: {
          DEFAULT: "hsl(var(--rust-hsl) / <alpha-value>)",
          hover: "hsl(var(--rust-hsl) / <alpha-value>)",
          disabled: "hsl(var(--rust-soft-hsl) / <alpha-value>)"
        },
        "teal-journey": {
          DEFAULT: "var(--p-problem)",
          dark: "var(--p-problem)",
          active: "hsl(var(--paper-2-hsl) / <alpha-value>)",
          tint: "hsl(var(--paper-hsl) / <alpha-value>)"
        },
        "orange-product": {
          DEFAULT: "var(--p-lit)",
          active: "hsl(var(--paper-2-hsl) / <alpha-value>)",
          tint: "hsl(var(--paper-hsl) / <alpha-value>)"
        },
        "purple-persona": {
          DEFAULT: "var(--p-hyp)",
          active: "hsl(var(--paper-2-hsl) / <alpha-value>)",
          tint: "hsl(var(--paper-hsl) / <alpha-value>)"
        },
        "sage-brand": {
          DEFAULT: "var(--p-overview)",
          active: "hsl(var(--paper-2-hsl) / <alpha-value>)",
          tint: "hsl(var(--paper-hsl) / <alpha-value>)"
        }
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)"
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        drawer: "var(--shadow-drawer)"
      },
      fontFamily: {
        sans: ["var(--f-ui)"],
        display: ["var(--f-display)"],
        mono: ["var(--f-mono)"]
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
}
