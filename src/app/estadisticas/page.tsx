// Estadísticas — redirige al año actual.
import { redirect } from "next/navigation";

export default function EstadisticasPage() {
  const year = new Date().getFullYear();
  redirect(`/estadisticas/${year}`);
}
