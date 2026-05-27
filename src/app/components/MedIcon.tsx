import {
  Bug, Wind, HeartPulse, Droplet, Droplets, Microscope, Baby, Zap,
  Flame, AlertCircle, AlertTriangle, Bone, Pill, FlaskConical, Sun,
  Activity, Bandage, Leaf, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  bug:           Bug,
  wind:          Wind,
  "heart-pulse": HeartPulse,
  droplet:       Droplet,
  droplets:      Droplets,
  microscope:    Microscope,
  baby:          Baby,
  zap:           Zap,
  flame:         Flame,
  "alert-circle":    AlertCircle,
  "alert-triangle":  AlertTriangle,
  bone:          Bone,
  pill:          Pill,
  flask:         FlaskConical,
  sun:           Sun,
  activity:      Activity,
  bandage:       Bandage,
  leaf:          Leaf,
};

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function MedIcon({ name, size = 20, className }: Props) {
  const Icon = iconMap[name] ?? Activity;
  return <Icon size={size} className={className} />;
}
