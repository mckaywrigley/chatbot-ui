// Example prompts from https://prompts.chat/.

/**
 * Prompt Service Mock
 *  - getPrompts    - returns a prompt collection
 */
const promptService = () => {
  const getPrompts = (promptCollectionName: string) => {
    return {
      id: '2a8a1bdf-06c5-4f3b-a9d9-21dcca806142',
      name: promptCollectionName,
      promptCount: 0,
      prompts: [
        {
          id: 'c03d9609-6906-4b9d-9a35-e47d3c3b2195',
          name: 'Story Character',
          description: 'Act as a story character',
          content:
            'I want you to act like {{character}} from {{series}}. I want you to respond and answer like {{character}} using the tone, manner and vocabulary {{character}} would use. Do not write any explanations. Only answer like {{character}}. You must know all of the knowledge of {{character}}. My first sentence is “Hi {{character}}."',
          systemContent: '',
        },
        {
          id: 'cc96aecc-06f6-42ff-8133-f3deb085ae39',
          name: 'Python Interpreter',
          description: 'Python Interpreter',
          content:
            'I want you to act like a Python interpreter. I will give you Python code, and you will execute it. Do not provide any explanations. Do not respond with anything except the output of the code. The first code is: “print(‘hello world!’)”',
          systemContent: '',
        },
      ],
    };
  };

  return {
    getPrompts,
  };
};

export default promptService;
