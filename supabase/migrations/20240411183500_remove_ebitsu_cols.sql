ALTER TABLE chats
DROP COLUMN ebisu_model,
DROP COLUMN revise_date,
DROP COLUMN recall_date,
ADD COLUMN srs_card jsonb;