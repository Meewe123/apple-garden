// @ts-check
/**
 * External links built from the restaurant data: maps, directions, phone.
 * Coordinates come from the plus code, so every service points to the same spot.
 */

/**
 * @param {{
 *   name: string,
 *   googleMapsUrl?: string,
 *   phone: { e164: string },
 *   geo: { lat: number, lng: number },
 *   address: { locality: string, region: string, plusCode: string, plusCodeFull: string },
 * }} restaurant
 */
export function buildLinks(restaurant) {
  const { lat, lng } = restaurant.geo;
  const coords = `${lat},${lng}`;
  const place = `${restaurant.name}, ${restaurant.address.plusCodeFull}`;

  return {
    tel: `tel:${restaurant.phone.e164}`,
    // A direct link to the listing, if one is set in the data; otherwise a search
    // by name and plus code, which lands on the same listing.
    googlePlace:
      restaurant.googleMapsUrl ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
    googleDirections: `https://www.google.com/maps/dir/?api=1&destination=${coords}`,
    yandexDirections: `https://yandex.uz/maps/?rtext=~${coords}&rtt=auto`,
    googleEmbed: `https://www.google.com/maps?q=${coords}&z=16&hl=ru&output=embed`,
  };
}

/**
 * Text for the "copy address" button: enough for a taxi driver or a friend
 * to find the place in any maps app.
 * @param {Parameters<typeof buildLinks>[0]} restaurant
 */
export function addressForCopy(restaurant) {
  const { name, address, geo } = restaurant;
  return `${name}, ${address.locality}, ${address.region}. Plus code: ${address.plusCodeFull}. Координаты: ${geo.lat}, ${geo.lng}`;
}
