export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cavalos: {
        Row: {
          ano: string | null
          arquivo_url: string | null
          chassi: string | null
          created_at: string
          created_by: string | null
          id: string
          marca_modelo: string | null
          placa: string | null
          renavam: string | null
          status: string
          transportador_id: string
          updated_at: string
        }
        Insert: {
          ano?: string | null
          arquivo_url?: string | null
          chassi?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca_modelo?: string | null
          placa?: string | null
          renavam?: string | null
          status?: string
          transportador_id: string
          updated_at?: string
        }
        Update: {
          ano?: string | null
          arquivo_url?: string | null
          chassi?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca_modelo?: string | null
          placa?: string | null
          renavam?: string | null
          status?: string
          transportador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cavalos_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          data_renovacao_agendada: string | null
          empresa: string
          id: string
          observacoes: string | null
          status: string | null
          tipo: string
          updated_at: string
          vencimento: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_renovacao_agendada?: string | null
          empresa: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          vencimento: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          data_renovacao_agendada?: string | null
          empresa?: string
          id?: string
          observacoes?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          vencimento?: string
        }
        Relationships: []
      }
      conferencia_seguros: {
        Row: {
          arquivo_apolice_url: string | null
          created_at: string
          created_by: string | null
          id: string
          observacoes: string | null
          periodo_referencia: string
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_apolice_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          periodo_referencia: string
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_apolice_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          periodo_referencia?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      conferencia_seguros_extraidos: {
        Row: {
          certificado: string | null
          conferencia_id: string
          created_at: string
          id: string
          nome: string
          premio: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          certificado?: string | null
          conferencia_id: string
          created_at?: string
          id?: string
          nome: string
          premio?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          certificado?: string | null
          conferencia_id?: string
          created_at?: string
          id?: string
          nome?: string
          premio?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_seguros_extraidos_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "conferencia_seguros"
            referencedColumns: ["id"]
          },
        ]
      }
      conferencia_seguros_itens: {
        Row: {
          coberto: boolean
          conferencia_id: string
          created_at: string
          id: string
          motorista_id: string
          observacoes: string | null
          seguro_id: string | null
        }
        Insert: {
          coberto?: boolean
          conferencia_id: string
          created_at?: string
          id?: string
          motorista_id: string
          observacoes?: string | null
          seguro_id?: string | null
        }
        Update: {
          coberto?: boolean
          conferencia_id?: string
          created_at?: string
          id?: string
          motorista_id?: string
          observacoes?: string | null
          seguro_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conferencia_seguros_itens_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "conferencia_seguros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencia_seguros_itens_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conferencia_seguros_itens_seguro_id_fkey"
            columns: ["seguro_id"]
            isOneToOne: false
            referencedRelation: "seguros"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_url: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          data_assinatura: string | null
          data_envio: string | null
          empresa: string
          id: string
          modelo: string | null
          motorista_id: string | null
          observacoes: string | null
          status: string | null
          tipo: string
          transportador_id: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_envio?: string | null
          empresa: string
          id?: string
          modelo?: string | null
          motorista_id?: string | null
          observacoes?: string | null
          status?: string | null
          tipo: string
          transportador_id?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura?: string | null
          data_envio?: string | null
          empresa?: string
          id?: string
          modelo?: string | null
          motorista_id?: string | null
          observacoes?: string | null
          status?: string | null
          tipo?: string
          transportador_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_empresa: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa: string
          id: string
          status: string | null
          tipo: string
          updated_at: string
          vencimento: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa: string
          id?: string
          status?: string | null
          tipo: string
          updated_at?: string
          vencimento?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa?: string
          id?: string
          status?: string | null
          tipo?: string
          updated_at?: string
          vencimento?: string | null
        }
        Relationships: []
      }
      motorista_arquivos: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          motorista_id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          motorista_id: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          motorista_id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motorista_arquivos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          alvara_numero: string | null
          alvara_vencimento: string | null
          antt_numero: string | null
          antt_vencimento: string | null
          certificado_numero: string | null
          certificado_vencimento: string | null
          cidade: string | null
          cnh_numero: string | null
          cnh_vencimento: string | null
          cpf: string
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          is_transportador_proprio: boolean
          mopp_numero: string | null
          mopp_vencimento: string | null
          mopp_vitalicio: boolean
          nome: string
          rg: string | null
          situacao_operacional: string | null
          status: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          alvara_numero?: string | null
          alvara_vencimento?: string | null
          antt_numero?: string | null
          antt_vencimento?: string | null
          certificado_numero?: string | null
          certificado_vencimento?: string | null
          cidade?: string | null
          cnh_numero?: string | null
          cnh_vencimento?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          is_transportador_proprio?: boolean
          mopp_numero?: string | null
          mopp_vencimento?: string | null
          mopp_vitalicio?: boolean
          nome: string
          rg?: string | null
          situacao_operacional?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          alvara_numero?: string | null
          alvara_vencimento?: string | null
          antt_numero?: string | null
          antt_vencimento?: string | null
          certificado_numero?: string | null
          certificado_vencimento?: string | null
          cidade?: string | null
          cnh_numero?: string | null
          cnh_vencimento?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          is_transportador_proprio?: boolean
          mopp_numero?: string | null
          mopp_vencimento?: string | null
          mopp_vitalicio?: boolean
          nome?: string
          rg?: string | null
          situacao_operacional?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reboques: {
        Row: {
          ano: string | null
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          id: string
          placa: string | null
          renavam: string | null
          status: string
          tipo: string | null
          transportador_id: string
          updated_at: string
        }
        Insert: {
          ano?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          placa?: string | null
          renavam?: string | null
          status?: string
          tipo?: string | null
          transportador_id: string
          updated_at?: string
        }
        Update: {
          ano?: string | null
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          placa?: string | null
          renavam?: string | null
          status?: string
          tipo?: string | null
          transportador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reboques_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_config: {
        Row: {
          assunto_padrao: string | null
          corpo_padrao: string | null
          created_at: string | null
          created_by: string | null
          destinatarios: string[] | null
          dia_envio: string | null
          envio_automatico: boolean | null
          horario_envio: string | null
          id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          assunto_padrao?: string | null
          corpo_padrao?: string | null
          created_at?: string | null
          created_by?: string | null
          destinatarios?: string[] | null
          dia_envio?: string | null
          envio_automatico?: boolean | null
          horario_envio?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          assunto_padrao?: string | null
          corpo_padrao?: string | null
          created_at?: string | null
          created_by?: string | null
          destinatarios?: string[] | null
          dia_envio?: string | null
          envio_automatico?: boolean | null
          horario_envio?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seguros: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          id: string
          motorista_id: string | null
          numero_apolice: string | null
          observacoes: string | null
          seguradora: string
          status: string | null
          tipo: string
          updated_at: string
          valor_premio: number | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motorista_id?: string | null
          numero_apolice?: string | null
          observacoes?: string | null
          seguradora: string
          status?: string | null
          tipo: string
          updated_at?: string
          valor_premio?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          motorista_id?: string | null
          numero_apolice?: string | null
          observacoes?: string | null
          seguradora?: string
          status?: string | null
          tipo?: string
          updated_at?: string
          valor_premio?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seguros_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      transportador_arquivos: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          transportador_id: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          transportador_id: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          transportador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportador_arquivos_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      transportador_motoristas: {
        Row: {
          created_at: string
          id: string
          motorista_id: string
          transportador_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motorista_id: string
          transportador_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motorista_id?: string
          transportador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportador_motoristas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportador_motoristas_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      transportadores: {
        Row: {
          alvara_numero: string | null
          antt_numero: string | null
          certificado_numero: string | null
          contato: string | null
          cpf_cnpj: string
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado_civil: string | null
          id: string
          inscricao_estadual: string | null
          motorista_id: string | null
          razao_social: string
          rg: string | null
          situacao_operacional: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alvara_numero?: string | null
          antt_numero?: string | null
          certificado_numero?: string | null
          contato?: string | null
          cpf_cnpj: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          id?: string
          inscricao_estadual?: string | null
          motorista_id?: string | null
          razao_social: string
          rg?: string | null
          situacao_operacional?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alvara_numero?: string | null
          antt_numero?: string | null
          certificado_numero?: string | null
          contato?: string | null
          cpf_cnpj?: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          id?: string
          inscricao_estadual?: string | null
          motorista_id?: string | null
          razao_social?: string
          rg?: string | null
          situacao_operacional?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportadores_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
