import { ErrorMessage } from '@/types/error';
import { IconCircleX } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  error: ErrorMessage;
}

export const ErrorMessageDiv: FC<Props> = ({ error }) => {
  return (
    <div className="mx-6 flex h-full flex-col items-center justify-center text-red-500">
      <div className="mb-5">
        <IconCircleX size={36} />
      </div>
      <div className="mb-3 text-2xl font-medium">{error.title}</div>
      {error.messageLines.map((line, index) => (
        <div key={index} className="text-center">
          {' '}
          {line}{' '}
        </div>
      ))}
      <div className="mt-4 text-xs opacity-50 dark:text-red-400">
        {error.code ? <i>Code: {error.code}</i> : ''}
      </div>
    </div>
  );
};
