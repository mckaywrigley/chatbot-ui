import Form from "antd/lib/form";
import TextArea from "antd/lib/input/TextArea";
import { FC, useRef } from "react";

interface Props {
  value: string;
  onValueChange: any;
  rows?: number;
  name: string;
  label: string;
}

export const PromptEditor: FC<Props> = ({ value, onValueChange, rows, name, label }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onValueChange(value);
  };

  return (
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
        value={value || ''}
        rows={rows || 2}
        onChange={handleChange}
      />
    </Form.Item>
  );
};

