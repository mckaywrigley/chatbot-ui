INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user) VALUES
('00000000-0000-0000-0000-000000000000', 'e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'authenticated', 'authenticated', 'test@test.com', crypt('password', gen_salt('bf')), '2023-02-18 23:31:13.017218+00', NULL, '', '2023-02-18 23:31:12.757017+00', '', NULL, '', '', NULL, '2023-02-18 23:31:13.01781+00', '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2023-02-18 23:31:12.752281+00', '2023-02-18 23:31:13.019418+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, 'f');

-- Start data for workspaces 
INSERT INTO workspaces (user_id, name, description, default_context_length, default_model, default_prompt, default_temperature, include_profile_context, include_workspace_instructions, instructions, is_home, sharing, embeddings_provider) VALUES 
('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'Workspace 1', 'This is for testing.', 4000, 'gpt-4-turbo-preview', 'You are an assistant.', 0.5, true, true, 'These are the instructions.', false, 'private', 'openai');

-- Get workspace ids
DO $$
DECLARE
  workspace1_id UUID;
BEGIN
  SELECT id INTO workspace1_id FROM workspaces WHERE name='Home';

  -- start data for folders
  INSERT INTO folders (user_id, workspace_id, name, description, type) VALUES
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', workspace1_id, 'Chat Folder 1', 'This is a folder for chats', 'chats');

  -- start data for files
  INSERT INTO files (user_id, name, description, file_path, size, tokens, type) VALUES
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'File 1', 'This is a file for testing', 'https://example.com/file1', 1000000, 250, 'pdf');

  -- start data for file_workspaces
  DECLARE
    file1_id UUID;
  BEGIN
    SELECT id INTO file1_id FROM files WHERE name='File 1';

    INSERT INTO file_workspaces (user_id, file_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', file1_id, workspace1_id);
  END;

  -- DECLARE
  --   file1_id UUID;
  -- BEGIN
  --   SELECT id INTO file1_id FROM chats WHERE name='Chat 1';

  --   -- start data for file items
  --   INSERT INTO file_items (user_id, file_id, content, embedding) VALUES
  --   ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', file1_id, 'File Item 1', []);
  -- END;

  -- start data for presets
  INSERT INTO presets (user_id, created_at, updated_at, sharing, include_profile_context, include_workspace_instructions, context_length, model, name, prompt, temperature, description, embeddings_provider) VALUES
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'private', TRUE, TRUE, 4000, 'gpt-4-turbo-preview', 'Preset 1', 'Prompt 1', 0.5, 'Description for Preset 1', 'openai');

  -- Get preset id
  DECLARE
    preset1_id UUID;
  BEGIN
    SELECT id INTO preset1_id FROM presets WHERE name='Preset 1';

    -- start data for preset_workspaces
    INSERT INTO preset_workspaces (user_id, preset_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', preset1_id, workspace1_id);
  END;

  -- Start data for assistants 
  INSERT INTO assistants (user_id, name, description, model, image_path, sharing, context_length, include_profile_context, include_workspace_instructions, prompt, temperature, embeddings_provider) VALUES 
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'Albert Einstein', 'This is an Albert Einstein assistant.', 'gpt-4-turbo-preview', '', 'private', 4000, TRUE, TRUE, 'You are Albert Einstein.', 0.5, 'openai');

  -- Get assistant id
  DECLARE
    assistant1_id UUID;
  BEGIN
    SELECT id INTO assistant1_id FROM assistants WHERE name='Albert Einstein';

    -- start data for assistant_workspaces
    INSERT INTO assistant_workspaces (user_id, assistant_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', assistant1_id, workspace1_id);
  END;

  -- Start data for chats 
  INSERT INTO chats (user_id, workspace_id, name, model, prompt, temperature, context_length, include_profile_context, include_workspace_instructions, embeddings_provider) VALUES 
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', workspace1_id, 'Chat 1', 'gpt-4-turbo-preview', 'You are an assistant.', 0.5, 4000, TRUE, TRUE, 'openai');

  DECLARE
    folder1_id UUID;
  BEGIN
    SELECT id INTO folder1_id FROM folders WHERE name='Chat Folder 1';

    INSERT INTO chats (user_id, workspace_id, name, model, prompt, temperature, context_length, include_profile_context, include_workspace_instructions, folder_id, embeddings_provider) VALUES 
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', workspace1_id, 'Chat 4', 'gpt-4-turbo-preview', 'You are an assistant.', 0.5, 4000, TRUE, TRUE, folder1_id, 'openai');
  END;

  -- Start data for messages 
  -- Get chat ids
    DECLARE
      chat1_id UUID;
    BEGIN
      SELECT id INTO chat1_id FROM chats WHERE name='Chat 1';

      INSERT INTO messages (user_id, chat_id, content, role, model, sequence_number, image_paths) VALUES
      -- Chat 1
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'Hello! This is a long message with **markdown**. It contains multiple sentences and paragraphs. Let me add more content to this message. I am a user interacting with an AI assistant. I can ask the assistant to perform various tasks, such as generating text, answering questions, and even writing code. The assistant uses a powerful language model to understand my requests and generate appropriate responses. This is a very interesting and exciting technology!', 'user', 'gpt-4-turbo-preview', 0, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'How are you? This is another long message with *italic markdown*. It also contains multiple sentences and paragraphs. Let me add more content to this message. As an AI assistant, I can understand and respond to a wide range of requests. I can generate text, answer questions, and even write code. I use a powerful language model to understand your requests and generate appropriate responses. This is a very interesting and exciting technology!', 'assistant', 'gpt-4-turbo-preview', 1, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'I am fine, thank you! This is a third long message with [link markdown](http://example.com). It contains even more sentences and paragraphs. Let me add even more content to this message. As a user, I can interact with the AI assistant in a variety of ways. I can ask it to generate text, answer questions, and even write code. The assistant uses a powerful language model to understand my requests and generate appropriate responses. This is a very interesting and exciting technology!', 'user', 'gpt-4-turbo-preview', 2, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'Great to hear that! This is a fourth long message with `code markdown`. It contains a lot of sentences and paragraphs. Let me add even more content to this message. As an AI assistant, I can understand and respond to a wide range of requests. I can generate text, answer questions, and even write code. I use a powerful language model to understand your requests and generate appropriate responses. This is a very interesting and exciting technology!', 'assistant', 'gpt-4-turbo-preview', 3, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'What can you do? This is a fifth long message with > blockquote markdown. It contains a ton of sentences and paragraphs. Let me add even more content to this message. As a user, I can interact with the AI assistant in a variety of ways. I can ask it to generate text, answer questions, and even write code. The assistant uses a powerful language model to understand my requests and generate appropriate responses. This is a very interesting and exciting technology!', 'user', 'gpt-4-turbo-preview', 4, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'I can assist you with various tasks. This is a sixth long message with - list markdown. It contains an enormous amount of sentences and paragraphs. Let me add even more content to this message. As an AI assistant, I can understand and respond to a wide range of requests. I can generate text, answer questions, and even write code. I use a powerful language model to understand your requests and generate appropriate responses. This is a very interesting and exciting technology!', 'assistant', 'gpt-4-turbo-preview', 5, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'Can you assist me with my homework? This is a seventh long message with 1. numbered list markdown. It contains a plethora of sentences and paragraphs. Let me add even more content to this message. As a user, I can interact with the AI assistant in a variety of ways. I can ask it to generate text, answer questions, and even write code. The assistant uses a powerful language model to understand my requests and generate appropriate responses. This is a very interesting and exciting technology!', 'user', 'gpt-4-turbo-preview', 6, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'Sure, I would be happy to help. What do you need assistance with? This is an eighth long message with --- horizontal rule markdown. It contains a multitude of sentences and paragraphs. Let me add even more content to this message. As an AI assistant, I can understand and respond to a wide range of requests. I can generate text, answer questions, and even write code. I use a powerful language model to understand your requests and generate appropriate responses. This is a very interesting and exciting technology!', 'assistant', 'gpt-4-turbo-preview', 7, '{}'),
      ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', chat1_id, 'I need help with my math homework. This is a ninth long message with # heading markdown. It contains a vast number of sentences and paragraphs. Let me add even more content to this message. As a user, I can interact with the AI assistant in a variety of ways. I can ask it to generate text, answer questions, and even write code. The assistant uses a powerful language model to understand my requests and generate appropriate responses. This is a very interesting and exciting technology!', 'user', 'gpt-4-turbo-preview', 8, '{}');
    END;

  -- Start data for prompts 
  INSERT INTO prompts (user_id, folder_id, created_at, updated_at, sharing, content, name) VALUES 
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'private', 'I want you to act as a storyteller. You will come up with entertaining stories that are engaging, imaginative and captivating for the audience. It can be fairy tales, educational stories or any other type of stories which has the potential to capture people''s attention and imagination. Depending on the target audience, you may choose specific themes or topics for your storytelling session e.g., if it’s children then you can talk about animals; If it’s adults then history-based tales might engage them better etc. My first request is ''I need an interesting story on perseverance.''', 'Storyteller');

  -- Start data for prompt_workspaces
  DECLARE
    prompt1_id UUID;
  BEGIN
    SELECT id INTO prompt1_id FROM prompts WHERE name='Storyteller';

    INSERT INTO prompt_workspaces (user_id, prompt_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', prompt1_id, workspace1_id);
  END;

  -- Start data for collections  
  INSERT INTO collections (user_id, name, description, created_at, updated_at, sharing) VALUES
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'Collection 1', 'This is a description for Collection 1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'private');

  -- Start data for collection_workspaces
  DECLARE
    collection1_id UUID;
  BEGIN
    SELECT id INTO collection1_id FROM collections WHERE name='Collection 1';

    INSERT INTO collection_workspaces (user_id, collection_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', collection1_id, workspace1_id);
  END;

  -- Start data for tools
  INSERT INTO tools (user_id, description, name, schema, url, created_at, updated_at, sharing) VALUES
  ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', 'This is a description for Tool 1', 'Tool 1', '{}', 'http://example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'private');

  -- Start data for tool_workspaces
  DECLARE
    tool1_id UUID;
    workspace1_id UUID;
  BEGIN
    SELECT id INTO tool1_id FROM tools WHERE name='Tool 1';
    SELECT id INTO workspace1_id FROM workspaces WHERE name='Home';

    INSERT INTO tool_workspaces (user_id, tool_id, workspace_id) VALUES
    ('e9fc7e46-a8a5-4fd4-8ba7-af485013e6fa', tool1_id, workspace1_id);
  END;

END $$;