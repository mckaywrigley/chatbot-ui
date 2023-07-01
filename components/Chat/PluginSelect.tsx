import { IconChevronDown, IconTrash } from '@tabler/icons-react';
import {
  Dispatch,
  FC,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import { useTranslation } from 'next-i18next';

import { getPlugins } from '@/utils/app/plugins';

import { API } from '@/types/api';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

interface Props {
  plugins: Array<Plugin>;
  setPlugins: Dispatch<SetStateAction<Array<Plugin>>>;
}

export const PluginSelect: FC<Props> = ({ plugins, setPlugins }) => {
  const { t } = useTranslation('chat');

  const pluginsIdList = plugins.map((plugin) => plugin.id as string);
  const {
    state: { lightMode },
  } = useContext(HomeContext);

  const selectRef = useRef<HTMLDivElement>(null);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localPlugins, setLocalPlugins] = useState<Record<string, Plugin>>({});
  const [toggleIsUpdated, setToggleIsUpdated] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const downloadPlugin = async (url: string) => {
    const result = await fetch(API.ADD_PLUGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url }),
    });
    return result.json();
  };

  const addPlugin = (plugin: Plugin) => {
    const localStoragePlugins = Object.keys(getPlugins() || {});
    if (localStoragePlugins.includes(plugin.id)) {
      setErrorMessage('This plugin is already installed');
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

  const mutation = useMutation(
    () => downloadPlugin(textareaRef.current?.value as string),
    {
      onSuccess: (data) => {
        const newPlugin = {
          id: data.name_for_model,
          name: data.name_for_human,
          description: data.description_for_human,
          url: textareaRef.current?.value as string,
          logo: data.logo_url,
        };
        addPlugin(newPlugin);
        textareaRef.current!.value = '';
      },
      onError: () => {
        textareaRef.current!.value = '';
        setErrorMessage('Please enter a valid URL');
      },
    },
  );

  const handleAddPluginClick = () => {
    if (!textareaRef.current || textareaRef.current.value === '')
      return setErrorMessage('Please enter a valid URL');
    mutation.mutate();
  };

  const toggleIsOpened = () => setIsOpened(!isOpened);

  const handleDeletePlugin = (e: React.MouseEvent<HTMLButtonElement>) => {
    const newPlugins = plugins.filter(
      (plugin) => plugin.id !== e.currentTarget.value,
    );
    setPlugins(newPlugins);
    const newLocalPlugins = Object.assign({}, localPlugins);
    delete newLocalPlugins[e.currentTarget.value];
    localStorage.removeItem('plugins');
    localStorage.setItem('plugins', JSON.stringify(newLocalPlugins));
    setLocalPlugins(newLocalPlugins);
    setIsOpened(false);
  };
  const handleClickPlugin = (e: React.MouseEvent<HTMLButtonElement>) => {
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
      <button
        type="button"
        className="relative cursor-pointer p-2 flex justify-between items-center pl-2 w-full rounded border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={toggleIsOpened}
      >
        {plugins.length > 0 ? (
          <div className="flex gap-1.5">
            {plugins.length < 6 ? (
              <>
                {plugins.map((plugin) => {
                  return (
                    <img
                      className="w-5 h-5 bg-white rounded"
                      key={plugin.id}
                      src={plugin.logo}
                      alt={plugin.name}
                    />
                  );
                })}
              </>
            ) : (
              <>
                {plugins.map((plugin, index) => {
                  if (index > 4) return <></>;
                  return (
                    <img
                      className="w-5 h-5 bg-white rounded"
                      key={plugin.id}
                      src={plugin.logo}
                      alt={plugin.name}
                    />
                  );
                })}
                <span>...</span>
              </>
            )}
            {isHovered && plugins && plugins.length > 0 && (
              <span className="absolute top-7 left-0 mt-2 p-1 whitespace-nowrap bg-black bg-opacity-50 text-white text-sm rounded-md">
                {plugins.map((plugin) => plugin.name).join(', ')}
              </span>
            )}
          </div>
        ) : (
          <span>{t('Not Selected')}</span>
        )}
        <IconChevronDown size={16} />
      </button>
      {isOpened && (
        <div
          ref={selectRef}
          className="mb-1 w-full rounded border border-neutral-200 bg-transparent flex flex-col p-1.5 gap-1.5 text-neutral-900 dark:border-neutral-600 dark:text-white"
        >
          {Object.keys(localPlugins).length > 0 && (
            <div className="w-full flex flex-col items-start gap-2 rounded cursor-pointer bg-transparent p-2 border border-neutral-200 dark:border-neutral-600 dark:text-white max-h-[7.5rem] overflow-y-auto">
              {Object.keys(localPlugins).map((pluginId) => (
                <div
                  key={pluginId}
                  className="w-full pl-1 rounded flex items-start dark:bg-[#343541] dark:text-white"
                >
                  <button
                    id={pluginId}
                    value={pluginId}
                    onClick={handleClickPlugin}
                    className="flex items-center w-full rounded p-1 dark:hover:bg-gray-400 hover:bg-gray-100 dark:hover:text-black transition-colors duration-200"
                  >
                    <img
                      className="w-5 h-5 mr-2 bg-white rounded"
                      src={localPlugins[pluginId].logo as string}
                      alt={localPlugins[pluginId].name}
                    />
                    <span>{t(localPlugins[pluginId].name)}</span>
                    <input
                      type={'checkbox'}
                      checked={pluginsIdList.includes(
                        localPlugins[pluginId].id,
                      )}
                      readOnly={true}
                      className="self-center ml-auto"
                    />
                  </button>
                  <button
                    type="button"
                    className="self-center rounded p-1 ml-2 dark:hover:bg-gray-400 hover:bg-gray-100 dark:hover:text-black transition-colors duration-200"
                    value={pluginId}
                    onClick={handleDeletePlugin}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-1 mb-1 w-full flex gap-1.5 rounded border border-neutral-200 bg-transparent pr-2 pl-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
            <span
              className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white md:py-1 md:pl-3"
              hidden={!mutation.isLoading}
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
                hidden={mutation.isLoading}
                placeholder={t('Type the domain of plugin...') || ''}
                rows={1}
                onChange={() => setErrorMessage('')}
                disabled={mutation.isLoading}
              />
              <button
                className="rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
                onClick={handleAddPluginClick}
                hidden={mutation.isLoading}
              >
                <span>Add</span>
              </button>
            </>
          </div>
          {errorMessage && (
            <span className="text-red-500 ml-1">{t(errorMessage)}</span>
          )}
        </div>
      )}
    </div>
  );
};
