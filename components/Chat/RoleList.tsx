import { FC } from 'react';
import RoleButton from '@/components/Buttons/RoleButton';
import { IRole, defaultRoleList } from '@/constants';

interface Props {
  onSelect: (params: string) => void;
  list?: IRole[];
}

const RoleList: FC<Props> = ({
  onSelect,
  list = defaultRoleList
}) => {

  return (
    <div className='flex flex-wrap lg:w-max w-screen'>
      {list.map((role: IRole) => (
        <div key={role.index} className='mr-7 w-1/4 lg:mr-1 lg:w-1/5'>
          <RoleButton role={role} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};

export default RoleList;