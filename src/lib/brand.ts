/** Nome e contato da marca em um só lugar. O e-mail só aparece se estiver configurado. */
export const BRAND = {
  name: "Gê",
  tagline: "gestão de beleza que brilha",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
} as const;
