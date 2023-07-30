import { FC, useCallback, useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import Form, { FormInstance } from "antd/lib/form";
import Select from "antd/lib/select";
import { languageOptions } from './config';
import TextArea from "antd/lib/input/TextArea";
import Input from "antd/lib/input";
import Progress from "antd/lib/progress";

const STATUS = {
  loading_tesseract: 'loading tesseract core',
  initializing_tesseract: 'initializing tesseract',
  loading_language: 'loading language traineddata',
  initializing_api: 'initializing api',
  initialize_api: 'initialized api',
  recognizing: 'recognizing text'
}

const STATUS_LIST = Object.values(STATUS);

interface Props {
  form: FormInstance;
  name: string;
  label: string;
}

const ImageUploader: FC<Props> = ({ form, name, label }) => {
  const [ocr, setOcr] = useState("");
  const [imageData, setImageData] = useState<any>('');
  const [progress, setProgress] = useState(0);
  const [lang, setLang] = useState<any>('chi_sim');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    form.setFieldValue(name, ocr);
    // 语言包地址：https://github.com/naptha/tessdata/blob/gh-pages/4.0.0_best/chi_sim.traineddata.gz
  }, [form, name, ocr]);

  const convertImageToText = useCallback(async (imageData: any) => {
    console.log('imageData', imageData)
    if (!imageData) return;
    const worker = await createWorker({
      langPath: '/tesseract/',
      logger: (m) => {
        console.log('worker m: ', m);
        const i = STATUS_LIST.findIndex((s) => m.status?.includes(s));
        if (i) {
          let progress = (i / STATUS_LIST.length);
          if (m.status === STATUS.recognizing) {
            progress = progress + (m.progress / STATUS_LIST.length);
          }
          setProgress(parseInt(`${progress * 100}`));
        }
      },
    });
    await (await worker).load();
    await (await worker).loadLanguage(lang);
    await (await worker).initialize(lang);
    const {
      data: { text },
    } = await (await worker).recognize(imageData);
    setOcr(text.replace(/\s+/g, ' ').trim());
  }, [lang]);

  const handleImageChange = useCallback((e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageDataUri = reader.result;
      setImageData(imageDataUri);
      convertImageToText(imageDataUri);
    };
    reader.readAsDataURL(file);
  }, [convertImageToText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setOcr(value);
  };

  const onLangChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLang(e);
  };

  return (
    <Form.Item
      className='px-1'
      label={label}
      key={name}
    >
      <div className="mb-3 flex">
        <Select
          className='flex-1 mr-2'
          size="middle"
          style={{ width: 200 }}
          options={languageOptions}
          value={lang}
          onChange={onLangChange}
        />
        <Input
          className='flex-1'
          type="file"
          onChange={handleImageChange}
          accept="image/*"
        />
      </div>
      {progress < 100 && progress > 0 && <div className="flex">
        <div className='w-24'>解析进度：</div><Progress percent={progress} status="active" strokeColor={{ from: '#108ee9', to: '#87d068' }} />
      </div>}
      {/*图片展示： {imageData ?? <Image className='w-0.3 h-auto mr-50' src={imageData} alt="" />} */}
      <Form.Item
        name={name}
        rules={[{ required: true, message: `请输入或选择${label}` }]}
      >
        <TextArea
          ref={textareaRef}
          className="w-full resize-none max-h-200 rounded-lg border border-neutral-200 bg-transparent px-4 py-3 text-neutral-900 dark:border-neutral-600 dark:text-neutral-100"
          style={{
            resize: 'none',
            bottom: `${textareaRef?.current?.scrollHeight}px`,
            overflow: `${textareaRef.current && textareaRef.current.scrollHeight > 400
              ? 'auto'
              : 'hidden'
              }`,
          }}
          placeholder={''}
          value={ocr || ''}
          rows={3}
          onChange={handleChange}
        />
      </Form.Item>
    </Form.Item>

  );
};

export default ImageUploader;