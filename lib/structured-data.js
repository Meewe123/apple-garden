// @ts-check
/**
 * schema.org/Restaurant description for search engines (JSON-LD).
 * No rating here: Google's own reviews must not be re-published as ours.
 */

const SCHEMA_DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * @param {any} restaurant parsed restaurant.json
 * @param {{ imageUrl: string, mapUrl: string }} extra
 */
export function restaurantJsonLd(restaurant, { imageUrl, mapUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: `${restaurant.kind} с террасой в саду. ${restaurant.address.locality}, ${restaurant.address.region}.`,
    telephone: restaurant.phone.e164,
    image: imageUrl,
    hasMap: mapUrl,
    servesCuisine: restaurant.kitchen.map((/** @type {{ title: string }} */ k) => k.title),
    acceptsReservations: true,
    address: {
      "@type": "PostalAddress",
      addressLocality: restaurant.address.locality,
      addressRegion: restaurant.address.region,
      addressCountry: restaurant.address.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.geo.lat,
      longitude: restaurant.geo.lng,
    },
    openingHoursSpecification: restaurant.hours.map(
      (/** @type {{ days: number[], opens: string, closes: string }} */ rule) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: rule.days.map((d) => `https://schema.org/${SCHEMA_DAYS[d]}`),
        opens: rule.opens,
        closes: rule.closes,
      }),
    ),
  };
}

/**
 * JSON for an inline <script> data block. Escapes "<" so the content can never
 * close the script element early.
 * @param {unknown} value
 */
export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
