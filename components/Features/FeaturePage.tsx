import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NotionRenderer } from 'react-notion-x';

import Spinner from '../Spinner/Spinner';
import TierTag from './TierTag';

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
  const getPropertiesTier = (recordMap: ExtendedRecordMap) => {
    if (!recordMap) return [];
    const blockId = Object.keys(recordMap.block).find((key) => {
      return key.replace(/-/g, '') === pageId.replace(/-/g, '');
    });
    if (!blockId) return [];
    console.log(recordMap?.block[blockId]?.value?.properties);
    if (!recordMap?.block[blockId]?.value?.properties['{wW:']) return [];

    return recordMap?.block[blockId]?.value?.properties['{wW:'][0][0]
      .split(',')
      .filter((item: string) => item !== '');
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
        <div className="text-center font-bold text-lg m-1">
          {getPageTitle(recordMap)}
        </div>
        <div className="text-center my-2">
          {getPropertiesTier(recordMap).map((tier: string, index: number) => {
            return <TierTag key={index} tier={tier} />;
          })}
        </div>
        <NotionRenderer
          className=""
          recordMap={recordMap}
          fullPage={false}
          darkMode={true}
          components={{
            Collection: () => {
              return <></>;
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
