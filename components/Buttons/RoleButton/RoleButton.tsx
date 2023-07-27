import { IRole } from '@/constants';
import { useModel } from '@/hooks';
import Card from 'antd/lib/card';
import Image from 'next/image';
import { FC, useCallback } from 'react';
import va from '@vercel/analytics';

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
      style={{ width: 110 }}
      bodyStyle={{ padding: 12, fontSize: 14, minHeight: 106 }}
      cover={<Image src={role.img} alt={role.imgAlt} width={110} height={110} />}
    >
      <Meta style={{ fontSize: 12 }} title={role.title} description={role.description} />
    </Card>
  );
};

export default Role;
