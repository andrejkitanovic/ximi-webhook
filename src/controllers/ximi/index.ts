import axiosDefault from 'axios';

const axios = axiosDefault.create({
	baseURL: process.env.XIMI_BASE_URL,
	headers: {
		'Api-Key': `${process.env.XIMI_API_KEY}`,
	},
});

// const env = '';
const env = '/Addi';

export const ximiUsrLogin = async () => {
	const { data } = await axios.post(`${env}/api/users/sessions`, {
		Login: 'foofoobarbar@yopmail.com',
		Password: 'FooBar123+465',
	});
	return data;
};

export const ximiGetClients = async () => {
	const { data } = await axios.get(`${env}/api/clients`);
	return data;
};

export const ximiGetAgents = async () => {
	const { data } = await axios.get(`${env}/api/agents`);
	return data;
};

export const ximiGetContact = async (LastName: string, FirstName: string, Partition: number, Email: string) => {
	const { data } = await axios.get(`${env}/api/contacts`, {
		params: {
			LastName,
			FirstName,
			Partition,
			Email,
		},
	});

	if (data.Results?.length) {
		return data.Results[0];
	}
	return null;
};

export const ximiGetQuote = async (clientId: string) => {
	try {
		const { data } = await axios.get(`${env}/api/clients/${clientId}/quote`);
		return data;
	} catch (err) {
		return null;
	}
};

export const ximiGetInterventions = async (since: string) => {
	const { data } = await axios.get(`${env}/api/interventions/changes`, {
		params: {
			since,
		},
	});
	return data;
};
