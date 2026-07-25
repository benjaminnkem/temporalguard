import Link from "next/link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-sm text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 mb-5 text-muted-foreground">
          The workflow context may have expired or the route does not exist.
        </p>
        <Button nativeButton={false} render={<Link href="/overview" />}>
          Return to overview
        </Button>
      </div>
    </main>
  );
}
