import { useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface SeguradoExtraido {
  nome: string;
  certificado?: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  premio_seguro?: number;
}

export function usePdfExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seguradosExtraidos, setSeguradosExtraidos] = useState<SeguradoExtraido[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const { toast } = useToast();

  // Load previously saved extraction from DB
  const loadSavedExtraction = useCallback(async (conferenciaId: string) => {
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("conferencia_seguros_extraidos")
        .select("*")
        .eq("conferencia_id", conferenciaId)
        .order("nome");
      if (error) throw error;
      if (data && data.length > 0) {
        const segurados: SeguradoExtraido[] = data.map((d) => ({
          nome: d.nome,
          certificado: d.certificado || undefined,
          vigencia_inicio: d.vigencia_inicio || undefined,
          vigencia_fim: d.vigencia_fim || undefined,
          premio_seguro: d.premio ? parseFloat(d.premio) : undefined,
        }));
        setSeguradosExtraidos(segurados);
        return true; // had saved data
      }
      setSeguradosExtraidos([]);
      return false; // no saved data
    } catch (err) {
      console.error("Error loading saved extraction:", err);
      setSeguradosExtraidos([]);
      return false;
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  // Save extraction results to DB
  const saveExtraction = useCallback(async (conferenciaId: string, segurados: SeguradoExtraido[]) => {
    try {
      // Delete old data first
      await supabase
        .from("conferencia_seguros_extraidos")
        .delete()
        .eq("conferencia_id", conferenciaId);

      if (segurados.length > 0) {
        const rows = segurados.map((s) => ({
          conferencia_id: conferenciaId,
          nome: s.nome,
          certificado: s.certificado || null,
          vigencia_inicio: s.vigencia_inicio || null,
          vigencia_fim: s.vigencia_fim || null,
          premio: s.premio_seguro != null ? String(s.premio_seguro) : null,
        }));
        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error } = await supabase
            .from("conferencia_seguros_extraidos")
            .insert(batch);
          if (error) throw error;
        }
      }
    } catch (err) {
      console.error("Error saving extraction:", err);
    }
  }, []);

  const extractFromPdf = useCallback(async (pdfUrl: string, conferenciaId?: string) => {
    setIsExtracting(true);
    setProgress(0);
    setSeguradosExtraidos([]);

    try {
      // 1. Load PDF
      setProgress(5);
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      // 2. Render pages to images
      const pageImages: string[] = [];
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        pageImages.push(dataUrl);

        setProgress(Math.round((i / totalPages) * 40) + 5);
      }

      // 3. Send to edge function in smaller batches
      setProgress(50);
      const allSegurados: SeguradoExtraido[] = [];
      const batchSize = 3;
      
      for (let b = 0; b < pageImages.length; b += batchSize) {
        const batch = pageImages.slice(b, b + batchSize);
        const { data, error } = await supabase.functions.invoke("extract-apolice", {
          body: { images: batch },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (data?.segurados) {
          allSegurados.push(...data.segurados);
        }
        setProgress(50 + Math.round(((b + batchSize) / pageImages.length) * 40));
      }

      setProgress(90);
      // Deduplicate by name
      const unique = new Map<string, SeguradoExtraido>();
      for (const s of allSegurados) {
        const key = s.nome.trim().toUpperCase();
        if (!unique.has(key)) unique.set(key, s);
      }
      const segurados = Array.from(unique.values());
      setSeguradosExtraidos(segurados);

      // Save to DB if conferenciaId provided
      if (conferenciaId) {
        await saveExtraction(conferenciaId, segurados);
      }

      setProgress(100);

      toast({
        title: "Extração concluída!",
        description: `${segurados.length} segurados encontrados na apólice.`,
      });

      return segurados;
    } catch (err: any) {
      console.error("PDF extraction error:", err);
      toast({
        title: "Erro na extração",
        description: err.message || "Não foi possível extrair os dados da apólice.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsExtracting(false);
    }
  }, [toast, saveExtraction]);

  return {
    isExtracting,
    isLoadingSaved,
    progress,
    seguradosExtraidos,
    setSeguradosExtraidos,
    extractFromPdf,
    loadSavedExtraction,
  };
}
