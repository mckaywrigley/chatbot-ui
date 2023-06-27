import { ChangeEvent, FC, useState } from 'react';

import {
  API_ENTRYPOINT,
  PRIVATE_API_ENTRYPOINT,
  WORKSPACES_ENDPOINT,
} from '@/utils/app/const';

interface Workspace {
  name: string;
  slug: string;
  logo: string;
}

const workspaces: Workspace[] = [
  { name: 'Legal', slug: 'legal', logo: 'url-to-legal.png' },
  {
    name: 'Risk & Compliance',
    slug: 'risk-compliance',
    logo: 'url-to-risk.png',
  },
];

export const Workspace: FC = () => {
  const [selectedValue, setSelectedValue] = useState(workspaces[0].slug);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(
    workspaces[0],
  );

  const selectWorkspaceHandler = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
  };

  const APICall = async () => {
    const url = API_ENTRYPOINT + PRIVATE_API_ENTRYPOINT + WORKSPACES_ENDPOINT;
    console.log(url);
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(selectedWorkspace!.slug),
    });
    const data = await response.json();
    console.log(data);
    //do sth with the post response data
  };
  try {
    APICall();
  } catch (error) {
    console.log(error);
  }
  // api call to have default workspace without choosing it in select bar
  const workspaceAPICallHandler = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value);
    //event.target.value === workspace.slug
    try {
      APICall();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="m-2 rounded border border-neutral-200 bg-transparent pr-2  light:text-neutral-900 dark:border-neutral-600 dark:text-white hover:bg-gray-500/10  tranistion-colors duration-200">
      <select
        className="w-full cursor-pointer bg-transparent p-2"
        onChange={workspaceAPICallHandler}
        value={selectedValue}
      >
        <option disabled={true} className="bg-[#202123]">
          Select workspace
        </option>
        {workspaces.map((workspace) => (
          <option
            className="bg-[#202123]"
            value={workspace.slug}
            key={workspace.slug}
            onClick={() => {
              selectWorkspaceHandler(workspace);
            }}
          >
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
};
