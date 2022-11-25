export const dateUTC = (date: string) => {
	return new Date(date).setUTCHours(0, 0, 0, 0);
};

export const datePlus1DayUTC = (date: string) => {
	const formattedDate = new Date(date);
	formattedDate.setDate(formattedDate.getDate() + 1);
	return formattedDate.setUTCHours(0, 0, 0, 0);
};

export const getAge = (birthDate: string) =>
	Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / 3.15576e10);
