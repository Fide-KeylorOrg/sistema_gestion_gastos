import { Badge } from "@/components/ui/badge";

export const EmployeeStatusBadge = ({ active }: { active: boolean }) => <Badge tone={active ? "success" : "neutral"}>{active ? "Activo" : "Inactivo"}</Badge>;
