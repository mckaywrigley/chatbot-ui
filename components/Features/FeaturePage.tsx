import React, { useCallback, useContext, useEffect, useState } from 'react';
import { NotionRenderer } from 'react-notion-x';

import Spinner from '../Spinner/Spinner';

import { ExtendedRecordMap } from 'notion-types';

interface Props {
  pageId: string;
  internalLinkOnClick: (pageId: string) => void;
}

function FeaturePage({ pageId, internalLinkOnClick }: Props) {
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap>();

  const fetchPageData = useCallback(async () => {
    setRecordMap(undefined);
    const response = await fetch(`/api/notion/${pageId}`);
    const { recordMap } = await response.json();
    setRecordMap(recordMap);
  }, [pageId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  if (recordMap) {
    return (
      <NotionRenderer
        className="overflow-y-scroll m-2 !w-full"
        recordMap={recordMap}
        fullPage={false}
        header={true}
        darkMode={true}
        components={{
          PageLink: ({ ...props }) => (
            <a
              {...props}
              onClick={(e) => {
                e.preventDefault();
                if (props.href) {
                  // if the first character is /, then remove it
                  let id = props.href;
                  if (props.href.charAt(0) === '/') {
                    id = props.href.substring(1);
                  }
                  internalLinkOnClick(id);
                }
              }}
            />
          ),
        }}
      />
    );
  }
  return <Spinner size="16px" className="mx-auto mt-[50%]" />;
}

export default FeaturePage;
