export type LiveKitEventType = 'reaction' | 'raiseHand' | 'lowerHand' | 'whiteboard_state' | 'whiteboard_data' | 'mute_all' | 'clear_whiteboard';
export interface LiveKitEvent {
  type: LiveKitEventType;
  studentName?: string;
  studentId?: string;
  reactionKey?: 'gotIt' | 'confused' | 'tooFast' | 'repeat';
  timestamp: number;
  isDrawing?: boolean;
  paths?: any[];
  isMuted?: boolean;
}
