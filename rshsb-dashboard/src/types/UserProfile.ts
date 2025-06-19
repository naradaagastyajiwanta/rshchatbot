export interface UserProfile {
  wa_number: string;
  name: string;
  gender: string;
  domisili: string;
  keluhan: string;
  barrier: string;
  lead_status: 'Cold' | 'Warm' | 'Hot';
  last_updated: string;
  age: number;
  symptoms: string;
  medical_history: string;
  urgency_level: string;
  emotion: string;
  program_awareness: string;
}
