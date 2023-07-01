import React, { memo, useEffect, useRef, useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { IoArrowBack } from 'react-icons/io5';
import Select, { ActionMeta, MultiValue } from 'react-select';
import Datepicker from 'tailwind-datepicker-react';

import Image from 'next/image';

import { EdgarKeyValuePair } from '@/types/data';
import { Plugin, PluginID, Plugins } from '@/types/plugin';

interface EdgarParamsProps {
  onBack: () => void;
  onSave: (plugin: Plugin) => void;
}

interface PluginPickerProps {
  onPluginChange: (plugin: Plugin) => void;
  onClose: () => void;
}

interface Option {
  value: string;
  label: string;
}

const symbols = [
  { value: 'AAPL', label: 'Apple Inc.' },
  { value: 'GOOG', label: 'Google Inc.' },
  { value: 'TSLA', label: 'Tesla, Inc.' },
];

const formTypes = [
  { value: '10-K', label: 'Annual Report' },
  { value: '10-Q', label: 'Quarterly Report' },
  { value: '8-K', label: 'Current Report' },
];

const EdgarParams: React.FC<EdgarParamsProps> = memo(({ onBack, onSave }) => {
  const [selectedSymbols, setSelectedSymbols] = useState<MultiValue<Option>>(
    [],
  );
  const [selectedFormTypes, setSelectedFormTypes] = useState<
    MultiValue<Option>
  >([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startDateShow, setStartDateShow] = useState<Boolean | null>(false);
  const [endDateShow, setEndDateShow] = useState<Boolean | null>(false);
  const dateToNumber = (date: Date | null) => {
    if (!date) {
      return 0;
    }
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
  const updatePlugin = (plugin: Plugin) => {
    const requiredKeys: EdgarKeyValuePair[] = [
      {
        key: 'symbols',
        value:
          selectedSymbols.length !== 0
            ? selectedSymbols.map((symbol) => symbol.value)
            : symbols,
      },
      {
        key: 'formTypes',
        value:
          selectedFormTypes.length !== 0
            ? selectedFormTypes.map((formType) => formType.value)
            : formTypes,
      },
      { key: 'startDate', value: dateToNumber(startDate) || 0 },
      {
        key: 'endDate',
        value: dateToNumber(endDate) || dateToNumber(new Date()),
      },
    ];
    const updatedPlugin = { ...plugin, requiredKeys };
    console.log(selectedSymbols);
    console.log(requiredKeys);
    return updatedPlugin;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <button
        className="mb-4  text-blue-500 hover:text-blue-700 font-bold py-2"
        onClick={onBack}
      >
        <IoArrowBack size={25} />
      </button>
      <h2 className="font-bold text-lg text-gray-500 mb-4">EDGAR Parameters</h2>
      <Select
        isMulti
        className="mb-4"
        options={symbols}
        onChange={setSelectedSymbols}
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
        onChange={setSelectedFormTypes}
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
            onChange={setStartDate}
            show={startDateShow}
            setShow={setStartDateShow}
            options={{ defaultDate: null }}
          />
        </div>
        <div className="text-gray-500 mr-2">To</div>
        <div className="w-1/2 mr-2">
          <Datepicker
            onChange={setEndDate}
            show={endDateShow}
            setShow={setEndDateShow}
            options={{ defaultDate: null }}
          />
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => {
            const updatedPlugin = updatePlugin(Plugins[PluginID.EDGAR]);
            onSave(updatedPlugin);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
});

export const PluginPicker: React.FC<PluginPickerProps> = memo(
  ({ onPluginChange, onClose }) => {
    const modalRef = useRef<HTMLInputElement>(null);
    const [showEdgarSettings, setShowEdgarSettings] = useState(false);

    const handleOutsideClick = (e: any) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    useEffect(() => {
      addEventListener('mousedown', handleOutsideClick);
      return () => removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handlePluginSelection = (pluginId: PluginID) => {
      if (pluginId === PluginID.EDGAR) {
        setShowEdgarSettings(true);
      } else {
        const plugin = Plugins[pluginId];
        onPluginChange(plugin);
      }
    };

    return (
      <div className="fixed z-10 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75" />
          </div>

          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>

          <div
            ref={modalRef}
            className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          >
            {showEdgarSettings ? (
              <EdgarParams
                onBack={() => setShowEdgarSettings(false)}
                onSave={(plugin: Plugin) => {
                  setShowEdgarSettings(false);
                  onPluginChange(plugin);
                }}
              />
            ) : (
              <div className="p-6">
                <h2 className="text-lg text-gray-500 font-bold mb-4">
                  Choose a Plugin
                </h2>
                <div className="flex space-x-10">
                  <div
                    onClick={() => handlePluginSelection('chatgpt' as PluginID)}
                  >
                    <Image
                      className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                      src="/chatgpticon.svg"
                      alt="ChatGPT"
                      width={42}
                      height={42}
                    />
                  </div>
                  <div
                    onClick={() =>
                      handlePluginSelection(PluginID.GOOGLE_SEARCH)
                    }
                  >
                    <Image
                      className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                      src="/googleicon.svg"
                      alt="Google"
                      width={42}
                      height={42}
                    />
                  </div>
                  <div onClick={() => handlePluginSelection(PluginID.EDGAR)}>
                    <Image
                      className="cursor-pointer bg-cover bg-center rounded-full hover:shadow-2xl hover:scale-110 transition duration-300 ease-in-out"
                      src="/edgaricon.svg"
                      alt="EDGAR"
                      width={42}
                      height={42}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
