import React, { useEffect, useRef } from 'react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/analysis';

interface ExpenseChartProps {
  transactions: Transaction[];
  currency: string;
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, currency }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || transactions.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Restore canvas size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Process transactions by month
    const monthlyData = getMonthlyData(transactions);

    // Find max values
    const maxIncome = Math.max(...monthlyData.map(d => d.income));
    const maxExpense = Math.max(...monthlyData.map(d => d.expense));
    const maxValue = Math.max(maxIncome, maxExpense) * 1.1; // Add 10% padding

    // Set chart dimensions
    const chartWidth = canvas.width / dpr - 60;
    const chartHeight = canvas.height / dpr - 60;
    const barWidth = chartWidth / monthlyData.length / 3;
    const barSpacing = barWidth / 2;

    // Draw axes
    const startX = 40;
    const startY = canvas.height / dpr - 40;

    ctx.beginPath();
    ctx.strokeStyle = '#E5E7EB'; // gray-200
    ctx.lineWidth = 1;

    // X-axis
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + chartWidth, startY);

    // Y-axis
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY - chartHeight);

    ctx.stroke();

    // Draw horizontal grid lines
    const numGridLines = 5;
    ctx.beginPath();
    ctx.strokeStyle = '#F3F4F6'; // gray-100
    ctx.setLineDash([5, 5]);

    for (let i = 1; i <= numGridLines; i++) {
      const y = startY - (i / numGridLines) * chartHeight;
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + chartWidth, y);

      // Add y-axis labels
      const value = (i / numGridLines) * maxValue;
      ctx.fillStyle = '#6B7280'; // gray-500
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatCurrency(value, currency).slice(0, -3), startX - 5, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bars
    monthlyData.forEach((data, index) => {
      const x = startX + (index * 3 * barWidth) + (index * barSpacing);

      // Income bar
      const incomeHeight = (data.income / maxValue) * chartHeight;
      ctx.fillStyle = '#10B981'; // green-500
      ctx.fillRect(x, startY - incomeHeight, barWidth, incomeHeight);

      // Expense bar
      const expenseHeight = (data.expense / maxValue) * chartHeight;
      ctx.fillStyle = '#EF4444'; // red-500
      ctx.fillRect(x + barWidth + barSpacing, startY - expenseHeight, barWidth, expenseHeight);

      // Add month label
      ctx.fillStyle = '#6B7280'; // gray-500
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(data.month, x + barWidth, startY + 5);
    });

    // Add legend
    const legendX = startX;
    const legendY = startY - chartHeight - 20;

    // Income legend item
    ctx.fillStyle = '#10B981'; // green-500
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = '#111827'; // gray-900
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Income', legendX + 18, legendY + 6);

    // Expense legend item
    ctx.fillStyle = '#EF4444'; // red-500
    ctx.fillRect(legendX + 80, legendY, 12, 12);
    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillText('Expense', legendX + 98, legendY + 6);

  }, [transactions, currency]);

  // Helper function to group transactions by month
  const getMonthlyData = (transactions: Transaction[]) => {
    const monthlyData: { month: string; income: number; expense: number }[] = [];
    const monthsMap = new Map<string, { income: number; expense: number }>();

    // Group transactions by month
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.toLocaleDateString('en-US', { month: 'short' });

      if (!monthsMap.has(month)) {
        monthsMap.set(month, { income: 0, expense: 0 });
      }

      const data = monthsMap.get(month)!;

      if (transaction.type === 'income') {
        data.income += transaction.amount;
      } else {
        data.expense += transaction.amount;
      }
    });

    // Convert map to array
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    months.forEach(month => {
      if (monthsMap.has(month)) {
        const data = monthsMap.get(month)!;
        monthlyData.push({
          month,
          income: data.income,
          expense: data.expense
        });
      }
    });

    return monthlyData;
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: '250px' }}
    />
  );
};

export default ExpenseChart;
