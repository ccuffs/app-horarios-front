import axiosInstance from "../auth/axios.js";

// GET - Buscar todas as ofertas
export async function getOfertas() {
  try {
    const response = await axiosInstance.get("/ofertas");

    // Remove duplicatas baseadas na chave primária composta
    const uniqueOfertas = response.ofertas.filter(
      (oferta, index, self) =>
        index ===
        self.findIndex(
          (o) =>
            o.ano === oferta.ano &&
            o.semestre === oferta.semestre &&
            o.id_curso === oferta.id_curso &&
            o.fase === oferta.fase,
        ),
    );

    return uniqueOfertas;
  } catch (error) {
    console.error("Erro ao buscar ofertas:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Erro ao buscar ofertas",
    );
  }
}

// POST - Criar nova oferta
export async function createOferta(data) {
  try {
    const response = await axiosInstance.post("/ofertas", data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar oferta:", error);
    throw error;
  }
}

// PUT - Atualizar oferta existente
export async function updateOferta(ano, semestre, id_curso, fase, turno, data) {
  try {
    const response = await axiosInstance.put(
      `/ofertas/${ano}/${semestre}/${id_curso}/${fase}/${turno}`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao atualizar oferta:", error);
    throw error;
  }
}

// DELETE - Remover oferta
export async function deleteOferta(ano, semestre, id_curso, fase) {
  try {
    const response = await axiosInstance.delete(
      `/ofertas/${ano}/${semestre}/${id_curso}/${fase}`,
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao deletar oferta:", error);
    throw error;
  }
}

// Exportação padrão para manter compatibilidade
const ofertasService = {
  getOfertas,
  createOferta,
  updateOferta,
  deleteOferta,
};

export default ofertasService;
