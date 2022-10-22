import fs from 'fs';
import dayjs from 'dayjs';

export const writeInFile = async ({ path, context }: { path: string; context?: any }) => {
	try {
		if (!context) return;
		let parsedContext = '****************\n';
		parsedContext += `[${dayjs().format('HH:mm:ss DD/MM/YYYY')}]\n`;
		parsedContext += JSON.stringify(context) + '\n';
		parsedContext += '****************\n';

		fs.appendFile(path, parsedContext, (err) => {
			if (err) {
				console.error(err);
				return;
			}
		});
	} catch (err) {
		console.log(err);
	}
};
