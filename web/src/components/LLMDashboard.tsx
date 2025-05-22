import React, { useState, useEffect } from 'react';
import { FileUp, Filter, Loader2, Sparkles } from 'lucide-react';
import FileUpload from './FileUpload';
import DateRangePicker from './DateRangePicker';
import TransactionTable from './TransactionTable';
import AnalysisSummary from './AnalysisSummary';
import MerchantBreakdown from './MerchantBreakdown';
import { Transaction, DateRange, AnalysisSummary as AnalysisSummaryType } from '../types';
import { filterByDateRange, generateAnalysisSummary, isTransferBetweenAccounts } from '../utils/analysis';
import KeywordFilter from './KeywordFilter';
import { recategorizeTransactions } from '../services/transaction.service';

const LLMDashboard: React.FC = () => {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | null>(null);
    const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummaryType | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'analytics' | 'transactions' | 'merchants'>('transactions');
    const [includeTransfers, setIncludeTransfers] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
    const [isRecategorizing, setIsRecategorizing] = useState<boolean>(false);

    // Add useEffect to update filtered transactions when any filter changes
    useEffect(() => {
        if (allTransactions.length > 0) {
            const filtered = filterTransactions(allTransactions, dateRange, includeTransfers);
            setFilteredTransactions(filtered);
            setAnalysisSummary(generateAnalysisSummary(filtered, dateRange || undefined, includeTransfers));
        }
    }, [allTransactions, dateRange, includeTransfers, filterKeywords]);

    const filterTransactions = (transactions: Transaction[], range: DateRange | null, includeTransfers: boolean) => {
        let filtered = transactions;

        // First filter by date range
        if (range) {
            filtered = filterByDateRange(transactions, range);
        }

        // Then filter out transfers if needed
        if (!includeTransfers) {
            filtered = filtered.filter(t => !isTransferBetweenAccounts(t, transactions));
        }

        // Apply keyword filter
        if (filterKeywords.length > 0) {
            filtered = filtered.filter(t => !filterKeywords.some(keyword =>
                t.description.toLowerCase().includes(keyword.toLowerCase())
            ));
        }

        return filtered;
    };

    const handleTransactionsLoaded = async (transactions: Transaction[]) => {
        setIsProcessing(true);
        try {
            setAllTransactions(transactions);

            // Set default date range to last month
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            const defaultRange = { startDate, endDate };

            setDateRange(defaultRange);
            setErrorMessage(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDateRangeChange = async (range: DateRange) => {
        setIsProcessing(true);
        try {
            setDateRange(range);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTransfersToggle = async () => {
        setIsProcessing(true);
        try {
            setIncludeTransfers(!includeTransfers);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeywordsChange = (keywords: string[]) => {
        setFilterKeywords(keywords);
    };

    const handleError = (message: string) => {
        setErrorMessage(message);
    };

    const handleRecategorize = async () => {
        if (filteredTransactions.length === 0) return;

        setIsRecategorizing(true);
        try {
            const recategorizedTransactions = await recategorizeTransactions(filteredTransactions);
            console.log("🚀 ~ handleRecategorize ~ recategorizedTransactions:", recategorizedTransactions)

            // Update the filtered transactions with the recategorized ones
            const updatedFilteredTransactions = filteredTransactions.map(transaction => {
                const recategorized = recategorizedTransactions.find(t => t.id === transaction.id);
                return recategorized ? {
                    ...transaction,
                    ...recategorized
                } : transaction;
            });

            // Update both filtered and all transactions to maintain consistency
            setFilteredTransactions(updatedFilteredTransactions);
            setAllTransactions(prev =>
                prev.map(transaction => {
                    const updated = updatedFilteredTransactions.find(t => t.id === transaction.id);
                    return updated || transaction;
                })
            );
        } catch (error) {
            console.error('Error recategorizing transactions:', error);
            setErrorMessage('Failed to recategorize transactions. Please try again.');
        } finally {
            setIsRecategorizing(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-lg font-medium mb-4 flex items-center">
                            <FileUp className="h-5 w-5 mr-2 text-blue-500" />
                            Upload Transactions
                        </h2>

                        <div className="space-y-4">
                            <FileUpload
                                onTransactionsLoaded={handleTransactionsLoaded}
                                onError={handleError}
                            />

                            {errorMessage && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-md">
                                    {errorMessage}
                                </div>
                            )}

                            {allTransactions.length > 0 && (
                                <div className="py-3">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-gray-500">
                                            {allTransactions.length} transactions loaded
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={handleRecategorize}
                                                disabled={isRecategorizing || isProcessing}
                                                className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${isRecategorizing
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <Sparkles className="h-4 w-4 mr-1.5" />
                                                {isRecategorizing ? 'Recategorizing...' : 'Recategorize with AI'}
                                            </button>
                                            <button
                                                onClick={handleTransfersToggle}
                                                disabled={isProcessing}
                                                className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${includeTransfers
                                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <Filter className="h-4 w-4 mr-1.5" />
                                                {includeTransfers ? 'Including Transfers' : 'Excluding Transfers'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-2">Select date range for analysis:</p>
                                            <DateRangePicker
                                                onChange={handleDateRangeChange}
                                                disabled={allTransactions.length === 0 || isProcessing}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-2">Keyword Filters</p>
                                            <KeywordFilter
                                                keywords={filterKeywords}
                                                onKeywordsChange={handleKeywordsChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {allTransactions.length > 0 && (
                <>
                    <div className="sticky top-0 z-40 bg-white flex space-x-2 mb-6">
                        <button
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm
                                ${activeTab === 'transactions'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                            onClick={() => setActiveTab('transactions')}
                        >
                            Transactions
                        </button>
                        <button
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm
                                ${activeTab === 'analytics'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                            onClick={() => setActiveTab('analytics')}
                        >
                            Analytics
                        </button>
                        <button
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm
                                ${activeTab === 'merchants'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                            onClick={() => setActiveTab('merchants')}
                        >
                            Merchants
                        </button>
                    </div>

                    <div className="pb-12 relative">
                        {(isProcessing || isRecategorizing) && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
                                <div className="flex items-center space-x-2 text-blue-600">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>{isRecategorizing ? 'Recategorizing transactions...' : 'Processing...'}</span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transactions' ? (
                            <TransactionTable transactions={filteredTransactions} />
                        ) : activeTab === 'analytics' ? (
                            analysisSummary ? (
                                <AnalysisSummary
                                    summary={analysisSummary}
                                    transactions={filteredTransactions}
                                    startDate={dateRange?.startDate || new Date()}
                                    endDate={dateRange?.endDate || new Date()}
                                />
                            ) : (
                                <div className="bg-white rounded-lg shadow p-6 text-center">
                                    <p className="text-gray-500">No transaction data available for analysis.</p>
                                    <p className="text-sm text-gray-400 mt-2">Upload your transaction data to see analytics.</p>
                                </div>
                            )
                        ) : (
                            <MerchantBreakdown transactions={filteredTransactions} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default LLMDashboard; 
