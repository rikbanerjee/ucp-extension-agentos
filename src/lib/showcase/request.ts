import { createShowcaseGateway, isStorefrontId } from './fixture';
import { ShowcaseInputError } from './gateway';

export function gatewayForRequest(request: Request) {
  const storefrontId = request.headers.get('x-raos-storefront');
  const storefrontSessionId = request.headers.get('x-raos-storefront-session');
  if (!isStorefrontId(storefrontId)) throw new ShowcaseInputError('INVALID_STOREFRONT', 'Use a registered controlled storefront.');
  if (!storefrontSessionId || storefrontSessionId.length > 120) throw new ShowcaseInputError('INVALID_STOREFRONT_SESSION', 'Start a new storefront session.');
  return createShowcaseGateway(Date.now(), storefrontId, storefrontSessionId);
}
