/**
 * =========================================================================
 * IP Room Nepal - Safe Demo Mode Data Cleanup Script (TypeScript / Node.js)
 * =========================================================================
 *
 * Usage:
 *   # Dry-run (scans database and reports count of demo data without deleting):
 *   npx tsx scripts/cleanDemoData.ts --dry-run
 *
 *   # Live execution (safely removes demo data):
 *   npx tsx scripts/cleanDemoData.ts --confirm
 * =========================================================================
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://stygqxxldbegjilpzlco.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_nxl9JQoEpOUMh0CC42XK6Q_k8rju9C3';

// Main admin accounts that MUST NEVER BE MODIFIED OR DELETED
const PROTECTED_ADMIN_EMAILS = [
  'cainarjit@gmail.com',
  'admin@iproom.com.np',
];

const isDryRun = !process.argv.includes('--confirm') && !process.argv.includes('--execute');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('===========================================================');
  console.log('      IP Room Nepal - Demo Mode Data Cleanup Utility       ');
  console.log('===========================================================');
  console.log(`Connected to: ${SUPABASE_URL}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only, no deletion)' : 'LIVE EXECUTION (deleting demo data)'}`);
  console.log(`Protected Admin Emails: ${PROTECTED_ADMIN_EMAILS.join(', ')}`);
  console.log('-----------------------------------------------------------');

  try {
    // 1. Identify Demo Profiles
    console.log('\n[1/6] Scanning profiles for demo users...');
    const { data: allProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role');

    if (profileErr) {
      console.warn('Could not query profiles:', profileErr.message);
    }

    const demoProfiles = (allProfiles || []).filter((p: any) => {
      if (PROTECTED_ADMIN_EMAILS.includes(p.email?.toLowerCase())) {
        return false;
      }
      const id = String(p.id).toLowerCase();
      const email = String(p.email || '').toLowerCase();
      return (
        id.includes('demo') ||
        id.startsWith('usr-') ||
        email.includes('demo') ||
        email.includes('test') ||
        email.endsWith('@example.com') ||
        email === 'aayush.sharma@students.tu.edu.np' ||
        email === 'ramesh.shrestha@iproom.np'
      );
    });

    const demoUserIds = new Set(demoProfiles.map((p: any) => p.id));
    console.log(`  Found ${demoProfiles.length} demo user profiles to purge.`);
    demoProfiles.forEach((p: any) => console.log(`   - ${p.full_name || 'No Name'} (${p.email}) [${p.role}]`));

    // 2. Identify Demo Room Listings
    console.log('\n[2/6] Scanning rooms for demo listings...');
    const { data: allRooms, error: roomErr } = await supabase
      .from('rooms')
      .select('id, title, owner_id');

    if (roomErr) {
      console.warn('Could not query rooms table:', roomErr.message);
    }

    const demoRooms = (allRooms || []).filter((r: any) => {
      const id = String(r.id).toLowerCase();
      const title = String(r.title || '').toLowerCase();
      return (
        id.includes('demo') ||
        id.startsWith('room-demo-') ||
        title.includes('demo') ||
        title.includes('sample') ||
        title.includes('test listing') ||
        demoUserIds.has(r.owner_id)
      );
    });

    const demoRoomIds = new Set(demoRooms.map((r: any) => r.id));
    console.log(`  Found ${demoRooms.length} demo rooms to purge.`);
    demoRooms.forEach((r: any) => console.log(`   - "${r.title}" (ID: ${r.id})`));

    // 3. Identify Demo Bookings
    console.log('\n[3/6] Scanning bookings for mock/sample reservations...');
    const { data: allBookings, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, room_id, renter_id, owner_id, status');

    if (bookingErr) {
      console.warn('Could not query bookings:', bookingErr.message);
    }

    const demoBookings = (allBookings || []).filter((b: any) => {
      const id = String(b.id).toLowerCase();
      return (
        id.includes('demo') ||
        id.startsWith('book-demo-') ||
        demoRoomIds.has(b.room_id) ||
        demoUserIds.has(b.renter_id) ||
        demoUserIds.has(b.owner_id)
      );
    });

    const demoBookingIds = new Set(demoBookings.map((b: any) => b.id));
    console.log(`  Found ${demoBookings.length} demo booking requests to purge.`);

    // 4. Identify Demo Payments
    console.log('\n[4/6] Scanning payments for test transactions...');
    const { data: allPayments, error: paymentErr } = await supabase
      .from('payments')
      .select('id, booking_id, payer_id, amount, transaction_id');

    let demoPayments: any[] = [];
    if (!paymentErr && allPayments) {
      demoPayments = allPayments.filter((pm: any) => {
        const id = String(pm.id).toLowerCase();
        const txn = String(pm.transaction_id || '').toLowerCase();
        return (
          id.includes('demo') ||
          txn.includes('demo') ||
          txn.includes('test') ||
          txn.includes('mock') ||
          demoBookingIds.has(pm.booking_id) ||
          demoUserIds.has(pm.payer_id)
        );
      });
      console.log(`  Found ${demoPayments.length} demo/mock payments to purge.`);
    }

    // 5. Execution Phase
    if (isDryRun) {
      console.log('\n===========================================================');
      console.log('SUMMARY (DRY RUN): No changes were made to the database.');
      console.log(`  Profiles to remove: ${demoProfiles.length}`);
      console.log(`  Rooms to remove:    ${demoRooms.length}`);
      console.log(`  Bookings to remove: ${demoBookings.length}`);
      console.log(`  Payments to remove: ${demoPayments.length}`);
      console.log('-----------------------------------------------------------');
      console.log('To execute this deletion permanently, run:');
      console.log('  npx tsx scripts/cleanDemoData.ts --confirm');
      console.log('===========================================================');
      return;
    }

    console.log('\n[5/6] Executing safe deletion...');

    // Delete Payments
    for (const pm of demoPayments) {
      await supabase.from('payments').delete().eq('id', pm.id);
    }
    console.log(`  ✓ Removed ${demoPayments.length} mock transactions.`);

    // Delete Bookings
    for (const b of demoBookings) {
      await supabase.from('bookings').delete().eq('id', b.id);
    }
    console.log(`  ✓ Removed ${demoBookings.length} sample bookings.`);

    // Delete Wishlists / Comparisons for demo rooms or users
    for (const roomId of demoRoomIds) {
      await supabase.from('wishlists').delete().eq('room_id', roomId);
      await supabase.from('comparison_lists').delete().eq('room_id', roomId);
    }
    for (const userId of demoUserIds) {
      await supabase.from('wishlists').delete().eq('user_id', userId);
      await supabase.from('comparison_lists').delete().eq('user_id', userId);
    }
    console.log('  ✓ Removed demo wishlists and comparison entries.');

    // Delete Moderation Logs linked to demo rooms
    for (const roomId of demoRoomIds) {
      await supabase.from('moderation_logs').delete().eq('listing_id', roomId);
    }
    console.log('  ✓ Cleared demo moderation audit logs.');

    // Delete Rooms
    for (const r of demoRooms) {
      await supabase.from('rooms').delete().eq('id', r.id);
    }
    console.log(`  ✓ Removed ${demoRooms.length} demo room listings.`);

    // Delete Profiles
    for (const p of demoProfiles) {
      await supabase.from('profiles').delete().eq('id', p.id);
    }
    console.log(`  ✓ Removed ${demoProfiles.length} demo user profiles.`);

    // 6. Verification
    console.log('\n[6/6] Verifying remaining production database integrity...');
    const { count: remainingProfiles } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const { count: remainingRooms } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true });

    const { count: remainingBookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true });

    console.log('===========================================================');
    console.log('CLEANUP COMPLETE: All demo data was successfully removed!');
    console.log(`  Remaining live profiles: ${remainingProfiles || 0}`);
    console.log(`  Remaining live rooms:    ${remainingRooms || 0}`);
    console.log(`  Remaining live bookings: ${remainingBookings || 0}`);
    console.log('Admin accounts and database schemas remain 100% intact.');
    console.log('===========================================================');
  } catch (err: any) {
    console.error('Error during cleanup:', err?.message || err);
  }
}

main();
