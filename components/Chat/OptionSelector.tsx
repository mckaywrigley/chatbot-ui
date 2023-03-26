import React, {FC} from 'react';
import {Option} from './Option';
import {useTranslation} from "next-i18next";

interface Props {
    onLanguageSelected: (option: string) => void;
    onToneSelected: (option: string) => void;
}

export const OptionsSelector: FC<Props> = ({onLanguageSelected, onToneSelected}) => {
    const {t} = useTranslation('chat')
    return (
        <div className="flex items-center justify-center flex-col sm:flex-row space-x-0 gap-2 sm:gap-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Option
                    onChange={onLanguageSelected}
                    labelKey="languages"
                    label={t('Languages')}
                />
            </div>
        </div>
    );
};

