export const defaultPrompts = [
    {
        id: 'summary',
        name: 'Summarize the conversation',
        description: 'Summarize the conversation',
        content: 'Summarize the conversation',
        model: {
            id: "gpt-3.5-turbo",
            name: "GPT-3.5",
            maxLength: 12000,
            tokenLimit: 4000
        },
        folderId: null
    },
    {
        id: 'explain_code',
        name: 'Explain code',
        description: 'Explains code provided by the user',
        content: 'Explain the following code:\\n',
        model: {
            id: "gpt-3.5-turbo",
            name: "GPT-3.5",
            maxLength: 12000,
            tokenLimit: 4000
        },
        folderId: null
    },
]