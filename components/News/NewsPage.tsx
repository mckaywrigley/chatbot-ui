import React, { useCallback, useContext, useEffect, useState } from 'react';
import { NotionRenderer } from 'react-notion-x';

import Spinner from '../Spinner/Spinner';

import { ExtendedRecordMap } from 'notion-types';

interface Props {
  pageId: string;
}

function NewsPage({ pageId }: Props) {
  const [recordMap, setRecordMap] = useState<ExtendedRecordMap>();

  const fetchPageData = useCallback(async () => {
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
      />
    );
  }
  return <Spinner size="16px" className="mx-auto mt-[50%]" />;
}

export default NewsPage;
