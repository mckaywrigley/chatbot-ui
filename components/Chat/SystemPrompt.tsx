import {Conversation} from "@/types";
import {DEFAULT_SYSTEM_PROMPT} from "@/utils/app/const";
import {FC, useEffect, useRef, useState} from "react";
import {useTranslation} from "next-i18next";
import {OptionsSelector} from "@/components/Chat/OptionSelector";

interface Props {
    conversation: Conversation;
    onChangePrompt: (prompt: string) => void;
}

export const SystemPrompt: FC<Props> = ({conversation, onChangePrompt}) => {
    const maxLength = 4000;
    const {t} = useTranslation('chat')
    const [currPrompt, setCurrPrompt] = useState<string>("");
    const [basePrompt, setBasePrompt] = useState(conversation.prompt || DEFAULT_SYSTEM_PROMPT);
    const [selectedOptions, setSelectedOptions] = useState({
        language: '',
        tone: '',
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleLanguageSelected = (language: string) => {
        setSelectedOptions((prevState) => ({...prevState, language}));
    };

    const handleToneSelected = (tone: string) => {
        setSelectedOptions((prevState) => ({...prevState, tone}));
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;


        if (value.length > maxLength) {
            alert(t(`Prompt limit is {{maxLength}} characters`, {maxLength}));
            return;
        }

        setCurrPrompt(value);

        if (value.length > 0) {
            onChangePrompt(value);
        }
    };

    const updatePrompt = () => {
        const languagePart = selectedOptions.language ? `Always respond in ${selectedOptions.language}.` : '';
        const tonePart = selectedOptions.tone ? `Use a ${selectedOptions.tone} tone.` : '';

        const prompt = `${basePrompt} ${languagePart} ${tonePart}`.trim();
        if (prompt.length > maxLength) {
            alert(t(`Prompt limit is {{maxLength}} characters`, {maxLength}));
            return;
        }

        setCurrPrompt(prompt);

        if (prompt.length > 0) {
            onChangePrompt(prompt);
        }
    };


    useEffect(() => {
        if (textareaRef && textareaRef.current) {
            textareaRef.current.style.height = "inherit";
            textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
        }
    }, [currPrompt]);

    useEffect(() => {
        if (conversation.prompt) {
            setCurrPrompt(conversation.prompt);
        } else {
            setCurrPrompt(DEFAULT_SYSTEM_PROMPT);
        }
    }, [conversation]);

    useEffect(() => {
        updatePrompt();
    }, [selectedOptions]);

    return (
        <div className="flex flex-col items-center">
            <label className="text-left dark:text-neutral-400 text-neutral-700 mb-2">{t('System Prompt')}</label>
            <textarea
                ref={textareaRef}
                className="w-full rounded-lg px-4 py-2 focus:outline-none dark:bg-[#40414F] dark:border-opacity-50 dark:border-neutral-800 dark:text-neutral-100 border border-neutral-500 shadow text-neutral-900"
                style={{
                    resize: "none",
                    bottom: `${textareaRef?.current?.scrollHeight}px`,
                    maxHeight: "300px",
                    overflow: `${textareaRef.current && textareaRef.current.scrollHeight > 400 ? "auto" : "hidden"}`
                }}
                placeholder={t("Enter a prompt") || ''}
                value={t(currPrompt) || ''}
                rows={1}
                onChange={handleChange}
            />
            <div className="mt-4 w-full flex justify-center">
                <OptionsSelector onLanguageSelected={handleLanguageSelected} onToneSelected={handleToneSelected}/>
            </div>
        </div>
    );
};
