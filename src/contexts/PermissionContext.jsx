import React from "react";
import { Alert, Box } from "@mui/material";
import { useAuth } from "./AuthContext";
import permissoesService from "../services/permissoesService";

export default function PermissionContext({
  children,
  permissoes,
  grupos,
  fallback = null,
  showError = true, // Controla se deve exibir a mensagem de alerta quando não há permissão
}) {
  const { permissoesUsuario, gruposUsuario } = useAuth();

  let hasPermission = false;

  // Se grupos foram especificados, verificar por grupos
  if (grupos && grupos.length > 0) {
    hasPermission = permissoesService.verificarPermissaoPorGrupos(
      gruposUsuario,
      grupos,
    );
  }
  // Se permissões foram especificadas, verificar por IDs de permissão
  else if (permissoes && permissoes.length > 0) {
    hasPermission = permissoesService.verificarPermissaoPorIds(
      permissoesUsuario,
      permissoes,
    );
  }

  if (!hasPermission) {
    // Se um fallback foi fornecido, sempre retorna ele
    if (fallback) {
      return fallback;
    }

    // Se showError é true, exibe a mensagem de alerta
    if (showError) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="warning">
            Você não tem permissão para acessar este recurso.
          </Alert>
        </Box>
      );
    }

    // Se showError é false, retorna null (não exibe nada)
    return null;
  }

  return children;
}
