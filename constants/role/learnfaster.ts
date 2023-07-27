import { formType, IRole } from './type';

export const learnfaster: IRole = {
  index: 3,
  img: '/images/learnfaster.png',
  imgAlt: 'learnfaster',
  title: '知识百科',
  description: '80/20原则快速学习知识',
  example: '我想学习关于{}的更多知识.',
  prompt: `
    I want to learn about the {}. Identify and share the most important 20% of learnings from this topic that will help me understand 80% of it.
    Write in Chinese，With a Optimistic tone，In a Technical style
  `,
  options: [{
    label: '希望学习的学科/话题',
    key: 'topic',
    type: formType.input,
  }],
};
