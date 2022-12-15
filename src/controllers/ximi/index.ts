import axiosDefault from 'axios';
import dayjs from 'dayjs';
import { wait } from 'helpers/wait';

const LIMIT = 50;
const OFFSET = 0;
const PAGINATION_SIZE = 50;

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

export const ximiGetRecentClientsGraphql = async () => {
	console.log('GETTING RECENTLY MODIFIED CLIENTS');
	// Initialize empty array to hold fetched clients
	const clients = [];

	// Initialize cursor for pagination
	let cursor = 0;

	// Initialize flag to track when to stop fetching
	let keepFetching = true;

	const currentTime = dayjs();

	// Fetch clients in batches of 50 until the most recently modified client
	// in the current batch is older than 2 hours
	while (keepFetching) {
		console.log('FETCHING MOST RECENT CONTACTS XIMI...');
		const { data } = await axios.post(`${env}/api/graphql`, {
			Query: `
		  {
			clients(limit:${PAGINATION_SIZE}, offset:${cursor} sortBy:mTime_DESC) {
			  items {
				id
				mPrincipal {
					displayName
				}
				cTime
				mTime
				stage
				status
				email
				homePhone
				phone
				mobilePhone
				contractNature
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

		// Filter out any records modified by the API_Production account
		const fetchedRecords = data?.data?.clients?.items || [];
		// console.log('fetchedRecords', fetchedRecords.length);

		const filteredRecords = fetchedRecords.filter((client: any) => {
			// console.log('client', client.email);
			// console.log('#', client.mPrincipal.displayName);
			//!Dayjs is 2 hours behind, so adding to hours to dayjs brings it to SA time. mTIme is 1 hour behind SA time, so adding 3 hours
			// console.log('T', dayjs(client.mTime).add(3, 'hour').toString());
			// console.log('Current Time', currentTime.add(2, 'hour').toString());
			const isApi = client.mPrincipal?.displayName === 'API_Production';
			const isOlderThan2Hours = currentTime.diff(dayjs(client.mTime).add(1, 'hour'), 'hour') >= 2;
			return !isApi && !isOlderThan2Hours;
		});
		// console.log('filteredRecords', filteredRecords.length);

		// Add fetched clients to the array
		clients.push(...filteredRecords);

		// Update the cursor for the next iteration
		cursor += PAGINATION_SIZE;

		// Use dayjs to check if the most recently modified client in the current batch
		// is older than 2 hours. If so, set the flag to stop fetching.
		// console.log(data?.data?.clients?.items[0]?.mTime, cursor);
		if (dayjs().diff(dayjs(data?.data?.clients?.items[0]?.mTime).add(1, 'hour'), 'hour') >= 2) {
			keepFetching = false;
		}

		await wait(500);
	}

	// Return the array of fetched clients
	return clients;
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
					mobilePhone
					contractNature
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

export const ximiGetRecentAgentsGraphql = async () => {
	console.log('GETTING RECENTLY MODIFIED AGENTS');
	// Initialize empty array to hold fetched clients
	const agents = [];

	// Initialize cursor for pagination
	let cursor = 0;

	// Initialize flag to track when to stop fetching
	let keepFetching = true;

	const currentTime = dayjs();

	// Fetch clients in batches of 50 until the most recently modified client
	// in the current batch is older than 2 hours
	while (keepFetching) {
		console.log('FETCHING MOST RECENT AGENTS XIMI...');
		const { data } = await axios.post(`${env}/api/graphql`, {
			Query: `
			{
				agents(limit:${PAGINATION_SIZE}, offset:${cursor} sortBy:mTime_DESC) {
					items {
						id
						mPrincipal {
							displayName
						}
						mTime
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
							displayName
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

		// Filter out any records modified by the API_Production account
		const fetchedRecords = data?.data?.agents?.items || [];

		const filteredRecords = fetchedRecords.filter((agent: any) => {
			// console.log('Agent', `${agent.firstName} ${agent.lastName}`);
			// console.log('#', agent.mPrincipal.displayName);
			//!Dayjs is 2 hours behind, so adding to hours to dayjs brings it to SA time. mTIme is 1 hour behind SA time, so adding 3 hours
			// console.log('T', dayjs(agent.mTime).add(3, 'hour').toString());
			// console.log('Current Time', currentTime.add(2, 'hour').toString());
			const isApi = agent.mPrincipal?.displayName === 'API_Production';
			const isOlderThan2Hours = currentTime.diff(dayjs(agent.mTime).add(1, 'hour'), 'hour') >= 2;
			return !isApi && !isOlderThan2Hours;
		});
		// console.log('filteredRecords', filteredRecords.length);

		// Add fetched agent to the array
		agents.push(...filteredRecords);

		// Update the cursor for the next iteration
		cursor += PAGINATION_SIZE;

		// Use dayjs to check if the most recently modified client in the current batch
		// is older than 2 hours. If so, set the flag to stop fetching.
		// console.log(data?.data?.clients?.items[0]?.mTime, cursor);
		if (dayjs().diff(dayjs(data?.data?.agents?.items[0]?.mTime).add(1, 'hour'), 'hour') >= 2) {
			keepFetching = false;
		}

		await wait(500);
	}

	// Return the array of fetched agents
	return agents;
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
						displayName
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

export const ximiHSExists = async (name: string) => {
	console.log('SEARCHING XIMI CONTACT', name);
	const nameAsUrl = encodeURIComponent(name);
	try {
		const { data } = await axios.get(
			`${env}/api/clients?Offset=0&Top=1&ComputeHasMoreRows=1&ComputeHitCount=1&Search=${nameAsUrl}&lastModification=1970-10-13T00:00:00`
		);
		console.log('XIMI CONTACT FOUND', data.Results?.length > 0 ? data.Results[0].Id : false);
		return data.Results?.length > 0 ? data.Results[0].Id : false;
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR SEARCHING XIMI CONTACT', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
		} else {
			console.log('ERROR SEARCHING XIMI CONTACT', err);
		}
		return false;
	}
};

export const ximiHSAgentExists = async (name: string) => {
	console.log('SEARCHING XIMI AGENT', name);
	const nameAsUrl = encodeURIComponent(name);
	try {
		const { data } = await axios.get(
			`${env}/api/agents?Offset=0&Top=1&ComputeHasMoreRows=1&ComputeHitCount=1&Search=${nameAsUrl}&lastModification=1970-10-13T00:00:00`
		);
		console.log('XIMI AGENT FOUND', data.Results?.length > 0 ? data.Results[0].Id : false);
		return data.Results?.length > 0 ? data.Results[0].Id : false;
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR SEARCHING XIMI AGENT', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
		} else {
			console.log('ERROR SEARCHING XIMI AGENT', err);
		}
		return false;
	}
};

export const ximiCreateClient = async (data: any) => {
	try {
		console.log('Creating Ximi client...');
		await axios.post(`${env}/api/clients`, data);
		console.log('Ximi client created');
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR CREATING AGENT', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
			return;
		} else {
			console.log('ERROR CREATING CONTACT', err);
		}
	}
};

export const ximiUpdateClient = async (id: string, data: any) => {
	try {
		console.log('Updating Ximi client...');
		await axios.put(`${env}/api/clients/${id}`, data);
		console.log('Ximi client updated');
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR UPDATING AGENT', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
			return;
		} else {
			console.log('ERROR UPDATING CONTACT', err);
		}
	}
};

export const ximiCreateAgent = async (data: any) => {
	try {
		console.log('Creating Ximi agent...');
		await axios.post(`${env}/api/agents`, data);
		console.log('Ximi agent created');
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR CREATING AGENT', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
			return;
		} else {
			console.log('ERROR CREATING AGENT', err);
		}
	}
};

export const ximiSearchAgency = async (name: string) => {
	console.log('SEARCHING AGENCY', name);
	const nameAsUrl = encodeURIComponent(name);
	try {
		const { data: response } = await axios.get(
			`${env}/api/agencies?Offset=0&Top=1&ComputeHasMoreRows=1&ComputeHitCount=1&Search=${nameAsUrl}&lastModification=1970-10-13T00:00:00`
		);

		return response?.Results;
	} catch (err: any) {
		if (err.code === 'ERR_BAD_REQUEST') {
			console.log('ERROR SEARCHING AGENCY', err.response.config.data);
			console.log('*****');
			console.log(err.response.data);
			return;
		} else {
			console.log('ERROR SEARCHING AGENCY', err);
		}
	}
};

// 0a8ceada-ae72-4821-a935-17b9a911aa90
