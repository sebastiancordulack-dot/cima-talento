// Hand-written types mirroring supabase/migrations/ (0001–0007).
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
  | 'removed'
  | 'archived';

export type UserRole = 'admin' | 'hiring_manager' | 'julia' | 'regional_manager';

export type HmDecision = 'fit' | 'not_fit';

export type JuliaDecision = 'approved' | 'not_approved';

export type EmailType =
  | 'availability'
  | 'rejection_hm'
  | 'schedule_julia'
  | 'welcome'
  | 'rejection_julia'
  | 'archived';

export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';

export type CandidateOutcome = 'rejected_hm' | 'rejected_julia' | 'deleted_from_archive';

// Structured weekly availability for future dispatch matching, e.g.
// { mon: ['09:00-17:00'], tue: ['09:00-12:00'] }.
export type Availability = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', string[]>
>;

// ---- CiMA Activaciones (migration 0007) -------------------------------------

export type ActivationType = 'in_store' | 'field_event';

export type SolicitudStatus =
  | 'submitted'
  | 'in_review'
  | 'changes_proposed'
  | 'quote_sent'
  | 'client_approved'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type ChangeResponse = 'pending' | 'approved' | 'rejected';

export type SolicitudActor = 'cima_staff' | 'client';

export type ActivacionesEmailType =
  | 'solicitud_received'
  | 'change_proposed'
  | 'quote_sent'
  | 'event_confirmed'
  | 'event_cancelled'
  | 'internal_new_solicitud'
  | 'internal_client_approved'
  | 'internal_change_rejected'
  | 'internal_quote_question';

// Slugs stored in solicitudes.budget_range (labels are a UI concern):
// Under $5k / $5k–$10k / $10k–$20k / $20k+ / Not yet defined.
export type BudgetRange = 'under_5k' | '5k_10k' | '10k_20k' | '20k_plus' | 'not_defined';

export type CoiStatus = 'pending' | 'submitted' | 'approved';

