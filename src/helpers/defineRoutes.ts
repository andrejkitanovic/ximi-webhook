import { IRouter, RequestHandler } from 'express';
import { ValidationChain } from 'express-validator';

import validatorMiddleware from 'middlewares/validator';
import loggerMiddleware from 'middlewares/logger';

interface IRoute {
	method: 'get' | 'post' | 'put' | 'patch' | 'delete';
	route: string;
	validator?: ValidationChain[];
	controller: RequestHandler;
}

const defineRoutes = (router: IRouter, routes: IRoute[]) => {
	routes.forEach(({ method, route, validator, controller }) => {
		const additionalRoutes = [];

		if (validator) {
			additionalRoutes.push(validator, validatorMiddleware);
		}

		router[method](route, loggerMiddleware, ...additionalRoutes, controller);
	});
};

export default defineRoutes;
