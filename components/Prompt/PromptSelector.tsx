import { CSSProperties, FC, useCallback, useEffect, useState } from "react";
import Select from 'antd/lib/select';
import { PromptEditor } from './PromptEditor';
import Form, { FormInstance } from "antd/lib/form";
import { IOption } from "@/constants";

interface Props {
  options: any;
  label: string;
  size?: string;
  style?: CSSProperties;
  placeholder?: string;
  name: string;
  form: FormInstance;
}

export const PromptSelector: FC<Props> = ({ options, label, name, form }) => {
  const [prompt, setPrompt] = useState(options[0].prompt);
  const [option, setOption] = useState(options[0].value);

  useEffect(() => {
    form.setFieldValue(name, options[0].prompt);
  }, [form, name, options]);

  const onChange = useCallback((e: any) => {
    const { prompt, value } = options.find((o: IOption) => o.value === e) || {};
    const v = prompt || '';
    form.setFieldValue(name, v);
    setPrompt(v);
    setOption(value);
  }, [form, name, options]);

  const onValueChange = useCallback((e: any) => {
    form.setFieldValue(name, e);
    setPrompt(e);
  }, [form, name]);

  return (
    <Form.Item
      className='px-1 mb-0'
      label={label}
      key={name}
    >
      <Select
        size="middle"
        className="mb-2"
        style={{ width: 200 }}
        options={options}
        onChange={onChange}
        value={option}
        placeholder={`请选择${label}`}
      />
      <PromptEditor
        value={prompt}
        onValueChange={onValueChange}
        rows={3}
        key={name}
        name={name}
        label={label}
      />
    </Form.Item>
  );
};

