-- ============================================================
-- seed.sql
-- PlotSync MVP - Sample Seed Data
-- ============================================================
-- NOTE: This seed data is for local development only.
-- Supabase Auth UUIDs must exist before inserting users.
-- Run after creating test users via Supabase Auth dashboard or CLI.

-- Example seed (uncomment and replace UUIDs with real auth.users IDs):

/*
-- Insert test users (these UUIDs must match auth.users entries)
INSERT INTO users (id, email, display_name, avatar_url) VALUES
    ('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'Alice', NULL),
    ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'Bob', NULL),
    ('00000000-0000-0000-0000-000000000003', 'charlie@example.com', 'Charlie', NULL);

-- Insert sample plots
INSERT INTO plots (id, title, description, owner_id, tags, visibility) VALUES
    ('10000000-0000-0000-0000-000000000001', 'AIチャットアプリ企画', 'LLMを活用したチャットアプリの企画書です。リアルタイム共同編集に対応。', '00000000-0000-0000-0000-000000000001', ARRAY['AI', 'チャット', 'LLM'], 'public'),
    ('10000000-0000-0000-0000-000000000002', 'ECサイトリニューアル', '既存ECサイトのUI/UXを全面リニューアルする企画。', '00000000-0000-0000-0000-000000000002', ARRAY['EC', 'UI/UX', 'リニューアル'], 'public'),
    ('10000000-0000-0000-0000-000000000003', '社内ツール（非公開）', '社内向け管理ツールの企画書。', '00000000-0000-0000-0000-000000000001', ARRAY['社内', '管理'], 'private');

-- Insert sample sections
INSERT INTO sections (id, plot_id, title, content, order_index) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '概要', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "AIチャットアプリの概要説明"}]}]}', 0),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '技術スタック', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Next.js + Supabase + OpenAI API"}]}]}', 1),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '現状分析', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "現行サイトの課題と改善ポイント"}]}]}', 0);

-- Insert sample stars
INSERT INTO stars (plot_id, user_id) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- Insert sample thread + comment
INSERT INTO threads (id, plot_id, section_id) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');

INSERT INTO comments (thread_id, user_id, content) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'この概要、もう少し具体的なユースケースを追加しませんか？');
*/
