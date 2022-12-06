import {
	syncAgentsHStoXimi,
	syncAgentsXimiToHS,
	syncClientsXimiToHS,
	syncContactsHStoXimi,
	syncDealsHStoXimi,
} from 'controllers/sync';
import cron from 'node-schedule';

// Every day at 00:00
cron.scheduleJob('0 0 * * *', syncClientsXimiToHS); // Sync Clients XIMI -> HS
cron.scheduleJob('15 0 * * *', syncAgentsXimiToHS); // Sync Agents XIMI -> HS

cron.scheduleJob('30 0 * * *', syncContactsHStoXimi); // Sync Contacts HS -> XIMI
cron.scheduleJob('40 0 * * *', syncAgentsHStoXimi); // Sync Agents HS -> XIMI


// Every 20 minutes
cron.scheduleJob('*/20 * * * *', syncDealsHStoXimi); // Sync Deals HS -> XIMI



