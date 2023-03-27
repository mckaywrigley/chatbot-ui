import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';

export const MemoizedReactMarkdown: FC<Options> = memo(ReactMarkdown);
