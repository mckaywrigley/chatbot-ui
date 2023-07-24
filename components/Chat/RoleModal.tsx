import { IRoleOption, formType } from '@/constants';
import { useModel } from '@/hooks';
import { Form, Input, Modal, Select, Button, FormItemProps } from 'antd';
import { FC, useCallback, useEffect, useState, useRef } from 'react';
import { replaceAtPosition } from '@/utils/app/replaceAttr';;

interface Props {
  onSelect: (params: string) => void;
}

export const RoleModal: FC<Props> = ({ onSelect }) => {
  const { roleModalOpen, setRoleModalOpen, currentRole } = useModel('global');
  const [example, setExample] = useState('');
  const [form] = Form.useForm();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPrompt = useCallback((template: string, values: FormData) => {
    return replaceAtPosition(template, Object.values(values));
  }, []);

  const fetchExmple = useCallback((template: string, values: FormData) => {
    if (!values) return;
    const promp = fetchPrompt(template, values);
    setExample(promp);
  }, [fetchPrompt]);

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
  }, [setRoleModalOpen]);

  const onFinish = (values: any) => {
    console.log('Form values:', values);
    const prompt = fetchPrompt(currentRole.prompt, values);
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
        return <Form.Item
          key={key}
          label={label}
          name={key}
          rules={[{ required: true, message: `请输入或选择${label}` }]}
        >
          {
            type === formType.select ? <Select
              size="middle"
              style={{ width: 200 }}
              options={option}
              placeholder={`请选择${label}`}
            />
              : <Input
                placeholder={`请输入${label}`}
                style={{ width: 200 }}
              />
          }
        </Form.Item>
      })
    )
  }, [currentRole]);

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
        <Button key="submit" className="bg-[#202123] select-none items-center rounded-md border border-white/20 text-white transition-colors duration-200 hover:bg-gray-500/10" type="primary" onClick={() => form.submit()}>
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
