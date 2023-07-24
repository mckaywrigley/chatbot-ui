import { formType, IRole } from './type';

export const ieltes: IRole = {
  index: 3,
  img: '/images/ielts.png',
  imgAlt: 'Ielts',
  title: '雅思口语考官',
  description: '专属雅思口语锻炼题目',
  example: 'Provide 1 set of {} questions and answers for IELTS Speaking Exam across all three parts.',
  prompt: `
  Provide 1 set of {} questions and answers for IELTS Speaking Exam across all three parts.

Suggestions:
1. Include a variety of question types: Try to cover different question types, such as opinion-based, descriptive, hypothetical, problem-solving, or even strange questions.
2. Cover various themes: Include questions related to education, technology, environment, social issues, hobbies, etc., to offer a well-rounded set of examples.
3. Mention different speaking parts: Consider examples for all three parts of the IELTS Speaking Exam - Part 1 (Introduction & Familiar Topics), Part 2 (Cue Card / Topic Card), and Part 3 (Discussion).
4. Include a mix of personal and general topics: Combine questions that require personal experiences and opinions with broader topics that encourage candidates to discuss societal issues.
5. Ensure clarity and coherence: Focus on questions that allow candidates to express their thoughts clearly and coherently in their responses.

Question Reference:
For Part 1, questions could be like:
  a) Do you like cooking? Why / why not?
  b) Who did the cooking in your family when you were a child?
  c) Do you think that it's important to know how to cook well?
  d) Do you think that children should be taught cookery at school?

For Part 2, the cue card could be like:
"Describe an interesting conversation you had with someone you didn't know. You should say
  - who the person was
  - where the conversation took place
  - what you talked about
  - and explain why you found the conversation interesting."

For Part 3, questions could be like:
  a) What do you think we can learn by studying events of the past?
  b) What important events do you think might take place in the future?

Answer Reference:
For part 1, a short answer could be positive or negative and include a simple reason like:
"Yes, I think that sport is really important for children. Sports and games teach children to play together and try their best."
"Unfortunately I don't have time to do any sports or physical activities because of my work commitments. I'd like to find more time for regular exercise."

For part 2, the answer should contain enough less common vocabulary and always have 3 paragraphs like:
"1. I’d like to talk about a team project that I was involved in during my final term at business school. There were four of us on the team, and our task was to work with a local company to research a new market, in a European country, for one of their products or services. Our objective was to produce a report and give a presentation.
2. The first thing we did was split into two groups of two. We had been assigned a company that produced a range of bicycle accessories, so two of us spent some time getting to know the company while the other two researched the market and the competitors in the target country, which was Germany. In the end, I think it was a successful project because we managed to identify a possible gap in the market in Germany for one of the company’s products. Our group presentation also went really well.
3. Until that point, the course had been all about business theory, so it was quite a learning experience to work with a real company. I felt a real sense of accomplishment when we handed in our report and delivered our presentation, and I think all of us were proud of what we had done.
"

For part 3, the answer could be longer and contain personal experience like:
"Maybe the most important things are that friends need to share common interests and be honest with each other. Friends are people we spend a lot of time with, so it definitely helps if they enjoy doing the same activities or talking about the same topics as we do, and of course we need to be able to trust our friends, so honesty is vital for a good friendship. I think I would struggle to become friends with someone who didn’t have anything in common with me, or who wasn’t reliable or trustworthy."

Notes:
1. Do not use the same questions from reference.
2. Always place the answer below each question.
3. Always place two new lines between each QA for better readability.
4. Always use good phrases and personal experience in the answers.
5. Do not use textbook-like phrases and sentences.
6. Answer in informal, friendly, and approachable tone.
Write in Traditional Chinese
With a Warm tone
In a Technical style
  `,
  options: [{
    option: [
      {
        label: 'Animals',
        value: 'Animals',
      },
      {
        label: 'Art',
        value: 'Art',
      },
      {
        label: 'Business/advertising',
        value: 'Business/advertising',
      },
      {
        label: 'Career/Job',
        value: 'Career/Job',
      },
      {
        label: 'Communication',
        value: 'Communication',
      },
      {
        label: 'Crime',
        value: 'Crime',
      },
      {
        label: 'Culture/Society',
        value: 'Culture/Society',
      },
      {
        label: 'Education',
        value: 'Education',
      },
      {
        label: 'Entertainment',
        value: 'Entertainment',
      },
      {
        label: 'Environment',
        value: 'Environment',
      },
      {
        label: 'Family',
        value: 'Family',
      },
      {
        label: 'Food & farming',
        value: 'Food & farming',
      },
      {
        label: 'Global issues',
        value: 'Global issues',
      },
      {
        label: 'Health',
        value: 'Health',
      },
      {
        label: 'Hobbies',
        value: 'Hobbies',
      },
      {
        label: 'Media',
        value: 'Media',
      },
      {
        label: 'Money/Finance',
        value: 'Money/Finance',
      },
      {
        label: 'Science/Technology',
        value: 'Science/Technology',
      },
      {
        label: 'Space',
        value: 'Space',
      },
      {
        label: 'Sport',
        value: 'Sport',
      },
      {
        label: 'Transport',
        value: 'Transport',
      },
      {
        label: 'Travel',
        value: 'Travel',
      },
      {
        label: 'Work',
        value: 'Work',
      },
    ],
    label: '话题',
    key: 'topic',
    type: formType.select,
  }],
};
