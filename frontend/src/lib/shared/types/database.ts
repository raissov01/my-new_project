export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          streak_days: number;
          last_active_date: string | null;
          points: number;
          role: "student" | "teacher" | "admin";
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          streak_days?: number;
          last_active_date?: string | null;
          points?: number;
          role?: "student" | "teacher" | "admin";
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          streak_days?: number;
          last_active_date?: string | null;
          points?: number;
          role?: "student" | "teacher" | "admin";
        };
        Relationships: [];
      };
      flashcard_sets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          is_public?: boolean;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          id: string;
          term: string;
          definition: string;
          position: number;
          set_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          term: string;
          definition: string;
          position: number;
          set_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          term?: string;
          definition?: string;
          position?: number;
          set_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcard_set_access: {
        Row: {
          id: string;
          set_id: string;
          user_id: string;
          granted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          set_id: string;
          user_id: string;
          granted_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          set_id?: string;
          user_id?: string;
          granted_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcard_set_access_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcard_set_access_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcard_set_access_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_groups: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          join_code: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          join_code?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
          join_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: "owner" | "student";
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: "owner" | "student";
          joined_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: "owner" | "student";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "class_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_challenges: {
        Row: {
          id: string;
          group_id: string;
          set_id: string;
          title: string;
          deadline: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          set_id: string;
          title: string;
          deadline?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          set_id?: string;
          title?: string;
          deadline?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_challenges_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "class_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_challenges_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_challenges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_challenge_participants_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "class_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_challenge_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      class_challenge_attempts: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          set_id: string;
          completion_time: number;
          accuracy: number;
          total_correct: number;
          total_incorrect: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          set_id: string;
          completion_time: number;
          accuracy: number;
          total_correct: number;
          total_incorrect: number;
          completed_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          set_id?: string;
          completion_time?: number;
          accuracy?: number;
          total_correct?: number;
          total_incorrect?: number;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_challenge_attempts_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "class_challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_challenge_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_challenge_attempts_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      class_set_assignments: {
        Row: {
          id: string;
          group_id: string;
          set_id: string;
          assigned_by: string;
          deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          set_id: string;
          assigned_by: string;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          set_id?: string;
          assigned_by?: string;
          deadline?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_set_assignments_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "class_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_set_assignments_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_set_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      study_progress: {
        Row: {
          id: string;
          user_id: string;
          flashcard_id: string;
          times_seen: number;
          times_correct: number;
          times_incorrect: number;
          is_weak: boolean;
          review_interval: number;
          next_review_at: string;
          last_reviewed_at: string | null;
          last_studied_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          flashcard_id: string;
          times_seen?: number;
          times_correct?: number;
          times_incorrect?: number;
          is_weak?: boolean;
          review_interval?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
          last_studied_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          flashcard_id?: string;
          times_seen?: number;
          times_correct?: number;
          times_incorrect?: number;
          is_weak?: boolean;
          review_interval?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
          last_studied_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_progress_flashcard_id_fkey";
            columns: ["flashcard_id"];
            isOneToOne: false;
            referencedRelation: "flashcards";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          set_id: string | null;
          study_mode: "flashcard" | "quiz" | "write";
          preset: "15/5" | "25/5" | "50/10" | "custom";
          work_minutes: number;
          break_minutes: number;
          cards_reviewed: number;
          correct_answers: number;
          completed: boolean;
          started_at: string;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          set_id?: string | null;
          study_mode: "flashcard" | "quiz" | "write";
          preset?: "15/5" | "25/5" | "50/10" | "custom";
          work_minutes: number;
          break_minutes: number;
          cards_reviewed?: number;
          correct_answers?: number;
          completed?: boolean;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          set_id?: string | null;
          study_mode?: "flashcard" | "quiz" | "write";
          preset?: "15/5" | "25/5" | "50/10" | "custom";
          work_minutes?: number;
          break_minutes?: number;
          cards_reviewed?: number;
          correct_answers?: number;
          completed?: boolean;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pomodoro_sessions_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoro_preferences: {
        Row: {
          user_id: string;
          work_minutes: number;
          break_minutes: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          work_minutes?: number;
          break_minutes?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          work_minutes?: number;
          break_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pomodoro_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_attempts: {
        Row: {
          id: string;
          user_id: string;
          set_id: string;
          completion_time: number;
          accuracy: number;
          total_correct: number;
          total_incorrect: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          set_id: string;
          completion_time: number;
          accuracy: number;
          total_correct: number;
          total_incorrect: number;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          set_id?: string;
          completion_time?: number;
          accuracy?: number;
          total_correct?: number;
          total_incorrect?: number;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_attempts_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_sets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      leaderboard_stats: {
        Row: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          points: number;
          streak_days: number;
          total_cards_reviewed: number;
          total_correct: number;
          completed_sessions: number;
          total_study_minutes: number;
          ranking_score: number;
        };
      };
      leaderboard_daily: {
        Row: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          total_cards_reviewed: number;
          total_correct: number;
          completed_sessions: number;
          total_study_minutes: number;
          ranking_score: number;
        };
      };
      leaderboard_weekly: {
        Row: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          total_cards_reviewed: number;
          total_correct: number;
          completed_sessions: number;
          total_study_minutes: number;
          ranking_score: number;
        };
      };
    };
    Functions: {
      join_class_group_by_code: {
        Args: {
          p_join_code: string;
        };
        Returns: string;
      };
      upsert_study_progress: {
        Args: {
          p_user_id: string;
          p_flashcard_id: string;
          p_correct: boolean;
        };
        Returns: undefined;
      };
      refresh_leaderboard_views: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      delete_current_user_account: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];
export type FlashcardSet =
  Database["public"]["Tables"]["flashcard_sets"]["Row"];
export type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
export type FlashcardSetAccess =
  Database["public"]["Tables"]["flashcard_set_access"]["Row"];
export type ClassGroup = Database["public"]["Tables"]["class_groups"]["Row"];
export type ClassGroupMember =
  Database["public"]["Tables"]["class_group_members"]["Row"];
export type ClassChallenge =
  Database["public"]["Tables"]["class_challenges"]["Row"];
export type ClassChallengeParticipant =
  Database["public"]["Tables"]["class_challenge_participants"]["Row"];
export type ClassChallengeAttempt =
  Database["public"]["Tables"]["class_challenge_attempts"]["Row"];
export type ClassSetAssignment =
  Database["public"]["Tables"]["class_set_assignments"]["Row"];
export type StudyProgress =
  Database["public"]["Tables"]["study_progress"]["Row"];
export type PomodoroSession =
  Database["public"]["Tables"]["pomodoro_sessions"]["Row"];
export type ChallengeAttempt =
  Database["public"]["Tables"]["challenge_attempts"]["Row"];
export type LeaderboardEntry =
  Database["public"]["Views"]["leaderboard_stats"]["Row"];
export type LeaderboardDailyEntry =
  Database["public"]["Views"]["leaderboard_daily"]["Row"];
export type LeaderboardWeeklyEntry =
  Database["public"]["Views"]["leaderboard_weekly"]["Row"];
