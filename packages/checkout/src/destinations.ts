import type { FieldType } from '@tryghost/metafield-types';
import type { StripePort } from './field-ports.ts';

/**
 * What a port supplies, and what to call a field made to hold it. The types are a rule about
 * any destination: a port that returns an address can only be collected into a field that
 * keeps one, while a phone number goes into a short text field or a phone field. A phone field
 * keeps a number in one international form, and refuses one a wallet passes on without its
 * country code, which a short text field keeps as given. Their order doesn't matter: a field
 * made for a port starts as the first of them in the catalog's order.
 *
 * A key is not a port. `phone` is what Stripe calls what it returns; where it lands is
 * whatever the request said, and `Shipping Phone` is only how that field is listed.
 */
export const PORT_FIELD = {
  shipping_name: { key: 'shipping_name', name: 'Shipping Name', types: ['short_text'] },
  shipping_address: { key: 'shipping_address', name: 'Shipping Address', types: ['address'] },
  phone: { key: 'shipping_phone', name: 'Shipping Phone', types: ['short_text', 'phone'] },
} as const satisfies Record<
  StripePort,
  { key: string; name: string; types: readonly [FieldType, ...FieldType[]] }
>;

/** Whether a field of `type` can keep what `port` supplies. */
export function portTakes(port: StripePort, type: FieldType): boolean {
  const types: readonly FieldType[] = PORT_FIELD[port].types;
  return types.includes(type);
}
