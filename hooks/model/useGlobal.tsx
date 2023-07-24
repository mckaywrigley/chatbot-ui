import { useState } from 'react';

export const useGlobal = () => {
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState({});

  return {
    roleModalOpen,
    currentRole,
    setRoleModalOpen,
    setCurrentRole,
  };
};
