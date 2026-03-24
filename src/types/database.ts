export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      dictation_results: {
        Row: {
          id: string;
          user_id: string;
          sentence_original: string;
          user_input: string;
          score: number;
          word_count: number;
          correct_count: number;
          applied_patterns: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sentence_original: string;
          user_input: string;
          score: number;
          word_count: number;
          correct_count: number;
          applied_patterns?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sentence_original?: string;
          user_input?: string;
          score?: number;
          word_count?: number;
          correct_count?: number;
          applied_patterns?: string[];
          created_at?: string;
        };
      };
      player_sessions: {
        Row: {
          id: string;
          user_id: string;
          youtube_url: string;
          clip_start: number;
          clip_end: number;
          transcript: string;
          pronunciation_analysis: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_url: string;
          clip_start?: number;
          clip_end?: number;
          transcript?: string;
          pronunciation_analysis?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          youtube_url?: string;
          clip_start?: number;
          clip_end?: number;
          transcript?: string;
          pronunciation_analysis?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
