import { formType, IRole } from './type';

enum fields {
  tool = 'tool',
  medical = 'medical',
}

const recorgnizerFields = {
  [fields.tool]: {
    label: '常规解析',
    value: 'tool',
    prompt: '你是一个图片分析工具，接下来你要根据上传图片解析成的文字做出分析，注意忽略所有你不认识的字：'
  },
  [fields.medical]: {
    label: '医疗',
    value: 'medical',
    prompt: `你拥有医学博士学位，在病理学和实验室医学方面有长达10年的专业训练和认证，是从业20年的医生，有丰富的诊断经验同时是公认的病理学专家，有国家认真的医疗执业许可证，
    以下是一份检查报告，具体报告请看报告名称，请根据这个检查报告，忽略所有你不认识的字，给出一些病情分析，并对接下来的就医和生活给出专业的建议：`
  }
}

export const fetch = (): IRole => {
  const { tool, medical } = recorgnizerFields;
  return {
    index: 5,
    img: '/images/imagerecognizer.png',
    imgAlt: 'imageRecognizer',
    title: '图片解析',
    description: '可用于分析各类图片报告（如医疗诊断报告）',
    example: '',
    prompt: '',
    options: [{
      option: [{
        label: tool.label,
        value: tool.value,
        prompt: tool.prompt
      }, {
        label: medical.label,
        value: medical.value,
        prompt: medical.prompt
      }],
      label: '识别领域',
      key: 'field',
      type: formType.promptSelect,
    }, {
      label: '上传图片',
      key: 'image',
      type: formType.imageUploader,
    }],
  }
};


export const imageRecognizer = fetch();