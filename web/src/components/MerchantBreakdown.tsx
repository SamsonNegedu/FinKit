import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/analysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MerchantBreakdownProps {
    transactions: Transaction[];
}

interface MerchantSummary {
    name: string;
    total: number;
    count: number;
    average: number;
}

const MerchantBreakdown: React.FC<MerchantBreakdownProps> = ({ transactions }) => {
    const merchantData = useMemo(() => {
        const merchantMap = new Map<string, MerchantSummary>();

        // Only process expense transactions
        transactions
            .filter(t => t.type === 'expense')
            .forEach(transaction => {
                // Clean and normalize the merchant name
                const merchant = transaction.description
                    .split(' ')
                    .slice(0, 3)
                    .join(' ')
                    .toUpperCase() // Convert to uppercase for consistent matching
                    .replace(/[^A-Z0-9\s]/g, ''); // Remove special characters

                const existing = merchantMap.get(merchant) || {
                    name: merchant,
                    total: 0,
                    count: 0,
                    average: 0
                };

                existing.total += transaction.amount;
                existing.count += 1;
                existing.average = existing.total / existing.count;

                merchantMap.set(merchant, existing);
            });

        return Array.from(merchantMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 50); // Show top 10 merchants
    }, [transactions]);

    const currency = transactions[0]?.currency || 'EUR';

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Top Merchants by Spending</h2>

                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={merchantData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                tickFormatter={(value: number) => formatCurrency(value, currency)}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value, currency)}
                                labelFormatter={(label: string) => `Merchant: ${label}`}
                            />
                            <Bar
                                dataKey="total"
                                fill="#3B82F6"
                                name="Total Spent"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium">Merchant Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Merchant
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Spent
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transactions
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Average
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {merchantData.map((merchant) => (
                                <tr key={merchant.name}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {merchant.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                        {formatCurrency(merchant.total, currency)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        {merchant.count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        {formatCurrency(merchant.average, currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MerchantBreakdown; 
