-- ============================================================
-- 001_initial_schema.sql
-- PlotSync MVP - Initial Database Schema
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Users (Supabase Authと連携)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plots (企画書)
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    owner_id UUID REFERENCES users(id),
    tags TEXT[],
    visibility VARCHAR(20) DEFAULT 'public',
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sections (セクション - 最大255個/Plot)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hot Operations (Phase 1: 操作ログ、72時間保持)
CREATE TABLE hot_operations (
    id SERIAL PRIMARY KEY,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    operation_type VARCHAR(20),
    payload JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cold Snapshots (Phase 2: スナップショット、永続)
CREATE TABLE cold_snapshots (
    id SERIAL PRIMARY KEY,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    content JSONB,
    version INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stars
CREATE TABLE stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plot_id, user_id)
);

-- Forks
CREATE TABLE forks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_plot_id UUID REFERENCES plots(id),
    new_plot_id UUID REFERENCES plots(id),
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Threads (コメントスレッド)
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content VARCHAR(5000),
    parent_comment_id UUID REFERENCES comments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plot Bans
CREATE TABLE plot_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID REFERENCES plots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plot_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Plots
CREATE INDEX idx_plots_owner_id ON plots(owner_id);
CREATE INDEX idx_plots_visibility ON plots(visibility);
CREATE INDEX idx_plots_created_at ON plots(created_at DESC);
CREATE INDEX idx_plots_tags ON plots USING GIN(tags);

-- Sections
CREATE INDEX idx_sections_plot_id ON sections(plot_id);
CREATE INDEX idx_sections_order ON sections(plot_id, order_index);

-- Hot Operations
CREATE INDEX idx_hot_operations_section_id ON hot_operations(section_id);
CREATE INDEX idx_hot_operations_created_at ON hot_operations(created_at);

-- Cold Snapshots
CREATE INDEX idx_cold_snapshots_section_id ON cold_snapshots(section_id);
CREATE INDEX idx_cold_snapshots_version ON cold_snapshots(section_id, version DESC);

-- Stars
CREATE INDEX idx_stars_plot_id ON stars(plot_id);
CREATE INDEX idx_stars_user_id ON stars(user_id);

-- Forks
CREATE INDEX idx_forks_source_plot_id ON forks(source_plot_id);
CREATE INDEX idx_forks_user_id ON forks(user_id);

-- Threads
CREATE INDEX idx_threads_plot_id ON threads(plot_id);
CREATE INDEX idx_threads_section_id ON threads(section_id);

-- Comments
CREATE INDEX idx_comments_thread_id ON comments(thread_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Plot Bans
CREATE INDEX idx_plot_bans_plot_id ON plot_bans(plot_id);
CREATE INDEX idx_plot_bans_user_id ON plot_bans(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_bans ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- users
-- ----------------------------------------
-- 誰でもプロフィール閲覧可
CREATE POLICY "users_select_public" ON users
    FOR SELECT USING (true);

-- 自分のプロフィールのみ更新可
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 認証済みユーザーは自身のレコードを挿入可
CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ----------------------------------------
-- plots
-- ----------------------------------------
-- 公開Plotは誰でも閲覧可、非公開は所有者のみ
CREATE POLICY "plots_select" ON plots
    FOR SELECT USING (
        visibility = 'public' OR owner_id = auth.uid()
    );

-- 認証済みユーザーはPlotを作成可
CREATE POLICY "plots_insert" ON plots
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 所有者のみ更新可
CREATE POLICY "plots_update_owner" ON plots
    FOR UPDATE USING (auth.uid() = owner_id);

-- 所有者のみ削除可
CREATE POLICY "plots_delete_owner" ON plots
    FOR DELETE USING (auth.uid() = owner_id);

-- ----------------------------------------
-- sections
-- ----------------------------------------
-- 公開Plotのセクションは誰でも閲覧可
CREATE POLICY "sections_select" ON sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = sections.plot_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- 認証済みユーザーはセクション作成可（自分のPlotのみ）
CREATE POLICY "sections_insert" ON sections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = sections.plot_id
            AND plots.owner_id = auth.uid()
        )
    );

