import {
	syncAgentsHStoXimi,
	syncAgentsXimiToHS,
	syncClientsXimiToHS,
	syncContactsHStoXimi,
	syncDealsHStoXimi,
} from 'controllers/sync';
import cron from 'node-schedule';

// Every day at 00:00
cron.scheduleJob('0 */2 * * *', syncClientsXimiToHS); // Sync Clients XIMI -> HS
cron.scheduleJob('15 */2 * * *', syncAgentsXimiToHS); // Sync Agents XIMI -> HS

cron.scheduleJob('30 */2 * * *', syncContactsHStoXimi); // Sync Contacts HS -> XIMI
cron.scheduleJob('40 */2 * * *', syncAgentsHStoXimi); // Sync Agents HS -> XIMI

// Every 20 minutes
cron.scheduleJob('*/20 * * * *', syncDealsHStoXimi); // Sync Deals HS -> XIMI
