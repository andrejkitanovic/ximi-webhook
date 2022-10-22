import { syncAgentsXimiToHS, syncClientsXimiToHS } from 'controllers/sync';
import cron from 'node-schedule';

// Every day at 00:00
cron.scheduleJob('0 0 * * *', syncClientsXimiToHS); // Sync Clients XIMI -> HS
cron.scheduleJob('0 0 * * *', syncAgentsXimiToHS); // Sync Agents XIMI -> HS
