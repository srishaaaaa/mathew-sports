// ─────────────────────────────────────────────────────────────────
//  BRANCH 2 — Vybe Girl (POS 2, served at "/pos2")
// ─────────────────────────────────────────────────────────────────
//  Everything Branch 2 shows (terminal, invoices, WhatsApp messages,
//  installed app, theme presets) comes from this file.
//  POS 1 (Matthew Sports) is not affected by anything here.
//  Leave a contact field as "" to hide it on the invoice.
// ─────────────────────────────────────────────────────────────────
import type { BranchConfig } from "./types";

export const BRANCH: BranchConfig = {
  id: "pos2",
  shopName: "Vybe Girl",
  shortName: "Vybe Girl",
  tagline: "Perumathura, Trivandrum",

  ownerName: "",
  shopPhone: "+91 90742 38044",
  phone: "+91 87145 53441",
  email: "",
  address: "Veli, Perumathura Road, Perumathura, Trivandrum - 695303",
  instagram: "",

  // Branch 2's own files — never shared with Branch 1.
  logo: "/pos2/logo.png",
  logoMark: "/pos2/logo.png",
  logoOnLight: "/pos2/logo-light.png",
  logoBackground: "#FCF3EA",
  icons: {
    icon192: "/pos2/icon-192.png",
    icon512: "/pos2/icon-512.png",
    maskable512: "/pos2/icon-maskable-512.png",
    apple: "/pos2/apple-icon.png",
  },

  invoicePrefix: "VG",
  homePath: "/pos2",

  // Presets drawn from the logo: rose gold, black and soft cream.
  defaultThemeId: "rose-gold",
  themes: [
    {
      id: "rose-gold",
      name: "Rose Gold",
      description: "Logo rose-gold on soft cream — the signature look",
      colors: {
        primary: "#A9644C",
        primaryDark: "#8A4E3A",
        primaryLight: "#D29A80",
        onPrimary: "#FFFFFF",
        tint: "#F8E6DC",
        background: "#FCF3EA",
        surface: "#FFFAF5",
        border: "#EBD8C8",
        muted: "#F4E6D9",
        textMuted: "#7A6255",
        textSoft: "#4A3A32",
      },
    },
    {
      id: "noir-rose",
      name: "Noir & Rose",
      description: "Black with rose-gold lettering, like the badge",
      colors: {
        primary: "#1A1212",
        primaryDark: "#000000",
        primaryLight: "#3B2C28",
        onPrimary: "#E3A98C",
        tint: "#F6E2D8",
        background: "#FAF4EE",
        surface: "#FFFBF7",
        border: "#E6D6CA",
        muted: "#F1E5DB",
        textMuted: "#6E5D55",
        textSoft: "#3E322D",
      },
    },
    {
      id: "champagne",
      name: "Champagne",
      description: "Light rose-champagne with dark text",
      colors: {
        primary: "#E0A98E",
        primaryDark: "#C98D71",
        primaryLight: "#EEC3AE",
        onPrimary: "#1A1212",
        tint: "#FBEDE5",
        background: "#FDF7F1",
        surface: "#FFFCF9",
        border: "#EEDDD0",
        muted: "#F6EBE2",
        textMuted: "#7A655A",
        textSoft: "#4A3B34",
      },
    },
    {
      id: "blush",
      name: "Blush Pink",
      description: "Feminine pink accent",
      colors: {
        primary: "#B83B6B",
        primaryDark: "#922B53",
        primaryLight: "#DB6A95",
        onPrimary: "#FFFFFF",
        tint: "#FBE3EC",
        background: "#FCF3F6",
        surface: "#FFFAFC",
        border: "#EED3DD",
        muted: "#F6E4EB",
        textMuted: "#765764",
        textSoft: "#47343C",
      },
    },
    {
      id: "plum",
      name: "Royal Plum",
      description: "Deep plum, regal like the crown",
      colors: {
        primary: "#6D2E5B",
        primaryDark: "#521F44",
        primaryLight: "#9A5086",
        onPrimary: "#FFFFFF",
        tint: "#F1E1EC",
        background: "#F8F3F6",
        surface: "#FDFAFC",
        border: "#E2D2DD",
        muted: "#EFE3EB",
        textMuted: "#6A5763",
        textSoft: "#3F313A",
      },
    },
  ],
};
