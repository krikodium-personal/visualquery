import {
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  CheckSquare,
  ChevronsUpDown,
  Grid2X2,
  Images,
  ListChecks,
  ListOrdered,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RectangleEllipsis,
  Rows3,
  SlidersHorizontal,
  Star,
  TableProperties,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { QuestionType } from "@/lib/question-types";

const ICONS: Record<QuestionType, LucideIcon> = {
  single_choice: ListChecks,
  multi_choice: CheckSquare,
  dropdown: ChevronsUpDown,
  dropdown_matrix: Grid2X2,
  image_choice: Images,
  rating: Star,
  slider: SlidersHorizontal,
  ranking: ListOrdered,
  rating_matrix: TableProperties,
  best_worst: ChartNoAxesColumnIncreasing,
  text: MessageSquare,
  short_text: RectangleEllipsis,
  multiple_text: Rows3,
  name: UserRound,
  email: Mail,
  phone: Phone,
  address: MapPin,
  datetime: CalendarClock,
};

export function QuestionTypeIcon({ type, className }: { type: QuestionType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} aria-hidden="true" />;
}
