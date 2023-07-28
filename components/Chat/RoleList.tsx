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
    <div className='flex flex-wrap md:w-full w-screen pb-40 overflow-y-scroll' style={{ marginTop: 10 }}>
      {list.map((role: IRole) => (
        <div key={role.index} className='mr-7 w-1/4 md:mr-1 md:w-1/6'>
          <RoleButton role={role} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
};

export default RoleList;