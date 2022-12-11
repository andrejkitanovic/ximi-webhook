export type HSProperty = {
	firstname?: string;
	lastname?: string;
	id_ximi: number;
	gir: 1 | 2 | 3 | 4 | 5 | 6;
	date_d_entree: number; // Date
	adresse_agence_de_proximite: string;
	telephone_agence_de_proximite: string;
	email: string;
	nom_du_dernier_intervenant: string | undefined;
	civilite: string | null;
	origine_de_la_demande: string; // Select
	phone: string;
	mobilephone: string;
	entite: string;
	hs_content_membership_status: 'active' | 'inactive';
	age: number;
	date_of_birth: string;
	address: string;
	ne_e__le: Date;
	city: string;
	date_de_creation: Date;
	ville: string;
	date_de_naissance: Date;
	date_de_la_premiere_intervention_chez_le_client: number | undefined;
	derniere_intervention___nom_prestation: string | undefined;
	besoins: string;
	planning_ximi_contact: string;
	nature_du_besoins: string | undefined;

};

export type HSClient = HSProperty & {
	type_de_contact: 'Client';
	type_de_contact_aidadomi: 'Client';
	ximi_categorie: 'Cadre' | 'Non cadre' | undefined;
	categorie_client: 'Mandataire' | 'Prestataire' | undefined;
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
	besoins: string; // Multi select
	situation_familiale_ximi: string; // Select
	personne_isolee: 'true' | 'false';
	date_de_la_derniere_intervention_realisee: Date | undefined;
	date_de_fin_de_mission: Date | undefined;
	type_d_aide__recupere_de_ximi_: string;
	
};

export type HSProspect = HSClient & {
	type_de_contact: 'Prospect';
	type_de_contact_aidadomi: 'Prospect';
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

	situation_familiale: string; // Select
	personne_isolee: 'true' | 'false';
	age: number;
};

export type HSIntervenants = HSProperty & {
	type_de_contact: 'Intervenant';
	type_de_contact_aidadomi: 'Intervenant';
	zip: string;
	competences: string; // Select
	date_de_la_derniere_intervention_realisee: Date | undefined;
	type_de_contrat_ximi: string;
	ximi_stade: string;
	ximi_competences: string;
};
