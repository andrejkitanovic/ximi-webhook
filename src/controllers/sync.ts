import { RequestHandler } from 'express';
import { writeInFile } from 'helpers/writeInFile';
import { ximiGetAgents, ximiGetAgentsGraphql, ximiGetClients, ximiGetClientsGraphql } from './ximi';
import './date';

import { HSClient, HSIntervenants, HSProspect } from './hubspot/types';
import { hsCreateContact, hsCreateContactNote, hsUpdateContact, hsXimiExists } from './hubspot';
import { dateUTC, getAge } from './date';
import { filterObject } from 'helpers/filter';
import { wait } from 'helpers/wait';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncClientsXimiToHS: RequestHandler | any = async (req, res, next) => {
	try {
		const { Results: ximiIds } = await ximiGetClients();
		let ximiClients = await ximiGetClientsGraphql();
		ximiClients = ximiClients.map((client: any) => {
			const id = ximiIds.find(({ GraphQLId }: any) => GraphQLId === client.id).Id;

			return {
				...client,
				id,
			};
		});

		for await (const ximiClient of ximiClients) {
			const { contact } = ximiClient;
			const ximiID = ximiClient.id;

			if (!ximiClient.email) continue;

			const civilite =
				contact.title === 'MRS'
					? 'Madame'
					: contact.title === 'MR'
					? 'Monsieur'
					: contact.title === 'MR'
					? 'Mademoiselle'
					: null;

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsClient: HSClient = {
				id_ximi: ximiID,
				age: ximiClient.birthDate && getAge(ximiClient.birthDate),
				date_of_birth: ximiClient.birthDate,
				gir: ximiClient.computedGIRSAAD > 0 ? ximiClient.computedGIRSAAD : null,
				type_de_contact: 'Client',
				type_de_contact_aidadomi: 'Client',
				firstname: contact.firstName,
				lastname: contact.lastName,
				email: ximiClient.email,
				date_d_entree: ximiClient.cTime && dateUTC(ximiClient.cTime),
				zip: ximiClient.address.zip,
				besoins: contact.needsStr,
				personne_isolee: ximiClient.isIsolated ? 'true' : 'false',
				civilite: civilite,
				phone: ximiClient.homePhone,
				mobilephone: ximiClient.phone,
				hs_content_membership_status: ximiClient.status === 'ACTIV' ? 'active' : 'inactive',
				address: ximiClient.address?.street1 + ' ' + ximiClient.address?.building,
				// situation_familiale: contact.familyStatus === "NONE" ? "" : contact.familyStatus
			};

			if (ximiClient.stage === 'PROSPECT') {
				hsClient = {
					...hsClient,
					type_de_contact: 'Prospect',
					type_de_contact_aidadomi: 'Prospect',
				} as HSProspect;
			}

			hsClient = filterObject(hsClient);

			const hsExists = await hsXimiExists(`${ximiID}`, hsClient.email);

			if (hsExists) {
				console.log('Property Exists' + ' ' + hsExists);

				await hsUpdateContact(hsExists, hsClient);
			} else {
				const contactId = await hsCreateContact(hsClient);

				if (contactId) {
					await hsCreateContactNote(contactId, ximiID);
				}
			}

			await wait(500);
		}

		if (res) {
			res.json({
				message: 'Synced clients and propsects [XIMI] -> [HS]',
			});
		}
	} catch (err) {
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncAgentsXimiToHS: RequestHandler | any = async (req, res, next) => {
	try {
		const { Results: ximiIds } = await ximiGetAgents();
		let ximiAgents = await ximiGetAgentsGraphql();
		ximiAgents = ximiAgents.map((agent: any) => {
			const id = ximiIds.find(({ GraphQLId }: any) => GraphQLId === agent.id).Id;

			return {
				...agent,
				id,
			};
		});

		for await (const ximiAgent of ximiAgents) {
			const ximiID = ximiAgent.id;

			if (!ximiAgent.emailAddress1) continue;

			const civilite =
				ximiAgent.title === 'MRS'
					? 'Madame'
					: ximiAgent.title === 'MR'
					? 'Monsieur'
					: ximiAgent.title === 'MR'
					? 'Mademoiselle'
					: null;

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsProperty: HSIntervenants = {
				id_ximi: ximiID,
				type_de_contact: 'Intervenant',
				firstname: ximiAgent.firstName,
				lastname: ximiAgent.lastName,
				email: ximiAgent.emailAddress1,
				date_d_entree: ximiAgent.cTime && dateUTC(ximiAgent.cTime),
				mobilephone: ximiAgent.phone,
				zip: ximiAgent.address?.zip || '',
				civilite: civilite,
				hs_content_membership_status: ximiAgent.status === 'ACTIV' ? 'active' : 'inactive',
				age: ximiAgent.birthDate && getAge(ximiAgent.birthDate),
				date_of_birth: ximiAgent.birthDate,
				address: ximiAgent.address?.street1 + ' ' + ximiAgent.address?.building,
			};

			hsProperty = filterObject(hsProperty);

			const hsExists = await hsXimiExists(`${ximiID}`, hsProperty.email);

			if (hsExists) {
				console.log(`Property Exists ${hsExists}`);

				await hsUpdateContact(hsExists, hsProperty);
			} else {
				const contactId = await hsCreateContact(hsProperty);

				if (contactId) {
					console.log('Property Created' + ' ' + contactId);
					await hsCreateContactNote(contactId, ximiID);
				}
			}

			await wait(500);
		}

		if (res) {
			res.json({
				message: 'Synced agents [XIMI] -> [HS]',
			});
		}
	} catch (err) {
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};
