Integrations
1. We want to communicate with an LLM using the OpenAI API.
2. We want to build a backend that can be used to communicate with the LLM.
3. We want to build a frontend that can be used to communicate with the backend.

Backend
1. Should be written in Typescript using NestJS.
2. Should we able to accept questions about the transactions and personal expenses and proxy them to the LLM.
3. Should handle all cases where transfer is between accounts owned by the same person and not treat them as additional income.
4. Should anonymize personal data and bank records before sending it to the LLM.
5. Should use a short lived cache for any context storage. Temporarily cached data should be completely anonymized
6. Optional: Should be able to communicate with Google Sheets API to store breakdown of the transactions by the category of the transaction.

Frontend
1. Should be written in Typescript using React.
