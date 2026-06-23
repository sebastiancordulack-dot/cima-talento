// Hand-written types mirroring supabase/migrations/0001_initial_schema.sql.
// Keep in sync with the schema (or regenerate later with `supabase gen types`).

export type CandidateStatus =
  | 'new'
  | 'scheduled'
  | 'in_review'
  | 'advanced'
  | 'julia_scheduled'
  | 'approved'
  | 'rejected_hm'
  | 'rejected_julia'
  | 'no_show'
  | 'removed';

export type UserRole = 'admin' | 'hiring_manager' | 'julia' | 'regional_manager';

export type HmDecision = 'fit' | 'not_fit';

export type JuliaDecision = 'approved' | 'not_approved';

export type EmailType =
  | 'availability'
  | 'rejection_hm'
  | 'schedule_julia'
  | 'welcome'
  | 'rejection_julia';

export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';

// Structured weekly availability for future dispatch matching, e.g.
// { mon: ['09:00-17:00'], tue: ['09:00-12:00'] }.
export type Availability = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string[]>
>;

export interface Database {
  public: {
    Tables: {
      hiring_managers: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
          name: string;
          email: string;
          calendly_link: string | null;
          assigned_metros: string[];
          role: UserRole;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          name: string;
          email: string;
          calendly_link?: string | null;
          assigned_metros?: string[];
          role?: UserRole;
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['hiring_managers']['Insert']>;
        Relationships: [];
      };
      candidates: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          first_name: string;
          last_name: string | null;
          email: string;
          phone: string | null;
          city: string | null;
          zip_code: string | null;
          metro_area: string | null;
          state: string | null;
          status: CandidateStatus;
          source_ad_location: string | null;
          fillout_submission_id: string | null;
          notes: string | null;
          bilingual: boolean | null;
          prior_experience: boolean | null;
          app_comfortable: boolean | null;
          has_vehicle: boolean | null;
          work_authorized: boolean | null;
          available_mf: boolean | null;
          works_independently: boolean | null;
          score_total: number | null;
          scorecard_data: Record<string, unknown>;
          hm_decision: HmDecision | null;
          julia_decision: JuliaDecision | null;
          hm_call_at: string | null;
          julia_call_at: string | null;
          talent_pool_added_at: string | null;
          resume_path: string | null;
          resume_filename: string | null;
          resume_uploaded_at: string | null;
          upload_token: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          first_name: string;
          last_name?: string | null;
          email: string;
          phone?: string | null;
          city?: string | null;
          zip_code?: string | null;
          metro_area?: string | null;
          state?: string | null;
          status?: CandidateStatus;
          source_ad_location?: string | null;
          fillout_submission_id?: string | null;
          notes?: string | null;
          bilingual?: boolean | null;
          prior_experience?: boolean | null;
          app_comfortable?: boolean | null;
          has_vehicle?: boolean | null;
          work_authorized?: boolean | null;
          available_mf?: boolean | null;
          works_independently?: boolean | null;
          score_total?: number | null;
          scorecard_data?: Record<string, unknown>;
          hm_decision?: HmDecision | null;
          julia_decision?: JuliaDecision | null;
          hm_call_at?: string | null;
          julia_call_at?: string | null;
          talent_pool_added_at?: string | null;
          resume_path?: string | null;
          resume_filename?: string | null;
          resume_uploaded_at?: string | null;
          upload_token?: string;
        };
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>;
        Relationships: [];
      };
      candidate_status_history: {
        Row: {
          id: string;
          created_at: string;
          candidate_id: string;
          from_status: CandidateStatus | null;
          to_status: CandidateStatus;
          changed_by: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          candidate_id: string;
          from_status?: CandidateStatus | null;
          to_status: CandidateStatus;
          changed_by?: string | null;
          note?: string | null;
        };
        Update: Partial<Database['public']['Tables']['candidate_status_history']['Insert']>;
        Relationships: [];
      };
      talent_pool: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          candidate_id: string;
          metro_area: string | null;
          state: string | null;
          availability: Availability;
          active: boolean;
          onboarding_complete: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          candidate_id: string;
          metro_area?: string | null;
          state?: string | null;
          availability?: Availability;
          active?: boolean;
          onboarding_complete?: boolean;
        };
        Update: Partial<Database['public']['Tables']['talent_pool']['Insert']>;
        Relationships: [];
      };
      email_log: {
        Row: {
          id: string;
          created_at: string;
          candidate_id: string;
          email_type: EmailType;
          sent_at: string;
          resend_id: string | null;
          status: EmailStatus;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          candidate_id: string;
          email_type: EmailType;
          sent_at?: string;
          resend_id?: string | null;
          status?: EmailStatus;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['email_log']['Insert']>;
        Relationships: [];
      };
      metros: {
        Row: {
          id: string;
          created_at: string;
          metro: string;
          state: string;
          lng: number;
          lat: number;
          zip3: string[];
          cities: string[];
          created_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          metro: string;
          state: string;
          lng: number;
          lat: number;
          zip3?: string[];
          cities?: string[];
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['metros']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Enums: {
      candidate_status: CandidateStatus;
      user_role: UserRole;
      hm_decision: HmDecision;
      julia_decision: JuliaDecision;
      email_type: EmailType;
      email_status: EmailStatus;
    };
  };
}
