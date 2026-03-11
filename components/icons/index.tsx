import type { ComponentProps } from 'react';
import {
  AlertCircle,
  Bell,
  ChevronLeft,
  CircleHelp,
  Check,
  ChevronRight,
  Chrome,
  Eye,
  EyeOff,
  Grid2x2,
  Heart,
  Home,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Pill,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  User,
  X,
  XCircle,
} from '@tamagui/lucide-icons';

export type IconProps = ComponentProps<typeof Home>;

export function HomeIcon(props: IconProps) {
  return <Home {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Search {...props} />;
}

export function CartIcon(props: IconProps) {
  return <ShoppingCart {...props} />;
}

export function UserIcon(props: IconProps) {
  return <User {...props} />;
}

export function PackageIcon(props: IconProps) {
  return <Package {...props} />;
}

export function HeartIcon(props: IconProps) {
  return <Heart {...props} />;
}

export function BellIcon(props: IconProps) {
  return <Bell {...props} />;
}

export function GridIcon(props: IconProps) {
  return <Grid2x2 {...props} />;
}

export function CheckIcon(props: IconProps) {
  return <Check {...props} />;
}

export function MapPinIcon(props: IconProps) {
  return <MapPin {...props} />;
}

export function PillIcon(props: IconProps) {
  return <Pill {...props} />;
}

export function AlertCircleIcon(props: IconProps) {
  return <AlertCircle {...props} />;
}

export function CircleHelpIcon(props: IconProps) {
  return <CircleHelp {...props} />;
}

export function ChevronRightIcon(props: IconProps) {
  return <ChevronRight {...props} />;
}

export function ChevronLeftIcon(props: IconProps) {
  return <ChevronLeft {...props} />;
}

export function XCircleIcon(props: IconProps) {
  return <XCircle {...props} />;
}

export function EyeIcon(props: IconProps) {
  return <Eye {...props} />;
}

export function EyeOffIcon(props: IconProps) {
  return <EyeOff {...props} />;
}

export function StarIcon(props: IconProps) {
  return <Star {...props} />;
}

export function EditIcon(props: IconProps) {
  return <Pencil {...props} />;
}

export function DeleteIcon(props: IconProps) {
  return <Trash2 {...props} />;
}

export function GoogleIcon(props: IconProps) {
  return <Chrome {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <X {...props} />;
}

export function MoreIcon(props: IconProps) {
  return <MoreHorizontal {...props} />;
}
