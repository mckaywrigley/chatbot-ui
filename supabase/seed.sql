INSERT INTO share_conversations (accessible_id, title, prompts)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'AI Conversation',
    '[
      {"role": "assistant", "content": "Hello! How can I help you today?"},
      {"role": "user", "content": "I need some information about AI."},
      {"role": "assistant", "content": "AI stands for Artificial Intelligence. It refers to the simulation of human intelligence in machines that are programmed to think and learn like humans."}
    ]'
  ),
  (
    '123e4567-e89b-12d3-a456-426655440000',
    'Programming Language Recommendation',
    '[
      {"role": "assistant", "content": "Hi there! What can I do for you?"},
      {"role": "user", "content": "Can you recommend a good programming language?"},
      {"role": "assistant", "content": "Python is a great programming language for beginners and experts alike. It has a large community, extensive libraries, and it''s easy to learn."}
    ]'
  );
