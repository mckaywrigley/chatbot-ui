import React, { useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { IoArrowBack } from 'react-icons/io5';
import Select, { ActionMeta, MultiValue } from 'react-select';
import Datepicker from 'tailwind-datepicker-react';

import Image from 'next/image';

interface Props {
  onBack: () => void;
  onSave: () => void;
}

interface Option {
  value: string;
  label: string;
}

const symbolData = [
  { value: 'AAPL', label: 'Apple Inc.' },
  { value: 'GOOG', label: 'Google Inc.' },
  { value: 'TSLA', label: 'Tesla, Inc.' },
];

const formTypes = [
  { value: '8-K', label: '8-K' },
  { value: '10-Q', label: '10-Q' },
];

const EdgarParams: React.FC<Props> = ({ onBack, onSave }) => {
  const [selectedSymbolData, setSelectedSymbolData] = useState<
    MultiValue<Option>
  >([]);
  const [selectedFormTypes, setSelectedFormTypes] = useState<
    MultiValue<Option>
  >([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startDateShow, setStartDateShow] = useState<Boolean | null>(false);
  const [endDateShow, setEndDateShow] = useState<Boolean | null>(false);
  const dateToNumber = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // add 1 to get the month number in the range 1-12
    const day = date.getDate();
    // pad the month and day components with leading zeros if necessary
    const monthStr = (month < 10 ? '0' + month : month) as string;
    const dayStr = (day < 10 ? '0' + day : day) as string;
    return parseInt(`${year}${monthStr}${dayStr}`);
  };
  const numberToDate = (number: number) => {
    const year = Math.floor(number / 10000);
    const month = Math.floor((number % 10000) / 100);
    const day = number % 100;
    return new Date(year, month - 1, day);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <button
        className="mb-4  text-blue-500 hover:text-blue-700 font-bold py-2"
        onClick={onBack}
      >
        <IoArrowBack size={25} />
      </button>
      <h2 className="font-bold text-xl text-gray-500 mb-4">EDGAR Parameters</h2>
      <Select
        isMulti
        className="mb-4"
        options={symbolData}
        onChange={(selectedSymbolData) =>
          setSelectedSymbolData(selectedSymbolData)
        }
        placeholder="Symbol"
        styles={{
          option: (provided) => ({
            ...provided,
            color: 'gray',
          }),
        }}
      />
      <Select
        isMulti
        className="mb-4"
        options={formTypes}
        onChange={(selectedFormTypes) =>
          setSelectedFormTypes(selectedFormTypes)
        }
        placeholder="Form Type"
        styles={{
          option: (provided) => ({
            ...provided,
            color: 'gray',
          }),
        }}
      />
      <div className="flex items-center mb-4">
        <div className="w-1/2 mr-2">
          <Datepicker
            selected={startDate}
            onChange={setStartDate}
            show={startDateShow}
            setShow={setStartDateShow}
          />
        </div>
        <div className="text-gray-500 mr-2">To</div>
        <div className="w-1/2 mr-2">
          <Datepicker
            selected={endDate}
            onChange={setEndDate}
            show={endDateShow}
            setShow={setEndDateShow}
          />
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

const PluginPicker = () => {
  const [showModal, setShowModal] = useState(true);
  const [showEdgarSettings, setShowEdgarSettings] = useState(false);

  if (!showModal) return null;

  const closeEdgarSettingsAndModal = () => {
    setShowEdgarSettings(false);
    setShowModal(false);
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" />
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {showEdgarSettings ? (
            <EdgarParams
              onBack={() => setShowEdgarSettings(false)}
              onSave={closeEdgarSettingsAndModal}
            />
          ) : (
            <div className="p-6">
              <h2 className="text-xl text-gray-500 font-bold mb-4">
                Choose a Plugin
              </h2>
              <div className="flex space-x-10">
                <Image
                  className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                  src="/chatgpticon.svg"
                  alt="ChatGPT"
                  width={48}
                  height={48}
                />
                <Image
                  className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                  src="/googleicon.svg"
                  alt="Google"
                  width={48}
                  height={48}
                />
                <div onClick={() => setShowEdgarSettings(true)}>
                  <Image
                    className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                    src="/edgaricon.svg"
                    alt="EDGAR"
                    width={48}
                    height={48}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginPicker;
