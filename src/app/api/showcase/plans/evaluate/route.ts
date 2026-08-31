import { gatewayForRequest } from '@/lib/showcase/request';
import { ShowcaseInputError } from '@/lib/showcase/gateway';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) { try { const body = await request.json(); return Response.json(gatewayForRequest(request).evaluatePurchasePlan(body.lines, undefined, { budget: body.budget, substitutionsAllowed: body.substitutionsAllowed, requestedDeliveryWindow: body.requestedDeliveryWindow })); } catch (error) { return error instanceof ShowcaseInputError ? Response.json({ code: error.code, nextAction: error.message }, { status: 400 }) : Response.json({ code: 'INVALID_REQUEST', nextAction: 'Send valid JSON.' }, { status: 400 }); } }
