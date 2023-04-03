import { Plugin } from '@/types/plugin';

export const InstalledPlugins = ({ plugins }: { plugins: Plugin[] }) => {
  const installed = plugins.filter((p) => p.installed);
  if (!installed.length) return null;

  return (
    <div className="ml-1 flex flex-row items-center">
      | Installed Plugins:
      {/* TODO: replace with actual plugins */}
      {installed.map((plugin) => (
        <span className="ml-1" key={plugin.id}>
          <img src={plugin.manifest.logo_url} width={24} />
        </span>
      ))}
    </div>
  );
};
