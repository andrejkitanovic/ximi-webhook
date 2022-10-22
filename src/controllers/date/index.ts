export const dateUTC = (date: string) => {
	return new Date(date).setUTCHours(0, 0, 0, 0);
};

export const getAge = (birthDate: string) =>
	Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / 3.15576e10);
