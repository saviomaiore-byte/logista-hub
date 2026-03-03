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
  const { toast } = useToast();

  const extractFromPdf = useCallback(async (pdfUrl: string) => {
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
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        pageImages.push(dataUrl);

        setProgress(Math.round((i / totalPages) * 40) + 5);
      }

      // 3. Send to edge function
      setProgress(50);
      const { data, error } = await supabase.functions.invoke("extract-apolice", {
        body: { images: pageImages },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setProgress(90);
      const segurados = data?.segurados || [];
      setSeguradosExtraidos(segurados);
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
  }, [toast]);

  return {
    isExtracting,
    progress,
    seguradosExtraidos,
    setSeguradosExtraidos,
    extractFromPdf,
  };
}
