import { Plugin } from '@/types/plugin';
import { FC, useEffect, useState } from 'react';
import { Spinner } from '../Global/Spinner';

interface Props {
  plugins: Plugin[];
  onInstall: (plugin: Plugin) => void;
}

const DropdownButton: FC<{ enabledPlugins: Plugin[]; onClick: () => void }> = ({
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
          <img
            src={plugin.manifest.logo_url}
            alt="logo"
            key={index}
            className="h-8 w-8"
          />
        ))}
      </div>
      <span className="ml-1">&#x25BC;</span>
    </button>
  );
};

export const Plugins: FC<Props> = ({ plugins, onInstall }: Props) => {
  const [showPluginStore, setShowPluginStore] = useState(false);
  const [enabledPlugins, setEnabledPlugins] = useState<Plugin[]>([]);

  const onShowPlugins = () => {
    setShowPluginStore(!showPluginStore);
  };

  const handleTogglePlugin = (plugin: Plugin) => {
    // todo: handle the auth
    if (enabledPlugins.find((p) => p.name === plugin.name)) {
      setEnabledPlugins(enabledPlugins.filter((p) => p.name !== plugin.name));
      return;
    }

    setEnabledPlugins([...enabledPlugins, plugin]);
  };

  const handleInstallPlugin = (plugin: Plugin) => {
    onInstall(plugin);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        Plugins
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <DropdownButton
          enabledPlugins={enabledPlugins}
          onClick={onShowPlugins}
        />
        {showPluginStore && (
          <div className="absolute inset-0 z-10 h-full p-20">
            <div className="h-full rounded-lg bg-[#202123]">
              <button
                className="float-right pr-4 pt-4 text-gray-500"
                onClick={() => setShowPluginStore(false)}
              >
                &#x2715;
              </button>
              <PluginStore
                enabledPlugins={enabledPlugins}
                plugins={plugins}
                handleInstallPlugin={handleInstallPlugin}
                handleTogglePlugin={handleTogglePlugin}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PluginStore = ({
  enabledPlugins,
  plugins,
  handleInstallPlugin,
  handleTogglePlugin,
}: {
  enabledPlugins: Plugin[];
  plugins: Plugin[];
  handleInstallPlugin: (plugin: any) => void;
  handleTogglePlugin: (plugin: any) => void;
}) => {
  return (
    <div className="flex h-full flex-col space-y-4 p-10">
      <div className="text-xl">Plugin Store</div>
      <div>
        {enabledPlugins.length > 0 && (
          <>
            <div className="mb-2 text-sm font-semibold text-gray-500">
              Enabled Plugins
            </div>
            <div className="flex space-x-4">
              {enabledPlugins.map((plugin, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <img
                    src={plugin.manifest.logo_url}
                    alt="logo"
                    className="h-8 w-8"
                  />
                  <button
                    className="text-gray-500"
                    onClick={() => handleTogglePlugin(plugin)}
                  >
                    &#x2715;
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="grid h-full gap-4 overflow-y-auto rounded-sm p-4">
        {plugins.map((ap, i) => (
          <Plugin
            enabledPlugins={enabledPlugins}
            key={ap.name + i}
            plugin={ap}
            handleInstallPlugin={() => handleInstallPlugin(ap)}
            handleTogglePlugin={() => handleTogglePlugin(ap)}
          />
        ))}
      </div>
    </div>
  );
};

const Plugin = ({
  enabledPlugins,
  plugin,
  handleInstallPlugin,
  handleTogglePlugin,
}: {
  plugin: Plugin;
  enabledPlugins: Plugin[];
  handleInstallPlugin: (plugin: any) => void;
  handleTogglePlugin: (plugin: any) => void;
}) => {
  const enabled = enabledPlugins.find((p) => p.name === plugin.name);

  return (
    <div className="flex flex-col space-y-4 rounded-sm border border-gray-500 p-5">
      <div className="flex space-x-4">
        {/** a stock square image */}
        <img src={plugin.manifest.logo_url} alt="logo" className="h-16 w-16" />
        <div className="flex flex-col space-y-2">
          <div className={`flex items-center space-x-2`}>
            <div className="text-lg font-semibold">{plugin.name}</div>
            {enabled && (
              <div className="rounded-full bg-green-500 p-2 text-xs text-gray-300">
                Enabled
              </div>
            )}
          </div>
          {plugin.installed ? (
            <EnableButton
              enabled={enabled}
              plugin={plugin}
              handleTogglePlugin={handleTogglePlugin}
            />
          ) : (
            <InstallButton
              plugin={plugin}
              handleInstallPlugin={handleInstallPlugin}
            />
          )}
        </div>
      </div>
      <div className="flex text-sm text-gray-300">
        <p>{plugin.manifest.description_for_model}</p>
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
      className="flex w-fit items-center rounded bg-green-500 px-2 font-bold text-white hover:bg-green-700"
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

// enable button
const EnableButton = ({ plugin, handleTogglePlugin, enabled }: any) => {
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    // show loading
    setLoading(true);

    // handle the auth

    handleTogglePlugin(plugin);

    setLoading(false);
  };

  return (
    <button
      className={
        'flex w-fit items-center rounded bg-gray-500 px-2 font-bold text-white hover:bg-green-700'
      }
      onClick={toggle}
    >
      {loading ? (
        <Spinner className="m-2 ml-4" />
      ) : (
        <div className="p-2">{enabled ? 'Disable' : 'Enable'}</div>
      )}
    </button>
  );
};
