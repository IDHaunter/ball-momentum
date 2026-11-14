export const BALL_SKIN_OPTIONS = [
  {
    id: 'smiley',
    label: 'Happy face',
    description: 'A cheerful yellow smiley that spins with the ball.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#f5b942" stroke="#ffdf91" stroke-width="3"/><circle cx="22" cy="25" r="3.2" fill="#18212f"/><circle cx="42" cy="25" r="3.2" fill="#18212f"/><path d="M18 36 Q32 52 46 36" fill="none" stroke="#18212f" stroke-width="3.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'soccer',
    label: 'Football',
    description: 'Classic football with a bold centre pentagon and simplified dark panels.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#f8f9f6" stroke="#cbd5df" stroke-width="2.5"/><path d="M32 23 L32 18.6 M40.5 29.2 L44.8 27.8 M37.3 39.2 L39.9 42.9 M26.7 39.2 L24.1 42.9 M23.5 29.2 L19.2 27.8" fill="none" stroke="#5d6875" stroke-width="1.4" stroke-linecap="round"/><path d="M32 23 L40.5 29.2 L37.3 39.2 L26.7 39.2 L23.5 29.2 Z M32 18.4 L26.5 14.5 L28.6 8 L35.4 8 L37.5 14.5 Z M44.9 27.8 L47 21.4 L53.7 21.4 L55.8 27.8 L50.4 31.8 Z M40 43 L46.7 43 L48.8 49.4 L43.4 53.4 L37.9 49.4 Z M24 43 L26.1 49.4 L20.6 53.4 L15.2 49.4 L17.3 43 Z M19.1 27.8 L13.6 31.8 L8.2 27.8 L10.3 21.4 L17 21.4 Z" fill="#18212f" stroke="#18212f" stroke-linejoin="round"/><ellipse cx="24" cy="17" rx="7" ry="3" fill="#fff" opacity=".42"/></svg>',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    description: 'Orange basketball with bold curved side seams and a centre channel.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#e9822d" stroke="#6a3b22" stroke-width="2.5"/><path d="M32 5.7 C20 18 20 46 32 58.3 M32 5.7 C44 18 44 46 32 58.3 M32 5.7 V58.3 M5.7 32 C20 31.2 44 32.8 58.3 32" fill="none" stroke="#432719" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="23" cy="18" rx="8" ry="3.5" fill="#ffcf91" opacity=".34"/></svg>',
  },
  {
    id: 'eye',
    label: 'Googly eye',
    description: 'A silly eyeball. Its pupil spins around as the ball rolls.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#f8f7ed" stroke="#d7e1e8" stroke-width="2.5"/><circle cx="36" cy="31" r="16" fill="#43b9c9" stroke="#247d91" stroke-width="2"/><circle cx="39" cy="31" r="8.5" fill="#142238"/><circle cx="33" cy="24" r="4.5" fill="#fff"/><circle cx="43" cy="38" r="2" fill="#fff"/></svg>',
  },
  {
    id: 'alien',
    label: 'Tiny alien',
    description: 'A green space buddy with antennae and big eyes.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="27" fill="#8ed45b" stroke="#c5f28b" stroke-width="2.5"/><path d="M22 12 16 4 M42 12 48 4" stroke="#4c9c53" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="4" r="3.5" fill="#f5b942"/><circle cx="48" cy="4" r="3.5" fill="#f5b942"/><ellipse cx="22" cy="29" rx="6" ry="9" fill="#18212f"/><ellipse cx="42" cy="29" rx="6" ry="9" fill="#18212f"/><circle cx="24" cy="26" r="2" fill="#fff"/><circle cx="44" cy="26" r="2" fill="#fff"/><path d="M25 45 Q32 50 39 45" fill="none" stroke="#27543b" stroke-width="3" stroke-linecap="round"/></svg>',
  },
] as const;

export type BallSkin = (typeof BALL_SKIN_OPTIONS)[number]['id'];

export const DEFAULT_BALL_SKIN: BallSkin = 'smiley';

export function isBallSkin(value: unknown): value is BallSkin {
  return typeof value === 'string' && BALL_SKIN_OPTIONS.some((option) => option.id === value);
}

export function normalizeBallSkin(value: unknown): BallSkin {
  return isBallSkin(value) ? value : DEFAULT_BALL_SKIN;
}