// Itemized quote breakdown (jsonb). Shape is owned by the Hub quote builder
// (build-order Step 4); multi-location batches nest line items per location.
export type QuoteLineItems = Record<string, unknown>;

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
          last_bumped_at: string | null;
          previously_rejected_at: string | null;
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
          last_bumped_at?: string | null;
          previously_rejected_at?: string | null;
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
      candidate_outcomes: {
        Row: {
          id: string;
          decided_at: string;
          applied_at: string | null;
          metro_area: string | null;
          state: string | null;
          source: string | null;
          stage_reached: string;
          outcome: CandidateOutcome;
        };
        Insert: {
          id?: string;
          decided_at?: string;
          applied_at?: string | null;
          metro_area?: string | null;
          state?: string | null;
          source?: string | null;
          stage_reached: string;
          outcome: CandidateOutcome;
        };
        Update: Partial<Database['public']['Tables']['candidate_outcomes']['Insert']>;
        Relationships: [];
      };
      rejected_applicants: {
        Row: {
          email_hash: string;
          rejected_at: string;
          stage: string;
        };
        Insert: {
          email_hash: string;
          rejected_at?: string;
          stage: string;
        };
        Update: Partial<Database['public']['Tables']['rejected_applicants']['Insert']>;
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
      brand_clients: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
          company_name: string;
          brands: string[];
          portal_email: string;
          contact_name: string | null;
          contact_phone: string | null;
          active: boolean;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          company_name: string;
          brands?: string[];
          portal_email: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          active?: boolean;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['brand_clients']['Insert']>;
        Relationships: [];
      };
      solicitudes: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          client_id: string;
          batch_id: string | null;
          status: SolicitudStatus;
          activation_type: ActivationType;
          brand: string;
          brands_featured: number;
          num_brand_ambassadors: number | null;
          // In-store client fields
          special_promotions: string | null;
          comments: string | null;
          date: string | null;
          time_start: string | null;
          time_end: string | null;
          store_name: string | null;
          store_address: string | null;
          store_type: string | null;
          store_contact_name: string | null;
          store_contact_phone: string | null;
          distributor_rep_name: string | null;
          product_quantity: string | null;
          // Field/event client fields
          event_name: string | null;
          event_venue: string | null;
          event_address: string | null;
          event_dates: string | null; // daterange, e.g. "[2026-07-01,2026-07-03]"
          setup_time: string | null;
          activation_time_start: string | null;
          activation_time_end: string | null;
          teardown_time: string | null;
          expected_attendance: string | null;
          activation_needs: string[];
          activation_vision: string | null;
          client_supplied_assets: string | null;
          special_considerations: string | null;
          budget_range: BudgetRange | null;
          // CiMA-internal — never exposed to clients (client_solicitudes view)
          internal_notes: string | null;
          verification_notes: string | null;
          quote_amount: number | null;
          quote_line_items: QuoteLineItems | null;
          quote_notes: string | null;
          reviewed_by: string | null;
          store_condition: string | null;
          product_location_in_store: string | null;
          coi_required: boolean | null;
          coi_named_insured: string | null;
          coi_status: CoiStatus | null;
          participation_agreement_required: boolean | null;
          participation_agreement_payment: boolean | null;
          participation_agreement_amount: number | null;
          third_party_vendors: string | null;
          fabrication_notes: string | null;
          logistics_notes: string | null;
          asset_delivery_status: string | null;
          content_creation_brief: string | null;
          confirmed_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          client_id: string;
          batch_id?: string | null;
          status?: SolicitudStatus;
          activation_type: ActivationType;
          brand: string;
          brands_featured?: number;
          num_brand_ambassadors?: number | null;
          special_promotions?: string | null;
          comments?: string | null;
          date?: string | null;
          time_start?: string | null;
          time_end?: string | null;
          store_name?: string | null;
          store_address?: string | null;
          store_type?: string | null;
          store_contact_name?: string | null;
          store_contact_phone?: string | null;
          distributor_rep_name?: string | null;
          product_quantity?: string | null;
          event_name?: string | null;
          event_venue?: string | null;
          event_address?: string | null;
          event_dates?: string | null;
          setup_time?: string | null;
          activation_time_start?: string | null;
          activation_time_end?: string | null;
          teardown_time?: string | null;
          expected_attendance?: string | null;
          activation_needs?: string[];
          activation_vision?: string | null;
          client_supplied_assets?: string | null;
          special_considerations?: string | null;
          budget_range?: BudgetRange | null;
          internal_notes?: string | null;
          verification_notes?: string | null;
          quote_amount?: number | null;
          quote_line_items?: QuoteLineItems | null;
          quote_notes?: string | null;
          reviewed_by?: string | null;
          store_condition?: string | null;
          product_location_in_store?: string | null;
          coi_required?: boolean | null;
          coi_named_insured?: string | null;
          coi_status?: CoiStatus | null;
          participation_agreement_required?: boolean | null;
          participation_agreement_payment?: boolean | null;
          participation_agreement_amount?: number | null;
          third_party_vendors?: string | null;
          fabrication_notes?: string | null;
          logistics_notes?: string | null;
          asset_delivery_status?: string | null;
          content_creation_brief?: string | null;
          confirmed_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['solicitudes']['Insert']>;
        Relationships: [];
      };
      solicitud_assignments: {
        Row: {
          id: string;
          solicitud_id: string;
          talent_pool_id: string;
          assigned_at: string;
          assigned_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          solicitud_id: string;
          talent_pool_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['solicitud_assignments']['Insert']>;
        Relationships: [];
      };
      solicitud_changes: {
        Row: {
          id: string;
          created_at: string;
          solicitud_id: string;
          proposed_by: string | null;
          change_type: string;
          original_value: string | null;
          proposed_value: string | null;
          reason: string | null;
          client_response: ChangeResponse;
          client_responded_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          solicitud_id: string;
          proposed_by?: string | null;
          change_type: string;
          original_value?: string | null;
          proposed_value?: string | null;
          reason?: string | null;
          client_response?: ChangeResponse;
          client_responded_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['solicitud_changes']['Insert']>;
        Relationships: [];
      };
      solicitud_attachments: {
        Row: {
          id: string;
          created_at: string;
          solicitud_id: string;
          uploaded_by: SolicitudActor;
          storage_path: string;
          file_name: string;
          content_type: string | null;
          size_bytes: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          solicitud_id: string;
          uploaded_by?: SolicitudActor;
          storage_path: string;
          file_name: string;
          content_type?: string | null;
          size_bytes: number;
        };
        Update: Partial<Database['public']['Tables']['solicitud_attachments']['Insert']>;
        Relationships: [];
      };
      solicitud_status_log: {
        Row: {
          id: string;
          solicitud_id: string;
          changed_at: string;
          from_status: SolicitudStatus | null;
          to_status: SolicitudStatus;
          changed_by: string | null; // hiring_managers.id OR brand_clients.id
          actor_type: SolicitudActor | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          solicitud_id: string;
          changed_at?: string;
          from_status?: SolicitudStatus | null;
          to_status: SolicitudStatus;
          changed_by?: string | null;
          actor_type?: SolicitudActor | null;
          note?: string | null;
        };
        Update: Partial<Database['public']['Tables']['solicitud_status_log']['Insert']>;
        Relationships: [];
      };
      activaciones_email_log: {
        Row: {
          id: string;
          created_at: string;
          solicitud_id: string;
          email_type: ActivacionesEmailType;
          recipient_email: string;
          sent_at: string;
          resend_id: string | null;
          status: EmailStatus;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          solicitud_id: string;
          email_type: ActivacionesEmailType;
          recipient_email: string;
          sent_at?: string;
          resend_id?: string | null;
          status?: EmailStatus;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activaciones_email_log']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      // Column-safe, row-scoped portal reads (migration 0007 §10). Quote
      // fields are null until the Solicitud reaches quote_sent.
      client_solicitudes: {
        Row: Omit<
          Database['public']['Tables']['solicitudes']['Row'],
          | 'internal_notes'
          | 'verification_notes'
          | 'reviewed_by'
          | 'store_condition'
          | 'product_location_in_store'
          | 'coi_required'
          | 'coi_named_insured'
          | 'coi_status'
          | 'participation_agreement_required'
          | 'participation_agreement_payment'
          | 'participation_agreement_amount'
          | 'third_party_vendors'
          | 'fabrication_notes'
          | 'logistics_notes'
          | 'asset_delivery_status'
          | 'content_creation_brief'
        >;
        Relationships: [];
      };
      client_solicitud_changes: {
        Row: Omit<Database['public']['Tables']['solicitud_changes']['Row'], 'proposed_by'>;
        Relationships: [];
      };
      // Full passthrough: storage_path is unusable without the service-role
      // client (private bucket, no storage policies) — see migration 0009.
      client_solicitud_attachments: {
        Row: Database['public']['Tables']['solicitud_attachments']['Row'];
        Relationships: [];
      };
      client_solicitud_status_log: {
        Row: Omit<
          Database['public']['Tables']['solicitud_status_log']['Row'],
          'changed_by' | 'actor_type' | 'note'
        >;
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Enums: {
      candidate_status: CandidateStatus;
      user_role: UserRole;
      hm_decision: HmDecision;
      julia_decision: JuliaDecision;
      email_type: EmailType;
      email_status: EmailStatus;
      activation_type: ActivationType;
      solicitud_status: SolicitudStatus;
      change_response: ChangeResponse;
      solicitud_actor: SolicitudActor;
      activaciones_email_type: ActivacionesEmailType;
    };
  };
}
