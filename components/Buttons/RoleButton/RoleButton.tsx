import { IRole } from '@/constants';
import { useModel } from '@/hooks';
import { Card } from 'antd';
import Image from 'next/image';
import { FC, useCallback } from 'react';

interface Props {
  role: IRole;
  onSelect: (params: string) => void;
}

const { Meta } = Card;

const Role: FC<Props> = ({
  role,
  onSelect
}) => {
  const { setRoleModalOpen, setCurrentRole } = useModel('global');

  const onClick = useCallback(() => {
    if (role.options) {
      setRoleModalOpen(true);
      setCurrentRole(role);
    } else {
      onSelect(role.prompt);
    }
  }, [role, setRoleModalOpen, setCurrentRole, onSelect]);

  return (
    <>
      <Card
        className='m-1'
        onClick={onClick}
        hoverable
        style={{ width: 200 }}
        bodyStyle={{ padding: 12 }}
        cover={<Image src={role.img} alt={role.imgAlt} width={200} height={200} />}
      >
        <Meta title={role.title} description={role.description} />
      </Card>
    </>
  );
};

export default Role;
