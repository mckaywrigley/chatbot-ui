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
    <div className='flex flex-wrap lg:w-full w-screen'>
      {list.map((role: IRole) => (
        <div key={role.index} className='mr-7 w-1/4 lg:mr-1 lg:w-1/5'>
          <Role role={role} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};
