import {
  LayoutDashboard,
  Box,
  Settings,
  LogOut,
  Truck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock3,
  FileText,
  ShieldCheck,
  Thermometer,
  CreditCard,
  Shield,
  Upload,
  File,
} from 'lucide-react';

const iconConfig = {
  navigation: {
    dashboard: LayoutDashboard,
    inventory: Box,
    settings: Settings,
    logout: LogOut,
  },
  batchStatus: {
    inTransit: Truck,
    delivered: CheckCircle2,
    dispute: AlertTriangle,
  },
  sections: {
    traceability: MapPin,
    timeline: Clock3,
    documentation: FileText,
    certifications: FileText,
    telemetry: Thermometer,
  },
  contractActions: {
    releasePayment: CreditCard,
    openDispute: Shield,
    uploadCertificate: Upload,
    proofDocument: File,
  },
};

export default iconConfig;
