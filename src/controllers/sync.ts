import { RequestHandler } from 'express';
import { writeInFile } from 'helpers/writeInFile';
import {
	ximiCreateAgent,
	ximiCreateClient,
	ximiGetAgents,
	ximiGetAgentsGraphql,
	ximiGetClients,
	ximiGetClientsGraphql,
	ximiSearchAgency,
} from './ximi';
import './date';

import { HSClient, HSIntervenants, HSProspect } from './hubspot/types';
import { hsCreateContact, hsGetContacts, hsGetDeals, hsUpdateContact, hsXimiExists, hubspotClient } from './hubspot';
import { dateUTC, datePlus1DayUTC, getAge } from './date';
import { filterObject } from 'helpers/filter';
import { wait } from 'helpers/wait';
import dayjs from 'dayjs';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
export const syncClientsXimiToHS: RequestHandler | any = async (req, res, next) => {
	try {
		const { Results: ximiIds } = await ximiGetClients();
		let ximiClients = await ximiGetClientsGraphql();

		ximiClients = ximiClients.map((client: any) => {
			const id = ximiIds.find(({ GraphQLId }: any) => GraphQLId === client.id)?.Id;

			return {
				...client,
				id,
			};
		});

		for await (const ximiClient of ximiClients) {
			const { contact } = ximiClient;
			const ximiID = ximiClient.id;

			if (!ximiClient.email) continue;
			if (ximiClient.stage === 'LOST') {
				continue;
			}

			const civilite =
				contact.title === 'MRS'
					? 'Madame'
					: contact.title === 'MR'
					? 'Monsieur'
					: contact.title === 'MR'
					? 'Mademoiselle'
					: null;

			// let categorie: 'Cadre' | 'Non cadre' | undefined = undefined;
			let categorie_client: 'Mandataire' | 'Prestataire' | undefined = undefined;

			if (ximiClient.modality.length) {
				if (ximiClient.modality[0] === 'PROVIDER') {
					categorie_client = 'Mandataire';
				} else categorie_client = 'Prestataire';
			}

			const interventions = ximiClient.interventions;
			const missions = ximiClient.missions;

			let date_de_la_premiere_intervention_chez_le_client: Date | undefined = undefined;
			let derniere_intervention___nom_prestation: string | undefined = undefined;
			let nom_du_dernier_intervenant: string | undefined = undefined;

			if (interventions.length) {
				date_de_la_premiere_intervention_chez_le_client =
					interventions[0].startDate && dateUTC(interventions[0].startDate);

				if (interventions[0].agent) {
					nom_du_dernier_intervenant = `${interventions[0].agent.firstName} ${interventions[0].agent.lastName}`;
				}
			}
			if (missions.length) {
				derniere_intervention___nom_prestation = `${missions[0].label}`;
			}

			let origin = null;

			if (ximiClient?.contactSource?.internalType) {
				origin = ximiClient.contactSource.internalType;
			}

			let type_d_aide__ximi_ = undefined;

			if (ximiClient.coverageType) {
				type_d_aide__ximi_ = ximiClient.coverageType.type;
			}

			let agency = null;

			if (ximiClient.agency?.length) {
				agency = ximiClient.agency[0].name;
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
				date_d_entree: ximiClient.firstContactDate && datePlus1DayUTC(ximiClient.firstContactDate),
				zip: ximiClient.address?.zip,
				// besoins: ximiClient.needsDisplay?.replaceAll(', ', ';') ?? undefined,
				ximi_besoins: ximiClient.needsDisplay,
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
				derniere_intervention___nom_prestation,
				origine_de_la_demande_1: origin,
				date_de_creation: ximiClient.cTime && dateUTC(ximiClient.cTime),
				situation_familiale_1: contact.familyStatus,
				ximi_agency: agency,
				type_d_aide__ximi_,
				planning_ximi_contact: `https://app.ximi.xelya.io/AddiV4/Scheduler?viewType=WEEKLY&mode=Intervention&Clients=${ximiID}&date=2022-10-16&resourceView=AGENT&PriorityAppointment=-1&Agencies=1,19&Types=1,10,11,20,21&InterventionStatus=0,1,2,-3&Services=1`,
			};

			let isSigned = false;

			if (ximiClient.stage === 'PROSPECT') {
				hsClient = {
					...hsClient,
					type_de_contact: 'Prospect',
					type_de_contact_aidadomi: 'Prospect',
				} as HSProspect;

				if (ximiClient.mandateSigned) {
					isSigned = true;
				}
			}

			hsClient = filterObject(hsClient);

			console.log(hsClient)

			const hsExists = await hsXimiExists(`${ximiID}`, hsClient.email);

			if (hsExists) {
				console.log('Property Exists' + ' ' + hsExists);

				await hsUpdateContact(hsExists, hsClient);

				if (isSigned) {
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
	} catch (err) {
		console.log(err)
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

			const interventions = ximiAgent.interventions;
			// const missions = ximiAgent.missions;

			let date_de_la_premiere_intervention_chez_le_client: Date | undefined = undefined;
			let nom_du_dernier_intervenant: string | undefined = undefined;

			if (interventions.length) {
				date_de_la_premiere_intervention_chez_le_client =
					interventions[0].startDate && dateUTC(interventions[0].startDate);
				if (interventions[0].agent) {
					nom_du_dernier_intervenant = `${interventions[0].agent.firstName} ${interventions[0].agent.lastName}`;
				}
			}
			let origin = null;

			if (ximiAgent?.contactSource?.internalType) {
				origin = ximiAgent.contactSource.internalType;
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
				date_d_entree: ximiAgent.firstContactDate && datePlus1DayUTC(ximiAgent.firstContactDate),
				phone: ximiAgent.homePhone,
				mobilephone: ximiAgent.ximiAgent,
				zip: ximiAgent.address?.zip || '',
				civilite: civilite,
				hs_content_membership_status: ximiAgent.status === 'ACTIV' ? 'active' : 'inactive',
				age: ximiAgent.birthDate && getAge(ximiAgent.birthDate),
				date_of_birth: dayjs(ximiAgent.birthDate).format('DD/MM/YYYY'),
				date_de_naissance: ximiAgent.birthDate && dateUTC(ximiAgent.birthDate),
				address: ximiAgent.address?.street1 + ' ' + ximiAgent.address?.building,
				date_de_la_derniere_intervention_realisee:
					ximiAgent.lastInterventionDate && dateUTC(ximiAgent.lastInterventionDate),
				city: ximiAgent.address?.city,
				ville: ximiAgent.address?.city,
				date_de_creation: ximiAgent.cTime && dateUTC(ximiAgent.cTime),

				ximi_besoins: ximiAgent.needsDisplay,
				// personne_isolee: ximiClient.isIsolated ? 'true' : 'false',
				// civilite: civilite,
				type_de_contrat: typeDeContrat,
				ximi_stade: ximiAgent.stage,
				date_de_la_premiere_intervention_chez_le_client,
				nom_du_dernier_intervenant,
				origine_de_la_demande_1: origin,
				ximi_agency: agency,
				ximi_competences: skills,
				planning_ximi_contact: `https://app.ximi.xelya.io/AddiV4/Scheduler?viewType=WEEKLY&mode=Intervention&Clients=${ximiID}&date=2022-10-16&resourceView=AGENT&PriorityAppointment=-1&Agencies=1,19&Types=1,10,11,20,21&InterventionStatus=0,1,2,-3&Services=1`,
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
export const syncContactsHStoXimi: RequestHandler | any = async (req, res, next) => {
	try {
		const clientContacts = await hsGetContacts('Client');
		// const intervenantContacts = await hsGetContacts('Intervenant');

		// const contacts = [...clientContacts, ...intervenantContacts];

		for await (const contactRaw of clientContacts) {
			const contact = filterObject(contactRaw.properties);

			const title =
				contact.civilite === 'Madame'
					? 0
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 1
					: null;

			const ximiObject = filterObject({
				Type: 2,
				Stage: 1,
				Email: contact.email,
				HomePhone: contact.phone,
				Modality: contact.cateogire ? [contact.cateogire === 'Cadre' ? 'MANDATARY' : 'PROVIDER'] : null,
				LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
				LastMissionEnd: contact.date_de_fin_de_mission,
				// ContactSource
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
					FamilyStatus: contact.situation_familiale_1,
					EmailAddress1: contact.email,
					Nature: 'Client',
				},
				Address: {
					Zip: contact.zip ?? '',
					Street1: contact.address ?? 'None',
					City: contact.city || contact.ville || 'None',
					// Building:
				},
				// Interventions
				// NeedsStr: contact.ximi_besoins,
				isIsolated: contact.personne_isolee === 'true' ? true : contact.personne_isolee === 'false' ? false : null,
				computedGIRSAAD: contact.gir ? (parseInt(contact.gir) > 0 ? parseInt(contact.gir) : 0) : null,
			});

			await ximiCreateClient(ximiObject);
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
export const syncAgentsHStoXimi: RequestHandler | any = async (req, res, next) => {
	try {
		const intervenantContacts = await hsGetContacts('Intervenant');

		for await (const contactRaw of intervenantContacts) {
			const contact = filterObject(contactRaw.properties);

			const title =
				contact.civilite === 'Madame'
					? 0
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 1
					: null;

			let agency = null;
			const agencies = await ximiSearchAgency(contact.ximi_agency);

			if (agencies?.length) {
				agency = agencies[0].Id;
			}

			const ximiObject = filterObject({
				EmailAddress1: contact.email,
				HomePhone: contact.phone,
				LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
				// ContactSource
				Status: contact.hs_content_membership_status
					? contact.hs_content_membership_status === 'active'
						? 'ACTIV'
						: 'INACTIV'
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
					// Building:
				},
				AgencyId: agency,
				// Interventions
			});

			await ximiCreateAgent(ximiObject);
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
				'age',
				'date_of_birth',
				'date_de_naissance',
				'gir',
				'categorie',
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
				'origine_de_la_demande_1',
				'date_de_creation',
				'situation_familiale_1',
			]);

			const title =
				contact.civilite === 'Madame'
					? 0
					: contact.civilite === 'Monsieur'
					? 1
					: contact.civilite === 'Mademoiselle'
					? 1
					: null;

			console.log('creating ximi', deal);

			await ximiCreateClient({
				Type: 2,
				Stage: 0,
				Email: contact.email,
				HomePhone: contact.phone,
				Modality: contact.cateogire ? [contact.cateogire === 'Cadre' ? 'MANDATARY' : 'PROVIDER'] : null,
				LastInterventionDate: contact.date_de_la_derniere_intervention_realisee,
				LastMissionEnd: contact.date_de_fin_de_mission,
				// ContactSource
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
					FamilyStatus: contact.situation_familiale_1,
					EmailAddress1: contact.email,
					Nature: 'Client',
				},
				Address: {
					Zip: contact.zip ?? '',
					Street1: contact.address ?? 'None',
					City: contact.city || contact.ville || 'None',
					// Building:
				},
				// Interventions
				// NeedsStr: contact.ximi_besoins,
				isIsolated: contact.personne_isolee === 'true' ? true : contact.personne_isolee === 'false' ? false : null,
				computedGIRSAAD: contact.gir ? (parseInt(contact.gir) > 0 ? parseInt(contact.gir) : 0) : null,
			});
		}
	} catch (err) {
		await writeInFile({ path: 'file.log', context: '[ERROR]' + JSON.stringify(err) });

		if (next) {
			next(err);
		}
	}
};
