import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function WorkoutPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today&apos;s Workout</h1>
          <p className="text-muted-foreground mt-1">{today}</p>
        </div>
        <Button className="gap-2 font-medium">
          <Dumbbell className="h-4 w-4" />
          Generate Workout
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Your Daily 3</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            Click &quot;Generate Workout&quot; to get today&apos;s 3 problems — 1 revision + 2 discovery
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
