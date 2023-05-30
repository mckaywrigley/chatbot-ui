import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NotionRenderer } from 'react-notion-x';
import { Collection } from 'react-notion-x/build/third-party/collection';

import Spinner from '../Spinner/Spinner';

import { ExtendedRecordMap } from 'notion-types';

interface Props {
  pageId: string;
  internalLinkOnClick: (pageId: string) => void;
}

function FeaturePage({ pageId, internalLinkOnClick }: Props) {
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap>();

  const fetchPageData = async (pageId: string) => {
    setRecordMap(undefined);
    const response = await fetch(`/api/notion/${pageId}`);
    const { recordMap } = await response.json();
    setRecordMap(recordMap);
  };
  const getPageTitle = (recordMap: ExtendedRecordMap) => {
    if (!recordMap) return '';
    const blockId = Object.keys(recordMap.block).find((key) => {
      return key.replace(/-/g, '') === pageId.replace(/-/g, '');
    });
    if (!blockId) return '';
    return recordMap?.block[blockId]?.value?.properties?.title[0][0] || '';
  };

  useEffect(() => {
    fetchPageData(pageId);
  }, [pageId]);
  if (recordMap) {
    {
      /* <div className="text-center font-bold">{title}</div> */
    }
    return (
      <div className="overflow-scroll m-2 !w-full">
        <div className="text-center font-bold text-lg">
          {getPageTitle(recordMap)}
        </div>
        <NotionRenderer
          className=""
          recordMap={recordMap}
          fullPage={false}
          darkMode={true}
          components={{
            Collection: () => {
              return <div></div>;
            },
            PageLink: ({ ...props }) => {
              return (
                <a
                  {...props}
                  onClick={(e) => {
                    e.preventDefault();
                    let id = props.href;
                    if (props.href.charAt(0) === '/') {
                      id = props.href.substring(1);
                    }
                    internalLinkOnClick(id);
                  }}
                />
              );
            },
          }}
        />
      </div>
    );
  }
  return <Spinner size="16px" className="mx-auto mt-[50%]" />;
}

export default FeaturePage;
