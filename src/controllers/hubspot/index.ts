import { Client } from '@hubspot/api-client';
import { Filter, FilterGroup } from '@hubspot/api-client/lib/codegen/crm/contacts';
import axiosDefault from 'axios';
import { dateUTC } from 'controllers/date';
import dayjs from 'dayjs';

const axios = axiosDefault.create({
	baseURL: 'https://api.hubapi.com',
	headers: {
		Authorization: `Bearer ${process.env.HS_ACCESS_KEY}`,
	},
});

export const hubspotClient = new Client({ accessToken: process.env.HS_ACCESS_KEY });

const searchFilter = ({
	value,
	properties,
	propertyName = 'id_ximi',
}: {
	value: string;
	properties: string[];
	propertyName?: string;
}) => {
	const filter: Filter = { propertyName, operator: 'EQ', value };
	const filterGroup: FilterGroup = { filters: [filter] };

	return {
		filterGroups: [filterGroup],
		properties,
		limit: 1,
		sorts: [properties[0]],
		after: 0,
	};
};

export const hsSearchByEmail = async (email: string) => {
	try {
		const { data } = await axios.get(`/contacts/v1/contact/email/${email}/profile`);

		return data.vid;
	} catch (err) {
		// console.log(err);
		return false;
	}
};

export const hsXimiExists = async (ximiID: string, email: string) => {
	try {
		const filterId = searchFilter({ value: ximiID, properties: ['id_ximi'] });
		const resultId = await hubspotClient.crm.contacts.searchApi.doSearch(filterId);

		const emailResult = await hsSearchByEmail(email);

		return resultId.results?.[0]?.id || emailResult;
	} catch (err: any) {
		console.error('SEARCH CONTACT ERROR');
		return true;
	}
};

export const hsCreateContact = async (properties: any) => {
	try {
		const result = await hubspotClient.crm.contacts.basicApi.create({
			properties,
		});

		return result.id;
	} catch (err: any) {
		console.error('CREATE CONTACT ERROR', err.body);
		return false;
	}
};

export const hsUpdateContact = async (id: string, properties: any) => {
	try {
		console.log('update contact', id);
		const result = await hubspotClient.crm.contacts.basicApi.update(id, {
			properties,
		});

		return result.id;
	} catch (err: any) {
		console.error('UPDATE CONTACT ERROR', err.body);
		return false;
	}
};

export const hsCreateContactNote = async (contactId: string, ximiId: string) => {
	try {
		const { id: noteId } = await hubspotClient.crm.objects.notes.basicApi.create({
			properties: {
				hs_timestamp: new Date().toISOString(),
				hs_note_body: `<a href="https://app.ximi.xelya.io/AddiV4/Scheduler?viewType=WEEKLY&mode=Intervention&Clients=${ximiId}&date=2022-10-16&resourceView=AGENT&PriorityAppointment=-1&Agencies=1,19&Types=1,10,11,20,21&InterventionStatus=0,1,2,-3&Services=1">[XIMI] Timetable Link</a>`,
			},
		});
		await hubspotClient.crm.objects.notes.associationsApi.create(noteId, 'contact', contactId, 'note_to_contact');

		return true;
	} catch (err: any) {
		console.error('CREATE NOTE ERROR', err);
		return false;
	}
};

export const hsGetDeals = async () => {
	try {
		const { results } = await hubspotClient.crm.deals.searchApi.doSearch({
			filterGroups: [
				{
					filters: [{ operator: 'GTE', propertyName: 'createdate', value: `${dateUTC(dayjs().subtract(1, 'day').toString())}` }],
				},
			],
			sorts: [],
			properties: ['dealname'],
			limit: 100,
			after: 0,
		});

		return results ?? [];
	} catch (err: any) {
		console.log('SEARCH DEAL ERROR', err);
		return [];
	}
};
