-- Video2Tool Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video analyses table
CREATE TABLE IF NOT EXISTS public.video_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    video_name TEXT NOT NULL,
    video_url TEXT,
    video_file_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transcription TEXT,
    visual_elements JSONB,
    summary JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Specifications table
CREATE TABLE IF NOT EXISTS public.specifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    video_analysis_id UUID REFERENCES public.video_analyses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    specification_id UUID REFERENCES public.specifications(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    estimate TEXT,
    dependencies TEXT[], -- Array of task IDs
    notes TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_project_id ON public.video_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_status ON public.video_analyses(status);
CREATE INDEX IF NOT EXISTS idx_specifications_video_analysis_id ON public.specifications(video_analysis_id);
CREATE INDEX IF NOT EXISTS idx_specifications_status ON public.specifications(status);
CREATE INDEX IF NOT EXISTS idx_tasks_specification_id ON public.tasks(specification_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_analyses_updated_at BEFORE UPDATE ON public.video_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_specifications_updated_at BEFORE UPDATE ON public.specifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Video analyses policies
CREATE POLICY "Users can view own video analyses" ON public.video_analyses FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_analyses.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can create video analyses in own projects" ON public.video_analyses FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_analyses.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can update own video analyses" ON public.video_analyses FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_analyses.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "Users can delete own video analyses" ON public.video_analyses FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = video_analyses.project_id AND projects.user_id = auth.uid()));

-- Specifications policies
CREATE POLICY "Users can view own specifications" ON public.specifications FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.video_analyses va 
    JOIN public.projects p ON va.project_id = p.id 
    WHERE va.id = specifications.video_analysis_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create specifications for own video analyses" ON public.specifications FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_analyses va 
    JOIN public.projects p ON va.project_id = p.id 
    WHERE va.id = specifications.video_analysis_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update own specifications" ON public.specifications FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.video_analyses va 
    JOIN public.projects p ON va.project_id = p.id 
    WHERE va.id = specifications.video_analysis_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete own specifications" ON public.specifications FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.video_analyses va 
    JOIN public.projects p ON va.project_id = p.id 
    WHERE va.id = specifications.video_analysis_id AND p.user_id = auth.uid()
));

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.specifications s
    JOIN public.video_analyses va ON s.video_analysis_id = va.id
    JOIN public.projects p ON va.project_id = p.id 
    WHERE s.id = tasks.specification_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create tasks for own specifications" ON public.tasks FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.specifications s
    JOIN public.video_analyses va ON s.video_analysis_id = va.id
    JOIN public.projects p ON va.project_id = p.id 
    WHERE s.id = tasks.specification_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.specifications s
    JOIN public.video_analyses va ON s.video_analysis_id = va.id
    JOIN public.projects p ON va.project_id = p.id 
    WHERE s.id = tasks.specification_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.specifications s
    JOIN public.video_analyses va ON s.video_analysis_id = va.id
    JOIN public.projects p ON va.project_id = p.id 
    WHERE s.id = tasks.specification_id AND p.user_id = auth.uid()
));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
