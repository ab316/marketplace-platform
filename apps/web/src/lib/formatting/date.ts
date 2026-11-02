/**
 * Date display. One locale for the whole interface so the same instant never reads two ways on
 * one page; `long` for prose ("1 November 2026"), `medium` for dense tables ("1 Nov 2026").
 */
const LONG = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });
const MEDIUM = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

export const formatLongDate = (iso: string): string => LONG.format(new Date(iso));
export const formatMediumDate = (iso: string): string => MEDIUM.format(new Date(iso));
