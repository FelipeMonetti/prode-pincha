// Conexión a Supabase
// La URL y anon key son públicas (no son secretas).
// La seguridad la manejan las Row Level Security policies en la DB.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const SUPABASE_URL = 'https://khyurgitvicuaxbgcejb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeXVyZ2l0dmljdWF4YmdjZWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTA3MTksImV4cCI6MjEwODc4NjcxOX0.7aKULS5_HZPwoX-t79tqwJiSLF2be2mTF_ejpQwo_SE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
