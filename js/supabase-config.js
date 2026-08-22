// ==========================================
// SHORASH MENU — Supabase Configuration
// ==========================================

const SUPABASE_URL = 'https://pklzxpivnoqnrzyjryqz.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CC5l_DeuRDVy32hFOoVWMw_7i45WhmK';

// Create Supabase client
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log('✅ SHORASH Supabase connected');

// ==========================================
// SHORASH MENU — Supabase Connection Test
// ==========================================

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');

    const { data, error } = await supabaseClient
      .from('restaurant_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Supabase test failed:', error);
      return;
    }

    console.log('✅ SUPABASE CONNECTION SUCCESS');
    console.log('📦 Restaurant settings:', data);

  } catch (error) {
    console.error('❌ Supabase connection error:', error);
  }
}

testSupabaseConnection();
