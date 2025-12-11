/**
 * Webhook notification service
 */

import { supabase } from './supabase';

const WEBHOOK_URL = 'https://n8n.dogtronic.dev/webhook/pracosfera';

/**
 * Shift hours mapping
 */
const SHIFT_HOURS: Record<string, { start: number; end: number }> = {
  'Z-1': { start: 6, end: 14 },
  'Z-2': { start: 10, end: 18 },
  'Z-3': { start: 15, end: 23 },
};

/**
 * Finds workers whose shifts contain the reservation time
 * Returns array of phone numbers
 */
export async function findAvailableWorkers(
  reservationDate: string,
  reservationStartTime: string,
  reservationEndTime: string
): Promise<string[]> {
  try {
    // Parse reservation times to hours (decimal)
    // Handle both HH:MM and HH:MM:SS formats
    const startParts = reservationStartTime.split(':');
    const endParts = reservationEndTime.split(':');
    const startH = Number(startParts[0]);
    const startM = Number(startParts[1] || 0);
    const endH = Number(endParts[0]);
    const endM = Number(endParts[1] || 0);
    const resStart = startH + startM / 60;
    const resEnd = endH + endM / 60;

    // Get all workers with shifts on this date
    const { data: shifts, error: shiftsError } = await supabase
      .from('worker_shifts')
      .select(`
        worker_id,
        shift_type,
        custom_shift_hours (
          start_time,
          end_time
        )
      `)
      .eq('shift_date', reservationDate)
      .neq('shift_type', 'WOLNY');

    if (shiftsError) {
      console.error('Error fetching worker shifts:', shiftsError);
      return [];
    }

    if (!shifts || shifts.length === 0) {
      return [];
    }

    // Get worker IDs and check if reservation fits their shift
    const availableWorkerIds: string[] = [];

    for (const shift of shifts) {
      let shiftStart: number;
      let shiftEnd: number;

      if (shift.shift_type === 'CUST') {
        // Custom shift hours
        const customHours = (shift.custom_shift_hours as any)?.[0];
        if (!customHours) continue;

        // Handle both HH:MM and HH:MM:SS formats
        const custStartParts = customHours.start_time.split(':');
        const custEndParts = customHours.end_time.split(':');
        const custStartH = Number(custStartParts[0]);
        const custStartM = Number(custStartParts[1] || 0);
        const custEndH = Number(custEndParts[0]);
        const custEndM = Number(custEndParts[1] || 0);
        shiftStart = custStartH + custStartM / 60;
        shiftEnd = custEndH + custEndM / 60;
      } else {
        // Standard shift
        const hours = SHIFT_HOURS[shift.shift_type];
        if (!hours) continue;
        shiftStart = hours.start;
        shiftEnd = hours.end;
      }

      // Check if reservation fits within shift
      // Handle night shift (spans midnight, e.g., 22-6)
      let fits = false;
      if (shiftStart > shiftEnd) {
        // Night shift spans midnight
        fits = resStart >= shiftStart || resEnd <= shiftEnd;
      } else {
        // Regular shift
        fits = resStart >= shiftStart && resEnd <= shiftEnd;
      }

      if (fits) {
        availableWorkerIds.push(shift.worker_id);
      }
    }

    if (availableWorkerIds.length === 0) {
      return [];
    }

    // Get phone numbers for available workers
    const { data: workers, error: workersError } = await supabase
      .from('users')
      .select('phone')
      .in('id', availableWorkerIds)
      .eq('role', 'worker');

    if (workersError) {
      console.error('Error fetching worker phones:', workersError);
      return [];
    }

    // Return only phone numbers
    return (workers || []).map(w => w.phone).filter(Boolean);
  } catch (error) {
    console.error('Error finding available workers:', error);
    return [];
  }
}

export interface ReservationWebhookData {
  id: string;
  reservation_number: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  status: string;
  worker_id?: string | null;
  franchisee_id: string;
  created_at: string;
  updated_at: string;
  franchisee?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    mpk_number?: string;
    store_address?: string;
  };
  worker?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  available_worker_phones?: string[];
}

/**
 * Sends webhook notification when a new reservation is created
 */
export async function sendReservationWebhook(
  reservationData: ReservationWebhookData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find available workers for this reservation
    const availableWorkerPhones = await findAvailableWorkers(
      reservationData.date,
      reservationData.start_time,
      reservationData.end_time
    );

    // Add available worker phones to reservation data
    const webhookPayload = {
      event: 'reservation_created',
      data: {
        ...reservationData,
        available_worker_phones: availableWorkerPhones,
      },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Webhook error:', response.status, errorText);
      return {
        success: false,
        error: `Webhook error: ${response.status} ${response.statusText}`,
      };
    }

    console.log('Webhook sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error sending webhook:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending webhook',
    };
  }
}

