import { gatewayForRequest } from '@/lib/showcase/request';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) { try { return Response.json(gatewayForRequest(request).getStorefrontCapabilities()); } catch (error) { return Response.json({ code: 'INVALID_STOREFRONT', nextAction: error instanceof Error ? error.message : 'Start a new storefront session.' }, { status: 400 }); } }
