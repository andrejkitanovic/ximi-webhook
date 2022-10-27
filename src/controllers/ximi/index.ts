import axiosDefault from 'axios';

const axios = axiosDefault.create({
	baseURL: process.env.XIMI_BASE_URL,
	headers: {
		'Api-Key': `${process.env.XIMI_API_KEY}`,
	},
});

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

export const ximiGetClientsGraphql = async () => {
	const { data } = await axios.post(`${env}/api/graphql`, {
		Query: `
		{
			clients {
				items {
					id
					cTime
					stage
					lastInterventionDate
					status
					email
					homePhone
					phone
					contact {
						firstName
						lastName
						birthDate
						title
						familyStatus
						emailAddress1
					}
					address {
						zip
						street1
						building
					}
					needsStr
					isIsolated
					computedGIRSAAD
				}
			}
		}
		`,
	});
	console.log(data)
	return data?.data?.clients?.items || [];
};

export const ximiGetAgents = async () => {
	const { data } = await axios.get(`${env}/api/agents`);
	return data;
};

export const ximiGetAgentsGraphql = async () => {
	const { data } = await axios.post(`${env}/api/graphql`, {
		Query: `
		{
			agents {
				items {
					id
					cTime
					stage
					lastInterventionDate
					status
					emailAddress1
					homePhone
					firstName
					lastName
					birthDate
					title
					address {
						zip
						street1
						building
					}
				}
			}
		}
		`,
	});
	console.log(data)

	return data?.data?.agents?.items || [];
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