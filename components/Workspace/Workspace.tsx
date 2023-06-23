import { ChangeEvent, FC, useState } from 'react';

export const Workspace: FC = () => {
  const [selectValue, setSelectValue] = useState('');
  const workspaceChangeHandler = (event: ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value === 'Workspace1') {
      setSelectValue('Workspace1');
      console.log('Workspace1 selected');
      // async () => {
      //   const response = await fetch('...workspace1');
      //   const data = await response.json();
      //   console.log(data);
      // };
    }
    if (event.target.value === 'Workspace2') {
      setSelectValue('Workspace2');
      console.log('Workspace2 selected');
      // async () => {
      //   const response = await fetch('...workspace2');
      //   const data = await response.json();
      //   console.log(data);
      // };
    }
  };
  return (
    <div className="m-2 rounded border border-neutral-200 bg-transparent pr-2  text-neutral-900 dark:border-neutral-600 dark:text-white hover:bg-gray-500/10  tranistion-colors duration-200">
      <select
        className="w-full cursor-pointer bg-transparent p-2"
        onChange={workspaceChangeHandler}
        value={selectValue}
      >
        <option className="bg-[#202123]" value="Workspace1">
          Workspace1
        </option>
        <option className="bg-[#202123]" value="Workspace2">
          Workspace2
        </option>
      </select>
    </div>
  );
};
