import { RequestHandler } from 'express';
import { writeInFile } from 'helpers/writeInFile';
import { ximiCreateClient, ximiGetAgents, ximiGetAgentsGraphql, ximiGetClients, ximiGetClientsGraphql } from './ximi';
import './date';

import { HSClient, HSIntervenants, HSProspect } from './hubspot/types';
import {
	hsCreateContact,
	hsCreateContactNote,
	hsGetDeals,
	hsUpdateContact,
	hsXimiExists,
	hubspotClient,
} from './hubspot';
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

			let categorie: 'Cadre' | 'Non cadre' | undefined = undefined;

			if (ximiClient.modality.length) {
				if (ximiClient.modality[0] === 'M') {
					categorie = 'Cadre';
				} else categorie = 'Non cadre';
			}

			const interventions = ximiClient.interventions;

			let date_de_la_premiere_intervention_chez_le_client: Date | undefined = undefined;
			let nom_du_dernier_intervenant: string | undefined = undefined;

			if (interventions.length) {
				date_de_la_premiere_intervention_chez_le_client =
					interventions[0].startDate && dateUTC(interventions[0].startDate);
				if (interventions[0].agent) {
					nom_du_dernier_intervenant = `${interventions[0].agent.firstName} ${interventions[0].agent.lastName}`;
				}
			}

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsClient: HSClient = {
				id_ximi: ximiID,
				ne_e__le: ximiClient.birthDate,
				age: ximiClient.birthDate && getAge(ximiClient.birthDate),
				date_of_birth: ximiClient.birthDate,
				gir: ximiClient.computedGIRSAAD > 0 ? ximiClient.computedGIRSAAD : null,
				categorie,
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
				date_de_la_derniere_intervention_realisee:
					ximiClient.lastInterventionDate && dateUTC(ximiClient.lastInterventionDate),
				date_de_fin_de_mission: ximiClient.lastMissionEnd && dateUTC(ximiClient.lastMissionEnd),
				date_de_la_premiere_intervention_chez_le_client,
				nom_du_dernier_intervenant,
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
				date_de_la_derniere_intervention_realisee:
					ximiAgent.lastInterventionDate && dateUTC(ximiAgent.lastInterventionDate),
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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncDealsHStoXimi: RequestHandler | any = async (req, res, next) => {
	try {
		const deals = await hsGetDeals();

		for await (const deal of deals) {
			const { results: contactAssocations } = await hubspotClient.crm.deals.associationsApi.getAll(deal.id, 'contact');

			if (!contactAssocations.length) return;

			const contactId = contactAssocations[0].id;

			const { properties: contact } = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
				'firstname',
				'lastname',
				'gir',
				'date_d_entree',
				'email',
				'civilite',
				'phone',
				'mobilephone',
				'hs_content_membership_status',
				'date_of_birth',
				'address',
				'zip',
				'city',
			]);

			console.log(contact);

			await ximiCreateClient({
				Type: 2,
				// 	status: '',
				Email: contact.email,
				// 	homePhone: '',
				Contact: {
					Title: 1,
					FirstName: contact.firstname,
					LastName: contact.lastname,
					BirthDate: contact.date_of_birth,
					// title: contact.civilite,
					MobilePhone: contact.phone,
					// familyStatus: '',
					EmailAddress1: contact.email,
				},
				Address: {
					Zip: contact.zip ?? '',
					Street1: contact.address ?? '',
					City: contact.city ?? '',
				},
				// 	needsStr: '',
				// 	isIsolated: '',
				// 	computedGIRSAAD: '',
			});
		}
	} catch (err) {
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};
