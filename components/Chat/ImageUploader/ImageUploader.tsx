import { FC, useCallback, useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import Form, { FormInstance } from "antd/lib/form";
import Select from "antd/lib/select";
import { languageOptions } from './config';
import TextArea from "antd/lib/input/TextArea";
import Input from "antd/lib/input";

interface Props {
  form: FormInstance;
  name: string;
  label: string;
}

export const ImageUploader: FC<Props> = ({ form, name, label }) => {
  const [ocr, setOcr] = useState("");
  const [imageData, setImageData] = useState<any>('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [lang, setLang] = useState<any>('chi_sim');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const worker = createWorker({
    logger: (m) => {
      console.log(m);
      setStatus(m.status);
      setProgress(parseInt(m.progress * 100));
    },
  });

  useEffect(() => {
    form.setFieldValue(name, ocr);
  }, [form, name, ocr]);

  const convertImageToText = useCallback(async (imageData) => {

    if (!imageData) return;
    await worker.load();
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    const {
      data: { text },
    } = await worker.recognize(imageData);
    setOcr(text.replace(/\s+/g, ' ').trim());
  }, [worker, lang]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
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
      {!!status && status !== 'recognizing text' && <div>
        <div className="progress-label">提取状态: {status}...</div>
      </div>}
      {progress < 100 && progress > 0 && <div>
        <div className="progress-label">Progress ({progress}%)</div>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }} ></div>
        </div>
      </div>}
      <div className="display-flex">
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
      </div>
    </Form.Item>

  );
};
