export type HSProperty = {
	firstname?: string;
	lastname?: string;

	id_ximi: number;
	gir: 1 | 2 | 3 | 4 | 5 | 6;
	date_d_entree: number; // Date
	adresse_agence_de_proximite: string;
	telephone_agence_de_proximite: string;
	email: string;
	nom_du_dernier_intervenant: string;
	civilite: string;
	origine_de_la_demande: string; // Select
};

export type HSClient = HSProperty & {
	type_de_contact: 'Client';
	categorie: 'Cadre' | 'Non cadre';
	categorie_client: 'Mandataire' | 'Prestataire';
	zip: string;
	agence: string; // Select
	segmentation_client: 'PA' | 'PSH' | 'GE' | 'TELEASSISTANCE' | 'JARDI' | 'ENTRETIEN' | 'Assistance/mutuelles';
	sous_segmentation_client:
		| 'PA sans PEC'
		| 'PA avec PEC hors APA et CARSAT'
		| 'APA'
		| 'CARSAT'
		| 'PSH (adulte) sans PEC'
		| 'PSH (adulte) avec PEC'
		| 'PSH (enfant moins de 18 ans) sans PEC'
		| 'PSH (enfant moins de 18 ans) avec PEC'
		| 'Entretien du domicile sans PEC'
		| 'Garde d’enfant moins de 3 ans'
		| 'Garde d’enfant plus de 3 ans'
		| 'Télé-assistance'
		| 'Jardinage'
		| 'Bricolage'
		| 'Assistance/mutuelles'; // Multi select
	date_de_la_premiere_intervention_chez_le_client: number; // Date
	besoins: string; // Multi select
	situation_familiale: string; // Select
	personne_isolee: 'true' | 'false';
	age: number;
};

export type HSProspect = HSProperty & {
	type_de_contact: 'Prospect';
	createdate: number; // Date
	segmentation_client: 'PA' | 'PSH' | 'GE' | 'TELEASSISTANCE' | 'JARDI' | 'ENTRETIEN' | 'Assistance/mutuelles';
	sous_segmentation_client:
		| 'PA sans PEC'
		| 'PA avec PEC hors APA et CARSAT'
		| 'APA'
		| 'CARSAT'
		| 'PSH (adulte) sans PEC'
		| 'PSH (adulte) avec PEC'
		| 'PSH (enfant moins de 18 ans) sans PEC'
		| 'PSH (enfant moins de 18 ans) avec PEC'
		| 'Entretien du domicile sans PEC'
		| 'Garde d’enfant moins de 3 ans'
		| 'Garde d’enfant plus de 3 ans'
		| 'Télé-assistance'
		| 'Jardinage'
		| 'Bricolage'
		| 'Assistance/mutuelles'; // Multi select
	besoins: string; // Multi select
	situation_familiale: string; // Select
	personne_isolee: 'true' | 'false';
	age: number;
};

export type HSIntervenants = HSProperty & {
	type_de_contact: 'Intervenant';
	stade: string; // Select
	zip: string;
	agence: string; // Select
	competences: string; // Select
};
