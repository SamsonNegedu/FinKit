import React from 'react';
import { CreditCard, ArrowUp, ArrowDown, PieChart, DollarSign } from 'lucide-react';
import { AnalysisSummary as AnalysisSummaryType, Transaction } from '../types';
import { formatCurrency } from '../utils/analysis';
import CategoryChart from './charts/CategoryChart';
import ExpenseChart from './charts/ExpenseChart';

interface AnalysisSummaryProps {
  summary: AnalysisSummaryType;
  transactions: Transaction[];
  startDate: Date;
  endDate: Date;
}

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  summary,
  transactions,
  startDate,
  endDate
}) => {
  const formatDateRange = () => {
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-full">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
          <p className="text-sm text-gray-500 mb-4">
            Analysis for period: {formatDateRange()}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center mb-2">
                <div className="bg-blue-100 p-2 rounded-full mr-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-blue-800">Net Balance</h3>
              </div>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center mb-2">
                <div className="bg-green-100 p-2 rounded-full mr-2">
                  <ArrowUp className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-sm font-medium text-green-800">Total Income</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <div className="flex items-center mb-2">
                <div className="bg-red-100 p-2 rounded-full mr-2">
                  <ArrowDown className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-sm font-medium text-red-800">Total Expenses</h3>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpense)}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center mb-2">
                <div className="bg-purple-100 p-2 rounded-full mr-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-medium text-purple-800">Transactions</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {transactions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-1">
        <div className="bg-white p-4 rounded-lg shadow h-full">
          <div className="flex items-center mb-4">
            <PieChart className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold">Expense Categories</h2>
          </div>

          {summary.categorySummary.length > 0 ? (
            <CategoryChart categories={summary.categorySummary} currency={transactions[0]?.currency || 'EUR'} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No expense data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-1">
        <div className="bg-white p-4 rounded-lg shadow h-full">
          <div className="flex items-center mb-4">
            <PieChart className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold">Income vs Expenses</h2>
          </div>

          {transactions.length > 0 ? (
            <ExpenseChart
              transactions={transactions}
              currency={transactions[0]?.currency || 'EUR'}
            />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">No transaction data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-full">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Notable Transactions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Largest Income</h3>
              {summary.largestIncome ? (
                <div>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(summary.largestIncome.amount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    {summary.largestIncome.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(summary.largestIncome.date).toLocaleDateString()} • {summary.largestIncome.category}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No income transactions found</p>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Largest Expense</h3>
              {summary.largestExpense ? (
                <div>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(summary.largestExpense.amount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    {summary.largestExpense.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(summary.largestExpense.date).toLocaleDateString()} • {summary.largestExpense.category}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No expense transactions found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSummary;
