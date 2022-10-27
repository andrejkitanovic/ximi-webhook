import { Router } from 'express';
import defineRoutes from 'helpers/defineRoutes';

import { syncAgentsXimiToHS, syncClientsXimiToHS, syncDealsHStoXimi } from 'controllers/sync';

const router = Router();
defineRoutes(router, [
	{
		method: 'get',
		route: '/clients-prospects/ximi-hs',
		controller: syncClientsXimiToHS,
	},
	{
		method: 'get',
		route: '/agents/ximi-hs',
		controller: syncAgentsXimiToHS,
	},
	{
		method: 'get',
		route: '/deals/hs-ximi',
		controller: syncDealsHStoXimi,
	},
]);

export default router;
