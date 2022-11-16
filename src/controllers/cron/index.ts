import { syncAgentsXimiToHS, syncClientsXimiToHS, syncDealsHStoXimi } from 'controllers/sync';
import cron from 'node-schedule';

// Every day at 00:00
cron.scheduleJob('0 0 * * *', syncClientsXimiToHS); // Sync Clients XIMI -> HS
cron.scheduleJob('15 0 * * *', syncAgentsXimiToHS); // Sync Agents XIMI -> HS
cron.scheduleJob('30 0 * * *', syncDealsHStoXimi); // Sync Agents HS -> XIMI
