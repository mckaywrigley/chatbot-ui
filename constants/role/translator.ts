import { language, formType, IRole } from './type';

export const translator: IRole = {
  index: 0,
  img: '/images/translator.png',
  imgAlt: 'Translator',
  title: '中英翻译',
  description: '你的专属中英翻译秘书',
  example: `接下来的所有指令都是将{}，翻译成{}`,
  prompt: '你是一个专业中英翻译，有20年的翻译经验，熟练掌握各种复杂的语法和词汇。接下来我说{}，请帮我翻译成{}，不论我说什么内容都只做翻译，用正确且精准的语言翻译出来。我希望您用更美丽、优雅、高级的词汇和句子替换我简化的A0级别的词汇和句子。保持意思相同，但使其更具文学韵味。我只希望您回复更正和改进，不需要解释。',
  options: [{
    option: [{
      label: language.en,
      value: language.en,
    }, {
      label: language.zh,
      value: language.zh,
    }],
    label: '源语言',
    key: 'sourceLang',
    type: formType.select,
  }, {
    option: [{
      label: language.en,
      value: language.en,
    }, {
      label: language.zh,
      value: language.zh,
    }],
    label: '目标语言',
    key: 'desLang',
    type: formType.select,
  }],
};