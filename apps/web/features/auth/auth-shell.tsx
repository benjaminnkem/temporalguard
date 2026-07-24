import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <CardHeader>
      <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </CardTitle>
      <CardDescription className="text-base">{description}</CardDescription>
    </CardHeader>
  );
}

export function AuthCardBody({ children }: { children: React.ReactNode }) {
  return <CardContent>{children}</CardContent>;
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-md shadow-sm">{children}</Card>
  );
}
