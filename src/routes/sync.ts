import { Router } from 'express';
import defineRoutes from 'helpers/defineRoutes';

import {
	syncAgentsHStoXimi,
	syncAgentsXimiToHS,
	syncClientsXimiToHS,
	syncContactsHStoXimi,
	syncDealsHStoXimi,
} from 'controllers/sync';

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
	{
		method: 'get',
		route: '/contacts/hs-ximi',
		controller: syncContactsHStoXimi,
	},
	{
		method: 'get',
		route: '/agents/hs-ximi',
		controller: syncAgentsHStoXimi,
	},
]);

export default router;
