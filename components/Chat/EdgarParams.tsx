import React, { ChangeEvent, useEffect, useState } from 'react';
import DatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { ActionMeta, MultiValue } from 'react-select';

interface Option {
  value: string;
  label: string;
}

const symbolData: Option[] = [
  { value: 'AAPL', label: 'Apple Inc.' },
  { value: 'GOOG', label: 'Google Inc.' },
  { value: 'TSLA', label: 'Tesla, Inc.' },
  // and more...
];

const formTypes: Option[] = [
  { value: '8-K', label: '8-K' },
  { value: '10-Q', label: '10-Q' },
  // and more...
];

export const EdgarParams: React.FC = () => {
  const [selectedSymbolData, setSelectedSymbolData] = useState<
    MultiValue<Option>
  >([]);
  const [selectedFormTypes, setSelectedFormTypes] = useState<
    MultiValue<Option>
  >([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <form>
        <Select
          isMulti
          options={formTypes}
          className="basic-multi-select w-full mt-2"
          value={selectedFormTypes}
          onChange={(selectedFormTypes) =>
            setSelectedFormTypes(selectedFormTypes)
          }
        />
        <Select
          isMulti
          options={symbolData}
          className="basic-multi-select w-full mt-2"
          value={selectedSymbolData}
          onChange={(selectedSymbolData) =>
            setSelectedSymbolData(selectedSymbolData)
          }
        />
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date as Date)}
          className="w-full mt-2 p-2 border"
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date as Date)}
          className="w-full mt-2 p-2 border"
        />
      </form>
    </div>
  );
};
