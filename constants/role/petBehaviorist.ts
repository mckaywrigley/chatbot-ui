import { formType, IRole } from './type';

export const petBehaviorist: IRole = {
  index: 2,
  img: '/images/pet.png',
  imgAlt: 'Pet',
  title: '宠物达人',
  description: '解决养宠物时遇到问题的烦恼',
  example: '我有一只{}(eg: 具有攻击性行为的德国牧羊犬)，需要解决它{}(eg: 最近充满攻击性)的问题。',
  prompt: `I want you to act as a pet behaviorist. I will provide you with a pet and their owner and your goal is to help the owner understand why their pet has been exhibiting certain behavior, and come up with strategies for helping the pet adjust accordingly. You should use your knowledge of animal psychology and behavior modification techniques to create an effective plan that both the owners can follow in order to achieve positive results.
    My first request is "我有一个{}，我需要解决它{}的问题.Write in Chinese,With a Warm tone, In a Narrative style
  `,
  options: [{
    label: '宠物类型',
    key: 'pet',
    type: formType.input,
  }, {
    label: '需要咨询宠物解决什么问题',
    key: 'certainbehavior',
    type: formType.input,
  }],
};