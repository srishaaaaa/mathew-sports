// ─────────────────────────────────────────────────────────────────
//  BRANCH 1 — Matthew Sports (POS 1, served at "/")
// ─────────────────────────────────────────────────────────────────
//  Everything Branch 1 shows (terminal, invoices, WhatsApp messages,
//  installed app, theme presets) comes from this file.
//  Leave a contact field as "" to hide it on the invoice.
// ─────────────────────────────────────────────────────────────────
import type { BranchConfig } from "./types";

export const BRANCH: BranchConfig = {
  id: "pos1",
  shopName: "Matthew Sports",
  shortName: "Matthew Sports",
  tagline: "Pallamthurai, Kanyakumari",

  ownerName: "",
  phone: "+965 6033 4656",
  shopPhone: "",
  email: "ajinraj1402@gmail.com",
  address: "Main Road, Pallamthurai, Kanyakumari - 629601",
  instagram: "",

  logo: "/logo.png",
  logoMark: "/logo-mark.png",
  logoOnLight: "/logo-light.png",
  logoBackground: "#030408",
  icons: {
    icon192: "/icon-192.png",
    icon512: "/icon-512.png",
    maskable512: "/icon-maskable-512.png",
    apple: "/apple-icon.png",
  },

  invoicePrefix: "MS",
  homePath: "/pos1",

  // Presets drawn from the logo: black, white and championship gold.
  defaultThemeId: "matthew-gold",
  themes: [
    {
      id: "matthew-gold",
      name: "Matthew Gold",
      description: "Logo gold with black text — the signature look",
      colors: {
        primary: "#E8A317",
        primaryDark: "#C98A0C",
        primaryLight: "#F5BC42",
        onPrimary: "#111111",
        tint: "#FDF1D6",
        background: "#F6F4EF",
        surface: "#FBFAF6",
        border: "#E3DCCB",
        muted: "#EEE8DA",
        textMuted: "#6B6455",
        textSoft: "#3D3A33",
      },
    },
    {
      id: "night-court",
      name: "Night Court",
      description: "Bold black with gold lettering",
      colors: {
        primary: "#161616",
        primaryDark: "#000000",
        primaryLight: "#3A3A3A",
        onPrimary: "#F5BC42",
        tint: "#F6EBCF",
        background: "#F3F3F1",
        surface: "#FAFAF8",
        border: "#DADAD5",
        muted: "#E8E8E3",
        textMuted: "#5F5F5A",
        textSoft: "#333330",
      },
    },
    {
      id: "trophy-bronze",
      name: "Trophy Bronze",
      description: "Deeper antique gold with white text",
      colors: {
        primary: "#9A6A0A",
        primaryDark: "#7A5307",
        primaryLight: "#C08A1E",
        onPrimary: "#FFFFFF",
        tint: "#F7ECD3",
        background: "#F5F2EB",
        surface: "#FBF9F4",
        border: "#E0D6C0",
        muted: "#ECE4D2",
        textMuted: "#665D4C",
        textSoft: "#3B3528",
      },
    },
    {
      id: "victory-red",
      name: "Victory Red",
      description: "Classic sports red on warm cream",
      colors: {
        primary: "#C1272D",
        primaryDark: "#9E1B20",
        primaryLight: "#E03A3F",
        onPrimary: "#FFFFFF",
        tint: "#F6E4E1",
        background: "#F5EFE6",
        surface: "#FAF7F2",
        border: "#E0D5C3",
        muted: "#EDE4D6",
        textMuted: "#6B5F52",
        textSoft: "#4A4038",
      },
    },
    {
      id: "track-blue",
      name: "Track Blue",
      description: "Cool athletic blue",
      colors: {
        primary: "#1D4ED8",
        primaryDark: "#1E3A8A",
        primaryLight: "#3B82F6",
        onPrimary: "#FFFFFF",
        tint: "#E0E7FF",
        background: "#EEF2F7",
        surface: "#F8FAFC",
        border: "#CBD5E1",
        muted: "#E2E8F0",
        textMuted: "#475569",
        textSoft: "#334155",
      },
    },
  ],
};
