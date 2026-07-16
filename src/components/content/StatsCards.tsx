import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { EmptyRecord } from '@/components/empty/Empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, ShieldAlert } from 'lucide-react';

export function StatsCards() {
  const data = useStore((state) => state.data);
  const isLoading = useStore((state) => state.isLoading);
  const selectedSectionId = useStore((state) => state.selectedSectionId);

  const sections = data?.sections ?? [];
  const allEntries = sections.flatMap((section) => section.entries ?? []);
  const records =
    selectedSectionId === 'all'
      ? allEntries
      : (sections.find((section) => section.id === selectedSectionId)
          ?.entries ?? []);

  if (isLoading) {
    return (
      <div className="flex w-full gap-4">
        <Card className="w-1/2 h-full">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
        <Card className="w-1/2 h-full">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="h-[calc(100vh-77px)] flex items-center">
        <EmptyRecord />
      </div>
    );
  }

  return (
    <div className="flex w-full gap-3">
      <Card className="w-1/2 h-full transition-all hover:shadow-md">
        <CardContent className="px-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardDescription className="text-sm tracking-wide">
                Всего записей
              </CardDescription>
              <CardTitle className="text-2xl font-semibold mt-0.5">
                {records.length}
              </CardTitle>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-1/2 h-full transition-all hover:shadow-md">
        <CardContent className="px-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardDescription className="text-sm tracking-wide">
                Слабые пароли
              </CardDescription>
              <CardTitle className="text-2xl font-semibold mt-0.5">
                {records.filter((record) => record.securityLevel <= 1).length}
              </CardTitle>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
