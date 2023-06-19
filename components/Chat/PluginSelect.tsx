import {
  Dispatch,
  FC,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQuery } from 'react-query';

import { useTranslation } from 'next-i18next';
import Image from 'next/image';

import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import chevronDownIconBlack from '@/public/icons/chevron-down-black.svg';
import chevronDownIcon from '@/public/icons/chevron-down.svg';

interface Props {
  plugins: Array<Plugin>;
  setPlugins: Dispatch<SetStateAction<Array<Plugin>>>;
}

export const PluginSelect: FC<Props> = ({ plugins, setPlugins }) => {
  const { t } = useTranslation('chat');

  const pluginsIdList = plugins.map((plugin) => plugin.id as string);
  const [shouldDownloadPlugin, setShouldDownloadPlugin] = useState(false);
  const {
    state: { lightMode },
  } = useContext(HomeContext);

  const selectRef = useRef<HTMLDivElement>(null);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localPlugins, setLocalPlugins] = useState<Record<string, Plugin>>({});
  const [toggleIsUpdated, setToggleIsUpdated] = useState<boolean>(false);

  const downloadPlugin = async (url: string) => {
    const result = await fetch(url, { method: 'GET' });
    return result.json();
  };

  const getPlugins = () => {
    const plugins = localStorage.getItem('plugins');
    if (!plugins) return null;
    return JSON.parse(localStorage.getItem('plugins') as string);
  };
  const addPlugin = (plugin: Plugin) => {
    const localStoragePlugins = Object.keys(getPlugins() || {});
    if (localStoragePlugins.includes(plugin.id)) {
      alert('This plugin is already installed');
      return;
    }
    const currentPlugins = getPlugins();
    if (currentPlugins) {
      currentPlugins[plugin.id] = plugin;
      localStorage.setItem('plugins', JSON.stringify(currentPlugins));
    } else {
      const newPlugins = { [plugin.id]: plugin };
      localStorage.setItem('plugins', JSON.stringify(newPlugins));
    }
    setPlugins((prev) => [...prev, plugin]);
    setIsOpened(false);
    setToggleIsUpdated((prev) => !prev);
  };

  const { isLoading, error, data } = useQuery(
    'addPlugin',
    () => downloadPlugin(textareaRef.current?.value as string),
    {
      enabled: shouldDownloadPlugin,
      onSuccess: (data) => {
        const newPlugin = {
          id: data.name_for_model,
          name: data.name_for_human,
          description: data.description_for_human,
          url: textareaRef.current?.value as string,
          logo: data.logo_url,
        };
        addPlugin(newPlugin);
        setShouldDownloadPlugin(false);
        textareaRef.current!.value = '';
      },
      onError: () => {
        setShouldDownloadPlugin(false);
        alert('Please enter a valid URL');
        textareaRef.current!.value = '';
      },
    },
  );

  const handleAddPluginClick = () => {
    if (!textareaRef.current || textareaRef.current.value === '')
      return alert('Please enter a valid URL');
    setShouldDownloadPlugin(true);
  };

  const toggleIsOpened = () => setIsOpened(!isOpened);
  const handleClickPlugin = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.value === 'none') {
      setPlugins([]);
      setIsOpened(false);
      return;
    }
    if (pluginsIdList.includes(e.currentTarget.value)) {
      const newPlugins = plugins.filter(
        (plugin) => plugin.id !== e.currentTarget.value,
      );
      setPlugins(newPlugins);
      setIsOpened(false);
      return;
    }
    const newPlugin = localPlugins[e.currentTarget.value];
    setPlugins((prev) => [...prev, newPlugin]);
    setIsOpened(false);
  };

  useEffect(() => {
    setLocalPlugins(getPlugins() || {});
  }, [toggleIsUpdated]);

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Plugin')}
      </label>
      <div className="pl-2 w-full rounded border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white">
        <div
          className="w-full cursor-pointer bg-transparent p-2 flex justify-between items-center"
          onClick={toggleIsOpened}
        >
          <div className="flex items-start gap-1">
            {plugins.length > 0 ? (
              plugins.map((plugin) => {
                return (
                  <img
                    className="w-5 h-5 bg-white rounded"
                    key={plugin.id}
                    src={plugin.logo}
                    alt={plugin.name}
                  />
                );
              })
            ) : (
              <span>{t('Unchecked')}</span>
            )}
          </div>
          <Image
            className="w-3 h-3"
            src={lightMode === 'dark' ? chevronDownIcon : chevronDownIconBlack}
            alt="down"
          />
        </div>
      </div>
      {isOpened && (
        <div
          ref={selectRef}
          className="mb-1 w-full rounded border border-neutral-200 bg-transparent flex flex-col p-1.5 gap-1.5 text-neutral-900 dark:border-neutral-600 dark:text-white"
        >
          {Object.keys(localPlugins).length > 0 && (
            <div className="w-full flex flex-col items-start gap-2 rounded cursor-pointer bg-transparent p-2 border border-neutral-200 dark:border-neutral-600 dark:text-white max-h-[7.5rem] overflow-y-auto">
              {Object.keys(localPlugins).map((pluginName) => (
                <button
                  key={localPlugins[pluginName].id}
                  id={localPlugins[pluginName].id}
                  value={localPlugins[pluginName].id}
                  className="w-full pl-1 rounded flex items-start hover:bg-gray-100 dark:bg-[#343541] dark:text-white dark:hover:bg-gray-400 dark:hover:text-black transition-colors duration-200"
                  onClick={handleClickPlugin}
                >
                  <img
                    className="w-5 h-5 mr-2 bg-white rounded"
                    src={localPlugins[pluginName].logo as string}
                    alt={localPlugins[pluginName].name}
                  />
                  <span>{t(localPlugins[pluginName].name)}</span>
                  <input
                    type={'checkbox'}
                    checked={pluginsIdList.includes(
                      localPlugins[pluginName].id,
                    )}
                    readOnly={true}
                    className="self-center ml-auto mr-1"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="mt-1 mb-1 w-full flex gap-1.5 rounded border border-neutral-200 bg-transparent pr-2 pl-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
            <span
              className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-1 md:pl-3"
              hidden={!isLoading}
            >
              Loading...
            </span>
            <>
              <textarea
                className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-1 md:pl-3"
                ref={textareaRef}
                style={{
                  resize: 'none',
                  bottom: `${textareaRef?.current?.scrollHeight}px`,
                  maxHeight: '400px',
                  overflow: `${
                    textareaRef.current &&
                    textareaRef.current.scrollHeight > 400
                      ? 'auto'
                      : 'hidden'
                  }`,
                }}
                hidden={isLoading}
                placeholder={t('Type the domain of plugin...') || ''}
                rows={1}
              />
              <button
                className="rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
                onClick={handleAddPluginClick}
                hidden={isLoading}
              >
                <span>Add</span>
              </button>
            </>
          </div>
        </div>
      )}
    </div>
  );
};
