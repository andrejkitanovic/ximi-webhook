import { RequestHandler } from 'express';
import { writeInFile } from 'helpers/writeInFile';
import {
	ximiCreateAgent,
	ximiCreateClient,
	ximiGetRecentAgentsGraphql,
	ximiGetRecentClientsGraphql,
	ximiHSAgentExists,
	ximiHSExists,
	ximiSearchAgency,
	ximiUpdateAgent,
	ximiUpdateClient,
} from './ximi';
import './date';
import skillsJson from '../skills.json';
import contactOriginJson from '../contactSources.json';

import { HSClient, HSIntervenants, HSProspect } from './hubspot/types';
import { hsCreateContact, hsGetContacts, hsGetDeals, hsUpdateContact, hsXimiExists, hubspotClient } from './hubspot';
import { datePlus1DayUTC, dateUTC, findEarliestDate, getAge } from './date';
import { filterObject } from 'helpers/filter';
import { wait } from 'helpers/wait';
import dayjs from 'dayjs';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncClientsXimiToHS: RequestHandler | any = async (req, res, next) => {
	try {
		// const { Results: ximiIds } = await ximiGetClients();
		const ximiClients = await ximiGetRecentClientsGraphql();

		//Adds the client ID from REST API to the client object from GraphQL API
		// ximiClients = ximiClients.map(async (client: any) => {
		// 	//Searches through clients from REST API to find the item where GraphQLId from REST API matches client.id from GraphQL API
		// 	//Saves the ID
		// 	// const id = ximiIds.find(({ GraphQLId }: any) => GraphQLId === client.id)?.Id;

		// 	const id = await ximiHSExists(client.contact?.firstName + ' ' + client.contact?.lastName);

		// 	if (!id) {
		// 		console.log('no id found');
		// 		return;
		// 	}

		// 	await wait(500);

		// 	//Returns GraphQL client with id from REST API
		// 	return {
		// 		...client,
		// 		id,
		// 	};
		// });

		// ximiClients.forEach(async (client: any) => {
		// 	const id = await ximiHSExists(client.contact?.firstName + ' ' + client.contact?.lastName);

		// 	if (!id) {
		// 		console.log('no id found');
		// 		return;
		// 	}

		// 	client.id = id;

		// 	await wait(500);
		// });

		for await (const client of ximiClients) {
			const id = await ximiHSExists(client.contact?.firstName + ' ' + client.contact?.lastName);

			if (!id) {
				console.log('no id found');
				continue;
			}

			client.id = id;

			await wait(500);
		}

		console.log('✅ IDs retrieved', ximiClients.length);

		for await (const ximiClient of ximiClients) {
			const { contact } = ximiClient;
			const ximiID = ximiClient.id;

			// if (!ximiClient.email) continue;
			if (ximiClient.stage === 'LOST') {
				continue;
			}

			const civilite =
				contact.title === 'MRS'
					? 'Madame'
					: contact.title === 'MR'
					? 'Monsieur'
					: contact.title === 'MS'
					? 'Mademoiselle'
					: null;

			let categorie_client: 'Mandataire' | 'Prestataire' | undefined = undefined;

			if (ximiClient.modality.length) {
				if (ximiClient.modality[0] === 'PROVIDER') {
					categorie_client = 'Prestataire';
				} else categorie_client = 'Mandataire';
			}

			const interventions = ximiClient.interventions;
			const missions = ximiClient.missions;

			let date_de_la_premiere_intervention_chez_le_client: number | undefined = undefined;
			let derniere_intervention___nom_prestation: string | undefined = undefined;
			let nom_du_dernier_intervenant: string | undefined = undefined;

			if (interventions.length) {
				date_de_la_premiere_intervention_chez_le_client = findEarliestDate(
					interventions.map((intervention: any) => intervention.startDate)
				);

				if (interventions[0].agent) {
					nom_du_dernier_intervenant = `${interventions[0].agent.firstName} ${interventions[0].agent.lastName}`;
				}
			}
			if (missions.length) {
				derniere_intervention___nom_prestation = `${missions[0].label}`;
			}

			let origin = null;

			if (ximiClient?.contactSource?.displayName) {
				origin = ximiClient.contactSource.displayName;
			}

			let type_d_aide__recupere_de_ximi_ = undefined;

			if (ximiClient.coverageType) {
				type_d_aide__recupere_de_ximi_ = ximiClient.coverageType.type;
			}

			let agency = null;

			if (ximiClient.agency) {
				agency = ximiClient.agency.name;
			}

			let besoins = null;

			if (ximiClient.needs?.length) {
				besoins = ximiClient.needs.map((need: any) => need.name).join(';');
			}

			let nature_du_besoin = undefined;

			if (ximiClient.contractNature) {
				if (ximiClient.contractNature === 'RECURRENT') {
					nature_du_besoin = 'Prestation régulière';
				} else if (ximiClient.contractNature === 'ONE_SHOT') {
					nature_du_besoin = 'Prestation ponctuelle';
				}
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsClient: HSClient = {
				id_ximi: ximiID,
				age: contact.birthDate && getAge(contact.birthDate),
				date_of_birth: dayjs(contact.birthDate).format('DD/MM/YYYY'),
				date_de_naissance: contact.birthDate && dateUTC(contact.birthDate),
				gir: ximiClient.computedGIRSAAD > 0 ? ximiClient.computedGIRSAAD : null,
				categorie_client,
				type_de_contact: 'Client',
				type_de_contact_aidadomi: 'Client',
				firstname: contact.firstName,
				lastname: contact.lastName,
				city: ximiClient.address?.city,
				ville: ximiClient.address?.city,
				email: ximiClient.email,
				date_d_entree: ximiClient.entryDate && datePlus1DayUTC(ximiClient.entryDate),
				zip: ximiClient.address?.zip,
				besoins,
				personne_isolee: ximiClient.isIsolated ? 'true' : 'false',
				civilite: civilite,
				phone: ximiClient.phone,
				mobilephone: ximiClient.mobilePhone,
				hs_content_membership_status: ximiClient.status === 'ACTIV' ? 'active' : 'inactive',
				address: ximiClient.address?.street1 + ' ' + ximiClient.address?.building,
				date_de_la_derniere_intervention_realisee:
					ximiClient.lastInterventionDate && dateUTC(ximiClient.lastInterventionDate),
				date_de_fin_de_mission: ximiClient.lastMissionEnd && dateUTC(ximiClient.lastMissionEnd),
				date_de_la_premiere_intervention_chez_le_client,
				nom_du_dernier_intervenant,
				derniere_intervention___nom_prestation,
				origine_de_la_demande: origin,
				date_de_creation: ximiClient.cTime && dateUTC(ximiClient.cTime),
				situation_familiale_ximi: contact.familyStatus,
				entite: agency,
				nature_du_besoin,
				type_d_aide__recupere_de_ximi_,
				planning_ximi_contact: `https://app.ximi.xelya.io/AddiV4/Scheduler?viewType=WEEKLY&mode=Intervention&Clients=${ximiID}&resourceView=AGENT&PriorityAppointment=-1&Agencies=1,19&Types=1,10,11,20,21&InterventionStatus=0,1,2,-3&Services=1`,
			};

			let isSigned = false;

			//Check if Prospect and update type_de_contact if necessary
			if (ximiClient.stage === 'PROSPECT') {
				hsClient = {
					...hsClient,
					type_de_contact: 'Prospect',
					type_de_contact_aidadomi: 'Prospect',
				} as HSProspect;

				//Check if Mandate is signed
				if (ximiClient.mandateSigned) {
					isSigned = true;
				}
			}

			//Filter out null and undefined values
			hsClient = filterObject(hsClient);

			//Check if contact exists in Hubspot and return its ID
			const hsExists = await hsXimiExists(`${ximiID}`);

			if (hsExists) {
				console.log('Contact Exists:' + ' ' + hsExists);

				await hsUpdateContact(hsExists, hsClient);

				if (isSigned) {
					//If Mandate is signed, close all deals associated with the contact
					const { results: deals } = await hubspotClient.crm.contacts.associationsApi.getAll(hsExists, 'deal');

					for await (const deal of deals) {
						await hubspotClient.crm.deals.basicApi.update(deal.id, {
							properties: {
								dealstage: 'closedwon',
							},
						});
					}
				}
			} else {
				await hsCreateContact(hsClient);
			}

			await wait(500);
		}

		if (res) {
			res.json({
				message: 'Synced clients and propsects [XIMI] -> [HS]',
			});
		}
		console.log('Synced clients and propsects [XIMI] -> [HS]');
	} catch (err) {
		console.log(err);
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncAgentsXimiToHS: RequestHandler | any = async (req, res, next) => {
	console.log('STARTING AGENTS SYNC');
	try {
		// const { Results: ximiIds } = await ximiGetAgents();
		const ximiAgents = await ximiGetRecentAgentsGraphql();
		// ximiAgents = ximiAgents.map((agent: any) => {
		// 	const id = ximiIds.find(({ GraphQLId }: any) => GraphQLId === agent.id).Id;

		// 	return {
		// 		...agent,
		// 		id,
		// 	};
		// });

		for await (const agent of ximiAgents) {
			const id = await ximiHSAgentExists(agent.firstName + ' ' + agent.lastName);

			if (!id) {
				console.log('no id found');
				continue;
			}

			agent.id = id;

			await wait(500);
		}

		console.log('✅ IDs retrieved', ximiAgents.length);

		for await (const ximiAgent of ximiAgents) {
			const ximiID = ximiAgent.id;

			if (!ximiAgent.emailAddress1) continue;
			if (ximiAgent.stage === 'CANDIDATE') {
				continue;
			}

			const civilite =
				ximiAgent.title === 'MRS'
					? 'Madame'
					: ximiAgent.title === 'MR'
					? 'Monsieur'
					: ximiAgent.title === 'MR'
					? 'Mademoiselle'
					: null;

			const interventions = ximiAgent.interventions;
			// const missions = ximiAgent.missions;

			let date_de_la_premiere_intervention_chez_le_client: number | undefined = undefined;
			let nom_du_dernier_intervenant: string | undefined = undefined;

			if (interventions.length) {
				date_de_la_premiere_intervention_chez_le_client = findEarliestDate(
					interventions.map((intervention: any) => intervention.startDate)
				);
				if (interventions[0].agent) {
					nom_du_dernier_intervenant = `${interventions[0].agent.firstName} ${interventions[0].agent.lastName}`;
				}
			}
			let origin = null;

			if (ximiAgent?.contactSource?.displayName) {
				origin = ximiAgent.contactSource.displayName;
			}

			let agency = null;

			if (ximiAgent.agency?.length) {
				agency = ximiAgent.agency[0].name;
			}

			let skills = null;

			if (ximiAgent?.skills?.length) {
				skills = ximiAgent.skills.map((skill: any) => skill.name).join(';');
			}

			let typeDeContrat = null;

			if (ximiAgent.contracts?.length) {
				typeDeContrat = ximiAgent.contracts[0].type;
			}

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error
			let hsProperty: HSIntervenants = {
				id_ximi: ximiID,
				type_de_contact: 'Intervenant',
				type_de_contact_aidadomi: 'Intervenant',
				firstname: ximiAgent.firstName,
				lastname: ximiAgent.lastName,
				email: ximiAgent.emailAddress1,
				date_d_entree: ximiAgent.entryDate && dateUTC(ximiAgent.entryDate),
				phone: ximiAgent.homePhone,
				mobilephone: ximiAgent.mobilePhone,
				zip: ximiAgent.address?.zip || '',
				civilite: civilite,
				hs_content_membership_status: ximiAgent.status === 'ACTIVE' ? 'active' : 'inactive',
				age: ximiAgent.birthDate && getAge(ximiAgent.birthDate),
				date_of_birth: dayjs(ximiAgent.birthDate).format('DD/MM/YYYY'),
				date_de_naissance: ximiAgent.birthDate && dateUTC(ximiAgent.birthDate),
				address: ximiAgent.address?.street1 + ' ' + ximiAgent.address?.building,
				date_de_la_derniere_intervention_realisee:
					ximiAgent.lastInterventionDate && dateUTC(ximiAgent.lastInterventionDate),
				city: ximiAgent.address?.city,
				ville: ximiAgent.address?.city,
				date_de_creation: ximiAgent.cTime && dateUTC(ximiAgent.cTime),

				// personne_isolee: ximiClient.isIsolated ? 'true' : 'false',
				// civilite: civilite,
				type_de_contrat_ximi: typeDeContrat,
				// type_de_contrat: typeDeContrat,
				ximi_stade: ximiAgent.stage,
				date_de_la_premiere_intervention_chez_le_client,
				nom_du_dernier_intervenant,
				origine_de_la_demande: origin,
				entite: agency,
				competences: skills,
				planning_ximi_contact: `https://app.ximi.xelya.io/AddiV4/Scheduler?viewType=WEEKLY&mode=Intervention&Clients=${ximiID}&resourceView=AGENT&PriorityAppointment=-1&Agencies=1,19&Types=1,10,11,20,21&InterventionStatus=0,1,2,-3&Services=1`,
			};

			hsProperty = filterObject(hsProperty);

			const hsExists = await hsXimiExists(`${ximiID}`);

			if (hsExists) {
				console.log(`Contact exists: ${hsExists}`);

				await hsUpdateContact(hsExists, hsProperty);
			} else {
				const contactId = await hsCreateContact(hsProperty);

				if (contactId) {
					console.log('Property Created' + ' ' + contactId);
				}
			}

			await wait(500);
		}

		if (res) {
			res.json({
				message: 'Synced agents [XIMI] -> [HS]',
			});
		}
		console.log('Synced agents [XIMI] -> [HS]');
	} catch (err) {
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncContactsHStoXimi: RequestHandler | any = async (req, res, next) => {
	try {
		const clientContacts = await hsGetContacts('Client');
		const prospectContacts = await hsGetContacts('Prospect');
		// console.log('clientContacts', clientContacts[0].properties);
		// const intervenantContacts = await hsGetContacts('Intervenant');

		const contacts = [...clientContacts, ...prospectContacts];

		console.log('contacts', contacts.length);

		for await (const contactRaw of contacts) {
			const contact = filterObject(contactRaw.properties);

			const title =
				contact.civilite === 'Madame'
					? 2
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 3
					: null;

			let agency = null;
			let agencies = null;
			if (contact.entite) {
				agencies = await ximiSearchAgency(contact.entite);
			}

			if (agencies?.length) {
				agency = agencies[0].Id;
			}

			const contactNeeds = contact.besoins ? contact.besoins.split(';').map((need: string) => need.trim()) : [];

			//match each contactNeed to an item in skills.json by matching it to the Name field in the json file
			const needs = contactNeeds.map((need: string) => {
				const skill = skillsJson.find((skill: any) => skill.Name === need);
				return skill?.Id;
			});

			const contactOrigin = contactOriginJson.find((origin: any) => origin.Code === contact.origine_de_la_demande);
			const sourceId = contactOrigin?.Id;

			const ximiObject = filterObject({
				Type: 2,
				Stage: 1,
				Email: contact.email,
				HomePhone: contact.phone,
				Modality: contact.categorie_client
					? [contact.categorie_client === 'Prestataire' ? 'PROVIDER' : 'REPRESENTATIVE']
					: null,
				LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
				LastMissionEnd: contact.date_de_fin_de_mission,
				Status: contact.hs_content_membership_status
					? contact.hs_content_membership_status === 'active'
						? 'ACTIV'
						: 'INACTIV'
					: null,
				Contact: {
					Title: title,
					FirstName: contact.firstname,
					LastName: contact.lastname,
					BirthDate: contact.date_of_birth,
					MobilePhone: contact.mobilephone,
					FamilyStatus: contact.situation_familiale_ximi,
					EmailAddress1: contact.email,
					Nature: 'Client',
				},
				Address: {
					Zip: contact.zip ?? '',
					Street1: contact.address ?? 'None',
					City: contact.city || contact.ville || 'None',
				},
				AgencyId: agency,
				// Interventions
				isIsolated: contact.personne_isolee === 'true' ? true : contact.personne_isolee === 'false' ? false : null,
				computedGIRSAAD: contact.gir ? (parseInt(contact.gir) > 0 ? parseInt(contact.gir) : 0) : null,
				NeedsIds: needs,
				SourceId: sourceId,
			});

			//Seems modality and nature de besoins cannot be updated via REST API
			//Nor can Type d'aide
			//Age
			//Origin needs discussing
			//Status can't be set
			//GIR Can't be set

			let contactExists = null;

			contactExists = await ximiHSExists(contact.firstname + ' ' + contact.lastname);

			if (contactExists) {
				console.log(`Contact exists: ${contactExists}`);

				await ximiUpdateClient(contactExists, ximiObject);
			} else {
				const ximiID = await ximiCreateClient(ximiObject);
				console.log('Ximi Client Created' + ' ' + ximiID);
			}

			// await ximiCreateClient(ximiObject);
		}
	} catch (err) {
		console.log(err);
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncAgentsHStoXimi: RequestHandler | any = async (req, res, next) => {
	try {
		const intervenantContacts = await hsGetContacts('Intervenant');

		for await (const contactRaw of intervenantContacts) {
			const contact = filterObject(contactRaw.properties);

			let stage = null;
			if (contact.ximi_stade) {
				switch (contact.ximi_stade) {
					case 'CANDIDATE':
						stage = 0;
						break;
					case 'REFUSED_CANDIDATE':
						stage = 1;
						break;
					case 'AGENT':
						stage = 2;
						break;
					case 'LEFT_AGENT':
						stage = 3;
						break;
					case 'FIRED_AGENT':
						stage = 4;
						break;
					case 'EXTERNAL_AGENT':
						stage = 5;
						break;
					case 'ACCEPTED_CANDIDATE':
						stage = 6;
						break;
					default:
						break;
				}
			}

			const title =
				contact.civilite === 'Madame'
					? 2
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 3
					: null;

			let agency = null;
			const agencies = await ximiSearchAgency(contact.entite);

			if (agencies?.length) {
				agency = agencies[0].Id;
			}

			// const contactNeeds = contact.besoins.split(';').map((need: string) => need.trim());
			const contactCompetences = contact.competences
				? contact.competences.split(';').map((need: string) => need.trim())
				: [];

			//match each contactNeed to an item in skills.json by matching it to the Name field in the json file
			const skills = contactCompetences.map((competence: string) => {
				const skill = skillsJson.find((skill: any) => skill.Name === competence);
				// return skill?.Id;
				return {
					Id: skill?.Id,
					Active: skill?.Active,
					Comments: skill?.Comments,
					Name: skill?.Name,
				};
			});

			const contactOrigin = contactOriginJson.find((origin: any) => origin.Code === contact.origine_de_la_demande);
			const sourceId = contactOrigin?.Id;

			const ximiObject = filterObject({
				EmailAddress1: contact.email,
				HomePhone: contact.phone,
				LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
				Status: contact.hs_content_membership_status
					? contact.hs_content_membership_status === 'active'
						? 'ACTIVE'
						: 'INACTIVE'
					: null,
				Title: title,
				FirstName: contact.firstname,
				LastName: contact.lastname,
				BirthDate: contact.date_of_birth,
				MobilePhone: contact.phone,
				Address: {
					Zip: contact.zip ?? '',
					Street1: contact.address ?? 'None',
					City: contact.city || contact.ville || 'None',
				},
				AgencyId: agency,
				Skills: skills,
				SourceId: sourceId,
				// Stage: stage, //!!This cannot be changed by the API
			});

			// await ximiCreateAgent(ximiObject);

			let agentExists = null;

			agentExists = await ximiHSAgentExists(contact.firstname + ' ' + contact.lastname);

			if (agentExists) {
				console.log(`Contact exists: ${agentExists}`);
				await ximiUpdateAgent(agentExists, stage ? { ...ximiObject, Stage: stage } : ximiObject);
			} else {
				console.log(`Contact doesn't exist: ${agentExists}`);
				await ximiCreateAgent(ximiObject);
			}
		}
	} catch (err) {
		console.log(err);

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
		let deals = await hsGetDeals();
		deals = deals.filter((deal) => deal.properties.pipeline === 'default');

		for await (const deal of deals) {
			const { results: contactAssocations } = await hubspotClient.crm.deals.associationsApi.getAll(deal.id, 'contact');

			if (!contactAssocations.length) return;

			const contactId = contactAssocations[0].id;

			const { properties: contact } = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
				'age',
				'date_of_birth',
				'date_de_naissance',
				'gir',
				'categorie_client',
				'type_de_contact',
				'type_de_contact_aidadomi',
				'firstname',
				'lastname',
				'city',
				'ville',
				'email',
				'date_d_entree',
				'zip',
				'besoins',
				'personne_isolee',
				'civilite',
				'phone',
				'mobilephone',
				'hs_content_membership_status',
				'address',
				'date_de_la_derniere_intervention_realisee',
				'date_de_fin_de_mission',
				'date_de_la_premiere_intervention_chez_le_client',
				'nom_du_dernier_intervenant',
				'derniere_intervention___nom_prestation',
				'origine_de_la_demande',
				'date_de_creation',
				'situation_familiale_ximi',
			]);

			const title =
				contact.civilite === 'Madame'
					? 2
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 3
					: null;

			console.log('creating ximi', deal);

			let agency = null;
			const agencies = await ximiSearchAgency(contact.entite);

			if (agencies?.length) {
				agency = agencies[0].Id;
			}

			await ximiCreateClient(
				filterObject({
					Type: 2,
					Stage: 1,
					Email: contact.email,
					HomePhone: contact.phone,
					Modality: contact.categorie_client
						? [contact.categorie_client === 'Prestataire' ? 'PROVIDER' : 'REPRESENTATIVE']
						: null,
					LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
					LastMissionEnd: contact.date_de_fin_de_mission,
					Status: contact.hs_content_membership_status
						? contact.hs_content_membership_status === 'active'
							? 'ACTIV'
							: 'INACTIV'
						: null,
					Contact: {
						Title: title,
						FirstName: contact.firstname,
						LastName: contact.lastname,
						BirthDate: contact.date_of_birth,
						MobilePhone: contact.phone,
						FamilyStatus: contact.situation_familiale_ximi,
						EmailAddress1: contact.email,
						Nature: 'Client',
					},
					Address: {
						Zip: contact.zip ?? '',
						Street1: contact.address ?? 'None',
						City: contact.city || contact.ville || 'None',
					},
					AgencyId: agency,
					isIsolated: contact.personne_isolee === 'true' ? true : contact.personne_isolee === 'false' ? false : null,
					computedGIRSAAD: contact.gir ? (parseInt(contact.gir) > 0 ? parseInt(contact.gir) : 0) : null,
				})
			);
		}
	} catch (err) {
		console.log(err);

		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};

//TODO Add needs/competencies and Origin when syncing back to Ximi. Ask before doing this.
