-- `chats.answer_style` toggles whether the assistant answers in 1-2
-- short sentences ('concise') or with longer explanations ('elaborate').
-- The chat UI surfaces this as two buttons in the chat header so the
-- scientist can flip mid-conversation. Defaults to 'concise' so a new
-- chat doesn't ramble before the user has expressed a preference.

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS answer_style text NOT NULL DEFAULT 'concise'
    CHECK (answer_style IN ('concise', 'elaborate'));
