import axiosInstance from "../auth/axios.js";

// GET - Buscar todos os cursos
export async function getCursos() {
  try {
    const response = await axiosInstance.get("/cursos");
    return response.cursos;
  } catch (error) {
    console.error("Erro ao buscar cursos:", error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Erro ao buscar cursos",
    );
  }
}

// Exportação padrão para manter compatibilidade
const cursosService = {
  getCursos,
};

export default cursosService;
