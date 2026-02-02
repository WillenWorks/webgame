// Add these new API hooks inside useGame.ts

  /* =========================
   *  DOSSIER & NOTES
   * ========================= */
  const getDossierNotes = async (caseId: string) => {
    try {
      const res = await api<{ ok: boolean; notes: any }>(`/${caseId}/dossier`);
      return res.notes || {};
    } catch (e) {
      console.error("[GAME] Erro ao carregar notas do dossiê", e);
      return {};
    }
  };

  const saveDossierNotes = async (caseId: string, notes: any) => {
    try {
      const res = await api<{ ok: boolean; notes: any }>(`/${caseId}/dossier`, {
        method: "PUT",
        body: notes,
      });
      return res.notes || {};
    } catch (e) {
      console.error("[GAME] Erro ao salvar notas do dossiê", e);
      return null;
    }
  };
