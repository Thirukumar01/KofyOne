/**
 * KofyOne - Supabase Database Types
 * Represents the PostgreSQL schema managed via Supabase migrations.
 * Conforms to Supabase GenericSchema structure.
 */

import { Platform } from './platform';
import { TrackingConfig } from './tracking';
import { Category } from './category';
import { Resource } from './resource';
import { SiteBranding } from './branding';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: 'student' | 'educator' | 'admin' | 'guest';
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          preferred_platform: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: 'student' | 'educator' | 'admin' | 'guest';
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_platform?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: 'student' | 'educator' | 'admin' | 'guest';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'student' | 'educator' | 'admin' | 'guest';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
        Relationships: [];
      };
      user_security_questions: {
        Row: {
          user_id: string;
          question_id: string;
          answer_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          question_id: string;
          answer_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_security_questions']['Insert']>;
        Relationships: [];
      };
      security_verification_attempts: {
        Row: {
          id: string;
          account_identifier: string;
          user_id: string | null;
          success: boolean;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_identifier: string;
          user_id?: string | null;
          success?: boolean;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['security_verification_attempts']['Insert']>;
        Relationships: [];
      };
      password_reset_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['password_reset_tokens']['Insert']>;
        Relationships: [];
      };
      platforms: {
        Row: Platform;
        Insert: Omit<Platform, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Platform>;
        Relationships: [];
      };
      tracking_configs: {
        Row: TrackingConfig;
        Insert: Omit<TrackingConfig, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TrackingConfig>;
        Relationships: [
          {
            foreignKeyName: 'tracking_configs_platform_id_fkey';
            columns: ['platform_id'];
            isOneToOne: false;
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          }
        ];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Category>;
        Relationships: [];
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'view_count' | 'click_count' | 'created_at' | 'updated_at'> & {
          id?: string;
          view_count?: number;
          click_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Resource>;
        Relationships: [
          {
            foreignKeyName: 'resources_platform_id_fkey';
            columns: ['platform_id'];
            isOneToOne: false;
            referencedRelation: 'platforms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_tracking_config_id_fkey';
            columns: ['tracking_config_id'];
            isOneToOne: false;
            referencedRelation: 'tracking_configs';
            referencedColumns: ['id'];
          }
        ];
      };
      resource_categories: {
        Row: {
          resource_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          resource_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: Partial<{
          resource_id: string;
          category_id: string;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'resource_categories_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resource_categories_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          resource_id: string;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'user_favorites_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          }
        ];
      };
      user_recently_viewed: {
        Row: {
          id: string;
          user_id: string;
          resource_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          resource_id: string;
          viewed_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          resource_id: string;
          viewed_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: 'user_recently_viewed_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          changes: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          changes?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          changes: Json;
          ip_address: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      site_branding: {
        Row: SiteBranding;
        Insert: Omit<SiteBranding, 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<SiteBranding>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_resource_click: {
        Args: {
          resource_uuid: string;
        };
        Returns: undefined;
      };
      search_resources: {
        Args: {
          search_term: string;
          filter_platform_id?: string;
          filter_category_id?: string;
          result_limit?: number;
          result_offset?: number;
        };
        Returns: {
          id: string;
          platform_id: string;
          name: string;
          slug: string;
          description: string;
          official_url: string;
          logo_url: string | null;
          featured: boolean;
          is_published: boolean;
          display_order: number;
          tracking_config_id: string | null;
          view_count: number;
          click_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
          rank: number;
        }[];
      };
      check_username_available: {
        Args: {
          p_username: string;
        };
        Returns: boolean;
      };
      get_email_by_identifier: {
        Args: {
          p_identifier: string;
        };
        Returns: string | null;
      };
      count_recent_failed_attempts: {
        Args: {
          p_identifier: string;
        };
        Returns: number;
      };
      record_verification_attempt: {
        Args: {
          p_identifier: string;
          p_user_id: string | null;
          p_success: boolean;
          p_ip?: string | null;
        };
        Returns: undefined;
      };
      register_user_security: {
        Args: {
          p_user_id: string;
          p_username: string;
          p_question_id: string;
          p_answer_hash: string;
        };
        Returns: undefined;
      };
      get_security_question_for_verification: {
        Args: {
          p_identifier: string;
        };
        Returns: {
          out_user_id: string;
          out_email: string;
          out_question_id: string;
          out_answer_hash: string;
        }[];
      };
      store_password_reset_token: {
        Args: {
          p_user_id: string;
          p_token: string;
        };
        Returns: undefined;
      };
      apply_password_reset: {
        Args: {
          p_token: string;
          p_new_password: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