-- Plot所有者のみ更新可
CREATE POLICY "sections_update" ON sections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = sections.plot_id
            AND plots.owner_id = auth.uid()
        )
    );

-- Plot所有者のみ削除可
CREATE POLICY "sections_delete" ON sections
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = sections.plot_id
            AND plots.owner_id = auth.uid()
        )
    );

-- ----------------------------------------
-- hot_operations
-- ----------------------------------------
-- 公開Plotの操作ログは閲覧可
CREATE POLICY "hot_operations_select" ON hot_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sections
            JOIN plots ON plots.id = sections.plot_id
            WHERE sections.id = hot_operations.section_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- 認証済みユーザーは操作ログを挿入可
CREATE POLICY "hot_operations_insert" ON hot_operations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------
-- cold_snapshots
-- ----------------------------------------
-- 公開Plotのスナップショットは閲覧可
CREATE POLICY "cold_snapshots_select" ON cold_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sections
            JOIN plots ON plots.id = sections.plot_id
            WHERE sections.id = cold_snapshots.section_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- サービスロール（バックエンド）のみスナップショットを挿入可
-- NOTE: MVP段階ではservice_roleキー経由でのみ挿入
CREATE POLICY "cold_snapshots_insert" ON cold_snapshots
    FOR INSERT WITH CHECK (false);
    -- service_role keyはRLSをバイパスするため、アプリ経由で挿入可能

-- ----------------------------------------
-- stars
-- ----------------------------------------
-- 誰でもStar数を閲覧可
CREATE POLICY "stars_select" ON stars
    FOR SELECT USING (true);

-- 認証済みユーザーは自分のStarを追加可
CREATE POLICY "stars_insert" ON stars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分のStarのみ削除可
CREATE POLICY "stars_delete" ON stars
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------
-- forks
-- ----------------------------------------
-- 誰でもFork情報を閲覧可
CREATE POLICY "forks_select" ON forks
    FOR SELECT USING (true);

-- 認証済みユーザーはFork可
CREATE POLICY "forks_insert" ON forks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------
-- threads
-- ----------------------------------------
-- 公開Plotのスレッドは閲覧可
CREATE POLICY "threads_select" ON threads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = threads.plot_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- 認証済みユーザーはスレッド作成可
CREATE POLICY "threads_insert" ON threads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = threads.plot_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- ----------------------------------------
-- comments
-- ----------------------------------------
-- スレッドが閲覧可能ならコメントも閲覧可
CREATE POLICY "comments_select" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM threads
            JOIN plots ON plots.id = threads.plot_id
            WHERE threads.id = comments.thread_id
            AND (plots.visibility = 'public' OR plots.owner_id = auth.uid())
        )
    );

-- 認証済みユーザーはコメント投稿可
CREATE POLICY "comments_insert" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分のコメントのみ更新可
CREATE POLICY "comments_update_own" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- 自分のコメントのみ削除可
CREATE POLICY "comments_delete_own" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------
-- plot_bans
-- ----------------------------------------
-- Plot所有者のみBan一覧を閲覧可
CREATE POLICY "plot_bans_select" ON plot_bans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = plot_bans.plot_id
            AND plots.owner_id = auth.uid()
        )
    );

-- Plot所有者のみBan可
CREATE POLICY "plot_bans_insert" ON plot_bans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = plot_bans.plot_id
            AND plots.owner_id = auth.uid()
        )
    );

-- Plot所有者のみBan解除可
CREATE POLICY "plot_bans_delete" ON plot_bans
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM plots
            WHERE plots.id = plot_bans.plot_id
            AND plots.owner_id = auth.uid()
        )
    );
