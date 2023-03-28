import { FC, useState } from 'react';
import { Spinner } from '../Global/Spinner';

interface Props {}

const availablePlugins = [
  {
    name: 'Plugin 1',
    description: 'Description of plugin 1',
    enabled: false,
  },
  {
    name: 'Plugin 2',
    description: 'Description of plugin 2',
    enabled: false,
  },
  {
    name: 'Plugin 1',
    description: 'Description of plugin 1',
    enabled: false,
  },
  {
    name: 'Plugin 2',
    description: 'Description of plugin 2',
    enabled: false,
  },
  {
    name: 'Plugin 1',
    description: 'Description of plugin 1',
    enabled: false,
  },
  {
    name: 'Plugin 2',
    description: 'Description of plugin 2',
    enabled: false,
  },
  {
    name: 'Plugin 1',
    description: 'Description of plugin 1',
    enabled: false,
  },
  {
    name: 'Plugin 2',
    description: 'Description of plugin 2',
    enabled: false,
  },
];

const DropdownButton: FC<{ enabledPlugins: any[]; onClick: () => void }> = ({
  enabledPlugins,
  onClick,
}) => {
  return (
    <button
      className="flex w-full items-center justify-between rounded bg-gray-200 p-2 dark:bg-transparent"
      onClick={onClick}
    >
      <div className="flex space-x-4">
        {enabledPlugins.map((plugin, index) => (
          <span key={index} className="bg-blue-300 p-2 px-4">
            {plugin.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="ml-1">&#x25BC;</span>
    </button>
  );
};

export const Plugins: FC<Props> = () => {
  const [plugins, setPlugins] = useState<any>([]);
  const [showPluginStore, setShowPluginStore] = useState(false);

  const onShowPlugins = () => {
    setShowPluginStore(!showPluginStore);
  };

  const handleInstallPlugin = (plugin: any) => {
    setPlugins([...plugins, plugin]);
    setShowPluginStore(false);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        Plugins
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <DropdownButton enabledPlugins={plugins} onClick={onShowPlugins} />
        {showPluginStore && (
          <div className="absolute inset-0 z-10 h-full p-20">
            <div className="h-full rounded-lg bg-[#202123]">
              <button
                className="float-right pr-4 pt-4 text-gray-500"
                onClick={() => setShowPluginStore(false)}
              >
                &#x2715;
              </button>
              <PluginStore handleInstallPlugin={handleInstallPlugin} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PluginStore = ({
  handleInstallPlugin,
}: {
  handleInstallPlugin: (plugin: any) => void;
}) => {
  return (
    <div className="flex h-full flex-col space-y-4 p-10">
      <div className="text-xl">Plugin Store</div>
      <div className="grid h-full gap-4 overflow-y-auto rounded-sm p-4">
        {availablePlugins.map((ap, i) => (
          <Plugin
            key={ap.name + i}
            plugin={ap}
            handleInstallPlugin={() => handleInstallPlugin(ap)}
          />
        ))}
      </div>
    </div>
  );
};

const Plugin = ({
  plugin,
  handleInstallPlugin,
}: {
  plugin: any;
  handleInstallPlugin: (plugin: any) => void;
}) => {
  return (
    <div className="flex flex-col space-y-4 rounded-sm border border-gray-500 p-5">
      <div className="flex space-x-4">
        {/** a stock square image */}
        <img src="https://via.placeholder.com/75" />
        <div className="flex flex-col space-y-2">
          <div className="text-lg font-semibold">{plugin.name}</div>
          <InstallButton
            plugin={plugin}
            handleInstallPlugin={handleInstallPlugin}
          />
        </div>
      </div>
      <div className="flex text-sm text-gray-300">
        <p>{plugin.description}</p>
      </div>
    </div>
  );
};

// install button
const InstallButton = ({ plugin, handleInstallPlugin }: any) => {
  const [installed, setInstalled] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleInstall = () => {
    setInstalled(true);

    // show loading
    setLoading(true);

    // handle the auth

    handleInstallPlugin(plugin);
  };

  return (
    <button
      className="flex items-center rounded bg-green-500 px-2 font-bold text-white hover:bg-green-700"
      onClick={handleInstall}
      disabled={installed || loading}
    >
      {loading ? (
        <Spinner className="m-2 ml-4" />
      ) : (
        <>
          <span>Install</span>
          <span className="mb-2">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                d="M8 17l4 4 4-4m-4-5v9"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </span>
        </>
      )}
    </button>
  );
};
