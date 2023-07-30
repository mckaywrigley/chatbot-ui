import { IRole } from '@/constants';
import { useModel } from '@/hooks';
import dynamic from 'next/dynamic'
import Image from 'next/image';
import Card from 'antd/lib/card';
import { FC, useCallback } from 'react';
import va from '@vercel/analytics';

// const Card = dynamic(() => import('antd/lib/card'));

interface Props {
  role: IRole;
  onSelect: (params: string) => void;
}

const { Meta } = Card as any;

const RoleButton: FC<Props> = ({
  role,
  onSelect
}) => {
  const { setRoleModalOpen, setCurrentRole } = useModel('global');

  const onClick = useCallback(() => {
    va.track(role.imgAlt, { eventType: 'click' });
    if (role.options) {
      setRoleModalOpen(true);
      setCurrentRole(role);
    } else {
      onSelect(role.prompt);
    }
  }, [role, setRoleModalOpen, setCurrentRole, onSelect]);

  return (
    <Card
      className='m-1'
      onClick={onClick}
      hoverable
      style={{ width: 115 }}
      bodyStyle={{ padding: 12, fontSize: 14, minHeight: 106 }}
      cover={<Image priority src={role.img} alt={role.imgAlt} width={115} height={115} />}
    >
      <Meta style={{ fontSize: 12 }} title={role.title} description={role.description} />
    </Card>
  );
};

export default RoleButton;
