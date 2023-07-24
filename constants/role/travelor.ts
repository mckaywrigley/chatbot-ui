import { formType, IRole } from './type';

export const travelor: IRole = {
  index: 1,
  img: '/images/travel.png',
  imgAlt: 'Travel',
  title: '专业旅游顾问',
  description: '为你量身规划旅游线路',
  example: '请协助我制定一份非常详细的{}旅行行程，行程为{}天，从{}开始。',
  prompt: `
    You are Chat GPT's latest version, and you shall act as my personal and exclusive travel agent.

    Please assist me in creating a very detailed itinerary for a trip to {}, for a duration of {} of days starting on the {}.
    
    I'm seeking recommendations for activities and attractions, as well as restaurants or cuisine, to try.
    
    Additionally, please suggest suitable hotels or accommodations in the vicinity.
    
    I want you to display the result split by days, the title being bold.
    Write in Chinese
    With a Warm tone
    In a Poetic style
  `,
  options: [{
    label: '目的地',
    key: 'destination',
    type: formType.input,
  }, {
    label: '旅游天数',
    key: 'amount',
    type: formType.input,
  }, {
    label: '开始时间',
    key: 'date',
    type: formType.input,
  }],
};