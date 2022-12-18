# Ximi HubSpot integration

## If the client adds a new Agency, Skill/Besoin/Competence/Need, Origin

1. Add the option to the relevant drop down in HubSpot
2. Regenerate the lists available in the skills.json, contactSources.json and agencies.json files using the REST API (the REST API is the only endpoint where we can get the true ID of the object as the GraphQL API only gives the GraphQL ID)
