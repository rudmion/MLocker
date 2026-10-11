import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { EmptyRecord } from '@/components/empty/Empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from 'lucide-react';
import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

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

  const strongCount = records.filter(
    (record) => record.securityLevel === 3,
  ).length;
  const mediumCount = records.filter(
    (record) => record.securityLevel === 2,
  ).length;
  const weakCount = records.filter(
    (record) => record.securityLevel === 1,
  ).length;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const colors = ['#22c555', '#eab308', '#ef4444'];
  const dimmedColor = '#9ca3af';

  const chartData = {
    labels: ['Сильные', 'Средние', 'Слабые'],
    datasets: [
      {
        data: [strongCount, mediumCount, weakCount],
        backgroundColor: colors.map((color, index) =>
          hoveredIndex === null || hoveredIndex === index ? color : dimmedColor,
        ),
        borderWidth: 0,
        hoverOffset: 0,
      },
    ],
  };

  const legend = [
    { label: 'Сильные', count: strongCount, color: colors[0] },
    { label: 'Средние', count: mediumCount, color: colors[1] },
    { label: 'Слабые', count: weakCount, color: colors[2] },
  ];

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
    <div className="grid w-full grid-cols-2 gap-3">
      <Card className="transition-all hover:shadow-md p-1">
        <CardContent className="flex flex-1 items-center gap-3 px-2 py-0.5">
          <div className="flex items-center justify-center w-13 h-13 rounded-sm bg-primary/10">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardDescription className="tracking-wide">
              Всего записей
            </CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {records.length}
            </CardTitle>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all hover:shadow-md px-1 py-2">
        <CardContent className="flex flex-1 items-center gap-3 px-2 py-0.5">
          <div className="w-12 h-12 shrink-0">
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                animation: { duration: 150 },
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false },
                },
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            {legend.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 text-xs"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
