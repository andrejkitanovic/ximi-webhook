import dotenv from 'dotenv';
import moduleAlias from 'module-alias';
import dayjs from 'dayjs';

dotenv.config();
moduleAlias.addAliases({
	helpers: __dirname + '/helpers',
	routes: __dirname + '/routes',
	models: __dirname + '/models',
	controllers: __dirname + '/controllers',
	middlewares: __dirname + '/middlewares',
	validators: __dirname + '/validators',
	utils: __dirname + '/utils',
});

import express from 'express';
import cors from 'cors';

// import storage from "helpers/storage";
import headersMiddleware from 'middlewares/headers';
import errorMiddleware from 'middlewares/error';
import connection from 'helpers/connection';

import routing from 'routes';
import { ximiGetRecentClientsGraphql } from 'controllers/ximi';
import { syncAgentsHStoXimi, syncAgentsXimiToHS, syncClientsXimiToHS, syncContactsHStoXimi } from 'controllers/sync';
// import 'controllers/cron';
// syncClientsXimiToHS();
// syncAgentsHStoXimi();
syncContactsHStoXimi();
// ximiGetRecentClientsGraphql()
// 	.then((res) =>
// 		console.log(
// 			dayjs(res[res.length - 1].mTime)
// 				.add(3, 'hour')
// 				.toString()
// 		)
// 	)
// 	.catch((err) => console.log(err));
// syncClientsXimiToHS();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// storage(app);
app.use(headersMiddleware);
app.use('/logs', express.static('file.log'));
routing(app);
app.use(errorMiddleware);

connection(app);
