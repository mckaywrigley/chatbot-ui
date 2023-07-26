import { FC } from 'react';
import Role from '@/components/Buttons/RoleButton';
import { IRole, defaultRoleList } from '@/constants';

interface Props {
  onSelect: (params: string) => void;
  list?: IRole[];
}

const defaultOnSelect = () => {

}

export const RoleList: FC<Props> = ({
  onSelect = defaultOnSelect,
  list = defaultRoleList
}) => {

  return (
    <div className='flex lg:w-full w-screen overflow-x-scroll'>
      {list.map((role: IRole) => (
        <div key={role.index} className='flex-1'>
          <Role role={role} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};
