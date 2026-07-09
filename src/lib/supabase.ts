import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ktyladqcbwkbetwhpksp.supabase.co";
const supabaseAnonKey = "sb_publishable_8E18f-GHm4E7dxhqyCyG2A_gGtr6yxn";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);