import { Router } from 'express';
import defineRoutes from 'helpers/defineRoutes';

import { syncAgentsXimiToHS, syncClientsXimiToHS } from 'controllers/sync';

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
]);

export default router;
