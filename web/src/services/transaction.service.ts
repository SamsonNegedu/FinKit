import { Transaction } from '../types';

const API_BASE_URL = 'http://localhost:3001';

export const recategorizeTransactions = async (transactions: Transaction[]): Promise<Transaction[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/transactions/categorize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactions),
        });

        if (!response.ok) {
            throw new Error('Failed to recategorize transactions');
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error recategorizing transactions:', error);
        throw error;
    }
}; 
