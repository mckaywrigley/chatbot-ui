import { DEFAULT_IMAGE_GENERATION_STYLE, DEFAULT_IMAGE_GENERATION_SAMPLE } from '@/utils/app/const';

import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import HomeContext from '@/pages/api/home/home.context';


const MAX_NUMBER_OF_SAMPLES = 8;

// Subject to changes in the future: style_preset at https://platform.stability.ai/rest-api#tag/v1generation/operation/textToImage
const AVAILABLE_STYLES = {
  '3d-model': '3D Model',
  'analog-film': 'Analog Film',
  anime: 'Anime',
  cinematic: 'Cinematic',
  'comic-book': 'Comic Book',
  'digital-art': 'Digital Art',
  enhance: 'Enhance',
  'fantasy-art': 'Fantasy Art',
  isometric: 'Isometric',
  'line-art': 'Line Art',
  'low-poly': 'Low Poly',
  'modeling-compound': 'Modeling Compound',
  'neon-punk': 'Neon Punk',
  origami: 'Origami',
  photographic: 'Photographic',
  'pixel-art': 'Pixel Art',
  'tile-texture': 'Tile Texture',
};

const ImageGenerationSelectors = () => {
  const { t } = useTranslation('model');

  const {
    state: { selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const numberOfSamples = useMemo(
    () => selectedConversation?.numberOfSamples ?? DEFAULT_IMAGE_GENERATION_SAMPLE,
    [selectedConversation],
  );

  const imageStyle = useMemo(
    () => selectedConversation?.imageStyle ?? DEFAULT_IMAGE_GENERATION_STYLE,
    [selectedConversation],
  );

  const numberOfSamplesOnChange = (newNumberOfSamples: string) => {
    homeDispatch({
      field: 'selectedConversation',
      value: {
        ...selectedConversation,
        numberOfSamples: +newNumberOfSamples,
      },
    });
  };

  const imageStyleOnChange = (newImageStyle: string) => {
    homeDispatch({
      field: 'selectedConversation',
      value: {
        ...selectedConversation,
        imageStyle: newImageStyle,
      },
    });
  };

  const getOptionsForNumberOfSamples = useMemo(() => {
    const options = [];
    for (let i = 1; i <= MAX_NUMBER_OF_SAMPLES; i++) {
      options.push(
        <option key={i} value={i} className="dark:bg-[#343541] dark:text-white">
          {i}
        </option>,
      );
    }
    return options;
  }, []);

  const getOptionsForImageStyles = useMemo(() => {
    const options = [];
    const stylesMapping = Object.entries(AVAILABLE_STYLES);
    for (let i = 0; i < stylesMapping.length; i++) {
      const [key, value] = stylesMapping[i];
      options.push(
        <option
          key={key}
          value={key}
          className="dark:bg-[#343541] dark:text-white"
        >
          {t(key)}
        </option>,
      );
    }
    return options;
  }, []);

  return (
    <div className="flex flex-col justify-between md:flex-row mt-2 text-left text-sm text-neutral-700 dark:text-neutral-400">
      <div className="flex flex-row items-center justify-between md:justify-start">
        <label className="mr-2">{t('Samples')}</label>
        <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
          <select
            className="w-max-20 bg-transparent p-2 focus:outline-none"
            value={numberOfSamples}
            onChange={(e) => {
              numberOfSamplesOnChange(e.target.value);
            }}
          >
            {getOptionsForNumberOfSamples}
          </select>
        </div>
      </div>
      <div className="flex flex-row items-center justify-between mt-2 md:justify-start md:mt-0">
        <label className="mr-2">{t('Image Style')}</label>
        <div className="rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white w-fit pr-1 focus:outline-none">
          <select
            className="w-max-20 bg-transparent p-2 focus:outline-none"
            value={imageStyle}
            onChange={(e) => {
              imageStyleOnChange(e.target.value);
            }}
          >
            {getOptionsForImageStyles}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationSelectors;
