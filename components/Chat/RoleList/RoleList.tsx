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
    <div className='flex'>
      {list.map((role: IRole) => (<Role key={role.index} role={role} onSelect={onSelect} />))}
    </div>
  );
};
