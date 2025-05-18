Context
We have a sheet of transactions and personal expenses for the month. These transactions are from and between multiple accounts owned by the same person with expenses being paid from the different accounts.

The transactions list retrieved from the third party aggregator unfortunately covers all historical transactions.

Goal
1. We want to be able to see the transactions and personal expenses for a specified duration, can be a single day, a week, a month, a year, etc.
2. Since the transactions list also covers transfers between accounts owned by the same person, we don't want to treat these as additional income. e.g 400 EUR was transferred to from N26 to Wise, and from Wise Main balance to a Wise Jar, this should not be treated as additional income.
3. All transactions should be anonymized for processing through an LLM.
4. We want to integrate with the LLM to be able to ask questions about the transactions and personal expenses.
5. We want a breakdown of the transactions by the category of the transaction. Some categories may not be obvious and we want to be able to ask the LLM to help us understand the categories.
6. We should be able to recategorize a transaction.








