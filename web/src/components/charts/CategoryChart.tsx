import React, { useEffect, useRef } from 'react';
import { CategorySummary } from '../../types';
import { formatCurrency } from '../../utils/analysis';

interface CategoryChartProps {
  categories: CategorySummary[];
  currency: string;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ categories, currency }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || categories.length === 0) return;

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

    // Calculate pie chart dimensions
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 20; // Reduced padding

    // Draw pie chart
    let startAngle = 0;
    const total = categories.reduce((sum, cat) => sum + cat.total, 0);

    // We'll only show the top 5 categories, and group the rest as "Other"
    const topCategories = [...categories]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const otherTotal = categories.length > 5
      ? categories
        .sort((a, b) => b.total - a.total)
        .slice(5)
        .reduce((sum, cat) => sum + cat.total, 0)
      : 0;

    if (otherTotal > 0) {
      topCategories.push({
        category: 'Other',
        total: otherTotal,
        percentage: (otherTotal / total) * 100,
        color: '#9CA3AF' // gray-400
      });
    }

    // Draw pie slices
    topCategories.forEach(category => {
      const sliceAngle = (category.total / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = category.color;
      ctx.fill();

      // Add category label
      if (sliceAngle > 0.2) { // Only add label if slice is large enough
        const labelRadius = radius * 0.7;
        const labelAngle = startAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${Math.round(category.percentage)}%`,
          labelX,
          labelY
        );
      }

      startAngle += sliceAngle;
    });

    // Draw center circle (donut hole)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

  }, [categories, currency]);

  return (
    <div className="flex h-full">
      <div className="w-3/5 h-64 flex flex-col items-center justify-center">
        <div className="text-sm font-medium text-gray-500 mb-2">Total Expenses</div>
        <div className="text-xl font-bold text-gray-900 mb-4">
          {formatCurrency(categories.reduce((sum, cat) => sum + cat.total, 0), currency)}
        </div>
        <div className="relative flex-1 w-full">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>
      </div>
      <div className="w-2/5 pl-6 overflow-y-auto h-64">
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center min-w-0">
                <div
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm truncate">{category.category}</span>
              </div>
              <div className="text-sm font-medium ml-2 flex-shrink-0">
                {formatCurrency(category.total, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryChart;
