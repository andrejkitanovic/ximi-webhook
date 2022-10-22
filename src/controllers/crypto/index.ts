import crypto, { KeyExportOptions } from 'crypto';
import util from 'util';

const generateKeyPair = util.promisify(crypto.generateKeyPair);

export async function generateCrpyto() {
	const exportOptions: KeyExportOptions<'pem'> = {
		format: 'pem',
		type: 'pkcs1',
	};

	const { publicKey } = await generateKeyPair('rsa', {
		modulusLength: 2048,
	});

	console.log('Keys: ');
	console.log(publicKey.export(exportOptions));
	// console.log(privateKey.export(exportOptions));
}
