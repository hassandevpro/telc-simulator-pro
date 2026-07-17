/**
 * Coordonnées de contact / paiement manuel.
 * WhatsApp = canal direct pour acheter l'accès Pro (utile là où le paiement
 * en ligne n'est pas possible). Numéro au format international sans « + ».
 */
export const WHATSAPP_NUMBER = "237659646711"; // Cameroun (+237)
export const WHATSAPP_DISPLAY = "+237 659 646 711";

/** Lien wa.me avec message pré-rempli optionnel. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
