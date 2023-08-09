import { IRoleOption, formType } from '@/constants';
import { useModel } from '@/hooks';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import dynamic from 'next/dynamic'
import { FC, useCallback, useEffect, useState, useRef } from 'react';
import va from '@vercel/analytics';
import { replaceAtPosition } from '@/utils/app/replaceAttr';
import { PromptSelector } from '../Prompt/PromptSelector';

const ImageUploader = dynamic(() => import('./ImageUploader'))
interface Props {
  onSelect: (params: string) => void;
}

const RoleModal: FC<Props> = ({ onSelect }) => {
  const { roleModalOpen, setRoleModalOpen, currentRole } = useModel('global');
  const [example, setExample] = useState('');
  const [form] = Form.useForm();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 获取prompt：1.白名单内的模块通过拼接的方式获取 2.通过替换提示词关键字拼接
  const fetchPrompt = useCallback((template: string, values: any) => {
    if (currentRole.imgAlt === 'imageRecognizer') {
      const keys = Object.keys(values);
      return keys.reduce((pre, cur) => {
        return `${pre}\n${values[cur]}`;
      }, '');
    } else {
      return replaceAtPosition(template, Object.values(values));
    }
  }, [currentRole]);

  // 获取prompt示例
  const fetchExmple = useCallback((template: string, values: FormData) => {
    if (!values) return;
    const promp = fetchPrompt(template, values);
    setExample(promp);
  }, [fetchPrompt]);

  // 首次打开设置默认值和默认示例
  useEffect(() => {
    const values = currentRole.options?.reduce((pre: any, cur: IRoleOption, index: number) => {
      const { option, type, key } = cur;
      if (type === formType.select && !!option) {
        const o = option[index] ? option[index] : option[0];
        pre = { ...pre, [key]: o.value };
      } else pre = { ...pre, [key]: '' };
      return pre;
    }, {});

    form.setFieldsValue(values);
    fetchExmple(currentRole.example, values);
  }, [currentRole, fetchExmple, form]);

  const onCancelModal = useCallback(() => {
    setRoleModalOpen(false);
    form.setFieldsValue({});
  }, [form, setRoleModalOpen]);

  // 提交预设提示词
  const onFinish = (values: any) => {
    const prompt = fetchPrompt(currentRole.prompt, values);
    va.track(currentRole.imgAlt, { eventType: 'submit', prompt });
    onSelect(prompt);
    onCancelModal();
  };

  const onChange = (values: FormData) => {
    const lastValues = form.getFieldsValue();
    fetchExmple(currentRole.example, { ...lastValues, values });
  };

  const formRender = useCallback(() => {
    const { options } = currentRole;
    return (
      options?.map((item: IRoleOption) => {
        const { type, label, option, key } = item;
        let Item = null;
        if (type === formType.select) {
          Item = <Select
            size="middle"
            style={{ width: 200 }}
            options={option}
            placeholder={`请选择${label}`}
          />
        } else if (type === formType.input) {
          Item = <Input
            placeholder={`请输入${label}`}
            style={{ width: 200 }}
          />
        } else if (type === formType.imageUploader) {
          return <ImageUploader
            form={form}
            name={key}
            key={key}
            label={label}
          />
        } else if (type === formType.promptSelect) {
          return <PromptSelector
            size="middle"
            style={{ width: 200 }}
            options={option}
            placeholder={`请选择${label}`}
            key={key}
            name={key}
            label={label}
            form={form}
          />
        }

        return <Form.Item
          key={key}
          label={label}
          name={key}
          rules={[{ required: true, message: `请输入或选择${label}` }]}
        >
          {Item}
        </Form.Item>
      })
    )
  }, [currentRole, form]);

  const onFormSubmit = () => {
    form.submit();
  }

  return (
    <Modal
      title="请选择选项以完成你想要的目标"
      centered
      open={roleModalOpen}
      onCancel={onCancelModal}
      footer={[
        <Button key="cancel" onClick={onCancelModal}>
          取消
        </Button>,
        <Button key="submit" className="bg-[#202123] select-none items-center rounded-md border border-white/20 text-white transition-colors duration-200 hover:bg-gray-500/10" type="primary" onClick={onFormSubmit}>
          提交
        </Button>,
      ]}
    >
      {
        currentRole.example ? <div
          className="w-full rounded-lg border border-neutral-200 bg-transparent px-4 py-3 my-3 text-neutral-900 dark:border-neutral-600 dark:text-neutral-100"
          style={{
            resize: 'none',
            bottom: `${textareaRef?.current?.scrollHeight}px`,
          }}
        >
          示例: {example}
        </div> : <></>
      }
      <Form form={form} onFinish={onFinish} onValuesChange={onChange} layout="vertical">
        {formRender()}
      </Form>
    </Modal>
  );
};

export default RoleModal;