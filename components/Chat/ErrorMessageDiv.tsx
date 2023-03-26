import { ErrorMessage } from '@/types';
import { FC } from 'react';

interface Props {
  error: ErrorMessage;
}

export const ErrorMessageDiv: FC<Props> = ({ error }) => {
  return (
    <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[500px]">
      <div className="text-center text-red-500">
        {error.title} {error.code ? <i>({error.code}) </i> : ''}
      </div>
      {error.messageLines.map((line, index) => (
        <div key={index} className="text-center text-red-500">
          {' '}
          {line}{' '}
        </div>
      ))}
    </div>
  );
};
