import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gftwcfexduvwgvffigbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHdjZmV4ZHV2d2d2ZmZpZ2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTUzNTYsImV4cCI6MjA5Mzk3MTM1Nn0.SIUtKv-tvLqBbP0VLHf0QIV3tZBZSPtKzXjR2Tyad8c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);