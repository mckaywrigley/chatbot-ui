import React, {FC, useEffect, useState} from 'react';
import { useTranslation } from 'react-i18next';

interface Option {
    label: string;
    value: string;
}

interface Props {
    labelKey: string;
    label: string;
    onChange: (value: string) => void;
}

export const Option: FC<Props> = ({label, labelKey, onChange}) => {
    const { i18n } = useTranslation();
    const locale = i18n.language;
    const [options, setOptions] = useState<Option[]>([]);

    useEffect(() => {
        async function fetchData() {
            const response = await fetch(`/locales/${locale}/options.json`);
            const data = await response.json();
            setOptions(data[labelKey]);
        }
        fetchData();
    }, [labelKey]);
    return (
        <div className="relative w-full max-w-xs mx-auto">
            <label
                htmlFor="name"
                className="absolute -top-2 left-2 inline-block bg-white dark:bg-zinc-800 px-1 text-xs font-medium text-orange-500"
            >
                {label}
            </label>
            <select
                className="block w-full rounded-md border-0 py-2 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-sm sm:leading-6 dark:bg-zinc-800 dark:ring-gray-500"
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((option, index) => (
                    <option key={index} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

