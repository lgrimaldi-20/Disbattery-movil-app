import { User, MapPin } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  groupName: string;
  zoneName: string;
}

const DashboardHeader = ({ userName, groupName, zoneName }: DashboardHeaderProps) => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  };
  const formattedDate = today.toLocaleDateString('es-ES', options);

  return (
    <header className="gradient-header rounded-xl p-6 text-primary-foreground shadow-card animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">¡Hola, {userName}!</h1>
            <p className="text-primary-foreground/80 capitalize">{formattedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-lg">🏆</span>
            <span className="font-semibold">{groupName}</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-primary-foreground/80">
            <MapPin className="h-4 w-4" />
            <span>{zoneName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;