import axiosDefault from 'axios';

const LIMIT = 500;
const OFFSET = 0;

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
	const { data } = await axios.get(`${env}/api/clients?Top=${LIMIT}&Offset=${OFFSET}`);
	return data;
};

export const ximiGetClientsGraphql = async () => {
	const { data } = await axios.post(`${env}/api/graphql`, {
		Query: `
		{
			clients(limit: ${LIMIT}, offset: ${OFFSET}) {
				items {
					id
					cTime
					stage
					status
					email
					homePhone
					phone
					modality
					firstContactDate
					lastInterventionDate
					lastMissionEnd
					missions {
						label
					}
					coverageType {
						type
					}
					contactSource { 
						displayName
						internalType
					}
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
						city
						building
					}
					interventions {
						startDate
						agent {
							firstName
							lastName
						}
					}
					agency {
						name
					}
					entryDate
					needs {
						name
					}
					needsDisplay
					isIsolated
					computedGIRSAAD
					mandateSigned
				}
			}
		}
		`,
	});
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
					mobilePhone
					stage
					firstContactDate
					lastInterventionDate
					status
					emailAddress1
					homePhone
					firstName
					lastName
					birthDate
					title
					entryDate
					contactSource { 
						internalType
					}
					address {
						zip
						street1
						city
						building
					}
					interventions {
						startDate
					}
					contracts { 
						type 
					}
					agency {
						name
					}
					skills { 
						name 
					}
				}
			}
		}
		`,
	});
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

export const ximiCreateClient = async (data: any) => {
	try {
		await axios.post(`${env}/api/clients`, data);
	} catch (err) {
		console.log('ERROR CREATING CONTACT', err);
	}
};

export const ximiCreateAgent = async (data: any) => {
	try {
		await axios.post(`${env}/api/agents`, data);
	} catch (err) {
		console.log('ERROR CREATING AGENT', err);
	}
};

export const ximiSearchAgency = async (name: string) => {
	try {
		const { data: response } = await axios.get(
			`${env}/api/agencies?Offset=0&Top=1&ComputeHasMoreRows=1&ComputeHitCount=1&Search=${name}&lastModification=1970-10-13T00:00:00`
		);

		return response?.Results;
	} catch (err) {
		console.log('ERROR CREATING AGENT', err);
	}
};

// 0a8ceada-ae72-4821-a935-17b9a911aa90
