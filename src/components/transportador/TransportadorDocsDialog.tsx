import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransportadorAnexos } from "@/components/transportador/TransportadorAnexos";
import { ContratoAnexos } from "@/components/contrato/ContratoAnexos";
import type { Transportador } from "./types";

type Props = {
  transportador: Transportador | null;
  tab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
};

export function TransportadorDocsDialog({ transportador, tab, onTabChange, onClose }: Props) {
  return (
    <Dialog open={!!transportador} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tab === "contratos" ? "Contratos" : "Documentos"} - {transportador?.razao_social}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="anexos" className="flex-1">Anexos</TabsTrigger>
            <TabsTrigger value="contratos" className="flex-1">Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value="anexos" className="mt-4">
            {transportador && (
              <TransportadorAnexos transportadorId={transportador.id} transportadorNome={transportador.razao_social} />
            )}
          </TabsContent>
          <TabsContent value="contratos" className="mt-4">
            {transportador && (
              <ContratoAnexos transportador_id={transportador.id} nome={transportador.razao_social} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
