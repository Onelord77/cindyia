import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formats a phone number for display (without + sign)
 * Handles both formats: with DDI (5585...) and without (85...)
 * @param phone - Phone number (digits only or with DDI)
 * @returns Formatted phone like "(85) 99766-7750"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  // Phone with DDI (13 digits: 55 + DDD + 9 digits)
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const number = cleaned.slice(4);
    return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
  }

  // Phone with DDI (12 digits: 55 + DDD + 8 digits - landline)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const number = cleaned.slice(4);
    return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  }

  // Legacy format without DDI (11 digits: DDD + 9 digits)
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  // Legacy format without DDI (10 digits: DDD + 8 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Formats phone input with mask (national part only, without DDI)
 * DDI is handled separately in the form
 * @param value - Phone input value
 * @returns Masked phone like "(85) 99766-7750"
 */
export function formatPhoneMask(value: string): string {
  // Remove DDI if present (starts with 55 and has more than 11 digits)
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Removes mask from phone and adds DDI
 * @param phone - Masked phone number
 * @param ddi - Country code (default: 55)
 * @returns Phone with DDI like "5585997667750"
 */
export function unmaskPhone(phone: string, ddi: string = '55'): string {
  const digits = phone.replace(/\D/g, '');
  // If already has DDI, return as is
  if (digits.length >= 12 && digits.startsWith(ddi)) {
    return digits;
  }
  // Add DDI
  return `${ddi}${digits}`;
}

/**
 * Extracts the national number (without DDI) from a phone
 * @param phone - Phone number with or without DDI
 * @returns National number like "85997667750"
 */
export function extractNationalNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If starts with 55 and has 12-13 digits, remove DDI
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Extracts the DDI from a phone number
 * @param phone - Phone number
 * @returns DDI or "55" as default
 */
export function extractDDI(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12) {
    return digits.slice(0, 2);
  }
  return '55';
}

export function phoneToWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If already has DDI (12+ digits starting with country code), use as is
  if (digits.length >= 12) {
    return `https://wa.me/${digits}`;
  }
  // Otherwise add 55 (Brazil)
  return `https://wa.me/55${digits}`;
}

// ============ TIMEZONE UTILITIES (São Paulo / UTC-3) ============

export const SAO_PAULO_OFFSET = '-03:00';

/**
 * Creates an ISO datetime string with São Paulo timezone offset
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM format
 * @returns ISO string like "2024-01-15T14:30:00-03:00"
 */
export function toSaoPauloDateTime(date: string, time: string): string {
  return `${date}T${time}:00${SAO_PAULO_OFFSET}`;
}

/**
 * Creates a Date object from date/time strings, interpreted as São Paulo time
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM format
 * @returns Date object
 */
export function createSaoPauloDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${SAO_PAULO_OFFSET}`);
}

/**
 * Extracts hours and minutes from a Date object in São Paulo timezone
 * Uses the timezone offset to calculate the correct local time
 * @param date - Date object (can be UTC or any timezone)
 * @returns Object with hours and minutes in São Paulo time
 */
export function getTimeInSaoPaulo(date: Date): { hours: number; minutes: number } {
  // Get UTC time and adjust for São Paulo (UTC-3)
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // São Paulo is UTC-3, so subtract 3 hours
  let spHours = utcHours - 3;
  if (spHours < 0) spHours += 24;

  return { hours: spHours, minutes: utcMinutes };
}

/**
 * Formats a date's time portion in São Paulo timezone as HH:MM
 * @param date - Date object or ISO string
 * @returns Time string in HH:MM format
 */
export function formatTimeInSaoPaulo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { hours, minutes } = getTimeInSaoPaulo(d);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Gets the day of week (0-6) for a date in São Paulo timezone
 * @param date - Date object or ISO string
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeekInSaoPaulo(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Get the date parts in São Paulo timezone
  const { hours } = getTimeInSaoPaulo(d);

  // If the UTC hours minus 3 would roll back a day, adjust
  let dayOfWeek = d.getUTCDay();
  const utcHours = d.getUTCHours();

  // If São Paulo time is "yesterday" compared to UTC
  if (utcHours < 3) {
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }

  return dayOfWeek;
}

/**
 * Gets the date string (YYYY-MM-DD) for a date in São Paulo timezone
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInSaoPaulo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Calculate São Paulo date considering UTC-3
  const utcDate = new Date(d.getTime());
  utcDate.setUTCHours(utcDate.getUTCHours() - 3);

  return utcDate.toISOString().split('T')[0];
}

/**
 * Compares if two dates are the same day in São Paulo timezone
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if same day in São Paulo timezone
 */
export function isSameDayInSaoPaulo(date1: Date | string, date2: Date | string): boolean {
  return getDateInSaoPaulo(date1) === getDateInSaoPaulo(date2);
}

/**
 * Gets today's date string in São Paulo timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInSaoPaulo(): string {
  return getDateInSaoPaulo(new Date());
}
