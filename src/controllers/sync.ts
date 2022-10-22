import { RequestHandler } from 'express';
import { writeInFile } from 'helpers/writeInFile';
import { ximiGetClients, ximiGetAgents, ximiGetQuote } from './ximi';
import './date';

import { HSClient, HSIntervenants, HSProspect, HSProperty } from './hubspot/types';
import { hsCreateContact, hsCreateContactNote, hsXimiExists } from './hubspot';
import { dateUTC, getAge } from './date';
import { filterObject } from 'helpers/filter';
import { wait } from 'helpers/wait';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncClientsXimiToHS: RequestHandler | any = async (req, res, next) => {
	try {
		const { Results: ximiClients } = await ximiGetClients();

		for await (const ximiClient of ximiClients) {
			const { Contact } = ximiClient;
			const ximiID = ximiClient.Id;

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			const hsProperty: HSProperty = {
				id_ximi: ximiID,
				firstname: Contact.FirstName,
				lastname: Contact.LastName,
				email: Contact.EmailAddress1 || Contact.EmailAddress2 || Contact.EmailAddress3,
				date_d_entree: ximiClient.CTime && dateUTC(ximiClient.CTime),
				adresse_agence_de_proximite: '', // No contact with company
				telephone_agence_de_proximite: '', // No contact with company
				// gir: 1, // hardcoded
				// nom_du_dernier_intervenant: '', // hardcoded
				// civilite: '', // hardcoded
				// origine_de_la_demande: 'Autre', // hardcoded
			};

			if (!hsProperty.email) {
				// Required fields
				continue;
			}

			let hsClient = {
				...hsProperty,
				type_de_contact: 'Client',
				zip: Contact.Address?.Zip,
				date_de_la_premiere_intervention_chez_le_client: ximiClient && dateUTC(ximiClient.FirstContactDate),
				age: ximiClient.BirthDate && getAge(ximiClient.BirthDate),
				// categorie: 'Cadre', // hardcoded
				// categorie_client: 'Mandataire', // hardcoded
				// agence: 'Arles', // hardcoded
				// segmentation_client: 'PA', // hardcoded
				// sous_segmentation_client: 'APA', // hardcoded
				// besoins: 'Bricolage', // hardcoded
				// situation_familiale: 'Divorcé(e)', // hardcoded
				// personne_isolee: 'true', // hardcoded
			} as HSClient;

			hsClient = filterObject(hsClient);

			const hsExists = await hsXimiExists(`${ximiID}`, hsClient.email);

			if (hsExists) {
				console.log('Property Exists' + ' ' + hsExists);
			} else {
				const contactId = await hsCreateContact(hsClient);

				if (contactId) {
					await hsCreateContactNote(contactId, ximiID);
				}
			}

			const hasQuote = await ximiGetQuote(ximiID);

			if (hasQuote) {
				const hsPropsect = {
					...hsProperty,
					type_de_contact: 'Prospect',
					age: ximiClient.BirthDate && getAge(ximiClient.BirthDate),
					// createdate: dateUTC('06/05/2022'), // hardcoded
					// segmentation_client: 'PA', // hardcoded
					// sous_segmentation_client: 'APA', // hardcoded
					// besoins: 'Bricolage', // hardcoded
					// situation_familiale: 'Divorcé(e)', // hardcoded
					// personne_isolee: 'true', // hardcoded
				} as HSProspect;

				console.log(hsPropsect);
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
		const { Results: ximiAgents } = await ximiGetAgents();

		for await (const ximiAgent of ximiAgents) {
			const ximiID = ximiAgent.Id;

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsProperty: HSIntervenants = {
				id_ximi: ximiID,
				firstname: ximiAgent.FirstName,
				lastname: ximiAgent.LastName,
				email: ximiAgent.EmailAddress1 || ximiAgent.EmailAddress2 || ximiAgent.EmailAddress3,
				date_d_entree: ximiAgent.CTime && dateUTC(ximiAgent.CTime),
				adresse_agence_de_proximite: '', // No contact with company
				telephone_agence_de_proximite: '', // No contact with company
				// gir: 1, // hardcoded
				// nom_du_dernier_intervenant: '', // hardcoded
				// civilite: '', // hardcoded
				// origine_de_la_demande: 'Autre', // hardcoded
				type_de_contact: 'Intervenant',
				zip: ximiAgent.Address?.Zip || '',
				// stade: '', // hardcoded
				// agence: 'Arles', // hardcoded
				// competences: '', // hardcoded
			};

			if (!hsProperty.email) {
				// Required fields
				continue;
			}

			hsProperty = filterObject(hsProperty);

			const hsExists = await hsXimiExists(`${ximiID}`, hsProperty.email);

			if (hsExists) {
				console.log('Property Exists' + ' ' + hsExists);
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
