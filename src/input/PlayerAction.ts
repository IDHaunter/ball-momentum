export type InputSource = 'touch' | 'mouse' | 'keyboard';

export type PlayerAction =
  | { type: 'MOVE_LEFT'; strength: number; source: InputSource; timestamp: number }
  | { type: 'MOVE_RIGHT'; strength: number; source: InputSource; timestamp: number }
  | { type: 'JUMP'; strength: number; source: InputSource; timestamp: number }
  | { type: 'AIR_BOOST'; strength: number; source: InputSource; timestamp: number };
