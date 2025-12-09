/**
 * Skrypt migracji użytkowników do Supabase Auth
 * 
 * Użycie:
 * 1. Zainstaluj zależności: npm install @supabase/supabase-js
 * 2. Ustaw zmienne środowiskowe:
 *    - SUPABASE_URL - URL Twojego projektu Supabase
 *    - SUPABASE_SERVICE_ROLE_KEY - Service Role Key (z Settings > API)
 * 3. Uruchom: node migrate_users_to_auth.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Brakuje SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Użyj Service Role Key dla Admin API
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateUsers() {
  console.log('Rozpoczynam migrację użytkowników do Supabase Auth...\n');

  // Pobierz wszystkich użytkowników z tabeli users
  const { data: users, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('*');

  if (fetchError) {
    console.error('Błąd pobierania użytkowników:', fetchError);
    return;
  }

  console.log(`Znaleziono ${users.length} użytkowników do migracji\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      console.log(`Migruję użytkownika: ${user.email} (${user.role})...`);

      // Utwórz użytkownika w auth.users używając Admin API
      // UWAGA: Hasło musi być w formacie bcrypt hash
      // Jeśli masz plain text password, użyj admin.createUser z hasłem
      
      // Opcja 1: Jeśli masz plain text password (nie zalecane)
      // const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      //   email: user.email,
      //   password: 'temporary_password', // Użytkownik będzie musiał zmienić hasło
      //   email_confirm: true,
      //   user_metadata: {
      //     name: user.name,
      //     phone: user.phone,
      //     role: user.role
      //   }
      // });

      // Opcja 2: Jeśli masz tylko hash (obecna sytuacja)
      // Musisz użyć admin.createUser z opcją skip_password_validation
      // i ustawić password_hash bezpośrednio
      
      // Najlepsze rozwiązanie: Utwórz użytkownika z tymczasowym hasłem
      // i wyślij email z resetem hasła
      const tempPassword = `TempPass${Date.now()}${Math.random().toString(36).substring(7)}`;
      
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });

      if (createError) {
        console.error(`  ❌ Błąd tworzenia użytkownika w auth:`, createError.message);
        errorCount++;
        continue;
      }

      // Zaktualizuj tabelę users, aby powiązać z auth.users
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ auth_user_id: authUser.user.id })
        .eq('id', user.id);

      if (updateError) {
        console.error(`  ❌ Błąd aktualizacji users:`, updateError.message);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Migracja zakończona. Auth User ID: ${authUser.user.id}`);
      console.log(`     Tymczasowe hasło: ${tempPassword} (użytkownik powinien je zmienić)`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ Błąd migracji użytkownika ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n=== Podsumowanie migracji ===`);
  console.log(`✅ Sukces: ${successCount}`);
  console.log(`❌ Błędy: ${errorCount}`);
  console.log(`📊 Razem: ${users.length}`);
}

// Uruchom migrację
migrateUsers().catch(console.error);

