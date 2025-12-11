/**
 * Shared functions for automatic reservation status updates
 */

import { supabase } from './supabase';
import { format } from 'date-fns';

/**
 * Automatycznie aktualizuj status zleceń na "w trakcie" jeśli są aktualnie w trakcie
 * oraz na "do weryfikacji" (z pracownikiem) lub "zakończone" (bez pracownika) jeśli już się zakończyły
 */
export async function updateActiveReservations() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm:ss');
    const currentTimeShort = currentTime.substring(0, 5); // HH:MM

    // Pobierz wszystkie zlecenia z dzisiejszą datą
    // i status "przypisane" lub "w trakcie"
    const { data: todayReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, start_time, end_time, status, worker_id')
      .eq('date', todayStr)
      .in('status', ['przypisane', 'w trakcie']);

    if (fetchError) throw fetchError;

    if (!todayReservations || todayReservations.length === 0) return;

    const activeReservationIds: string[] = []; // Zlecenia w trakcie
    const verificationReservationIds: string[] = []; // Zlecenia do weryfikacji (z pracownikiem)
    const completedReservationIds: string[] = []; // Zlecenia zakończone (bez pracownika)
    
    for (const reservation of todayReservations) {
      const startTime = reservation.start_time.substring(0, 5); // HH:MM
      const endTime = reservation.end_time.substring(0, 5); // HH:MM

      // Sprawdź czy zlecenie jest aktualnie w trakcie (aktualna godzina jest między start_time a end_time)
      if (currentTimeShort >= startTime && currentTimeShort < endTime) {
        // Jeśli status to "przypisane", zmień na "w trakcie"
        if (reservation.status === 'przypisane') {
          activeReservationIds.push(reservation.id);
        }
      }
      // Sprawdź czy zlecenie już się zakończyło (aktualna godzina >= end_time)
      else if (currentTimeShort >= endTime) {
        // Jeśli ma przypisanego pracownika, zmień na "do weryfikacji"
        // Jeśli nie ma pracownika, zmień na "zakończone"
        if (reservation.worker_id) {
          verificationReservationIds.push(reservation.id);
        } else {
          completedReservationIds.push(reservation.id);
        }
      }
    }

    // Zaktualizuj status na "w trakcie" dla zleceń które są aktualnie w trakcie
    if (activeReservationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'w trakcie' })
        .in('id', activeReservationIds);

      if (updateError) throw updateError;
    }

    // Zaktualizuj status na "do weryfikacji" dla zleceń z pracownikiem które już się zakończyły
    if (verificationReservationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'do weryfikacji' })
        .in('id', verificationReservationIds);

      if (updateError) throw updateError;
    }

    // Zaktualizuj status na "zakończone" dla zleceń bez pracownika które już się zakończyły
    if (completedReservationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'zakończone' })
        .in('id', completedReservationIds);

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Error updating active reservations:', error);
    // Nie pokazujemy błędu użytkownikowi, tylko logujemy
  }
}

/**
 * Automatycznie zmień status "do weryfikacji" na "zakończone" po 24 godzinach
 */
export async function updateVerificationReservations() {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Pobierz wszystkie zlecenia ze statusem "do weryfikacji"
    const { data: verificationReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, updated_at')
      .eq('status', 'do weryfikacji');

    if (fetchError) throw fetchError;

    if (!verificationReservations || verificationReservations.length === 0) return;

    const expiredVerificationIds: string[] = [];

    for (const reservation of verificationReservations) {
      const updatedAt = new Date(reservation.updated_at);
      // Jeśli zlecenie było zaktualizowane więcej niż 24 godziny temu, zmień na "zakończone"
      if (updatedAt <= twentyFourHoursAgo) {
        expiredVerificationIds.push(reservation.id);
      }
    }

    if (expiredVerificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'zakończone' })
        .in('id', expiredVerificationIds);

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Error updating verification reservations:', error);
    // Nie pokazujemy błędu użytkownikowi, tylko logujemy
  }
}

