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
    description: 'Classic white football with dark panels.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#f5f6f2" stroke="#cbd5df" stroke-width="2.5"/><path d="M32 20 42 27 38 39 26 39 22 27Z" fill="#18212f"/><path d="M32 20 32 7 M42 27 55 22 M38 39 46 52 M26 39 17 52 M22 27 9 22" fill="none" stroke="#18212f" stroke-width="2.7" stroke-linecap="round"/><path d="M32 7 22 10 9 22 M55 22 46 10 32 7 M46 52 55 42 55 22 M17 52 8 42 9 22" fill="none" stroke="#8d99a8" stroke-width="1.5"/></svg>',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    description: 'Orange ball with classic black seams.',
    previewSvg: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#e9822d" stroke="#ffb15e" stroke-width="2.5"/><path d="M32 4 C14 18 14 46 32 60 M32 4 C50 18 50 46 32 60 M5 32 H59 M7 18 C21 28 43 28 57 18 M7 46 C21 36 43 36 57 46" fill="none" stroke="#44291e" stroke-width="2.5"/></svg>',
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
