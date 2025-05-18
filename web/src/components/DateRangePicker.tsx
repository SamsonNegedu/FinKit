import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { DateRange } from '../types';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface DateRangePickerProps {
  onChange: (range: DateRange) => void;
  disabled: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, disabled }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date && endDate) {
      updateDateRange(date, endDate);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    if (startDate && date) {
      updateDateRange(startDate, date);
    }
  };

  const updateDateRange = (start: Date, end: Date) => {
    // Add time to make the end date inclusive
    const endDateObj = new Date(end);
    endDateObj.setHours(23, 59, 59, 999);

    if (start <= endDateObj) {
      onChange({
        startDate: start,
        endDate: endDateObj
      });
    }
  };

  const getLastThreeMonths = () => {
    const endDateObj = new Date();
    const startDateObj = new Date();
    startDateObj.setMonth(startDateObj.getMonth() - 3);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    // Update the parent component
    endDateObj.setHours(23, 59, 59, 999);
    onChange({
      startDate: startDateObj,
      endDate: endDateObj
    });
  };

  const getThisYear = () => {
    const endDateObj = new Date();
    const startDateObj = new Date(endDateObj.getFullYear(), 0, 1);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    // Update the parent component
    endDateObj.setHours(23, 59, 59, 999);
    onChange({
      startDate: startDateObj,
      endDate: endDateObj
    });
  };

  const getLastYear = () => {
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    const startDateObj = new Date(lastYear, 0, 1);
    const endDateObj = new Date(lastYear, 11, 31);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    // Update the parent component
    endDateObj.setHours(23, 59, 59, 999);
    onChange({
      startDate: startDateObj,
      endDate: endDateObj
    });
  };

  const getLastMonth = () => {
    const now = new Date();
    const startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDateObj = new Date(now.getFullYear(), now.getMonth(), 0);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    // Update the parent component
    endDateObj.setHours(23, 59, 59, 999);
    onChange({
      startDate: startDateObj,
      endDate: endDateObj
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* Date Inputs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <DatePicker
                id="start-date"
                selected={startDate}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate || undefined}
                disabled={disabled}
                dateFormat="MMMM d, yyyy"
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholderText="Select start date"
                showPopperArrow={false}
                calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                popperClassName="z-[100]"
                popperPlacement="bottom-start"
                portalId="datepicker-portal"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <span className="hidden sm:inline text-gray-500 self-end mb-1">to</span>

          <div className="flex-1">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <DatePicker
                id="end-date"
                selected={endDate}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate || undefined}
                disabled={disabled}
                dateFormat="MMMM d, yyyy"
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholderText="Select end date"
                showPopperArrow={false}
                calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                popperClassName="z-[100]"
                popperPlacement="bottom-start"
                portalId="datepicker-portal"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={getLastMonth}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={disabled}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={getLastThreeMonths}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={disabled}
            >
              Last 3 Months
            </button>
            <button
              type="button"
              onClick={getThisYear}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={disabled}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={getLastYear}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={disabled}
            >
              Last Year
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
