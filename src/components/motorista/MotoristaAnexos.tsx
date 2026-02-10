import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Eye, Loader2, File, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Arquivo {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

interface MotoristaAnexosProps {
  motoristaId: string;
  motoristaNome: string;
}

export function MotoristaAnexos({ motoristaId, motoristaNome }: MotoristaAnexosProps) {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchArquivos = async () => {
    const { data, error } = await supabase
      .from("motorista_arquivos")
      .select("*")
      .eq("motorista_id", motoristaId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar arquivos");
    } else {
      setArquivos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArquivos();
  }, [motoristaId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: máximo 10MB`);
        continue;
      }

      try {
        const fileExt = file.name.split(".").pop();
        const storagePath = `motoristas/${motoristaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("documentos")
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from("motorista_arquivos")
          .insert({
            motorista_id: motoristaId,
            nome_arquivo: file.name,
            arquivo_url: urlData.publicUrl,
            tipo_arquivo: file.type || null,
            tamanho_bytes: file.size,
          });

        if (insertError) throw insertError;
      } catch (err: any) {
        toast.error(`Erro ao enviar ${file.name}`);
        console.error(err);
      }
    }

    toast.success("Arquivo(s) enviado(s)!");
    fetchArquivos();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (arquivo: Arquivo) => {
    if (!confirm(`Excluir "${arquivo.nome_arquivo}"?`)) return;

    // Extract storage path from URL
    const urlParts = arquivo.arquivo_url.split("/documentos/");
    const storagePath = urlParts[urlParts.length - 1];

    await supabase.storage.from("documentos").remove([storagePath]);
    const { error } = await supabase.from("motorista_arquivos").delete().eq("id", arquivo.id);

    if (error) {
      toast.error("Erro ao excluir arquivo");
    } else {
      toast.success("Arquivo excluído!");
      fetchArquivos();
    }
  };

  const canPreview = (tipo: string | null, nome: string) => {
    if (!tipo) {
      const ext = nome.split(".").pop()?.toLowerCase();
      return ["pdf", "jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
    }
    return tipo.startsWith("image/") || tipo === "application/pdf";
  };

  const getFileIcon = (tipo: string | null, nome: string) => {
    const ext = nome.split(".").pop()?.toLowerCase();
    if (tipo?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
        ) : (
          <><Upload className="h-4 w-4" /> Anexar Arquivo</>
        )}
      </Button>

      {/* List */}
      {loading ? (
        <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
      ) : arquivos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <File className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum arquivo anexado</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {arquivos.map((arq) => (
            <div
              key={arq.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              {getFileIcon(arq.tipo_arquivo, arq.nome_arquivo)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{arq.nome_arquivo}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(arq.tamanho_bytes)} • {new Date(arq.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-1">
                {canPreview(arq.tipo_arquivo, arq.nome_arquivo) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPreviewUrl(arq.arquivo_url);
                      setPreviewName(arq.nome_arquivo);
                    }}
                    title="Pré-visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(arq)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewName}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex-1 overflow-auto">
              {previewName.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img src={previewUrl} alt={previewName} className="max-w-full h-auto rounded-lg" />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] rounded-lg border border-border"
                  title={previewName}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
